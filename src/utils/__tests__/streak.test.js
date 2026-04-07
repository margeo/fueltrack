import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateStreak, getStreakEmoji, getStreakMessage } from "../streak";

describe("calculateStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when targetCalories is 0", () => {
    expect(calculateStreak({}, 0)).toBe(0);
  });

  it("returns 0 when targetCalories is negative", () => {
    expect(calculateStreak({}, -100)).toBe(0);
  });

  it("returns 0 when no logs exist", () => {
    expect(calculateStreak({}, 2000)).toBe(0);
  });

  it("counts consecutive days within calorie goal", () => {
    const logs = {
      "2024-06-15": {
        entries: [{ calories: 1800 }],
        exercises: [],
      },
      "2024-06-14": {
        entries: [{ calories: 1900 }],
        exercises: [],
      },
      "2024-06-13": {
        entries: [{ calories: 2000 }],
        exercises: [],
      },
    };
    expect(calculateStreak(logs, 2000)).toBe(3);
  });

  it("allows up to 100 calorie tolerance over target", () => {
    const logs = {
      "2024-06-15": {
        entries: [{ calories: 2100 }], // exactly at target + 100
        exercises: [],
      },
    };
    expect(calculateStreak(logs, 2000)).toBe(1);
  });

  it("breaks streak when exceeding target + 100", () => {
    const logs = {
      "2024-06-15": {
        entries: [{ calories: 1800 }],
        exercises: [],
      },
      "2024-06-14": {
        entries: [{ calories: 2200 }], // over by 200
        exercises: [],
      },
      "2024-06-13": {
        entries: [{ calories: 1500 }],
        exercises: [],
      },
    };
    expect(calculateStreak(logs, 2000)).toBe(1);
  });

  it("subtracts exercise calories from net", () => {
    const logs = {
      "2024-06-15": {
        entries: [{ calories: 2300 }],
        exercises: [{ calories: 400 }], // net = 1900
      },
    };
    expect(calculateStreak(logs, 2000)).toBe(1);
  });

  it("skips today if no food logged yet", () => {
    const logs = {
      "2024-06-14": {
        entries: [{ calories: 1800 }],
        exercises: [],
      },
      "2024-06-13": {
        entries: [{ calories: 1900 }],
        exercises: [],
      },
    };
    expect(calculateStreak(logs, 2000)).toBe(2);
  });

  it("breaks on day with zero calories (not today)", () => {
    const logs = {
      "2024-06-15": {
        entries: [{ calories: 1800 }],
        exercises: [],
      },
      "2024-06-14": {
        entries: [], // zero calories, not today
        exercises: [],
      },
      "2024-06-13": {
        entries: [{ calories: 1800 }],
        exercises: [],
      },
    };
    // Day 15: 1800 ≤ 2100 → streak = 1
    // Day 14: eaten = 0, withinGoal requires eaten > 0, so false → break
    expect(calculateStreak(logs, 2000)).toBe(1);
  });

  it("handles malformed log entries gracefully", () => {
    const logs = {
      "2024-06-15": null,
    };
    // normalizeDayLog(null) → { entries: [], exercises: [] }
    // eaten = 0, i === 0 → skip, then no more days → streak = 0
    expect(calculateStreak(logs, 2000)).toBe(0);
  });
});

describe("getStreakEmoji", () => {
  it("returns sleepy for 0", () => {
    expect(getStreakEmoji(0)).toBe("💤");
  });

  it("returns checkmark for 1-2", () => {
    expect(getStreakEmoji(1)).toBe("✅");
    expect(getStreakEmoji(2)).toBe("✅");
  });

  it("returns lightning for 3-6", () => {
    expect(getStreakEmoji(3)).toBe("⚡");
    expect(getStreakEmoji(6)).toBe("⚡");
  });

  it("returns single fire for 7-13", () => {
    expect(getStreakEmoji(7)).toBe("🔥");
    expect(getStreakEmoji(13)).toBe("🔥");
  });

  it("returns double fire for 14-29", () => {
    expect(getStreakEmoji(14)).toBe("🔥🔥");
    expect(getStreakEmoji(29)).toBe("🔥🔥");
  });

  it("returns triple fire for 30+", () => {
    expect(getStreakEmoji(30)).toBe("🔥🔥🔥");
    expect(getStreakEmoji(100)).toBe("🔥🔥🔥");
  });
});

describe("getStreakMessage", () => {
  it("returns start message for 0", () => {
    expect(getStreakMessage(0)).toContain("Ξεκίνα");
  });

  it("returns continue message for 1", () => {
    expect(getStreakMessage(1)).toContain("Ξεκίνησες");
  });

  it("returns good progress for 3", () => {
    expect(getStreakMessage(3)).toContain("Καλή πορεία");
  });

  it("returns week message for 7", () => {
    expect(getStreakMessage(7)).toContain("εβδομάδα");
  });

  it("returns two weeks message for 14", () => {
    expect(getStreakMessage(14)).toContain("2 εβδομάδες");
  });

  it("returns incredible message for 30+", () => {
    expect(getStreakMessage(30)).toContain("30+");
  });
});
