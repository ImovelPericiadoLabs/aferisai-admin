export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const DOCUMENT_FILTERS = [
  { value: "", label: "Qualquer original" },
  { value: "available", label: "Original disponível" },
  { value: "expired", label: "Original vencido" },
  { value: "purged", label: "Original eliminado" },
];

export const shortId = (id: string) => id.slice(-8);

export function download(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
