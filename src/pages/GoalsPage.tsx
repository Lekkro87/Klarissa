import { PiggyBank, Plus, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GoalCard } from '../components/goals/GoalBits';
import { AdjustGoalModal, GoalModal } from '../components/goals/GoalModals';
import { Button } from '../components/ui/Button';
import { Card, PageIntro } from '../components/ui/Card';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useToast } from '../components/ui/Toast';
import { toCents } from '../lib/money';
import { useActions, useData, useI18n } from '../state/store';
import { useAppUi } from '../state/ui';
import type { SavingsGoal } from '../types';

export function GoalsPage() {
  const { t, f } = useI18n();
  const { goals } = useData();
  const actions = useActions();
  const toast = useToast();
  const confirm = useConfirm();
  const ui = useAppUi();
  const [editor, setEditor] = useState<{ goal: SavingsGoal | null } | null>(null);
  const [adjusting, setAdjusting] = useState<SavingsGoal | null>(null);

  useEffect(() => {
    if (ui.intent === 'createGoal') {
      setEditor({ goal: null });
      ui.clearIntent();
    }
  }, [ui]);

  const summary = useMemo(() => {
    let saved = 0;
    let target = 0;
    let reached = 0;
    for (const goal of goals) {
      saved += toCents(Math.min(goal.currentAmount, goal.targetAmount));
      target += toCents(goal.targetAmount);
      if (goal.currentAmount >= goal.targetAmount) reached += 1;
    }
    const totalSaved = goals.reduce((sum, goal) => sum + toCents(goal.currentAmount), 0) / 100;
    return { saved: totalSaved, target: target / 100, progress: target > 0 ? (saved / target) * 100 : 0, reached };
  }, [goals]);

  const removeGoal = async (goal: SavingsGoal) => {
    const ok = await confirm({
      title: t.confirm.deleteGoalTitle,
      message: t.confirm.deleteGoalText(goal.name),
      confirmLabel: t.common.delete,
    });
    if (!ok) return;
    const removed = actions.deleteGoal(goal.id);
    if (removed) {
      toast.show({
        kind: 'success',
        message: t.toasts.goalDeleted,
        action: {
          label: t.common.undo,
          onClick: () =>
            actions.saveGoal({
              name: removed.name,
              targetAmount: removed.targetAmount,
              currentAmount: removed.currentAmount,
              deadline: removed.deadline,
              color: removed.color,
            }),
        },
      });
    }
  };

  // Aktuelle Version des Ziels verwenden, falls es sich während des Dialogs ändert
  const adjustingGoal = adjusting ? (goals.find((goal) => goal.id === adjusting.id) ?? null) : null;

  return (
    <div className="space-y-6">
      <PageIntro
        title={t.nav.goals}
        subtitle={t.goals.subtitle}
        actions={
          <Button icon={Plus} onClick={() => setEditor({ goal: null })}>
            {t.goals.addGoal}
          </Button>
        }
      />

      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title={t.goals.emptyTitle}
            text={t.goals.emptyText}
            action={
              <Button icon={Plus} onClick={() => setEditor({ goal: null })}>
                {t.goals.emptyAction}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card>
            <div className="grid gap-5 md:grid-cols-[1fr_1fr_1.4fr] md:items-center">
              <div>
                <p className="text-[13px] text-muted">{t.goals.totalSaved}</p>
                <p className="num mt-1 font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">{f.money(summary.saved)}</p>
              </div>
              <div>
                <p className="text-[13px] text-muted">{t.goals.totalTarget}</p>
                <p className="num mt-1 font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">{f.money(summary.target)}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink-2">
                    <Trophy className="size-4 text-serious" aria-hidden="true" />
                    {t.goals.goalsReached(summary.reached, goals.length)}
                  </span>
                  <span className="num font-semibold text-ink">{f.percent(summary.progress, 0)}</span>
                </div>
                <ProgressBar
                  percent={summary.progress}
                  size="lg"
                  label={t.goals.totalSaved}
                  valueText={`${f.money(summary.saved)} / ${f.money(summary.target)}`}
                />
              </div>
            </div>
          </Card>

          <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => setEditor({ goal })}
                onDelete={() => removeGoal(goal)}
                onAdjust={() => setAdjusting(goal)}
              />
            ))}
          </ul>
        </>
      )}

      <GoalModal open={editor !== null} goal={editor?.goal ?? null} onClose={() => setEditor(null)} />
      <AdjustGoalModal goal={adjustingGoal} onClose={() => setAdjusting(null)} />
    </div>
  );
}
