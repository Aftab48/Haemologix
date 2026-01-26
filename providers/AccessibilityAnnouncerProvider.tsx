"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { AnnouncerContext } from "@/utils/accessibility/announcer";
import type { AnnounceMode } from "@/utils/accessibility/types";

interface Props {
  children: ReactNode;
}

export default function AccessibilityAnnouncerProvider({ children }: Props) {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<AnnounceMode>("polite");

  const announce = useCallback(
    (text: string, announceMode: AnnounceMode = "polite") => {
      // Clear first to force re-announcement
      setMessage("");
      setMode(announceMode);

      // Small delay ensures screen readers detect the change
      setTimeout(() => {
        setMessage(text);
      }, 50);
    },
    []
  );

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}

      {/* Global screen reader announcer */}
      <div
        aria-live={mode}
        aria-atomic="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}