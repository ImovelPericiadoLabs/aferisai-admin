type Deps = {
  /** Resolves the relative logo path of an organization, or null when it has none. */
  detail: (organizationId: string) => Promise<string | null>;
  /** Turns a relative logo path into an object URL. */
  blob: (path: string) => Promise<string>;
  concurrency: number;
};

export type LogoLoader = ((
  organizationId: string,
  knownPath?: string | null,
) => Promise<string | null>) & { invalidate: (organizationId: string) => void };

/**
 * Loads organization logos for lists. A known path (or a known absence) from the
 * list avoids any extra request; otherwise the detail is asked, a few at a time.
 */
export function createLogoLoader({
  detail,
  blob,
  concurrency,
}: Deps): LogoLoader {
  const cache = new Map<string, Promise<string | null>>();
  const waiting: (() => void)[] = [];
  let running = 0;

  async function slot<T>(work: () => Promise<T>): Promise<T> {
    if (running >= concurrency)
      await new Promise<void>((resolve) => waiting.push(resolve));
    running += 1;
    try {
      return await work();
    } finally {
      running -= 1;
      waiting.shift()?.();
    }
  }

  const load = ((organizationId: string, knownPath?: string | null) => {
    const cached = cache.get(organizationId);
    if (cached) return cached;
    const promise = (async () => {
      try {
        const path =
          knownPath === undefined
            ? await slot(() => detail(organizationId))
            : knownPath;
        return path ? await slot(() => blob(path)) : null;
      } catch {
        return null;
      }
    })();
    cache.set(organizationId, promise);
    return promise;
  }) as LogoLoader;
  load.invalidate = (organizationId: string) => {
    cache.delete(organizationId);
  };
  return load;
}
