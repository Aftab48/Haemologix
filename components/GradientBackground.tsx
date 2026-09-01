"use client";

import { ReactNode } from "react";

interface GradientBackgroundProps {
  children: ReactNode;
  className?: string;
}

export default function GradientBackground({ children, className = "" }: GradientBackgroundProps) {
  return (
    <div className={`product-surface min-h-screen relative ${className}`}>
      <div className="product-surface-grid" aria-hidden="true" />
      <div className="product-surface-signal" aria-hidden="true" />
      <div className="product-surface-orbit" aria-hidden="true" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

