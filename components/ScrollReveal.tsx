"use client";

import { motion } from "framer-motion";
import React from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  threshold?: number;
  staggerChildren?: number;
}

const ScrollReveal = ({
  children,
  className = "",
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 30,
  threshold = 0.1, // 10% of element visible
  staggerChildren = 0,
}: ScrollRevealProps) => {
  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: distance };
      case "down":
        return { y: -distance };
      case "left":
        return { x: distance };
      case "right":
        return { x: -distance };
      default:
        return { y: distance };
    }
  };

  const variants = {
    hidden: { 
      opacity: 0, 
      ...getInitialPosition() 
    },
    visible: { 
      opacity: 1, 
      x: 0, 
      y: 0,
      transition: {
        duration: duration,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        delay: delay,
        staggerChildren: staggerChildren
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
