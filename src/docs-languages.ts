import type { CodeLanguage } from "./code-highlight";
import type { SampleLanguage } from "./docs-model";

/** Languages a code sample can ship in, in the order the tabs are shown. */
export const SAMPLE_LANGUAGES: {
  id: SampleLanguage;
  label: string;
  highlight: CodeLanguage;
  /** What the sample needs to run; shown under the tabs. */
  requires: string | null;
}[] = [
  { id: "curl", label: "cURL", highlight: "shell", requires: null },
  {
    id: "node",
    label: "Node.js",
    highlight: "js",
    requires: "Node.js 18 ou mais novo, sem dependências.",
  },
  {
    id: "python",
    label: "Python",
    highlight: "python",
    requires:
      "Python 3.9 ou mais novo e a biblioteca requests (pip install requests).",
  },
  {
    id: "java",
    label: "Java",
    highlight: "java",
    requires: "Java 17 ou mais novo, sem dependências.",
  },
  {
    id: "csharp",
    label: "C#",
    highlight: "csharp",
    requires: ".NET 6 ou mais novo, sem dependências.",
  },
  {
    id: "go",
    label: "Go",
    highlight: "go",
    requires: "Go 1.18 ou mais novo, sem dependências.",
  },
];

export const isSampleLanguage = (value: unknown): value is SampleLanguage =>
  SAMPLE_LANGUAGES.some((language) => language.id === value);

/** The reader's preferred language when the sample has it, otherwise the first one it does have. */
export function effectiveLanguage(
  available: readonly SampleLanguage[],
  preferred: SampleLanguage,
): SampleLanguage | null {
  if (available.includes(preferred)) return preferred;
  return (
    SAMPLE_LANGUAGES.find((language) => available.includes(language.id))?.id ??
    null
  );
}
