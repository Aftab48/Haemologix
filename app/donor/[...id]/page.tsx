"use client";

import { useState, useEffect } from "react";
import DonorWebDashboard from "../DonorWeb";
import DonorMobileDashboard from "../DonorMobile";

export default function DonorDashboard() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window !== "undefined") {
      const checkScreenSize = () => {
        // Use lg breakpoint (1024px) - below is mobile, above is tablet/laptop
        setIsMobile(window.innerWidth < 1024);
      };

      // Check on mount
      checkScreenSize();

      // Add event listener for window resize
      window.addEventListener("resize", checkScreenSize);

      // Cleanup
      return () => window.removeEventListener("resize", checkScreenSize);
    }
  }, []);

  // Render appropriate component based on screen size
  return isMobile ? <DonorMobileDashboard /> : <DonorWebDashboard />;
}
