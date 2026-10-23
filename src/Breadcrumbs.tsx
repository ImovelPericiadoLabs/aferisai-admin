import "./breadcrumbs.css";

export type Crumb = { label: string; onSelect?: () => void };

/** Last item is the current page; earlier ones are buttons that go up one level. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Você está em">
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`}>
              {current || !item.onSelect ? (
                <span aria-current={current ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <button type="button" onClick={item.onSelect}>
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
