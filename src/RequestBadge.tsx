export function RequestBadge({
  tone,
  children,
}: {
  tone: string;
  children: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
