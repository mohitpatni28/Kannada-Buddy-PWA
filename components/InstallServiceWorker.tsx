"use client";

import { useEffect } from "react";

export function InstallServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const useOfflineDocumentNavigation = (event: MouseEvent) => {
      if (navigator.onLine || event.defaultPrevented || event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.download) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      event.preventDefault();
      window.location.assign(destination.href);
    };

    document.addEventListener("click", useOfflineDocumentNavigation, true);
    return () => document.removeEventListener("click", useOfflineDocumentNavigation, true);
  }, []);

  return null;
}
