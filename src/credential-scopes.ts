export function allScopesSelected(
  availableScopes: string[],
  selectedScopes: string[],
): boolean {
  return (
    availableScopes.length > 0 &&
    availableScopes.every((scope) => selectedScopes.includes(scope))
  );
}

export function toggleAllScopes(
  availableScopes: string[],
  selectedScopes: string[],
): string[] {
  return allScopesSelected(availableScopes, selectedScopes)
    ? selectedScopes.filter((scope) => !availableScopes.includes(scope))
    : [...new Set([...selectedScopes, ...availableScopes])];
}
