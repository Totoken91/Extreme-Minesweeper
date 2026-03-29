"use client";

import { motion } from "framer-motion";

interface GlitchTextProps {
  text: string;
  className?: string;
  animate?: boolean;
  delay?: number;
}

const letterVariants = {
  hidden: { opacity: 0, y: 30, rotateX: -90 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      delay: i * 0.04,
      type: "spring" as const,
      damping: 12,
      stiffness: 200,
    },
  }),
};

export default function GlitchText({ text, className = "", animate = false, delay = 0 }: GlitchTextProps) {
  if (animate) {
    return (
      <motion.div
        className={`glitch-text ${className}`}
        data-text={text}
        initial="hidden"
        animate="visible"
        transition={{ delayChildren: delay }}
      >
        {text.split("").map((char, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={letterVariants}
            style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : undefined }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>
    );
  }

  return (
    <div className={`glitch-text ${className}`} data-text={text}>
      {text}
    </div>
  );
}
