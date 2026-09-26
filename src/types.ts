export type TransactionType = 'income' | 'expense';

export type IncomeCategory = 'salary' | 'sidejob' | 'freelance' | 'gift' | 'investment' | 'otherIncome';

export type ExpenseCategory =
  | 'housing'
  | 'groceries'
  | 'restaurants'
  | 'transport'
  | 'leisure'
  | 'shopping'
  | 'subscriptions'
  | 'health'
  | 'education'
  | 'travel'
  | 'bills'
  | 'otherExpense';

export type Category = IncomeCategory | ExpenseCategory;

export type PaymentMethod = 'checking' | 'creditCard' | 'cash' | 'paypal' | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Immer positiv, auf Cent gerundet. Das Vorzeichen ergibt sich aus `type`. */
  amount: number;
  category: Category;
  description: string;
  /** Lokales Datum im Format YYYY-MM-DD */
  date: string;
  paymentMethod: PaymentMethod | null;
  /** ISO-Zeitstempel */
  createdAt: string;
}

/** Werte, die der Nutzer im Formular eingibt (ohne technische Felder). */
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;

/** `total` steht für das Gesamtbudget eines Monats. */
export type BudgetCategory = ExpenseCategory | 'total';

export interface Budget {
  id: string;
  category: BudgetCategory;
  amount: number;
  /** 1–12 */
  month: number;
  year: number;
}

export type GoalColor = 'blue' | 'green' | 'orange' | 'violet' | 'magenta' | 'yellow';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  /** YYYY-MM-DD oder null */
  deadline: string | null;
  createdAt: string;
  color: GoalColor;
}

export type SavingsGoalInput = Omit<SavingsGoal, 'id' | 'createdAt'>;

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';
export type ThemePreference = 'light' | 'dark' | 'system';
export type Language = 'de' | 'en';

export interface Settings {
  name: string;
  currency: Currency;
  theme: ThemePreference;
  language: Language;
}

export interface Account {
  /**
   * Startguthaben, auf das alle Einnahmen und Ausgaben aufgerechnet werden.
   * `null`, solange der Nutzer seinen Kontostand noch nicht angegeben hat.
   */
  openingBalance: number | null;
}

/** Bargeldbestand – getrennt vom Bankkonto, gezählt nach Scheinen und Münzen. */
export interface CashWallet {
  /** Anzahl je Stückelung, Schlüssel z. B. „note-2000“ oder „coin-50“ */
  counts: Record<string, number>;
  /** ISO-Zeitstempel der letzten Änderung */
  updatedAt: string | null;
}

export interface AppData {
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  settings: Settings;
  account: Account;
  cash: CashWallet;
}
