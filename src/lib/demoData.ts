import type {
  AppData,
  Budget,
  Category,
  ExpenseCategory,
  Language,
  PaymentMethod,
  SavingsGoal,
  Settings,
  Transaction,
  TransactionType,
} from '../types';
import { addMonths, daysInMonth, monthEnd, pad2, type YearMonth, ymOf } from './dates';
import { roundMoney } from './money';
import { createId, DEFAULT_SETTINGS } from './storage';

/** Kleiner, deterministischer Zufallsgenerator (mulberry32). */
function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (min: number, max: number) => roundMoney(min + next() * (max - min)),
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
  };
}

const TEXT = {
  de: {
    salary: 'Gehalt – Muster GmbH',
    sidejob: 'Nebenjob – Café Liebling',
    freelance: ['Freelance: Website-Projekt', 'Freelance: Logo-Design', 'Freelance: Fotoshooting'],
    dividend: 'Dividende ETF-Sparplan',
    giftBirthday: 'Geburtstagsgeld von Oma',
    giftXmas: 'Weihnachtsgeschenk der Eltern',
    refund: 'Steuererstattung',
    rent: 'Miete Wohnung',
    electricity: 'Stromabschlag',
    internet: 'Internet & Mobilfunk',
    insurance: 'Haftpflicht- & Hausratversicherung',
    groceries: ['Supermarkt REWE', 'Wocheneinkauf Aldi', 'Edeka', 'Lidl', 'Wochenmarkt', 'Bäckerei', 'dm Drogerie'],
    ticket: 'Deutschlandticket',
    transport: ['Bahnticket', 'Tanken', 'Carsharing', 'Taxi'],
    leisure: ['Kino', 'Restaurant mit Freunden', 'Konzertticket', 'Bowling', 'Pizza-Abend', 'Kletterhalle'],
    shopping: ['Zalando Bestellung', 'Amazon', 'Sneaker', 'Buchhandlung', 'Elektronik-Zubehör', 'IKEA'],
    netflix: 'Netflix',
    spotify: 'Spotify Premium',
    icloud: 'iCloud+',
    prime: 'Amazon Prime',
    health: ['Apotheke', 'Zahnreinigung', 'Physiotherapie'],
    education: ['Online-Kurs', 'Fachbücher', 'Sprachkurs'],
    travel: ['Ferienwohnung Ostsee', 'Flug nach Lissabon', 'Wochenendtrip Hamburg'],
    other: ['Friseur', 'Geschenk für Freundin', 'Spende'],
    goals: ['Neues Fahrrad', 'Urlaub', 'Notgroschen', 'Gaming-PC'],
  },
  en: {
    salary: 'Salary – Sample Ltd.',
    sidejob: 'Side job – Café Liebling',
    freelance: ['Freelance: website project', 'Freelance: logo design', 'Freelance: photo shoot'],
    dividend: 'ETF dividend',
    giftBirthday: 'Birthday money from grandma',
    giftXmas: 'Christmas gift from parents',
    refund: 'Tax refund',
    rent: 'Apartment rent',
    electricity: 'Electricity',
    internet: 'Internet & mobile',
    insurance: 'Liability & home insurance',
    groceries: ['Supermarket', 'Weekly groceries', 'Organic store', 'Discount grocer', 'Farmers market', 'Bakery', 'Drugstore'],
    ticket: 'Monthly transit pass',
    transport: ['Train ticket', 'Fuel', 'Car sharing', 'Taxi'],
    leisure: ['Cinema', 'Dinner with friends', 'Concert ticket', 'Bowling', 'Pizza night', 'Climbing gym'],
    shopping: ['Clothing order', 'Amazon', 'Sneakers', 'Bookstore', 'Electronics accessories', 'IKEA'],
    netflix: 'Netflix',
    spotify: 'Spotify Premium',
    icloud: 'iCloud+',
    prime: 'Amazon Prime',
    health: ['Pharmacy', 'Dental cleaning', 'Physiotherapy'],
    education: ['Online course', 'Textbooks', 'Language course'],
    travel: ['Holiday flat at the coast', 'Flight to Lisbon', 'Weekend trip to Hamburg'],
    other: ['Hairdresser', 'Gift for a friend', 'Donation'],
    goals: ['New bike', 'Vacation', 'Emergency fund', 'Gaming PC'],
  },
} as const;

/**
 * Erstellt realistische Demo-Daten für die letzten 12 Monate,
 * relativ zum übergebenen Datum. Es entstehen keine Einträge in der Zukunft.
 */
export function createDemoData(today: string, language: Language, settings: Settings = DEFAULT_SETTINGS): AppData {
  const text = TEXT[language];
  const current = ymOf(today);
  const random = createRandom(current.year * 100 + current.month);
  const transactions: Transaction[] = [];
  const createdAt = new Date().toISOString();

  const add = (
    ym: YearMonth,
    day: number,
    type: TransactionType,
    category: Category,
    amount: number,
    description: string,
    paymentMethod: PaymentMethod | null = 'checking',
  ) => {
    const date = `${ym.year}-${pad2(ym.month)}-${pad2(Math.min(day, daysInMonth(ym.year, ym.month)))}`;
    if (date > today) return;
    transactions.push({
      id: createId(),
      type,
      category,
      amount: roundMoney(amount),
      description,
      date,
      paymentMethod,
      createdAt,
    });
  };

  const spread = (ym: YearMonth, total: number, days: number[], category: ExpenseCategory, names: readonly string[]) => {
    const weights = days.map(() => 0.6 + random.next());
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    let remaining = roundMoney(total);
    days.forEach((day, index) => {
      const amount = index === days.length - 1 ? remaining : roundMoney((total * weights[index]) / weightSum);
      remaining = roundMoney(remaining - amount);
      const method: PaymentMethod = random.chance(0.25) ? 'cash' : random.chance(0.5) ? 'creditCard' : 'checking';
      add(ym, day, 'expense', category, amount, random.pick(names), method);
    });
  };

  for (let offset = 11; offset >= 0; offset -= 1) {
    const ym = addMonths(current, -offset);
    const isCurrent = offset === 0;

    // Einnahmen
    add(ym, 1, 'income', 'salary', 3000, text.salary);
    add(ym, 15, 'income', 'sidejob', 450, text.sidejob);
    if (ym.month % 3 === 2) add(ym, 20, 'income', 'freelance', random.between(350, 850), random.pick(text.freelance));
    if (ym.month % 3 === 0) add(ym, 10, 'income', 'investment', random.between(38, 92), text.dividend);
    if (ym.month === 12) add(ym, 24, 'income', 'gift', 150, text.giftXmas, 'cash');
    if (ym.month === 5) add(ym, 12, 'income', 'gift', 100, text.giftBirthday, 'cash');
    if (ym.month === 7) add(ym, 8, 'income', 'otherIncome', random.between(180, 420), text.refund);

    // Fixkosten
    add(ym, 3, 'expense', 'housing', 850, text.rent);
    add(ym, 4, 'expense', 'bills', 65, text.electricity);
    add(ym, 6, 'expense', 'bills', 39.99, text.internet);
    if (ym.month % 3 === 1) add(ym, 15, 'expense', 'bills', 150, text.insurance);
    add(ym, 1, 'expense', 'transport', 58, text.ticket);
    add(ym, 5, 'expense', 'subscriptions', 17.99, text.netflix, 'creditCard');
    add(ym, 12, 'expense', 'subscriptions', 11.99, text.spotify, 'paypal');
    add(ym, 14, 'expense', 'subscriptions', 2.99, text.icloud, 'creditCard');
    add(ym, 20, 'expense', 'subscriptions', 8.99, text.prime, 'creditCard');

    if (isCurrent) {
      // Aktueller Monat: bewusst so gewählt, dass Budgetwarnungen sichtbar werden.
      spread(ym, 312.4, [2, 6, 9, 13, 17, 21, 24], 'groceries', text.groceries);
      add(ym, 7, 'expense', 'leisure', 24.5, text.leisure[0], 'creditCard');
      add(ym, 16, 'expense', 'leisure', 58.3, text.leisure[1], 'creditCard');
      add(ym, 23, 'expense', 'leisure', 21.2, text.leisure[3], 'cash');
      add(ym, 8, 'expense', 'shopping', 59.99, text.shopping[0], 'paypal');
      add(ym, 19, 'expense', 'shopping', 79, text.shopping[2], 'creditCard');
      add(ym, 18, 'expense', 'transport', 34.9, text.transport[0], 'creditCard');
      add(ym, 11, 'expense', 'health', 18.45, text.health[0], 'cash');
      continue;
    }

    spread(ym, random.between(285, 365), [2, 6, 10, 14, 18, 22, 27], 'groceries', text.groceries);
    spread(ym, random.between(95, 185), [8, 17, 25], 'leisure', text.leisure);
    spread(ym, random.between(45, 150), random.chance(0.5) ? [11, 23] : [19], 'shopping', text.shopping);
    if (random.chance(0.6)) add(ym, 21, 'expense', 'transport', random.between(25, 70), random.pick(text.transport), 'creditCard');
    if (random.chance(0.5)) add(ym, 13, 'expense', 'health', random.between(12, 85), random.pick(text.health), 'cash');
    if (random.chance(0.35)) add(ym, 9, 'expense', 'education', random.between(19, 89), random.pick(text.education), 'paypal');
    if (random.chance(0.45)) add(ym, 26, 'expense', 'otherExpense', random.between(15, 60), random.pick(text.other), 'cash');
    if (ym.month === 7 || ym.month === 8) add(ym, 4, 'expense', 'travel', random.between(380, 640), random.pick(text.travel), 'creditCard');
    if (ym.month === 12) spread(ym, random.between(160, 260), [9, 16], 'shopping', text.shopping);
  }

  transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Budgets für den aktuellen und die zwei vorherigen Monate
  const budgets: Budget[] = [];
  const budgetPlan: [Budget['category'], number][] = [
    ['total', 2400],
    ['groceries', 400],
    ['leisure', 200],
    ['transport', 200],
    ['shopping', 150],
    ['subscriptions', 40],
  ];
  for (let offset = 2; offset >= 0; offset -= 1) {
    const ym = addMonths(current, -offset);
    for (const [category, amount] of budgetPlan) {
      budgets.push({ id: createId(), category, amount, month: ym.month, year: ym.year });
    }
  }

  const goalNames = text.goals;
  const goals: SavingsGoal[] = [
    {
      id: createId(),
      name: goalNames[0],
      targetAmount: 1500,
      currentAmount: 750,
      deadline: monthEnd(addMonths(current, 5)),
      createdAt,
      color: 'green',
    },
    {
      id: createId(),
      name: goalNames[1],
      targetAmount: 2000,
      currentAmount: 1200,
      deadline: monthEnd(addMonths(current, 9)),
      createdAt,
      color: 'orange',
    },
    {
      id: createId(),
      name: goalNames[2],
      targetAmount: 5000,
      currentAmount: 3400,
      deadline: null,
      createdAt,
      color: 'blue',
    },
    {
      id: createId(),
      name: goalNames[3],
      targetAmount: 1800,
      currentAmount: 450,
      deadline: monthEnd(addMonths(current, 11)),
      createdAt,
      color: 'violet',
    },
  ];

  return { transactions, budgets, goals, settings: { ...settings } };
}
