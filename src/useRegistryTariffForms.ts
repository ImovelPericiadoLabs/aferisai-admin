import { useState } from "react";
import type {
  RegistryArispTariffPage,
  RegistryCertificateKind,
  RegistryCertificateTariff,
  RegistryCertificateTariffPage,
} from "./api";
import { rangeText, type LimitRange } from "./registry-tariff-model";
import { stepStates } from "./account-model";
import {
  DEFAULT_RANGE,
  DEFAULT_REASON,
  inRange,
  lengthOk,
  parseMoney,
  sha,
  type EvidenceMode,
} from "./registry-optional-tariffs-model";

export type Reviewing = "certificate" | "arisp" | null;

export function useCertificateTariffForm({
  certificates,
  limits,
  reviewing,
}: {
  certificates: RegistryCertificateTariff[];
  limits: RegistryCertificateTariffPage["limits"] | undefined;
  reviewing: Reviewing;
}) {
  const [kind, setKind] = useState<RegistryCertificateKind>("federal");
  const [state, setState] = useState("");
  const [cost, setCost] = useState("");
  const [evidence, setEvidence] = useState("");
  const [evidenceMode, setEvidenceMode] =
    useState<EvidenceMode>("admin_declaration");
  const [sampleDocument, setSampleDocument] = useState("");
  const [sampleCharge, setSampleCharge] = useState("");
  const [proofConfirmed, setProofConfirmed] = useState(false);
  const [operationalAttested, setOperationalAttested] = useState(false);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const costRange: LimitRange = limits?.unit_cost_cents ?? DEFAULT_RANGE;
  const reasonRange: LimitRange = limits?.reason_length ?? DEFAULT_REASON;
  const cents = parseMoney(cost);
  const current = certificates.find(
    (item) =>
      item.code === kind &&
      (item.state ?? "") === (state.trim().toUpperCase() || ""),
  );
  const proofOk =
    evidenceMode === "admin_declaration"
      ? operationalAttested &&
        !sampleDocument &&
        !sampleCharge &&
        !proofConfirmed
      : sha(sampleDocument) &&
        sha(sampleCharge) &&
        sampleDocument !== sampleCharge &&
        proofConfirmed;
  const states = stepStates([
    inRange(cents, costRange) &&
      (kind !== "estadual" || /^[A-Z]{2}$/.test(state.trim().toUpperCase())),
    (evidenceMode === "admin_declaration" || sha(evidence)) &&
      lengthOk(reason, reasonRange) &&
      proofOk,
    reviewing === "certificate",
  ]);

  function missing(): string[] {
    const value = parseMoney(cost);
    const list: string[] = [];
    if (kind === "estadual" && !/^[A-Z]{2}$/.test(state.trim().toUpperCase()))
      list.push("a UF com duas letras");
    if (kind !== "estadual" && state.trim())
      list.push("a UF (só vale para a certidão estadual)");
    if (!inRange(value, costRange))
      list.push(`o custo total por chamada (${rangeText(costRange)})`);
    if (evidenceMode === "supplier_file" && !sha(evidence))
      list.push("o arquivo da tabela de preços");
    if (!lengthOk(reason, reasonRange))
      list.push(
        `o motivo (de ${reasonRange.min} a ${reasonRange.max} caracteres)`,
      );
    if (!proofOk)
      list.push(
        evidenceMode === "admin_declaration"
          ? "sua aprovação operacional"
          : "o PDF e o débito conferidos",
      );
    return list;
  }

  function resetAfterPublish() {
    setCost("");
    setEvidence("");
    setSampleDocument("");
    setSampleCharge("");
    setProofConfirmed(false);
    setOperationalAttested(false);
    setReason("");
    setOpen(false);
  }

  return {
    kind,
    setKind,
    state,
    setState,
    cost,
    setCost,
    evidence,
    setEvidence,
    evidenceMode,
    setEvidenceMode,
    sampleDocument,
    setSampleDocument,
    sampleCharge,
    setSampleCharge,
    proofConfirmed,
    setProofConfirmed,
    operationalAttested,
    setOperationalAttested,
    reason,
    setReason,
    open,
    setOpen,
    attempted,
    setAttempted,
    reasonRange,
    cents,
    current,
    states,
    missing,
    resetAfterPublish,
  };
}

export function useArispTariffForm({
  limits,
  reviewing,
}: {
  limits: RegistryArispTariffPage["limits"] | undefined;
  reviewing: Reviewing;
}) {
  const [linkedAccount, setLinkedAccount] = useState("");
  const [orderFee, setOrderFee] = useState("");
  const [downloadFee, setDownloadFee] = useState("");
  const [evidence, setEvidence] = useState("");
  const [evidenceMode, setEvidenceMode] =
    useState<EvidenceMode>("admin_declaration");
  const [certificateType, setCertificateType] = useState("");
  const [certificateTypeEvidence, setCertificateTypeEvidence] = useState("");
  const [typeConfirmed, setTypeConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const orderRange: LimitRange = limits?.order_fee_cents ?? DEFAULT_RANGE;
  const downloadRange: LimitRange = limits?.download_fee_cents ?? DEFAULT_RANGE;
  const reasonRange: LimitRange = limits?.reason_length ?? DEFAULT_REASON;
  const order = parseMoney(orderFee);
  const download = parseMoney(downloadFee);
  const budget =
    Number.isNaN(order) || Number.isNaN(download) ? null : order + 3 * download;
  const typeGroupOk =
    !(certificateType || certificateTypeEvidence || typeConfirmed) ||
    (!!certificateType.trim() && sha(certificateTypeEvidence) && typeConfirmed);
  const states = stepStates([
    !!linkedAccount &&
      inRange(order, orderRange) &&
      inRange(download, downloadRange),
    (evidenceMode === "admin_declaration" || sha(evidence)) &&
      lengthOk(reason, reasonRange) &&
      typeGroupOk,
    reviewing === "arisp",
  ]);

  function missing(): string[] {
    const orderValue = parseMoney(orderFee);
    const downloadValue = parseMoney(downloadFee);
    const list: string[] = [];
    if (!linkedAccount) list.push("a conta vinculada");
    if (!inRange(orderValue, orderRange))
      list.push(`o valor do pedido (${rangeText(orderRange)})`);
    if (!inRange(downloadValue, downloadRange))
      list.push(`o valor de cada download (${rangeText(downloadRange)})`);
    if (evidenceMode === "supplier_file" && !sha(evidence))
      list.push("o arquivo da tabela de preços");
    if (!lengthOk(reason, reasonRange))
      list.push(
        `o motivo (de ${reasonRange.min} a ${reasonRange.max} caracteres)`,
      );
    if (!typeGroupOk)
      list.push(
        "o tipo de ônus completo (tipo, arquivo da resposta e confirmação)",
      );
    return list;
  }

  function resetAfterPublish() {
    setOrderFee("");
    setDownloadFee("");
    setEvidence("");
    setCertificateType("");
    setCertificateTypeEvidence("");
    setTypeConfirmed(false);
    setReason("");
    setOpen(false);
  }

  return {
    linkedAccount,
    setLinkedAccount,
    orderFee,
    setOrderFee,
    downloadFee,
    setDownloadFee,
    evidence,
    setEvidence,
    evidenceMode,
    setEvidenceMode,
    certificateType,
    setCertificateType,
    certificateTypeEvidence,
    setCertificateTypeEvidence,
    typeConfirmed,
    setTypeConfirmed,
    reason,
    setReason,
    open,
    setOpen,
    attempted,
    setAttempted,
    reasonRange,
    order,
    download,
    budget,
    states,
    missing,
    resetAfterPublish,
  };
}

export type CertificateTariffForm = ReturnType<typeof useCertificateTariffForm>;
export type ArispTariffForm = ReturnType<typeof useArispTariffForm>;
