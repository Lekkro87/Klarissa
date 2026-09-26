import { useCallback } from 'react';
import type { BudgetLevel, BudgetWarning } from '../../lib/calculations';
import { useI18n } from '../../state/store';

/** Liefert den verständlichen Warntext für eine Budgetwarnung. */
export function useWarningMessage() {
  const { t, f } = useI18n();
  return useCallback(
    (warning: Pick<BudgetWarning, 'category' | 'percent' | 'remaining' | 'over'> & { level: BudgetLevel }): string => {
      if (warning.level === 'ok') return '';
      const w = t.budget.warnings;
      const percent = f.percent(Math.floor(warning.percent), 0);
      if (warning.category === 'total') {
        switch (warning.level) {
          case 'warn75':
            return w.totalWarn75(percent);
          case 'warn90':
            return w.totalWarn90(f.money(warning.remaining));
          case 'full':
            return w.totalFull;
          default:
            return w.totalOver(f.money(warning.over));
        }
      }
      const category = t.categories[warning.category];
      switch (warning.level) {
        case 'warn75':
          return w.warn75(percent, category);
        case 'warn90':
          return w.warn90(category, f.money(warning.remaining));
        case 'full':
          return w.full(category);
        default:
          return w.over(category, f.money(warning.over));
      }
    },
    [t, f],
  );
}
