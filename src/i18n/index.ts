import type { Language } from '../types';
import { de, type Messages } from './de';
import { en } from './en';

export type { Messages };

export const MESSAGES: Record<Language, Messages> = { de, en };
