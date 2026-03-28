export interface ScoringState {
  score: number;
  combo: number;
  comboMultiplier: number;
  maxCombo: number;
  lastClickTime: number;
  rapidClicks: number; // consecutive fast clicks
  casesRevealed: number;
  totalTimeSurvived: number;
}

// Combo thresholds
const COMBO_BREAK_THRESHOLD = 2000; // ms - combo breaks after 2s
const COMBO_TIER_1 = 5; // rapid clicks for x2
const COMBO_TIER_2 = 10; // for x3
const COMBO_TIER_3 = 20; // for x5

const ZONE_3x3_BONUS = 5;
const ZONE_5x5_BONUS = 25;

export function createScoringState(): ScoringState {
  return {
    score: 0,
    combo: 0,
    comboMultiplier: 1,
    maxCombo: 0,
    lastClickTime: 0,
    rapidClicks: 0,
    casesRevealed: 0,
    totalTimeSurvived: 0,
  };
}

function getComboMultiplier(rapidClicks: number): number {
  if (rapidClicks >= COMBO_TIER_3) return 5;
  if (rapidClicks >= COMBO_TIER_2) return 3;
  if (rapidClicks >= COMBO_TIER_1) return 2;
  return 1;
}

export interface RevealResult {
  cellsRevealed: number;
  hitMine: boolean;
}

export function onReveal(
  scoring: ScoringState,
  result: RevealResult
): void {
  const now = performance.now();

  if (result.hitMine) {
    // Mine hit: break combo
    scoring.rapidClicks = 0;
    scoring.combo = 0;
    scoring.comboMultiplier = 1;
    scoring.lastClickTime = now;
    return;
  }

  // Check combo timing
  if (scoring.lastClickTime > 0) {
    const elapsed = now - scoring.lastClickTime;
    if (elapsed > COMBO_BREAK_THRESHOLD) {
      // Combo break
      scoring.rapidClicks = 0;
      scoring.combo = 0;
      scoring.comboMultiplier = 1;
    }
  }

  // Increment rapid clicks
  scoring.rapidClicks++;
  scoring.comboMultiplier = getComboMultiplier(scoring.rapidClicks);
  scoring.combo = scoring.rapidClicks;
  if (scoring.combo > scoring.maxCombo) {
    scoring.maxCombo = scoring.combo;
  }

  // Calculate points for this reveal
  const cellsRevealed = result.cellsRevealed;
  scoring.casesRevealed += cellsRevealed;

  // Base score: 1 point per cell
  let points = cellsRevealed;

  // Zone bonuses
  if (cellsRevealed >= 25) {
    points += ZONE_5x5_BONUS;
  } else if (cellsRevealed >= 9) {
    points += ZONE_3x3_BONUS;
  }

  // Apply combo multiplier
  points *= scoring.comboMultiplier;

  scoring.score += points;
  scoring.lastClickTime = now;
}

export function formatScore(score: number): string {
  return score.toLocaleString("fr-FR");
}
