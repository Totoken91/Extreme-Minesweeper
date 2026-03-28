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
  triggerShake,
  spawnPopup,
  RendererState,
} from "@/engine/renderer";
import { spawnExplosion } from "@/engine/particles";
import { sound } from "@/engine/audio";
import { createScoringState, onReveal, onMinePenalty, ScoringState } from "@/engine/scoring";
import {
  GameModeConfig,
  GameModeType,
  CLASSIC_DIFFICULTIES,
  SPEED_DEMON_CONFIG,
  SpeedDemonState,
  createSpeedDemonState,
  updateSpeedDemonTimer,
  onSpeedDemonReveal,
} from "@/engine/gamemode";

const HUD_HEIGHT = 56;
const FADE_DURATION = 300;

type Screen = "menu" | "game" | "result";

export default function MinesweeperGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MinesweeperEngine | null>(null);
  const rendererRef = useRef<RendererState>(createRendererState());
  const timerRef = useRef(0); // classic: seconds elapsed
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const transitionCallbackRef = useRef<(() => void) | null>(null);
  const scoringRef = useRef<ScoringState>(createScoringState());
  const speedDemonRef = useRef<SpeedDemonState | null>(null);
  const gameModeRef = useRef<GameModeConfig>(CLASSIC_DIFFICULTIES[0]);

  const [screen, setScreen] = useState<Screen>("menu");
  const [modeConfig, setModeConfig] = useState<GameModeConfig>(CLASSIC_DIFFICULTIES[0]);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [finalTime, setFinalTime] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [fadeVisible, setFadeVisible] = useState(true);
  const [menuTab, setMenuTab] = useState<GameModeType>("classic");

  // Initial fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => {
      setFadeOpacity(0);
      setTimeout(() => setFadeVisible(false), FADE_DURATION);
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const transitionTo = useCallback((callback: () => void) => {
    setFadeVisible(true);
    setFadeOpacity(1);
    transitionCallbackRef.current = callback;
  }, []);

  useEffect(() => {
    if (fadeOpacity === 1 && fadeVisible && transitionCallbackRef.current) {
      const cb = transitionCallbackRef.current;
      transitionCallbackRef.current = null;
      const t = setTimeout(() => {
        cb();
        requestAnimationFrame(() => {
          setFadeOpacity(0);
          setTimeout(() => setFadeVisible(false), FADE_DURATION);
        });
      }, FADE_DURATION);
      return () => clearTimeout(t);
    }
  }, [fadeOpacity, fadeVisible]);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startClassicTimer = useCallback(() => {
    stopTimer();
    timerRef.current = 0;
    timerIntervalRef.current = setInterval(() => {
      timerRef.current++;
    }, 1000);
  }, [stopTimer]);

  const initGame = useCallback(
    (config: GameModeConfig) => {
      setModeConfig(config);
      gameModeRef.current = config;
      engineRef.current = createEngine(config.rows, config.cols, config.mines);
      rendererRef.current = createRendererState();
      scoringRef.current = createScoringState();
      timerRef.current = 0;
      stopTimer();

      if (config.type === "speed_demon") {
        speedDemonRef.current = createSpeedDemonState(config);
      } else {
        speedDemonRef.current = null;
      }

      setGameState("idle");
      setScreen("game");
    },
    [stopTimer]
  );

  const startGame = useCallback(
    (config: GameModeConfig) => {
      transitionTo(() => initGame(config));
    },
    [transitionTo, initGame]
  );

  const restartGame = useCallback(() => {
    transitionTo(() => initGame(gameModeRef.current));
  }, [transitionTo, initGame]);

  const goToMenu = useCallback(() => {
    transitionTo(() => {
      stopTimer();
      setScreen("menu");
    });
  }, [stopTimer, transitionTo]);

  const handleGameEnd = useCallback(
    (state: GameState, mineRow?: number, mineCol?: number) => {
      stopTimer();
      setGameState(state);
      // Save time for results
      if (speedDemonRef.current) {
        setFinalTime(Math.round((gameModeRef.current.startTime - speedDemonRef.current.timeRemainingMs) / 1000));
      } else {
        setFinalTime(timerRef.current);
      }
      if (engineRef.current && state === "lost") {
        revealAll(engineRef.current);
        triggerShake(rendererRef.current);
        if (mineRow !== undefined && mineCol !== undefined) {
          const r = rendererRef.current;
          const cx = r.offsetX + mineCol * r.cellSize + r.cellSize / 2;
          const cy = r.offsetY + mineRow * r.cellSize + r.cellSize / 2;
          spawnExplosion(r.particles, cx, cy, 25);
        }
      }
      setTimeout(() => {
        transitionTo(() => setScreen("result"));
      }, 1200);
    },
    [stopTimer, transitionTo]
  );

  const handleCellAction = useCallback(
    (row: number, col: number, isFlag: boolean) => {
      if (!engineRef.current) return;
      sound.init();
      const engine = engineRef.current;
      if (engine.state === "won" || engine.state === "lost") return;

      const config = gameModeRef.current;
      const isSpeedDemon = config.type === "speed_demon";

      if (isFlag) {
        toggleFlag(engine, row, col);
        sound.playFlag();
      } else {
        const wasIdle = engine.state === "idle";
        const result = reveal(engine, row, col);
        let postState = engine.state as GameState;

        // Feed scoring
        onReveal(scoringRef.current, result);

        // Speed Demon: handle mine survival + time bonuses
        if (isSpeedDemon && speedDemonRef.current) {
          onSpeedDemonReveal(speedDemonRef.current, config, result.cellsRevealed, result.hitMine);

          if (result.hitMine && config.surviveOnMine) {
            // Don't die - override engine state back to playing
            engine.state = "playing";
            postState = "playing";
            // Still show explosion effects
            sound.playExplosion();
            triggerShake(rendererRef.current, 6, 200);
            const r = rendererRef.current;
            const cx = r.offsetX + col * r.cellSize + r.cellSize / 2;
            const cy = r.offsetY + row * r.cellSize + r.cellSize / 2;
            spawnExplosion(r.particles, cx, cy, 15);
            spawnPopup(r, cx, cy - r.cellSize, "-20s", "#ff3b3b", 1000);
            // Score penalty: lose 20% of current score
            const lost = onMinePenalty(scoringRef.current);
            if (lost > 0) {
              spawnPopup(r, cx, cy - r.cellSize * 2, `-${lost} pts`, "#ff6d00", 1000);
            }
          }

          // Check if time ran out
          if (speedDemonRef.current.timeRemainingMs <= 0) {
            engine.state = "lost";
            postState = "lost";
          }
        }

        if (wasIdle && (postState === "playing")) {
          if (isSpeedDemon) {
            // Speed Demon uses RAF-based timer, no setInterval needed
            // Timer starts ticking in the render loop
          } else {
            startClassicTimer();
          }
        }

        if (postState === "won") {
          sound.playVictory();
          handleGameEnd(postState, row, col);
        } else if (postState === "lost") {
          if (!isSpeedDemon || !result.hitMine) {
            // Only play game over if not a survived mine hit
            sound.playExplosion();
            sound.playGameOver();
          }
          handleGameEnd(postState, row, col);
        } else if (result.cellsRevealed > 0) {
          sound.playReveal();
          // Score popup
          const r = rendererRef.current;
          const cx = r.offsetX + col * r.cellSize + r.cellSize / 2;
          const cy = r.offsetY + row * r.cellSize;
          const scoreDelta = result.cellsRevealed * scoringRef.current.comboMultiplier;
          let popupText = `+${scoreDelta}`;
          if (scoringRef.current.comboMultiplier > 1) {
            popupText += ` x${scoringRef.current.comboMultiplier}`;
          }
          if (result.cellsRevealed >= 25) {
            popupText += " ZONE!";
            spawnPopup(r, cx, cy, popupText, "#00ff88", 1200);
          } else if (result.cellsRevealed >= 9) {
            popupText += " ZONE";
            spawnPopup(r, cx, cy, popupText, "#3b8bff", 1000);
          } else if (scoreDelta > 5) {
            spawnPopup(r, cx, cy, popupText, "#ffd600");
          }
          // Speed Demon: show time bonus popup for big reveals
          if (isSpeedDemon && result.cellsRevealed >= 5) {
            const timeBonusStr = `+${(result.cellsRevealed * 0.5).toFixed(1)}s`;
            spawnPopup(r, cx, cy - 20, timeBonusStr, "#00ff88", 600);
          }
        }
      }
      setGameState(engine.state);
    },
    [startClassicTimer, handleGameEnd]
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

    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      // Update Speed Demon timer
      if (
        speedDemonRef.current &&
        engineRef.current?.state === "playing"
      ) {
        updateSpeedDemonTimer(speedDemonRef.current, dt);
        if (speedDemonRef.current.timeRemainingMs <= 0) {
          // Time's up!
          if (engineRef.current) {
            engineRef.current.state = "lost";
            setGameState("lost");
            sound.playGameOver();
            handleGameEnd("lost");
          }
        }
      }

      if (engineRef.current) {
        ctx.save();
        ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

        // Pass timer value depending on mode
        const timerVal = speedDemonRef.current
          ? speedDemonRef.current.timeRemainingMs
          : timerRef.current;

        render(
          ctx,
          engineRef.current,
          rendererRef.current,
          timerVal,
          HUD_HEIGHT,
          scoringRef.current,
          gameModeRef.current,
          speedDemonRef.current
        );
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [screen, handleGameEnd]);

  // Mouse events
  useEffect(() => {
    if (screen !== "game") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!engineRef.current) return;
      const pos = screenToGrid(e.clientX, e.clientY, rendererRef.current, engineRef.current);
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
      const pos = screenToGrid(e.clientX, e.clientY, rendererRef.current, engineRef.current);
      if (pos) handleCellAction(pos[0], pos[1], false);
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (!engineRef.current) return;
      const pos = screenToGrid(e.clientX, e.clientY, rendererRef.current, engineRef.current);
      if (pos) handleCellAction(pos[0], pos[1], true);
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

      const pos = screenToGrid(touch.clientX, touch.clientY, rendererRef.current, engineRef.current);
      if (pos) {
        rendererRef.current.hoverRow = pos[0];
        rendererRef.current.hoverCol = pos[1];
        longPressTimerRef.current = setTimeout(() => {
          handleCellAction(pos[0], pos[1], true);
          touchStartRef.current = null;
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
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const pos = screenToGrid(touch.clientX, touch.clientY, rendererRef.current, engineRef.current);
        if (pos) handleCellAction(pos[0], pos[1], false);
      }
      touchStartRef.current = null;
    };

    const onTouchMove = () => {
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

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // Fade overlay
  const fadeOverlay = fadeVisible ? (
    <div
      className="fixed inset-0 z-50 bg-[#0a0a0a] pointer-events-none"
      style={{
        opacity: fadeOpacity,
        transition: `opacity ${FADE_DURATION}ms ease-in-out`,
      }}
    />
  ) : null;

  // --- MENU SCREEN ---
  if (screen === "menu") {
    return (
      <>
        {fadeOverlay}
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-[#e8e8e8] select-none">
          <div className="border-2 border-[#ff3b3b] p-8 md:p-12 max-w-lg w-full mx-4 text-center bg-[#111]">
            <div className="text-[10px] tracking-[4px] text-[#ff3b3b] mb-6 uppercase font-mono">
              Minesweeper Xtreme
            </div>
            <h1
              className="text-5xl md:text-7xl font-bold tracking-wider leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              MINESWEEPER
              <span className="block text-2xl md:text-3xl tracking-[12px] text-[#ff3b3b] mt-2">
                XTREME
              </span>
            </h1>

            {/* Mode tabs */}
            <div className="flex gap-0 mt-8 border border-[#2a2a2a]">
              <button
                onClick={() => setMenuTab("classic")}
                className={`flex-1 py-2 font-mono text-xs tracking-wider transition-colors cursor-pointer ${
                  menuTab === "classic"
                    ? "bg-[#1a1a1a] text-[#e8e8e8] border-b-2 border-b-[#e8e8e8]"
                    : "bg-[#111] text-[#666] hover:text-[#999]"
                }`}
              >
                CLASSIQUE
              </button>
              <button
                onClick={() => setMenuTab("speed_demon")}
                className={`flex-1 py-2 font-mono text-xs tracking-wider transition-colors cursor-pointer ${
                  menuTab === "speed_demon"
                    ? "bg-[#1a1a1a] text-[#ff3b3b] border-b-2 border-b-[#ff3b3b]"
                    : "bg-[#111] text-[#666] hover:text-[#999]"
                }`}
              >
                SPEED DEMON
              </button>
            </div>

            {/* Mode content */}
            <div className="flex flex-col gap-3 mt-6">
              {menuTab === "classic" ? (
                <>
                  <p className="text-[#666] text-xs font-mono mb-2">
                    Demineur classique. Revele toutes les cases sans toucher de mine.
                  </p>
                  {CLASSIC_DIFFICULTIES.map((config) => (
                    <button
                      key={config.name}
                      onClick={() => startGame(config)}
                      className="border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#e8e8e8] hover:bg-[#1f1f1f] text-[#e8e8e8] py-3 px-6 font-mono text-sm tracking-wider transition-colors cursor-pointer"
                    >
                      {config.name.toUpperCase()}
                      <span className="text-[#666] ml-3">
                        {config.cols}x{config.rows} — {config.mines} mines
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <p className="text-[#666] text-xs font-mono mb-2">
                    60 secondes. +0.5s/case (max +3s/clic). Mine = -20s et -20% score.
                    <br />
                    Score max avant que le timer atteigne zero.
                  </p>
                  <button
                    onClick={() => startGame(SPEED_DEMON_CONFIG)}
                    className="border border-[#ff3b3b] bg-[#1f1111] hover:bg-[#2a1111] text-[#ff3b3b] py-4 px-6 font-mono text-sm tracking-wider transition-colors cursor-pointer"
                  >
                    <span className="text-lg">⚡</span> LANCER SPEED DEMON
                    <span className="text-[#666] ml-3 text-xs">
                      30x30 — 200 mines — 60s
                    </span>
                  </button>
                </>
              )}
            </div>

            <div className="text-[10px] text-[#444] mt-6 font-mono tracking-wider">
              CLIC GAUCHE : REVELER &nbsp;|&nbsp; CLIC DROIT : DRAPEAU
              <br />
              MOBILE : TAP : REVELER &nbsp;|&nbsp; LONG PRESS : DRAPEAU
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- RESULT SCREEN ---
  if (screen === "result") {
    const won = gameState === "won";
    const isSpeedDemon = modeConfig.type === "speed_demon";
    const scoring = scoringRef.current;
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;

    return (
      <>
        {fadeOverlay}
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-[#e8e8e8] select-none">
          <div className="border-2 border-[#2a2a2a] p-8 md:p-12 max-w-lg w-full mx-4 text-center bg-[#111]">
            {isSpeedDemon && (
              <div className="text-[10px] tracking-[4px] text-[#ff3b3b] mb-4 uppercase font-mono">
                ⚡ Speed Demon
              </div>
            )}
            <h2
              className={`text-5xl md:text-7xl font-bold tracking-wider ${
                won ? "text-[#00ff88]" : "text-[#ff3b3b]"
              }`}
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {won ? "VICTOIRE" : isSpeedDemon ? "TIME'S UP" : "DEFAITE"}
            </h2>

            {/* Score prominently */}
            <div className="mt-6 mb-4">
              <div className="text-[#666] text-xs font-mono tracking-wider">SCORE</div>
              <div
                className="text-4xl md:text-5xl text-[#ffd600] font-bold"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {scoring.score.toLocaleString("fr-FR")}
              </div>
            </div>

            <div className="mt-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
                <span className="text-[#666]">Mode</span>
                <span>{modeConfig.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
                <span className="text-[#666]">Grille</span>
                <span>{modeConfig.cols}x{modeConfig.rows}</span>
              </div>
              <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
                <span className="text-[#666]">Cases revelees</span>
                <span>{scoring.casesRevealed}</span>
              </div>
              <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
                <span className="text-[#666]">Meilleur combo</span>
                <span className="text-[#ff6d00]">x{scoring.maxCombo > 0 ? Math.min(5, scoring.maxCombo >= 20 ? 5 : scoring.maxCombo >= 10 ? 3 : scoring.maxCombo >= 5 ? 2 : 1) : 1}</span>
              </div>
              {isSpeedDemon && speedDemonRef.current && (
                <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
                  <span className="text-[#666]">Mines touchees</span>
                  <span className="text-[#ff3b3b]">{speedDemonRef.current.minesHit}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-[#2a2a2a] pb-2">
                <span className="text-[#666]">Temps</span>
                <span>
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
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
                onClick={goToMenu}
                className="border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#666] text-[#666] py-3 px-6 font-mono text-sm tracking-wider transition-colors cursor-pointer"
              >
                MENU
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- GAME SCREEN ---
  return (
    <div className="fixed inset-0 bg-[#0a0a0a]">
      {fadeOverlay}
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ touchAction: "none" }}
      />
      <button
        onClick={restartGame}
        className="fixed top-3 right-3 z-10 border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#ff3b3b] text-[#666] hover:text-[#ff3b3b] py-1.5 px-3 font-mono text-xs tracking-wider transition-colors cursor-pointer"
      >
        RESTART
      </button>
      <button
        onClick={goToMenu}
        className="fixed top-3 left-3 z-10 border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#666] text-[#666] hover:text-[#e8e8e8] py-1.5 px-3 font-mono text-xs tracking-wider transition-colors cursor-pointer"
      >
        ← MENU
      </button>
    </div>
  );
}
