'use client';

import { ReactNode } from 'react';

interface GradientBackgroundProps {
  children: ReactNode;
  className?: string;
}

export default function GradientBackground({ children, className = '' }: GradientBackgroundProps) {
  return (
    <div 
      className={`min-h-screen relative ${className}`}
      style={{
        background: `
          radial-gradient(at 15% 20%, #9B2226 0px, transparent 50%),
          radial-gradient(at 85% 10%, #94D2BD 0px, transparent 45%),
          radial-gradient(at 60% 80%, #E9D8A6 0px, transparent 50%),
          radial-gradient(at 30% 60%, #9B2226 0px, transparent 40%),
          radial-gradient(at 75% 45%, #94D2BD 0px, transparent 35%),
          radial-gradient(at 10% 85%, #E9D8A6 0px, transparent 45%),
          radial-gradient(at 90% 75%, #9B2226 0px, transparent 38%),
          radial-gradient(at 45% 25%, #94D2BD 0px, transparent 42%),
          linear-gradient(135deg, #E9D8A6 0%, #94D2BD 50%, #9B2226 100%)
        `
      }}
    >
      {/* Noise Overlay */}
      <div 
        className="fixed inset-0 opacity-60 mix-blend-overlay pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

