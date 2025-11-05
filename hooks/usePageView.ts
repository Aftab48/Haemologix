"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

/**
 * Hook for tracking page views and custom events
 * @param pageName - Name of the page for tracking
 * @param trackOnMount - Whether to track page view on mount (default: true)
 */
export function usePageView(pageName: string, trackOnMount: boolean = true) {
  useEffect(() => {
    if (trackOnMount) {
      track("page_view", { page: pageName });
    }
  }, [pageName, trackOnMount]);

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    track(eventName, { ...properties, page: pageName });
  };

  return { trackEvent };
}

