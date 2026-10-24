const managedValidity = "9999-12-31";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export const supplierTariffIsCurrent = (validUntil: string, now = Date.now()) =>
  validUntil.startsWith(managedValidity) ||
  new Date(validUntil).getTime() > now;

export const supplierTariffValidityLabel = (validUntil: string) => {
  if (validUntil.startsWith(managedValidity))
    return "Vigente até atualização do gestor";
  const date = new Date(validUntil);
  return supplierTariffIsCurrent(validUntil)
    ? `Vigente até ${dateTime.format(date)}`
    : `Vencida em ${dateTime.format(date)}`;
};
