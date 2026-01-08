'use client';

import { useEffect, useRef, useState } from 'react';
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { gsap } from 'gsap';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate brief loading stage
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // small delay for perceived smoothness

    return () => clearTimeout(timer);
  }, []);

  // GSAP animation after loading
  useEffect(() => {
    if (!isLoading && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
        }
      );
    }
  }, [isLoading]);

  // 🔑 GLOBAL PAGE LOADING STAGE
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div ref={containerRef} className="min-h-screen">
      {children}
    </div>
  );
}
