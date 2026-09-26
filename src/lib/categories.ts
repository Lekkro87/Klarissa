import {
  Banknote,
  Briefcase,
  Car,
  CircleEllipsis,
  CreditCard,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  type LucideIcon,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import type {
  BudgetCategory,
  Category,
  ExpenseCategory,
  IncomeCategory,
  PaymentMethod,
  TransactionType,
} from '../types';

export const INCOME_CATEGORIES: readonly IncomeCategory[] = [
  'salary',
  'sidejob',
  'freelance',
  'gift',
  'investment',
  'otherIncome',
];

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'housing',
  'groceries',
  'restaurants',
  'transport',
  'leisure',
  'shopping',
  'subscriptions',
  'health',
  'education',
  'travel',
  'bills',
  'otherExpense',
];

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['checking', 'creditCard', 'cash', 'paypal', 'other'];

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  salary: Briefcase,
  sidejob: Wallet,
  freelance: Laptop,
  gift: Gift,
  investment: TrendingUp,
  otherIncome: CircleEllipsis,
  housing: House,
  groceries: ShoppingCart,
  restaurants: UtensilsCrossed,
  transport: Car,
  leisure: Gamepad2,
  shopping: ShoppingBag,
  subscriptions: Repeat,
  health: HeartPulse,
  education: GraduationCap,
  travel: Plane,
  bills: Receipt,
  otherExpense: CircleEllipsis,
};

export const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  checking: Landmark,
  creditCard: CreditCard,
  cash: Banknote,
  paypal: Wallet,
  other: CircleEllipsis,
};

export function categoriesFor(type: TransactionType): readonly Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isIncomeCategory(value: unknown): value is IncomeCategory {
  return typeof value === 'string' && (INCOME_CATEGORIES as readonly string[]).includes(value);
}

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function isCategoryOfType(value: unknown, type: TransactionType): value is Category {
  return type === 'income' ? isIncomeCategory(value) : isExpenseCategory(value);
}

export function isBudgetCategory(value: unknown): value is BudgetCategory {
  return value === 'total' || isExpenseCategory(value);
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function typeOfCategory(category: Category): TransactionType {
  return isIncomeCategory(category) ? 'income' : 'expense';
}
