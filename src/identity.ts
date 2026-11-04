/** A person's mark: two initials and a stable pale tint of their own hue. */
export function initialsOf(name: string): string {
  const parts = name
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last =
    parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? "");
  return `${first}${last}`.toLocaleUpperCase("pt-BR");
}

export function hueOf(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export function tintOf(name: string): { background: string; color: string } {
  const hue = hueOf(name);
  return { background: `hsl(${hue} 55% 92%)`, color: `hsl(${hue} 45% 28%)` };
}
