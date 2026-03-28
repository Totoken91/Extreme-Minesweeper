"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  createEngine,
  reveal,
  toggleFlag,
  revealAll,
  MinesweeperEngine,
  GameState,
} from "@/engine/minesweeper";
import {
  createRendererState,
  calculateLayout,
  screenToGrid,
  render,
  RendererState,
} from "@/engine/renderer";

export type Difficulty = {
  name: string;
  rows: number;
  cols: number;
  mines: number;
};

const DIFFICULTIES: Difficulty[] = [
  { name: "Facile", rows: 9, cols: 9, mines: 10 },
  { name: "Moyen", rows: 16, cols: 16, mines: 40 },
  { name: "Difficile", rows: 16, cols: 30, mines: 99 },
];

const HUD_HEIGHT = 56;

export default function MinesweeperGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MinesweeperEngine | null>(null);
  const rendererRef = useRef<RendererState>(createRendererState());
  const timerRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [screen, setScreen] = useState<"menu" | "game" | "result">("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0]);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [finalTime, setFinalTime] = useState(0);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = 0;
    timerIntervalRef.current = setInterval(() => {
      timerRef.current++;
    }, 1000);
  }, [stopTimer]);

  const startGame = useCallback(
    (diff: Difficulty) => {
      setDifficulty(diff);
      engineRef.current = createEngine(diff.rows, diff.cols, diff.mines);
      rendererRef.current = createRendererState();
      timerRef.current = 0;
      stopTimer();
      setGameState("idle");
      setScreen("game");
    },
    [stopTimer]
  );

  const restartGame = useCallback(() => {
    startGame(difficulty);
  }, [startGame, difficulty]);

  const handleGameEnd = useCallback(
    (state: GameState) => {
      stopTimer();
      setGameState(state);
      setFinalTime(timerRef.current);
      if (engineRef.current && state === "lost") {
        revealAll(engineRef.current);
      }
      setTimeout(() => setScreen("result"), 1200);
    },
    [stopTimer]
  );

  const handleCellAction = useCallback(
    (row: number, col: number, isFlag: boolean) => {
      if (!engineRef.current) return;
      const engine = engineRef.current;
      if (engine.state === "won" || engine.state === "lost") return;

      if (isFlag) {
        toggleFlag(engine, row, col);
      } else {
        const wasIdle = engine.state === "idle";
        reveal(engine, row, col);
        // reveal() mutates engine.state; re-read to bypass TS narrowing
        const postState = engine.state as GameState;
        if (wasIdle && postState === "playing") {
          startTimer();
        }
        if (postState === "won" || postState === "lost") {
          handleGameEnd(postState);
        }
      }
      setGameState(engine.state);
    },
    [startTimer, handleGameEnd]
  );

  // Canvas rendering loop
  useEffect(() => {
    if (screen !== "game") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      // recalc with CSS dimensions
      if (engineRef.current) {
        calculateLayout(
          { width: window.innerWidth, height: window.innerHeight } as HTMLCanvasElement,
          engineRef.current,
          rendererRef.current,
          HUD_HEIGHT
        );
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      if (engineRef.current) {
        ctx.save();
        ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
        render(ctx, engineRef.current, rendererRef.current, timerRef.current, HUD_HEIGHT);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [screen]);

  // Mouse events
  useEffect(() => {
    if (screen !== "game") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!engineRef.current) return;
      const pos = screenToGrid(
        e.clientX,
        e.clientY,
        rendererRef.current,
        engineRef.current
      );
      if (pos) {
        rendererRef.current.hoverRow = pos[0];
        rendererRef.current.hoverCol = pos[1];
      } else {
        rendererRef.current.hoverRow = -1;
        rendererRef.current.hoverCol = -1;
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!engineRef.current) return;
      const pos = screenToGrid(
        e.clientX,
        e.clientY,
        rendererRef.current,
        engineRef.current
      );
      if (pos) {
        handleCellAction(pos[0], pos[1], false);
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (!engineRef.current) return;
      const pos = screenToGrid(
        e.clientX,
        e.clientY,
        rendererRef.current,
        engineRef.current
      );
      if (pos) {
        handleCellAction(pos[0], pos[1], true);
      }
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("contextmenu", onContextMenu);

    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [screen, handleCellAction]);

  // Touch events (mobile)
  useEffect(() => {
    if (screen !== "game") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (!engineRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };

      const pos = screenToGrid(
        touch.clientX,
        touch.clientY,
        rendererRef.current,
        engineRef.current
      );

      if (pos) {
        rendererRef.current.hoverRow = pos[0];
        rendererRef.current.hoverCol = pos[1];

        // Long press for flag
        longPressTimerRef.current = setTimeout(() => {
          handleCellAction(pos[0], pos[1], true);
          touchStartRef.current = null; // prevent tap after long press
        }, 400);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      rendererRef.current.hoverRow = -1;
      rendererRef.current.hoverCol = -1;

      if (!touchStartRef.current || !engineRef.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;

      // Only trigger tap if finger didn't move much
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const pos = screenToGrid(
          touch.clientX,
          touch.clientY,
          rendererRef.current,
          engineRef.current
        );
        if (pos) {
          handleCellAction(pos[0], pos[1], false);
        }
      }
      touchStartRef.current = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      // Cancel long press on move
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [screen, handleCellAction]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // --- MENU SCREEN ---
  if (screen === "menu") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-[#e8e8e8] select-none">
        <div className="border-2 border-[#ff3b3b] p-12 max-w-lg w-full mx-4 text-center bg-[#111]">
          <div className="text-[10px] tracking-[4px] text-[#ff3b3b] mb-6 uppercase font-mono">
            Phase 0 — Fondations
          </div>
          <h1
            className="text-6xl md:text-8xl font-bold tracking-wider leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            MINESWEEPER
            <span className="block text-2xl md:text-3xl tracking-[12px] text-[#ff3b3b] mt-2">
              XTREME
            </span>
          </h1>
          <p className="text-[#666] text-sm mt-6 font-mono">
            Choisis ta difficulte
          </p>
          <div className="flex flex-col gap-3 mt-8">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.name}
                onClick={() => startGame(diff)}
                className="border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#ff3b3b] hover:bg-[#1f1111] text-[#e8e8e8] py-3 px-6 font-mono text-sm tracking-wider transition-colors cursor-pointer"
              >
                {diff.name.toUpperCase()}
                <span className="text-[#666] ml-3">
                  {diff.cols}x{diff.rows} — {diff.mines} mines
                </span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-[#444] mt-8 font-mono tracking-wider">
            CLIC GAUCHE : REVELER &nbsp;|&nbsp; CLIC DROIT : DRAPEAU
            <br />
            MOBILE : TAP : REVELER &nbsp;|&nbsp; LONG PRESS : DRAPEAU
          </div>
        </div>
      </div>
    );
  }

  // --- RESULT SCREEN ---
  if (screen === "result") {
    const won = gameState === "won";
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-[#e8e8e8] select-none">
        <div className="border-2 border-[#2a2a2a] p-12 max-w-lg w-full mx-4 text-center bg-[#111]">
          <h2
            className={`text-5xl md:text-7xl font-bold tracking-wider ${
              won ? "text-[#00ff88]" : "text-[#ff3b3b]"
            }`}
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {won ? "VICTOIRE" : "DEFAITE"}
          </h2>
          <div className="mt-8 space-y-4 font-mono text-sm">
            <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
              <span className="text-[#666]">Difficulte</span>
              <span>{difficulty.name}</span>
            </div>
            <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
              <span className="text-[#666]">Grille</span>
              <span>
                {difficulty.cols}x{difficulty.rows}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
              <span className="text-[#666]">Mines</span>
              <span>{difficulty.mines}</span>
            </div>
            <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
              <span className="text-[#666]">Temps</span>
              <span>
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 mt-8">
            <button
              onClick={restartGame}
              className="border border-[#ff3b3b] bg-[#1f1111] hover:bg-[#2a1111] text-[#ff3b3b] py-3 px-6 font-mono text-sm tracking-wider transition-colors cursor-pointer"
            >
              REJOUER
            </button>
            <button
              onClick={() => setScreen("menu")}
              className="border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#666] text-[#666] py-3 px-6 font-mono text-sm tracking-wider transition-colors cursor-pointer"
            >
              MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME SCREEN ---
  return (
    <div className="fixed inset-0 bg-[#0a0a0a]">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ touchAction: "none" }}
      />
      {/* Restart button overlay */}
      <button
        onClick={restartGame}
        className="fixed top-3 right-3 z-10 border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#ff3b3b] text-[#666] hover:text-[#ff3b3b] py-1.5 px-3 font-mono text-xs tracking-wider transition-colors cursor-pointer"
      >
        RESTART
      </button>
      <button
        onClick={() => {
          stopTimer();
          setScreen("menu");
        }}
        className="fixed top-3 left-3 z-10 border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#666] text-[#666] hover:text-[#e8e8e8] py-1.5 px-3 font-mono text-xs tracking-wider transition-colors cursor-pointer"
      >
        ← MENU
      </button>
    </div>
  );
}
