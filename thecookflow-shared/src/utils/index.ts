const BASE_XP = 100;
const GROWTH_FACTOR = 1.3;

function xpForLevel(level: number): number {
  if (level <= 0) {
    return 0;
  }

  if (level === 1) {
    return BASE_XP;
  }

  let xp = BASE_XP;
  for (let currentLevel = 2; currentLevel <= level; currentLevel++) {
    xp = Math.round(xp * GROWTH_FACTOR + BASE_XP);
  }

  return xp;
}

export function calculateLevel(totalXP: number): number {
  if (!Number.isFinite(totalXP) || totalXP <= 0) {
    return 1;
  }

  let level = 1;
  let remainingXP = Math.floor(totalXP);

  while (remainingXP >= xpForLevel(level)) {
    remainingXP -= xpForLevel(level);
    level += 1;
  }

  return level;
}

export function getNextLevelXP(currentLevel: number): number {
  if (!Number.isFinite(currentLevel) || currentLevel < 1) {
    return xpForLevel(1);
  }

  return xpForLevel(Math.floor(currentLevel));
}

export function getProgressToNextLevel(totalXP: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
} {
  const level = calculateLevel(totalXP);
  const xpForCurrentLevel = xpForLevel(level - 1);
  const xpForNext = xpForLevel(level);
  const xpIntoLevel = Math.max(0, Math.floor(totalXP) - xpForCurrentLevel);

  return {
    level,
    xpIntoLevel,
    xpForNext,
  };
}
