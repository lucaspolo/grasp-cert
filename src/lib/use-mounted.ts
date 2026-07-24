"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Retorna false no SSR/hidratação e true após montar no cliente, sem o
 * padrão setState-em-effect (react-hooks/set-state-in-effect).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}
