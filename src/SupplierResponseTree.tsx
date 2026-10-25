import type { ReactNode } from "react";

function valueLabel(value: unknown): string {
  if (value === null) return "nulo";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

function DataNode({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}): ReactNode {
  if (value === null || typeof value !== "object") {
    return <span className="ops-evidence-value">{valueLabel(value)}</span>;
  }
  const entries = Object.entries(value);
  if (entries.length === 0)
    return <span className="ops-evidence-value">Vazio</span>;
  if (depth >= 6)
    return (
      <pre className="ops-evidence-raw">{JSON.stringify(value, null, 2)}</pre>
    );
  return (
    <table className="ops-evidence-table">
      <tbody>
        {entries.map(([key, child]) => (
          <tr key={key}>
            <th scope="row">
              {Array.isArray(value) ? `#${Number(key) + 1}` : key}
            </th>
            <td>
              {child !== null && typeof child === "object" ? (
                <details open={depth === 0}>
                  <summary>
                    {Array.isArray(child)
                      ? `${child.length} itens`
                      : `${Object.keys(child).length} campos`}
                  </summary>
                  <DataNode value={child} depth={depth + 1} />
                </details>
              ) : (
                <DataNode value={child} depth={depth + 1} />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SupplierResponseTree({ text }: { text: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return <pre className="ops-evidence-raw">{text}</pre>;
  }
  return (
    <div className="ops-evidence-tree">
      <DataNode value={parsed} />
    </div>
  );
}
