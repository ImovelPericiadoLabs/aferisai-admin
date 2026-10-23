import { useEffect, useRef, useState } from "react";
import { organizationLogos } from "./organization-logos";

/**
 * Logo (or initial) for an organization. Loads only when scrolled into view and
 * keeps the initial when there is no logo or it cannot be read.
 */
export function OrganizationAvatar({
  id,
  name,
  logoUrl,
}: {
  id: string;
  name: string;
  /** From the list when the API provides it; undefined asks the detail instead. */
  logoUrl?: string | null;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    void organizationLogos(id, logoUrl).then((url) => {
      if (live && url) setSrc({ id, url });
    });
    return () => {
      live = false;
    };
  }, [visible, id, logoUrl]);

  return (
    <span ref={ref} className="partner-dir-avatar" aria-hidden="true">
      {src?.id === id ? (
        <img src={src.url} alt="" referrerPolicy="no-referrer" />
      ) : (
        name.slice(0, 1).toLocaleUpperCase("pt-BR")
      )}
    </span>
  );
}
