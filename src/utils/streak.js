import { normalizeDayLog } from "./helpers";

export function calculateStreak(dailyLogs, targetCalories) {
  if (!targetCalories || targetCalories <= 0) return 0;

  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);

    const log = normalizeDayLog(dailyLogs[key]);
    const eaten = log.entries.reduce((sum, item) => sum + Number(item.calories || 0), 0);
    const exercise = log.exercises.reduce((sum, item) => sum + Number(item.calories || 0), 0);

    if (i === 0 && eaten === 0) continue;

    const net = eaten - exercise;
    const withinGoal = eaten > 0 && net <= targetCalories + 100;

    if (withinGoal) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function getStreakEmoji(streak) {
  if (streak >= 30) return "🔥🔥🔥";
  if (streak >= 14) return "🔥🔥";
  if (streak >= 7) return "🔥";
  if (streak >= 3) return "⚡";
  if (streak >= 1) return "✅";
  return "💤";
}

export function getStreakMessage(streak) {
  if (streak >= 30) return "Απίστευτο! 30+ μέρες στο στόχο!";
  if (streak >= 14) return "Εξαιρετικό! 2 εβδομάδες συνέχεια!";
  if (streak >= 7) return "Τέλεια εβδομάδα! Συνέχισε!";
  if (streak >= 3) return "Καλή πορεία! Κράτα το!";
  if (streak >= 1) return "Ξεκίνησες! Συνέχισε αύριο!";
  return "Ξεκίνα σήμερα για να χτίσεις streak!";
}