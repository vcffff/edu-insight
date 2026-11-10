"use client";
import {
  createContext,
  Fragment,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRepository, sourceKey } from "@/lib/data-source";
import type { DataSource, Repository } from "@/lib/data-source/types";
import {
  createSourceStore,
  SOURCE_STORAGE_KEY,
} from "@/lib/data-source/source-store";
export const DataSourceContext = createContext<{
  source: DataSource;
  repository: Repository;
  setSource: (source: DataSource) => void;
} | null>(null);
export function DataSourceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store] = useState(() => createSourceStore(() => window.localStorage));
  const subscribe = useCallback(
    (listener: () => void) => {
      const unsubscribe = store.subscribe(listener);
      const sync = (event: StorageEvent) => {
        if (event.key === SOURCE_STORAGE_KEY || event.key === null)
          store.sync(event.newValue);
      };
      window.addEventListener("storage", sync);
      return () => {
        unsubscribe();
        window.removeEventListener("storage", sync);
      };
    },
    [store],
  );
  const source = useSyncExternalStore(
    subscribe,
    store.getSnapshot,
    () => "api" as const,
  );
  const client = useQueryClient();
  const setSource = useCallback(
    (next: DataSource) => {
      const current = store.getSnapshot();
      if (next === current) return;
      // Query keys isolate even transports that cannot be cancelled. Aborting the
      // old HTTP transport also prevents wasted work and stale source status.
      void client.cancelQueries({ queryKey: sourceKey(current) });
      void client.invalidateQueries({
        queryKey: sourceKey(next),
        refetchType: "none",
      });
      store.setSource(next);
    },
    [client, store],
  );
  const value = useMemo(
    () => ({ source, repository: getRepository(source), setSource }),
    [source, setSource],
  );
  return (
    <DataSourceContext.Provider value={value}>
      <Fragment key={source}>{children}</Fragment>
    </DataSourceContext.Provider>
  );
}
