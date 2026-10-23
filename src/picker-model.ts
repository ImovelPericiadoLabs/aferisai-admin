export type PickerOption = { id: string; label: string; hint?: string };

export type PickerResult = { options: PickerOption[]; truncated?: boolean };

export type PickerSearch = (query: string) => Promise<PickerResult>;

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").trim();

export function filterOptions(
  options: PickerOption[],
  query: string,
): PickerOption[] {
  const needle = normalize(query);
  if (!needle) return options;
  return options.filter(
    (option) =>
      normalize(option.label).includes(needle) ||
      normalize(option.hint ?? "").includes(needle),
  );
}

export function mergeOptions(
  existing: PickerOption[],
  incoming: PickerOption[],
): PickerOption[] {
  const byId = new Map(existing.map((option) => [option.id, option]));
  for (const option of incoming) byId.set(option.id, option);
  return [...byId.values()];
}

export function nextIndex(current: number, step: 1 | -1, length: number) {
  if (length === 0) return -1;
  if (current < 0) return step === 1 ? 0 : length - 1;
  return (current + step + length) % length;
}

export type PickerKeyAction =
  | "next"
  | "prev"
  | "open"
  | "choose"
  | "swallow"
  | "close"
  | "removeLast"
  | "none";

export function pickerKeyAction(
  key: string,
  state: {
    open: boolean;
    hasActive: boolean;
    queryEmpty: boolean;
    multiple: boolean;
    hasValue: boolean;
  },
): PickerKeyAction {
  if (key === "ArrowDown" || key === "ArrowUp") {
    if (!state.open) return "open";
    return key === "ArrowDown" ? "next" : "prev";
  }
  if (key === "Enter" && state.open)
    return state.hasActive ? "choose" : "swallow";
  if (key === "Escape" && state.open) return "close";
  if (
    key === "Backspace" &&
    state.queryEmpty &&
    state.multiple &&
    state.hasValue
  )
    return "removeLast";
  return "none";
}

export async function collectPages<T>(
  fetchPage: (
    cursor?: string,
  ) => Promise<{ items: T[]; next_cursor: string | null }>,
  maxPages: number,
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage(cursor);
    items.push(...result.items);
    if (result.next_cursor === null) return { items, truncated: false };
    cursor = result.next_cursor;
  }
  return { items, truncated: true };
}
