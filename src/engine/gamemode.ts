export type GameModeType = "classic" | "speed_demon";

export interface GameModeConfig {
  type: GameModeType;
  name: string;
  rows: number;
  cols: number;
  mines: number;
  // Speed Demon specific
  countdown: boolean; // true = timer counts down, false = counts up
  startTime: number; // starting time in ms (60000 for Speed Demon)
  timePerSafeCell: number; // ms added per safe cell revealed (+500)
  timePenaltyMine: number; // ms removed on mine hit (-15000)
  surviveOnMine: boolean; // true = don't die on mine, just lose time
  timerAcceleration: number; // every N cells, timer ticks faster (100 for Speed Demon)
}

export const CLASSIC_DIFFICULTIES: GameModeConfig[] = [
  { type: "classic", name: "Facile", rows: 9, cols: 9, mines: 10, countdown: false, startTime: 0, timePerSafeCell: 0, timePenaltyMine: 0, surviveOnMine: false, timerAcceleration: 0 },
  { type: "classic", name: "Moyen", rows: 16, cols: 16, mines: 40, countdown: false, startTime: 0, timePerSafeCell: 0, timePenaltyMine: 0, surviveOnMine: false, timerAcceleration: 0 },
  { type: "classic", name: "Difficile", rows: 16, cols: 30, mines: 99, countdown: false, startTime: 0, timePerSafeCell: 0, timePenaltyMine: 0, surviveOnMine: false, timerAcceleration: 0 },
];

export const SPEED_DEMON_CONFIG: GameModeConfig = {
  type: "speed_demon",
  name: "Speed Demon",
  rows: 30,
  cols: 30,
  mines: 150, // ~16.7% density on 30x30
  countdown: true,
  startTime: 60000, // 60 seconds
  timePerSafeCell: 500, // +0.5s per safe cell
  timePenaltyMine: 15000, // -15s per mine
  surviveOnMine: true, // don't die, just lose time
  timerAcceleration: 100, // every 100 cells, timer ticks faster
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

  // Add time for safe cells
  state.timeRemainingMs += cellsRevealed * config.timePerSafeCell;

  // Check acceleration
  state.cellsForAcceleration += cellsRevealed;
  if (config.timerAcceleration > 0) {
    while (state.cellsForAcceleration >= config.timerAcceleration) {
      state.cellsForAcceleration -= config.timerAcceleration;
      state.timerSpeed += 0.15; // timer ticks 15% faster each milestone
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
