"use client";

import { createContext, useContext } from "react";
import type { AnnounceMode } from "./types";

interface AnnouncerContextValue {
  announce: (message: string, mode?: AnnounceMode) => void;
}

export const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

export function useAnnouncer() {
  const context = useContext(AnnouncerContext);

  if (!context) {
    throw new Error(
      "useAnnouncer must be used within AccessibilityAnnouncerProvider"
    );
  }

  return context;
}