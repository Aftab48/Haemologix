"use client";

import { useState, useEffect } from "react";
import AdminWebDashboard from "./AdminWeb";
import AdminMobileDashboard from "./AdminMobile";

// Opt out of static generation for this page
export const dynamic = "force-dynamic";

export default function DemoAdminDashboard() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkScreenSize = () => {
        setIsMobile(window.innerWidth < 1024);
      };

      checkScreenSize();
      window.addEventListener("resize", checkScreenSize);

      return () => window.removeEventListener("resize", checkScreenSize);
    }
  }, []);

  return isMobile ? <AdminMobileDashboard /> : <AdminWebDashboard />;
}
