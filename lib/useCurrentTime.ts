"use client";

import { useSyncExternalStore } from "react";

let currentTime = 0;
const listeners = new Set<() => void>();
const getSnapshot = () => currentTime;
const getServerSnapshot = () => 0;

function updateTime() {
  currentTime = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  updateTime();
  const interval = window.setInterval(updateTime, 60_000);
  return () => {
    listeners.delete(listener);
    window.clearInterval(interval);
  };
}

export function useCurrentTime() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
