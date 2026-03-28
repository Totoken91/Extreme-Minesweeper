import { MinesweeperEngine, CellState } from "./minesweeper";

const NUMBER_COLORS: Record<number, string> = {
  1: "#3b8bff",
  2: "#00c853",
  3: "#ff3b3b",
  4: "#7b1fa2",
  5: "#ff6d00",
  6: "#00bcd4",
  7: "#333333",
  8: "#888888",
};

const CELL_HIDDEN = "#1a1a1a";
const CELL_HIDDEN_HOVER = "#252525";
const CELL_REVEALED = "#0d0d0d";
const CELL_MINE_EXPLODED = "#3a0a0a";
const CELL_BORDER = "#2a2a2a";
const FLAG_COLOR = "#ffd600";
const MINE_COLOR = "#ff3b3b";
const BG_COLOR = "#0a0a0a";

export interface RendererState {
  cellSize: number;
  offsetX: number;
  offsetY: number;
  hoverRow: number;
  hoverCol: number;
}

export function createRendererState(): RendererState {
  return {
    cellSize: 32,
    offsetX: 0,
    offsetY: 0,
    hoverRow: -1,
    hoverCol: -1,
  };
}

export function calculateLayout(
  canvas: HTMLCanvasElement,
  engine: MinesweeperEngine,
  renderer: RendererState,
  hudHeight: number
): void {
  const availableWidth = canvas.width;
  const availableHeight = canvas.height - hudHeight;

  const cellW = Math.floor(availableWidth / engine.cols);
  const cellH = Math.floor(availableHeight / engine.rows);
  renderer.cellSize = Math.max(16, Math.min(cellW, cellH, 48));

  const gridWidth = renderer.cellSize * engine.cols;
  const gridHeight = renderer.cellSize * engine.rows;
  renderer.offsetX = Math.floor((availableWidth - gridWidth) / 2);
  renderer.offsetY = hudHeight + Math.floor((availableHeight - gridHeight) / 2);
}

export function screenToGrid(
  x: number,
  y: number,
  renderer: RendererState,
  engine: MinesweeperEngine
): [number, number] | null {
  const col = Math.floor((x - renderer.offsetX) / renderer.cellSize);
  const row = Math.floor((y - renderer.offsetY) / renderer.cellSize);
  if (row < 0 || row >= engine.rows || col < 0 || col >= engine.cols) {
    return null;
  }
  return [row, col];
}

export function render(
  ctx: CanvasRenderingContext2D,
  engine: MinesweeperEngine,
  renderer: RendererState,
  timer: number,
  hudHeight: number
): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  drawHUD(ctx, engine, timer, hudHeight);
  drawGrid(ctx, engine, renderer);
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  engine: MinesweeperEngine,
  timer: number,
  hudHeight: number
): void {
  const w = ctx.canvas.width;

  // HUD background
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, w, hudHeight);
  ctx.strokeStyle = CELL_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, hudHeight);
  ctx.lineTo(w, hudHeight);
  ctx.stroke();

  const midY = hudHeight / 2;
  ctx.textBaseline = "middle";

  // Mines remaining
  const minesLeft = engine.totalMines - engine.flagCount;
  ctx.fillStyle = MINE_COLOR;
  ctx.font = "bold 20px 'Space Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`💣 ${minesLeft}`, 20, midY);

  // Timer
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  ctx.fillStyle = "#e8e8e8";
  ctx.font = "bold 24px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(timeStr, w / 2, midY);

  // State indicator
  let stateText = "";
  let stateColor = "#666";
  if (engine.state === "won") {
    stateText = "VICTORY";
    stateColor = "#00ff88";
  } else if (engine.state === "lost") {
    stateText = "DEFEAT";
    stateColor = MINE_COLOR;
  }
  if (stateText) {
    ctx.fillStyle = stateColor;
    ctx.font = "bold 18px 'Space Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(stateText, w - 20, midY);
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  engine: MinesweeperEngine,
  renderer: RendererState
): void {
  const { cellSize, offsetX, offsetY } = renderer;
  const { grid, rows, cols } = engine;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;
      const cell = grid[r][c];
      const isHover =
        r === renderer.hoverRow &&
        c === renderer.hoverCol &&
        !cell.revealed &&
        !cell.flagged &&
        (engine.state === "playing" || engine.state === "idle");

      drawCell(ctx, cell, x, y, cellSize, isHover, engine.state === "lost");
    }
  }
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: CellState,
  x: number,
  y: number,
  size: number,
  isHover: boolean,
  isGameOver: boolean
): void {
  const padding = 1;

  if (cell.revealed) {
    if (cell.mine) {
      ctx.fillStyle = CELL_MINE_EXPLODED;
      ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      // Draw mine
      ctx.fillStyle = MINE_COLOR;
      ctx.font = `${Math.floor(size * 0.55)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💣", x + size / 2, y + size / 2);
    } else {
      ctx.fillStyle = CELL_REVEALED;
      ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);

      if (cell.adjacentMines > 0) {
        ctx.fillStyle = NUMBER_COLORS[cell.adjacentMines] || "#ffffff";
        ctx.font = `bold ${Math.floor(size * 0.55)}px 'Space Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          String(cell.adjacentMines),
          x + size / 2,
          y + size / 2 + 1
        );
      }
    }
  } else if (cell.flagged) {
    ctx.fillStyle = CELL_HIDDEN;
    ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
    ctx.fillStyle = FLAG_COLOR;
    ctx.font = `${Math.floor(size * 0.5)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚑", x + size / 2, y + size / 2);

    // If game over and wrongly flagged, show X
    if (isGameOver && !cell.mine) {
      ctx.strokeStyle = MINE_COLOR;
      ctx.lineWidth = 2;
      const inset = size * 0.2;
      ctx.beginPath();
      ctx.moveTo(x + inset, y + inset);
      ctx.lineTo(x + size - inset, y + size - inset);
      ctx.moveTo(x + size - inset, y + inset);
      ctx.lineTo(x + inset, y + size - inset);
      ctx.stroke();
    }
  } else {
    // Hidden cell
    ctx.fillStyle = isHover ? CELL_HIDDEN_HOVER : CELL_HIDDEN;
    ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);

    // On game over, show unflagged mines
    if (isGameOver && cell.mine) {
      ctx.fillStyle = "#666";
      ctx.font = `${Math.floor(size * 0.5)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💣", x + size / 2, y + size / 2);
    }
  }

  // Border
  ctx.strokeStyle = CELL_BORDER;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
}
