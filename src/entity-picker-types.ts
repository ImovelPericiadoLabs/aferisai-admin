import type { PickerOption, PickerResult, PickerSearch } from "./picker-model";

type Shared = {
  id: string;
  label: string;
  search: PickerSearch;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  limitNote?: string;
  emptyMessage?: string;
  emptyAction?: { label: string; href: string };
  knownOptions?: PickerOption[];
  cacheKey?: string;
  onUnauthorized?: () => void;
  resolve?: (id: string) => Promise<PickerOption | null>;
};

type Single = Shared & {
  multiple?: false;
  value: string;
  onChange: (id: string, option?: PickerOption) => void;
};

type Multiple = Shared & {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
};

export type Props = Single | Multiple;

export type Loaded = {
  key: string | undefined;
  query: string;
  options: PickerOption[];
  next?: () => Promise<PickerResult>;
  failed: boolean;
};
