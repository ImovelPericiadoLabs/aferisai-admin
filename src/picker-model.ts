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
