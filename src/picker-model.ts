export type PickerOption = { id: string; label: string; hint?: string };

export type PickerResult = {
  options: PickerOption[];
  next?: () => Promise<PickerResult>;
};

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

export async function pagedResult<T>(
  fetchPage: (
    cursor?: string,
  ) => Promise<{ items: T[]; next_cursor: string | null }>,
  toOption: (item: T) => PickerOption | null,
  query: string,
  filterOnClient: boolean,
  cursor?: string,
): Promise<PickerResult> {
  const page = await fetchPage(cursor);
  const mapped = page.items
    .map(toOption)
    .filter((option): option is PickerOption => option !== null);
  const nextCursor = page.next_cursor;
  return {
    options: filterOnClient ? filterOptions(mapped, query) : mapped,
    next: nextCursor
      ? () =>
          pagedResult(fetchPage, toOption, query, filterOnClient, nextCursor)
      : undefined,
  };
}

export function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}
