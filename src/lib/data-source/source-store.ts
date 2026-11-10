import type { DataSource } from "./types";
export const SOURCE_STORAGE_KEY = "eduinsight-data-source";
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
export function createSourceStore(storage: () => StorageAccess) {
  let value: DataSource = "api";
  let restored = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    getSnapshot: () => value,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!restored) {
        restored = true;
        try {
          value =
            storage().getItem(SOURCE_STORAGE_KEY) === "mock" ? "mock" : "api";
        } catch {
          /* Use the in-memory default. */
        }
        emit();
      }
      return () => {
        listeners.delete(listener);
      };
    },
    setSource(next: DataSource) {
      restored = true;
      value = next;
      try {
        storage().setItem(SOURCE_STORAGE_KEY, next);
      } catch {
        /* Persistence must never prevent switching. */
      }
      emit();
    },
    sync(saved: string | null) {
      value = saved === "mock" ? "mock" : "api";
      emit();
    },
  };
}
