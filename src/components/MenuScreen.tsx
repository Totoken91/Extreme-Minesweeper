"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameModeConfig, GameModeType, CLASSIC_DIFFICULTIES, SPEED_DEMON_CONFIG } from "@/engine/gamemode";
import Scene3D from "./Scene3D";
import GlitchText from "./GlitchText";

interface MenuScreenProps {
  onStartGame: (config: GameModeConfig) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.6 },
  },
} as const;

const itemVariants = {
  hidden: { x: -30, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, damping: 20, stiffness: 150 },
  },
};

const buttonHover = {
  scale: 1.02,
  boxShadow: "0 0 15px rgba(255,59,59,0.3)",
  borderColor: "#ff3b3b",
  transition: { duration: 0.2 },
};

const buttonTap = { scale: 0.97 };

export default function MenuScreen({ onStartGame }: MenuScreenProps) {
  const [menuTab, setMenuTab] = useState<GameModeType>("classic");

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

      {/* Menu content */}
      <div className="relative z-20 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 80, delay: 0.2 }}
          className="relative border-2 border-[#ff3b3b] p-8 md:p-12 max-w-lg w-full text-center select-none"
          style={{
            background: "rgba(10, 10, 10, 0.85)",
            backdropFilter: "blur(12px)",
            animation: "border-pulse 3s ease-in-out infinite",
          }}
        >
          {/* Classified banner */}
          <div className="classified-banner">
            CLASSIFIED // MSX-2026 // SOLO OPERATIONS
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4"
          >
            <GlitchText
              text="MINESWEEPER"
              animate
              delay={0.3}
              className="text-5xl md:text-7xl font-bold tracking-wider leading-none"

            />
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, type: "spring", damping: 15 }}
            >
              <GlitchText
                text="XTREME"
                className="text-xl md:text-2xl tracking-[14px] text-[#ff3b3b] mt-2 font-bold"
              />
            </motion.div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.5 }}
            className="text-[11px] text-[#666] mt-4 font-mono tracking-wider"
          >
            LE DEMINEUR. REINVENTE.
          </motion.p>

          {/* Mode tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="flex gap-0 mt-8 border border-[#2a2a2a] relative"
          >
            <button
              onClick={() => setMenuTab("classic")}
              className={`relative flex-1 py-2.5 font-mono text-xs tracking-[3px] transition-colors cursor-pointer z-10 ${
                menuTab === "classic" ? "text-[#e8e8e8]" : "text-[#555] hover:text-[#888]"
              }`}
            >
              CLASSIQUE
            </button>
            <button
              onClick={() => setMenuTab("speed_demon")}
              className={`relative flex-1 py-2.5 font-mono text-xs tracking-[3px] transition-colors cursor-pointer z-10 ${
                menuTab === "speed_demon" ? "text-[#ff3b3b]" : "text-[#555] hover:text-[#888]"
              }`}
            >
              SPEED DEMON
            </button>
            {/* Animated tab indicator */}
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 h-[2px]"
              style={{
                left: menuTab === "classic" ? "0%" : "50%",
                width: "50%",
                background: menuTab === "classic" ? "#e8e8e8" : "#ff3b3b",
              }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            />
          </motion.div>

          {/* Mode content */}
          <AnimatePresence mode="wait">
            {menuTab === "classic" ? (
              <motion.div
                key="classic"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="mt-6"
              >
                <p className="text-[#555] text-[11px] font-mono mb-4 tracking-wider">
                  REVELE TOUTES LES CASES. EVITE LES MINES.
                </p>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-2"
                >
                  {CLASSIC_DIFFICULTIES.map((config) => (
                    <motion.button
                      key={config.name}
                      variants={itemVariants}
                      whileHover={buttonHover}
                      whileTap={buttonTap}
                      onClick={() => onStartGame(config)}
                      className="border border-[#2a2a2a] bg-[#0d0d0d]/80 text-[#e8e8e8] py-3 px-6 font-mono text-sm tracking-wider cursor-pointer text-left"
                    >
                      <span className="font-bold">{config.name.toUpperCase()}</span>
                      <span className="text-[#555] ml-3 text-xs">
                        {config.cols}x{config.rows} — {config.mines} mines
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="speed_demon"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="mt-6"
              >
                <p className="text-[#555] text-[11px] font-mono mb-4 tracking-wider leading-relaxed">
                  60 SECONDES. +0.5S/CASE (MAX +3S/CLIC).
                  <br />
                  MINE = -20S ET -20% SCORE.
                </p>
                <motion.button
                  whileHover={{
                    scale: 1.03,
                    boxShadow: "0 0 30px rgba(255,59,59,0.5), 0 0 60px rgba(255,59,59,0.2)",
                  }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onStartGame(SPEED_DEMON_CONFIG)}
                  className="w-full border border-[#ff3b3b] bg-[#1a0808]/80 text-[#ff3b3b] py-4 px-6 font-mono text-sm tracking-wider cursor-pointer pulse-glow"
                >
                  <span className="text-xl mr-2">⚡</span>
                  <span className="font-bold">LANCER SPEED DEMON</span>
                  <br />
                  <span className="text-[#664444] text-[10px] tracking-[2px]">
                    30x30 — 200 MINES — 60S
                  </span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="text-[9px] text-[#333] mt-8 font-mono tracking-[2px] leading-relaxed"
          >
            CLIC GAUCHE : REVELER &nbsp;|&nbsp; CLIC DROIT : DRAPEAU
            <br />
            MOBILE : TAP : REVELER &nbsp;|&nbsp; LONG PRESS : DRAPEAU
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
