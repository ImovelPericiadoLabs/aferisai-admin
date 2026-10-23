export type Box = {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
};

export type AlignmentIssue = { a: string; b: string; reason: string };

const TOLERANCE = 2;

export function inSameRow(a: Box, b: Box): boolean {
  const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (overlap <= TOLERANCE) return false;
  const haveX =
    a.left !== undefined &&
    a.right !== undefined &&
    b.left !== undefined &&
    b.right !== undefined;
  if (!haveX) return true;
  const horizontal =
    Math.min(a.right as number, b.right as number) -
    Math.max(a.left as number, b.left as number);
  return horizontal <= 0;
}

export function misalignment(
  a: Box,
  b: Box,
  options: { checkHeight: boolean },
): string | null {
  if (!inSameRow(a, b)) return null;
  const heightA = a.bottom - a.top;
  const heightB = b.bottom - b.top;
  const centerGap = Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
  if (options.checkHeight && Math.abs(heightA - heightB) > TOLERANCE)
    return `alturas diferentes (${Math.round(heightA)}px e ${Math.round(heightB)}px)`;
  if (centerGap > TOLERANCE)
    return `centros desalinhados (${Math.round(centerGap)}px de diferença)`;
  return null;
}

const GROUPS =
  "form, fieldset, [role=dialog], [role=alertdialog], .card, header, footer, [role=toolbar], [class*=toolbar], [class*=actions], [class*=filters], [class*=-row]";

function describe(element: Element): string {
  const text = (element.textContent ?? "").trim().slice(0, 24);
  const placeholder = element.getAttribute("placeholder") ?? "";
  return `${element.tagName.toLowerCase()}.${element.className.toString().split(" ")[0]} "${text || placeholder}"`;
}

function visible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && !element.closest(".sr-only");
}

export function auditAlignment(root: ParentNode = document): AlignmentIssue[] {
  const controls = Array.from(
    root.querySelectorAll(
      ".btn, .button, .input, input.input, select.input, .picker-control",
    ),
  ).filter(visible);
  const byGroup = new Map<Element, Element[]>();
  for (const control of controls) {
    const group = control.closest(GROUPS) ?? document.body;
    byGroup.set(group, [...(byGroup.get(group) ?? []), control]);
  }
  const issues: AlignmentIssue[] = [];
  for (const members of byGroup.values())
    for (let i = 0; i < members.length; i += 1)
      for (let j = i + 1; j < members.length; j += 1) {
        const a = members[i];
        const b = members[j];
        const bothButtons = a.matches(".btn") && b.matches(".btn");
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const reason = misalignment(ra, rb, { checkHeight: !bothButtons });
        if (reason) issues.push({ a: describe(a), b: describe(b), reason });
      }
  return issues;
}
