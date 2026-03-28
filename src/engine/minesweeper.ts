export type CellState = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
  revealedAt: number; // performance.now() timestamp, 0 = not yet revealed
};

export type GameState = "idle" | "playing" | "won" | "lost";

export type Grid = CellState[][];

export interface MinesweeperEngine {
  grid: Grid;
  rows: number;
  cols: number;
  totalMines: number;
  flagCount: number;
  revealedCount: number;
  state: GameState;
}

export function createEngine(
  rows: number,
  cols: number,
  totalMines: number
): MinesweeperEngine {
  const grid: Grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacentMines: 0,
      revealedAt: 0,
    }))
  );

  return {
    grid,
    rows,
    cols,
    totalMines,
    flagCount: 0,
    revealedCount: 0,
    state: "idle",
  };
}

function getNeighbors(
  row: number,
  col: number,
  rows: number,
  cols: number
): [number, number][] {
  const neighbors: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push([nr, nc]);
      }
    }
  }
  return neighbors;
}

function placeMines(
  engine: MinesweeperEngine,
  safeRow: number,
  safeCol: number
): void {
  const { grid, rows, cols, totalMines } = engine;
  const excluded = new Set<string>();

  // Exclude the first clicked cell and its neighbors
  excluded.add(`${safeRow},${safeCol}`);
  for (const [nr, nc] of getNeighbors(safeRow, safeCol, rows, cols)) {
    excluded.add(`${nr},${nc}`);
  }

  let placed = 0;
  while (placed < totalMines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (excluded.has(`${r},${c}`) || grid[r][c].mine) continue;
    grid[r][c].mine = true;
    placed++;
  }

  // Calculate adjacent mine counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) continue;
      let count = 0;
      for (const [nr, nc] of getNeighbors(r, c, rows, cols)) {
        if (grid[nr][nc].mine) count++;
      }
      grid[r][c].adjacentMines = count;
    }
  }
}

function floodFill(engine: MinesweeperEngine, row: number, col: number): number {
  const { grid, rows, cols } = engine;
  const now = performance.now();
  // BFS instead of stack for better cascade ordering (closest cells first)
  const queue: [number, number][] = [[row, col]];
  let order = 0;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged || cell.mine) continue;

    cell.revealed = true;
    cell.revealedAt = now + order * 25; // 25ms stagger for cascade effect
    engine.revealedCount++;
    order++;

    if (cell.adjacentMines === 0) {
      for (const [nr, nc] of getNeighbors(r, c, rows, cols)) {
        if (!grid[nr][nc].revealed) {
          queue.push([nr, nc]);
        }
      }
    }
  }

  return order; // number of cells revealed
}

export interface RevealResult {
  cellsRevealed: number;
  hitMine: boolean;
}

export function reveal(
  engine: MinesweeperEngine,
  row: number,
  col: number
): RevealResult {
  if (engine.state === "won" || engine.state === "lost") return { cellsRevealed: 0, hitMine: false };

  const cell = engine.grid[row][col];
  if (cell.revealed || cell.flagged) return { cellsRevealed: 0, hitMine: false };

  // First click: place mines
  if (engine.state === "idle") {
    placeMines(engine, row, col);
    engine.state = "playing";
  }

  if (cell.mine) {
    cell.revealed = true;
    cell.revealedAt = performance.now();
    engine.state = "lost";
    return { cellsRevealed: 0, hitMine: true };
  }

  const count = floodFill(engine, row, col);

  // Check win: all non-mine cells revealed
  const totalSafe = engine.rows * engine.cols - engine.totalMines;
  if (engine.revealedCount >= totalSafe) {
    engine.state = "won";
  }

  return { cellsRevealed: count, hitMine: false };
}

export function toggleFlag(
  engine: MinesweeperEngine,
  row: number,
  col: number
): MinesweeperEngine {
  if (engine.state === "won" || engine.state === "lost") return engine;
  if (engine.state === "idle") return engine;

  const cell = engine.grid[row][col];
  if (cell.revealed) return engine;

  if (cell.flagged) {
    cell.flagged = false;
    engine.flagCount--;
  } else {
    cell.flagged = true;
    engine.flagCount++;
  }

  return engine;
}

export function revealAll(engine: MinesweeperEngine): void {
  for (let r = 0; r < engine.rows; r++) {
    for (let c = 0; c < engine.cols; c++) {
      engine.grid[r][c].revealed = true;
    }
  }
}
