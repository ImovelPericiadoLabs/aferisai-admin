type FieldLike = {
  tagName: string;
  type?: string;
  setAttribute: (name: string, value: string) => void;
};

const SKIPPED_TYPES = new Set([
  "button",
  "submit",
  "checkbox",
  "radio",
  "hidden",
]);

export function protectFromAutofill(el: FieldLike): void {
  const tag = el.tagName.toUpperCase();
  if (tag === "FORM") {
    el.setAttribute("autocomplete", "off");
    return;
  }
  if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;
  if (tag === "INPUT" && SKIPPED_TYPES.has((el.type ?? "").toLowerCase()))
    return;
  el.setAttribute(
    "autocomplete",
    tag === "INPUT" && el.type === "password" ? "new-password" : "off",
  );
  el.setAttribute("data-lpignore", "true");
  el.setAttribute("data-1p-ignore", "true");
  el.setAttribute("data-bwignore", "true");
  el.setAttribute("data-form-type", "other");
}

export function installNoAutofill(root: HTMLElement): () => void {
  const sweep = (node: ParentNode) => {
    node
      .querySelectorAll<HTMLElement>("form, input, textarea, select")
      .forEach((el) => protectFromAutofill(el as unknown as FieldLike));
  };
  sweep(root);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations)
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const element = node as HTMLElement;
        protectFromAutofill(element as unknown as FieldLike);
        sweep(element);
      });
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
