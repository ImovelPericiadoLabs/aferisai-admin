import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  listRegistryArispTariffs,
  listRegistryCertificateTariffs,
  publishRegistryArispTariff,
  publishRegistryCertificateTariff,
  type RegistryArispTariff,
  type RegistryArispTariffPage,
  type RegistryCertificateKind,
  type RegistryCertificateTariff,
  type RegistryCertificateTariffPage,
  type RegistrySupplierAccount,
} from "./api";
import { rangeText, type LimitRange } from "./registry-tariff-model";
import {
  Composer,
  ComposerSection,
  ComposerSummary,
  Delta,
  SettingCard,
} from "./SupplierUi";
import { stepStates } from "./account-model";
import { supplierTariffValidityLabel } from "./supplier-tariff-validity";
import type { ToastKind } from "./useToast";

const kinds: { value: RegistryCertificateKind; label: string }[] = [
  { value: "federal", label: "Federal" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "estadual", label: "Estadual por UF" },
  { value: "fgts", label: "FGTS" },
  { value: "iptu_sp", label: "IPTU São Paulo" },
  { value: "iptu_rj", label: "IPTU Rio de Janeiro" },
  { value: "cnj", label: "CNJ" },
  { value: "cgu", label: "CGU" },
];
const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
const sha = (value: string) => /^[0-9a-f]{64}$/.test(value);
const DEFAULT_RANGE: LimitRange = { min: 1, max: 100_000 };
const DEFAULT_REASON: LimitRange = { min: 10, max: 500 };

const parseMoney = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  return /^\d+(?:\.\d{1,2})?$/.test(normalized)
    ? Math.round(Number(normalized) * 100)
    : NaN;
};

export function RegistryOptionalTariffs({
  account,
  accounts,
  csrf,
  onUnauthorized,
  onToast,
}: {
  account: RegistrySupplierAccount;
  accounts: RegistrySupplierAccount[];
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [certificates, setCertificates] = useState<RegistryCertificateTariff[]>(
    [],
  );
  const [certificateCursor, setCertificateCursor] = useState<string | null>(
    null,
  );
  const [arisp, setArisp] = useState<RegistryArispTariff[]>([]);
  const [arispCursor, setArispCursor] = useState<string | null>(null);
  const [kind, setKind] = useState<RegistryCertificateKind>("federal");
  const [state, setState] = useState("");
  const [cost, setCost] = useState("");
  const [evidence, setEvidence] = useState("");
  const [sampleDocument, setSampleDocument] = useState("");
  const [sampleCharge, setSampleCharge] = useState("");
  const [proofConfirmed, setProofConfirmed] = useState(false);
  const [certificateReason, setCertificateReason] = useState("");
  const [linkedAccount, setLinkedAccount] = useState("");
  const [orderFee, setOrderFee] = useState("");
  const [downloadFee, setDownloadFee] = useState("");
  const [arispEvidence, setArispEvidence] = useState("");
  const [certificateType, setCertificateType] = useState("");
  const [certificateTypeEvidence, setCertificateTypeEvidence] = useState("");
  const [typeConfirmed, setTypeConfirmed] = useState(false);
  const [arispReason, setArispReason] = useState("");
  const [reviewing, setReviewing] = useState<"certificate" | "arisp" | null>(
    null,
  );
  const [arispRaw, setArispRaw] = useState<RegistryArispTariffPage["limits"]>();
  const [certRaw, setCertRaw] =
    useState<RegistryCertificateTariffPage["limits"]>();
  const [certOpen, setCertOpen] = useState(false);
  const [arispOpen, setArispOpen] = useState(false);
  const [certAttempted, setCertAttempted] = useState(false);
  const [arispAttempted, setArispAttempted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = account.status === "active";
  const orderRange = arispRaw?.order_fee_cents ?? DEFAULT_RANGE;
  const downloadRange = arispRaw?.download_fee_cents ?? DEFAULT_RANGE;
  const arispReasonRange = arispRaw?.reason_length ?? DEFAULT_REASON;
  const costRange = certRaw?.unit_cost_cents ?? DEFAULT_RANGE;
  const certReasonRange = certRaw?.reason_length ?? DEFAULT_REASON;
  const inRange = (value: number, range: LimitRange) =>
    Number.isSafeInteger(value) && value >= range.min && value <= range.max;
  const lengthOk = (text: string, range: LimitRange) =>
    text.trim().length >= range.min && text.trim().length <= range.max;
  const arispOrder = parseMoney(orderFee);
  const arispDownload = parseMoney(downloadFee);
  const arispBudget =
    Number.isNaN(arispOrder) || Number.isNaN(arispDownload)
      ? null
      : arispOrder + 3 * arispDownload;
  const typeGroupOk =
    !(certificateType || certificateTypeEvidence || typeConfirmed) ||
    (!!certificateType.trim() && sha(certificateTypeEvidence) && typeConfirmed);
  const arispStates = stepStates([
    !!linkedAccount &&
      inRange(arispOrder, orderRange) &&
      inRange(arispDownload, downloadRange),
    sha(arispEvidence) &&
      lengthOk(arispReason, arispReasonRange) &&
      typeGroupOk,
    reviewing === "arisp",
  ]);
  const certCents = parseMoney(cost);
  const certCurrent = certificates.find(
    (item) =>
      item.code === kind &&
      (item.state ?? "") === (state.trim().toUpperCase() || ""),
  );
  const proofOk =
    !(sampleDocument || sampleCharge || proofConfirmed) ||
    (sha(sampleDocument) &&
      sha(sampleCharge) &&
      sampleDocument !== sampleCharge &&
      proofConfirmed);
  const certStates = stepStates([
    inRange(certCents, costRange) &&
      (kind !== "estadual" || /^[A-Z]{2}$/.test(state.trim().toUpperCase())),
    sha(evidence) && lengthOk(certificateReason, certReasonRange) && proofOk,
    reviewing === "certificate",
  ]);
  const otherProvider = account.provider === "onr" ? "infosimples" : "onr";
  const otherAccounts = accounts.filter(
    (item) => item.provider === otherProvider && item.status === "active",
  );

  const load = useCallback(
    async (next?: string, kind: "certificate" | "arisp" = "arisp") => {
      setLoading(true);
      try {
        if (kind === "certificate" && account.provider === "infosimples") {
          const page = await listRegistryCertificateTariffs(account.id, next);
          setCertificates((old) =>
            next ? [...old, ...page.items] : page.items,
          );
          setCertificateCursor(page.next_cursor);
          if (page.limits) setCertRaw(page.limits);
        } else {
          const page = await listRegistryArispTariffs(account.id, next);
          setArisp((old) => (next ? [...old, ...page.items] : page.items));
          setArispCursor(page.next_cursor);
          if (page.limits) setArispRaw(page.limits);
        }
        setError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar as tarifas opcionais.",
          );
      } finally {
        setLoading(false);
      }
    },
    [account.id, account.provider, onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void load();
      if (account.provider === "infosimples")
        void load(undefined, "certificate");
    });
  }, [account.provider, load]);

  function certMissing(): string[] {
    const cents = parseMoney(cost);
    const missing: string[] = [];
    if (kind === "estadual" && !/^[A-Z]{2}$/.test(state.trim().toUpperCase()))
      missing.push("a UF com duas letras");
    if (kind !== "estadual" && state.trim())
      missing.push("a UF (só vale para a certidão estadual)");
    if (!inRange(cents, costRange))
      missing.push(`o custo total por chamada (${rangeText(costRange)})`);
    if (!sha(evidence))
      missing.push("o SHA-256 da tabela (64 caracteres hexadecimais)");
    if (!lengthOk(certificateReason, certReasonRange))
      missing.push(
        `o motivo (de ${certReasonRange.min} a ${certReasonRange.max} caracteres)`,
      );
    if (!proofOk)
      missing.push("os comprovantes (dois hashes diferentes e a conferência)");
    return missing;
  }

  function reviewCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCertAttempted(true);
    if (certMissing().length > 0) return;
    setError("");
    setReviewing("certificate");
  }

  async function publishCertificate() {
    if (busy || !active) return;
    setBusy(true);
    try {
      await publishRegistryCertificateTariff(
        {
          account_id: account.id,
          code: kind,
          state: kind === "estadual" ? state.trim().toUpperCase() : null,
          unit_cost_cents: parseMoney(cost),
          evidence_sha256: evidence,
          sample_document_sha256: sampleDocument || null,
          sample_charge_sha256: sampleCharge || null,
          delivery_proof_confirmed: proofConfirmed ? true : null,
          reason: certificateReason.trim(),
          contract_verified: true,
          supplier_fee_covered: true,
        },
        csrf,
      );
      setReviewing(null);
      setCost("");
      setEvidence("");
      setSampleDocument("");
      setSampleCharge("");
      setProofConfirmed(false);
      setCertificateReason("");
      setCertOpen(false);
      onToast(
        "Tarifa opcional publicada até nova atualização para esta conta.",
        "success",
      );
      await load(undefined, "certificate");
    } catch (cause) {
      setReviewing(null);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Publicação não confirmada. Atualize o histórico.",
        );
    } finally {
      setBusy(false);
    }
  }

  function arispMissing(): string[] {
    const order = parseMoney(orderFee);
    const download = parseMoney(downloadFee);
    const missing: string[] = [];
    if (!linkedAccount) missing.push("a conta vinculada");
    if (!inRange(order, orderRange))
      missing.push(`o valor do pedido (${rangeText(orderRange)})`);
    if (!inRange(download, downloadRange))
      missing.push(`o valor de cada download (${rangeText(downloadRange)})`);
    if (!sha(arispEvidence))
      missing.push("o SHA-256 da tabela (64 caracteres hexadecimais)");
    if (!lengthOk(arispReason, arispReasonRange))
      missing.push(
        `o motivo (de ${arispReasonRange.min} a ${arispReasonRange.max} caracteres)`,
      );
    if (!typeGroupOk)
      missing.push("o tipo de ônus completo (tipo, SHA-256 e confirmação)");
    return missing;
  }

  function reviewArisp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setArispAttempted(true);
    if (arispMissing().length > 0) return;
    setError("");
    setReviewing("arisp");
  }

  async function publishArisp() {
    if (busy || !active) return;
    setBusy(true);
    try {
      await publishRegistryArispTariff(
        {
          infosimples_account_id:
            account.provider === "infosimples" ? account.id : linkedAccount,
          onr_account_id:
            account.provider === "onr" ? account.id : linkedAccount,
          order_fee_cents: parseMoney(orderFee),
          download_fee_cents: parseMoney(downloadFee),
          evidence_sha256: arispEvidence,
          reason: arispReason.trim(),
          contract_verified: true,
          supplier_fee_covered: true,
          certificate_type: certificateType.trim() || null,
          certificate_type_evidence_sha256: certificateTypeEvidence || null,
          certificate_type_verified: typeConfirmed ? true : null,
        },
        csrf,
      );
      setReviewing(null);
      setOrderFee("");
      setDownloadFee("");
      setArispEvidence("");
      setCertificateType("");
      setCertificateTypeEvidence("");
      setTypeConfirmed(false);
      setArispReason("");
      setArispOpen(false);
      onToast(
        "Tarifa da API de certidão registrada até nova atualização.",
        "success",
      );
      await load();
    } catch (cause) {
      setReviewing(null);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Publicação não confirmada. Atualize o histórico.",
        );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sup-optional-tariffs">
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {account.provider === "infosimples" && (
        <>
          <SettingCard
            title="Certidões InfoSimples"
            help="A tarifa total é própria desta conta e fica vigente até o gestor atualizá-la. Sem PDF real e débito comprovados, a oferta continua indisponível."
            actions={
              <button
                type="button"
                className="btn btn-primary btn-md"
                aria-haspopup="dialog"
                disabled={!active}
                onClick={() => {
                  setCertAttempted(false);
                  setCertOpen(true);
                }}
              >
                Nova tarifa
              </button>
            }
          >
            {loading && !certificates.length && (
              <p role="status">Carregando tarifas…</p>
            )}
            <ul className="sup-tariff-list">
              {certificates.map((item) => (
                <li key={item.id}>
                  <strong>
                    {kinds.find((kind) => kind.value === item.code)?.label ??
                      item.code}
                    {item.state ? ` · ${item.state}` : ""}
                  </strong>
                  <span>
                    {money(item.unit_cost_cents)} ·{" "}
                    {supplierTariffValidityLabel(item.valid_until)}
                  </span>
                  <small>
                    {item.sample_document_sha256 && item.sample_charge_sha256
                      ? "Comprovantes registrados"
                      : "Sem comprovantes de entrega"}
                  </small>
                </li>
              ))}
            </ul>
            {certificateCursor && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={loading}
                onClick={() => void load(certificateCursor, "certificate")}
              >
                Mais versões
              </button>
            )}
          </SettingCard>
          {certOpen && (
            <Composer
              title="Nova tarifa de certidão"
              steps={[
                { id: "values", label: "Valores", state: certStates[0] },
                { id: "evidence", label: "Evidência", state: certStates[1] },
                { id: "review", label: "Revisão", state: certStates[2] },
              ]}
              onClose={() => !busy && setCertOpen(false)}
              summary={
                <ComposerSummary
                  title="Resumo da nova versão"
                  total={Number.isNaN(certCents) ? "—" : money(certCents)}
                  delta={
                    !Number.isNaN(certCents) && certCurrent ? (
                      <>
                        <Delta
                          current={certCents}
                          previous={certCurrent.unit_cost_cents}
                        />{" "}
                        <small className="sup-muted">
                          atual {money(certCurrent.unit_cost_cents)}
                        </small>
                      </>
                    ) : undefined
                  }
                  rows={[
                    {
                      label: "Tipo",
                      value:
                        kinds.find((item) => item.value === kind)?.label ??
                        kind,
                    },
                    ...(kind === "estadual"
                      ? [
                          {
                            label: "UF",
                            value: state.trim().toUpperCase() || "—",
                          },
                        ]
                      : []),
                    {
                      label: "Comprovantes",
                      value:
                        sampleDocument && sampleCharge
                          ? "Registrados"
                          : "Sem comprovantes",
                    },
                    { label: "Vigência", value: "Até atualização" },
                  ]}
                  footer={
                    reviewing === "certificate" ? (
                      <div
                        className="sup-review"
                        role="group"
                        aria-label="Confirmar tarifa"
                      >
                        <p>
                          Publicar{" "}
                          <strong>
                            {Number.isNaN(certCents) ? "—" : money(certCents)}
                          </strong>{" "}
                          para {kind}? Fica na auditoria e vale até a próxima
                          atualização.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary btn-md"
                          disabled={busy}
                          onClick={() => void publishCertificate()}
                        >
                          {busy ? "Publicando…" : "Confirmar e publicar"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-md"
                          disabled={busy}
                          onClick={() => setReviewing(null)}
                        >
                          Voltar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        form="certificate-form"
                        className="btn btn-primary btn-md"
                        disabled={!active || busy}
                      >
                        Revisar tarifa
                      </button>
                    )
                  }
                />
              }
            >
              {error && (
                <p className="alert alert-danger" role="alert">
                  {error}
                </p>
              )}
              {certAttempted && certMissing().length > 0 && (
                <p className="alert alert-danger" role="alert">
                  Falta ou está inválido: {certMissing().join("; ")}.
                </p>
              )}
              <form
                id="certificate-form"
                className="sup-composer-form"
                onSubmit={reviewCertificate}
                noValidate
              >
                <ComposerSection
                  title="Valores"
                  state={certStates[0]}
                  recap={`${kinds.find((item) => item.value === kind)?.label ?? kind} · ${Number.isNaN(certCents) ? "—" : money(certCents)}`}
                >
                  <label>
                    Tipo
                    <select
                      className="input"
                      value={kind}
                      disabled={!active || busy}
                      onChange={(event) => {
                        setKind(event.target.value as RegistryCertificateKind);
                        setState("");
                        setReviewing(null);
                      }}
                    >
                      {kinds.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {kind === "estadual" && (
                    <label>
                      UF
                      <input
                        className="input"
                        value={state}
                        maxLength={2}
                        disabled={!active || busy}
                        onChange={(event) => setState(event.target.value)}
                      />
                    </label>
                  )}
                  <label>
                    Custo total por chamada (R$)
                    <input
                      className="input"
                      inputMode="decimal"
                      placeholder="0,24"
                      value={cost}
                      disabled={!active || busy}
                      onChange={(event) => setCost(event.target.value)}
                    />
                  </label>
                </ComposerSection>

                <ComposerSection
                  title="Evidência"
                  state={certStates[1]}
                  recap={`SHA ${evidence.slice(0, 8)}… · ${certificateReason.trim().slice(0, 40)}`}
                >
                  <label>
                    SHA-256 da tabela de preços
                    <input
                      className="input"
                      value={evidence}
                      maxLength={64}
                      disabled={!active || busy}
                      onChange={(event) => setEvidence(event.target.value)}
                    />
                  </label>
                  <label>
                    Motivo
                    <textarea
                      className="input"
                      rows={3}
                      maxLength={certReasonRange.max}
                      value={certificateReason}
                      disabled={!active || busy}
                      onChange={(event) =>
                        setCertificateReason(event.target.value)
                      }
                    />
                    <small>
                      Fica na auditoria. Sem senhas, tokens ou matrículas.
                    </small>
                  </label>
                  <details>
                    <summary>Comprovantes de entrega (opcional)</summary>
                    <label>
                      SHA-256 do PDF
                      <input
                        className="input"
                        value={sampleDocument}
                        maxLength={64}
                        disabled={!active || busy}
                        onChange={(event) =>
                          setSampleDocument(event.target.value)
                        }
                      />
                      <small>
                        Hashes distintos do PDF e do débito real, após conferir
                        ambos.
                      </small>
                    </label>
                    <label>
                      SHA-256 do débito
                      <input
                        className="input"
                        value={sampleCharge}
                        maxLength={64}
                        disabled={!active || busy}
                        onChange={(event) =>
                          setSampleCharge(event.target.value)
                        }
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={proofConfirmed}
                        disabled={!active || busy}
                        onChange={(event) =>
                          setProofConfirmed(event.target.checked)
                        }
                      />
                      Conferi visualmente o PDF e o débito
                    </label>
                  </details>
                </ComposerSection>
              </form>
            </Composer>
          )}
        </>
      )}
      <SettingCard
        title="API de certidão RI Digital"
        help="Pedido e até três downloads pela InfoSimples, ligados à conta RI Digital. O custo da compra no portal é cotado à parte."
        actions={
          <button
            type="button"
            className="btn btn-primary btn-md"
            aria-haspopup="dialog"
            disabled={!active}
            onClick={() => {
              setArispAttempted(false);
              setArispOpen(true);
            }}
          >
            Nova tarifa
          </button>
        }
      >
        {loading && !arisp.length && <p role="status">Carregando tarifas…</p>}
        <ul className="sup-tariff-list">
          {arisp.map((item) => (
            <li key={item.id}>
              <strong>Reserva da API {money(item.budget_cents)}</strong>
              <span>
                Pedido {money(item.order_fee_cents)} · download{" "}
                {money(item.download_fee_cents)} × {item.download_budget_count}
              </span>
              <small>
                {item.certificate_type
                  ? `Tipo ${item.certificate_type} comprovado`
                  : "Tipo de ônus não comprovado"}{" "}
                · {supplierTariffValidityLabel(item.valid_until)}
              </small>
            </li>
          ))}
        </ul>
        {arispCursor && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={loading}
            onClick={() => void load(arispCursor)}
          >
            Mais versões
          </button>
        )}
      </SettingCard>
      {arispOpen && (
        <Composer
          title="Nova tarifa da API de certidão"
          steps={[
            { id: "values", label: "Valores", state: arispStates[0] },
            { id: "evidence", label: "Evidência", state: arispStates[1] },
            { id: "review", label: "Revisão", state: arispStates[2] },
          ]}
          onClose={() => !busy && setArispOpen(false)}
          summary={
            <ComposerSummary
              title="Resumo da nova versão"
              total={arispBudget === null ? "—" : money(arispBudget)}
              delta={
                arispBudget !== null && arisp[0] ? (
                  <>
                    <Delta
                      current={arispBudget}
                      previous={arisp[0].budget_cents}
                    />{" "}
                    <small className="sup-muted">
                      atual {money(arisp[0].budget_cents)}
                    </small>
                  </>
                ) : undefined
              }
              rows={[
                {
                  label: "Pedido",
                  value: Number.isNaN(arispOrder) ? "—" : money(arispOrder),
                },
                {
                  label: "3 × download",
                  value: Number.isNaN(arispDownload)
                    ? "—"
                    : money(3 * arispDownload),
                },
                {
                  label: "Tipo de ônus",
                  value: certificateType.trim() || "Não comprovado",
                },
                { label: "Vigência", value: "Até atualização" },
              ]}
              footer={
                reviewing === "arisp" ? (
                  <div
                    className="sup-review"
                    role="group"
                    aria-label="Confirmar tarifa"
                  >
                    <p>
                      Publicar reserva da API de{" "}
                      <strong>
                        {arispBudget === null ? "—" : money(arispBudget)}
                      </strong>
                      ? Fica na auditoria e vale até a próxima atualização.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-md"
                      disabled={busy}
                      onClick={() => void publishArisp()}
                    >
                      {busy ? "Publicando…" : "Confirmar e publicar"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-md"
                      disabled={busy}
                      onClick={() => setReviewing(null)}
                    >
                      Voltar
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    form="arisp-form"
                    className="btn btn-primary btn-md"
                    disabled={!active || busy}
                  >
                    Revisar tarifa
                  </button>
                )
              }
            />
          }
        >
          {error && (
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
          )}
          {arispAttempted && arispMissing().length > 0 && (
            <p className="alert alert-danger" role="alert">
              Falta ou está inválido: {arispMissing().join("; ")}.
            </p>
          )}
          <form
            id="arisp-form"
            className="sup-composer-form"
            onSubmit={reviewArisp}
            noValidate
          >
            <ComposerSection
              title="Valores"
              state={arispStates[0]}
              recap={`Pedido ${Number.isNaN(arispOrder) ? "—" : money(arispOrder)} · download ${Number.isNaN(arispDownload) ? "—" : money(arispDownload)}`}
            >
              <label className="sup-span">
                Conta {otherProvider === "onr" ? "RI Digital" : "InfoSimples"}{" "}
                vinculada
                <select
                  className="input"
                  value={linkedAccount}
                  disabled={!active || busy}
                  onChange={(event) => setLinkedAccount(event.target.value)}
                >
                  <option value="">Selecione a conta ativa</option>
                  {otherAccounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pedido (R$)
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="0,28"
                  value={orderFee}
                  disabled={!active || busy}
                  onChange={(event) => setOrderFee(event.target.value)}
                />
              </label>
              <label>
                Cada download (R$)
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="0,20"
                  value={downloadFee}
                  disabled={!active || busy}
                  onChange={(event) => setDownloadFee(event.target.value)}
                />
              </label>
            </ComposerSection>

            <ComposerSection
              title="Evidência"
              state={arispStates[1]}
              recap={`SHA ${arispEvidence.slice(0, 8)}… · ${arispReason.trim().slice(0, 40)}`}
            >
              <label>
                SHA-256 da tabela de preços
                <input
                  className="input"
                  value={arispEvidence}
                  maxLength={64}
                  disabled={!active || busy}
                  onChange={(event) => setArispEvidence(event.target.value)}
                />
              </label>
              <label>
                Motivo
                <textarea
                  className="input"
                  rows={3}
                  maxLength={arispReasonRange.max}
                  value={arispReason}
                  disabled={!active || busy}
                  onChange={(event) => setArispReason(event.target.value)}
                />
                <small>
                  Fica na auditoria. Sem senhas, tokens ou matrículas.
                </small>
              </label>
              <details>
                <summary>Tipo literal de ônus (opcional)</summary>
                <label>
                  tipo_certidao aceito
                  <input
                    className="input"
                    value={certificateType}
                    maxLength={80}
                    disabled={!active || busy}
                    onChange={(event) => setCertificateType(event.target.value)}
                  />
                  <small>
                    Só se a conta aceitou este valor e você guardou a evidência.
                  </small>
                </label>
                <label>
                  SHA-256 da evidência do tipo
                  <input
                    className="input"
                    value={certificateTypeEvidence}
                    maxLength={64}
                    disabled={!active || busy}
                    onChange={(event) =>
                      setCertificateTypeEvidence(event.target.value)
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={typeConfirmed}
                    disabled={!active || busy}
                    onChange={(event) => setTypeConfirmed(event.target.checked)}
                  />
                  Conferi o tipo aceito na conta
                </label>
              </details>
            </ComposerSection>
          </form>
        </Composer>
      )}
    </div>
  );
}
