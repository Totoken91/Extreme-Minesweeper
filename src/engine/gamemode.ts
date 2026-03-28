export type GameModeType = "classic" | "speed_demon";

export interface GameModeConfig {
  type: GameModeType;
  name: string;
  rows: number;
  cols: number;
  mines: number;
  // Speed Demon specific
  countdown: boolean;
  startTime: number; // starting time in ms
  timePerSafeCell: number; // ms added per safe cell revealed
  maxTimeBonusPerClick: number; // max ms gained per single click (caps flood fill bonus)
  timePenaltyMine: number; // ms removed on mine hit
  surviveOnMine: boolean;
  timerAcceleration: number; // every N cells, timer ticks faster
}

export const CLASSIC_DIFFICULTIES: GameModeConfig[] = [
  { type: "classic", name: "Facile", rows: 9, cols: 9, mines: 10, countdown: false, startTime: 0, timePerSafeCell: 0, maxTimeBonusPerClick: 0, timePenaltyMine: 0, surviveOnMine: false, timerAcceleration: 0 },
  { type: "classic", name: "Moyen", rows: 16, cols: 16, mines: 40, countdown: false, startTime: 0, timePerSafeCell: 0, maxTimeBonusPerClick: 0, timePenaltyMine: 0, surviveOnMine: false, timerAcceleration: 0 },
  { type: "classic", name: "Difficile", rows: 16, cols: 30, mines: 99, countdown: false, startTime: 0, timePerSafeCell: 0, maxTimeBonusPerClick: 0, timePenaltyMine: 0, surviveOnMine: false, timerAcceleration: 0 },
];

export const SPEED_DEMON_CONFIG: GameModeConfig = {
  type: "speed_demon",
  name: "Speed Demon",
  rows: 30,
  cols: 30,
  mines: 200, // ~22% density — less empty space, harder to spam
  countdown: true,
  startTime: 60000, // 60 seconds
  timePerSafeCell: 500, // +0.5s per safe cell
  maxTimeBonusPerClick: 3000, // cap at +3s per click (flood fill capped)
  timePenaltyMine: 20000, // -20s per mine (was -15s)
  surviveOnMine: true,
  timerAcceleration: 100,
};

export interface SpeedDemonState {
  timeRemainingMs: number;
  timerSpeed: number; // multiplier (1.0 = normal, increases)
  cellsForAcceleration: number; // cells revealed since last acceleration
  minesHit: number;
}

export function createSpeedDemonState(config: GameModeConfig): SpeedDemonState {
  return {
    timeRemainingMs: config.startTime,
    timerSpeed: 1.0,
    cellsForAcceleration: 0,
    minesHit: 0,
  };
}

export function updateSpeedDemonTimer(state: SpeedDemonState, dtMs: number): void {
  state.timeRemainingMs -= dtMs * state.timerSpeed;
  if (state.timeRemainingMs < 0) state.timeRemainingMs = 0;
}

export function onSpeedDemonReveal(
  state: SpeedDemonState,
  config: GameModeConfig,
  cellsRevealed: number,
  hitMine: boolean
): void {
  if (hitMine) {
    state.timeRemainingMs -= config.timePenaltyMine;
    if (state.timeRemainingMs < 0) state.timeRemainingMs = 0;
    state.minesHit++;
    return;
  }

  // Add time for safe cells (capped per click)
  const rawBonus = cellsRevealed * config.timePerSafeCell;
  const cappedBonus = config.maxTimeBonusPerClick > 0
    ? Math.min(rawBonus, config.maxTimeBonusPerClick)
    : rawBonus;
  state.timeRemainingMs += cappedBonus;

  // Cap timer at startTime — can't stockpile beyond initial time
  if (state.timeRemainingMs > config.startTime) {
    state.timeRemainingMs = config.startTime;
  }

  // Check acceleration
  state.cellsForAcceleration += cellsRevealed;
  if (config.timerAcceleration > 0) {
    while (state.cellsForAcceleration >= config.timerAcceleration) {
      state.cellsForAcceleration -= config.timerAcceleration;
      state.timerSpeed += 0.15;
    }
  }
}

export function formatTimeMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatTimeMsDecimal(ms: number): string {
  const totalSeconds = Math.max(0, ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
}
