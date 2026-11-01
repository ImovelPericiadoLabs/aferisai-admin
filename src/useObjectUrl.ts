import { useEffect, useState } from "react";

export function useObjectUrl(blob: Blob | null): string | null {
  const [state, setState] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setState({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return state && state.blob === blob ? state.url : null;
}
