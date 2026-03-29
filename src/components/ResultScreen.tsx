"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { GameModeConfig } from "@/engine/gamemode";
import { ScoringState } from "@/engine/scoring";
import Scene3D from "./Scene3D";
import GlitchText from "./GlitchText";

interface ResultScreenProps {
  won: boolean;
  modeConfig: GameModeConfig;
  scoring: ScoringState;
  finalTime: number;
  minesHit: number;
  onRestart: () => void;
  onMenu: () => void;
}

function useCountUp(target: number, duration: number = 1500): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.floor(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

const statVariants = {
  hidden: { x: -30, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, damping: 20, stiffness: 150 },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.8 },
  },
} as const;

export default function ResultScreen({
  won,
  modeConfig,
  scoring,
  finalTime,
  minesHit,
  onRestart,
  onMenu,
}: ResultScreenProps) {
  const animatedScore = useCountUp(scoring.score, 2000);
  const isSpeedDemon = modeConfig.type === "speed_demon";
  const minutes = Math.floor(finalTime / 60);
  const seconds = finalTime % 60;

  const title = won ? "VICTOIRE" : isSpeedDemon ? "TIME'S UP" : "DEFAITE";
  const titleColor = won ? "#00ff88" : "#ff3b3b";

  const maxComboMultiplier = scoring.maxCombo >= 20 ? 5 : scoring.maxCombo >= 10 ? 3 : scoring.maxCombo >= 5 ? 2 : 1;

  const stats = [
    { label: "Mode", value: modeConfig.name },
    { label: "Grille", value: `${modeConfig.cols}x${modeConfig.rows}` },
    { label: "Cases revelees", value: String(scoring.casesRevealed) },
    { label: "Meilleur combo", value: `x${maxComboMultiplier}`, color: "#ff6d00" },
    ...(isSpeedDemon ? [{ label: "Mines touchees", value: String(minesHit), color: "#ff3b3b" }] : []),
    { label: "Temps", value: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` },
  ];

  return (
    <div className="fixed inset-0">
      {/* CRT effects */}
      <div className="crt-noise" />
      <div className="crt-vignette" />
      <div className="crt-scanlines" />

      {/* 3D Background */}
      <Suspense fallback={null}>
        <Scene3D />
      </Suspense>

      {/* Result content */}
      <div className="relative z-20 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 80 }}
          className="relative border-2 p-8 md:p-12 max-w-lg w-full text-center select-none"
          style={{
            borderColor: titleColor,
            background: "rgba(10, 10, 10, 0.88)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Mode badge */}
          {isSpeedDemon && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[10px] tracking-[4px] text-[#ff3b3b] mb-4 uppercase font-mono"
            >
              ⚡ SPEED DEMON
            </motion.div>
          )}

          {/* Title with glitch */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 10, stiffness: 100 }}
          >
            <GlitchText
              text={title}
              animate
              className="text-5xl md:text-7xl font-bold tracking-wider"

            />
          </motion.div>

          {/* Animated score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 mb-4"
          >
            <div className="text-[#555] text-[10px] font-mono tracking-[4px]">SCORE</div>
            <div
              className="text-5xl md:text-6xl font-bold"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#ffd600" }}
            >
              {animatedScore.toLocaleString("fr-FR")}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-4 space-y-2 font-mono text-sm"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={statVariants}
                className="flex justify-between border-b border-[#1a1a1a] pb-2"
              >
                <span className="text-[#555]">{stat.label}</span>
                <span style={{ color: stat.color || "#e8e8e8" }}>{stat.value}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="flex flex-col gap-3 mt-8"
          >
            <motion.button
              whileHover={{
                scale: 1.03,
                boxShadow: `0 0 20px ${titleColor}40`,
              }}
              whileTap={{ scale: 0.97 }}
              onClick={onRestart}
              className="border py-3 px-6 font-mono text-sm tracking-wider cursor-pointer"
              style={{
                borderColor: titleColor,
                color: titleColor,
                background: won ? "rgba(0,255,136,0.05)" : "rgba(255,59,59,0.05)",
              }}
            >
              REJOUER
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, borderColor: "#666" }}
              whileTap={{ scale: 0.97 }}
              onClick={onMenu}
              className="border border-[#2a2a2a] bg-transparent text-[#666] py-3 px-6 font-mono text-sm tracking-wider cursor-pointer"
            >
              MENU
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
