export const GOALS = {
  lose: {
    key: "lose",
    label: "Lose weight",
    calorieStrategy: "deficit"
  },
  maintain: {
    key: "maintain",
    label: "Maintain",
    calorieStrategy: "maintain"
  },
  gain: {
    key: "gain",
    label: "Muscle gain",
    calorieStrategy: "surplus"
  },
  fitness: {
    key: "fitness",
    label: "Fitness",
    calorieStrategy: "recomposition"
  }
};

export const GOAL_OPTIONS = Object.values(GOALS);