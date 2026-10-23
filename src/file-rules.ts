export type FileKind = "image" | "pdf" | "json" | "text";

export type FileRule = {
  kinds: FileKind[];
  extensions: string[];
  mimeTypes: string[];
  maxBytes: number;
};

export type FileLike = { name: string; size: number; type: string };

const KiB = 1024;
const MiB = 1024 * KiB;

export function formatBytes(bytes: number): string {
  const number = (value: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
  if (bytes >= MiB) return `${number(bytes / MiB)} MiB`;
  if (bytes >= KiB) return `${number(bytes / KiB)} KiB`;
  return `${bytes} B`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1
    ? name.slice(dot + 1).toLowerCase()
    : "";
}

const byExtension: Record<string, FileKind> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  pdf: "pdf",
  json: "json",
  txt: "text",
};

function kindOf(file: FileLike, extension: string): FileKind | "other" {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/json") return "json";
  if (mime.startsWith("text/")) return "text";
  if (mime === "") return byExtension[extension] ?? "other";
  return "other";
}

export function describeFile(file: FileLike): {
  kind: FileKind | "other";
  extension: string;
  sizeLabel: string;
} {
  const extension = extensionOf(file.name);
  return {
    kind: kindOf(file, extension),
    extension,
    sizeLabel: formatBytes(file.size),
  };
}

export function validateFile(
  file: FileLike,
  rule: FileRule,
):
  | { ok: true }
  | { ok: false; code: "empty" | "type" | "size"; message: string } {
  if (file.size === 0)
    return { ok: false, code: "empty", message: "O arquivo está vazio." };
  const extension = extensionOf(file.name);
  const mime = file.type.toLowerCase();
  const typeOk =
    mime === ""
      ? rule.extensions.includes(extension)
      : rule.mimeTypes.includes(mime);
  if (!typeOk)
    return {
      ok: false,
      code: "type",
      message: `Tipo não aceito. Use ${rule.extensions.map((item) => item.toUpperCase()).join(", ")}.`,
    };
  if (file.size > rule.maxBytes)
    return {
      ok: false,
      code: "size",
      message: `O arquivo passa do limite de ${formatBytes(rule.maxBytes)}.`,
    };
  return { ok: true };
}

export const LOGO_RULE: FileRule = {
  kinds: ["image"],
  extensions: ["png", "jpg", "jpeg"],
  mimeTypes: ["image/png", "image/jpeg"],
  maxBytes: 2 * MiB,
};

export const SERVICE_ACCOUNT_RULE: FileRule = {
  kinds: ["json"],
  extensions: ["json"],
  mimeTypes: ["application/json"],
  maxBytes: 64 * KiB,
};
