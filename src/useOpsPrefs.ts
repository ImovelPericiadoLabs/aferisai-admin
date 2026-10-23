import { useState } from "react";
import { readPrefs, writePrefs, type TablePrefs } from "./ops-model";

/** Saved density and hidden columns for one table, kept in this browser. */
export function useOpsPrefs(key: string) {
  const [prefs, setPrefs] = useState<TablePrefs>(() => readPrefs(key));
  const update = (next: TablePrefs) => {
    setPrefs(next);
    writePrefs(key, next);
  };
  return [prefs, update] as const;
}
