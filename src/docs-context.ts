import { createContext, useContext } from "react";
import type { SampleLanguage } from "./docs-model";

export type DocsContextValue = {
  language: SampleLanguage;
  setLanguage: (language: SampleLanguage) => void;
  /** Opens a page, optionally scrolling to an anchor: "page" or "page#section". */
  go: (target: string) => void;
};

export const DocsContext = createContext<DocsContextValue | null>(null);

export function useDocs(): DocsContextValue {
  const value = useContext(DocsContext);
  if (!value) throw new Error("useDocs must be used inside <DocsSite>");
  return value;
}
