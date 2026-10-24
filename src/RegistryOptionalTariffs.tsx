import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  listRegistryArispTariffs,
  listRegistryCertificateTariffs,
  publishRegistryArispTariff,
  publishRegistryCertificateTariff,
  type RegistryArispTariff,
  type RegistryCertificateKind,
  type RegistryCertificateTariff,
  type RegistrySupplierAccount,
} from "./api";
import { FormModal, SettingCard } from "./SupplierUi";
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
  const [certOpen, setCertOpen] = useState(false);
  const [arispOpen, setArispOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = account.status === "active";
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
        } else {
          const page = await listRegistryArispTariffs(account.id, next);
          setArisp((old) => (next ? [...old, ...page.items] : page.items));
          setArispCursor(page.next_cursor);
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

  function reviewCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseMoney(cost);
    if (
      !Number.isSafeInteger(cents) ||
      cents <= 0 ||
      cents > 100000 ||
      !sha(evidence) ||
      certificateReason.trim().length < 10 ||
      (kind === "estadual" && !/^[A-Z]{2}$/.test(state.trim().toUpperCase())) ||
      (kind !== "estadual" && state.trim()) ||
      ((sampleDocument || sampleCharge || proofConfirmed) &&
        (!sha(sampleDocument) ||
          !sha(sampleCharge) ||
          sampleDocument === sampleCharge ||
          !proofConfirmed))
    ) {
      setError(
        "Confira tipo, UF, custo em reais, evidência, comprovantes e motivo.",
      );
      return;
    }
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

  function reviewArisp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const order = parseMoney(orderFee);
    const download = parseMoney(downloadFee);
    if (
      !linkedAccount ||
      !Number.isSafeInteger(order) ||
      order <= 0 ||
      order > 100000 ||
      !Number.isSafeInteger(download) ||
      download <= 0 ||
      download > 100000 ||
      !sha(arispEvidence) ||
      arispReason.trim().length < 10 ||
      ((certificateType || certificateTypeEvidence || typeConfirmed) &&
        (!certificateType.trim() ||
          !sha(certificateTypeEvidence) ||
          !typeConfirmed))
    ) {
      setError(
        "Confira as duas contas, pedido, downloads, evidência, tipo comprovado e motivo.",
      );
      return;
    }
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
                onClick={() => setCertOpen(true)}
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
          <FormModal
            open={certOpen}
            title="Nova tarifa de certidão"
            onClose={() => !busy && setCertOpen(false)}
          >
            {error && (
              <p className="alert alert-danger" role="alert">
                {error}
              </p>
            )}

            <form
              className="sup-form-grid"
              onSubmit={reviewCertificate}
              noValidate
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
                  value={cost}
                  disabled={!active || busy}
                  onChange={(event) => setCost(event.target.value)}
                />
              </label>
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
              <details>
                <summary>Comprovantes de entrega (opcional)</summary>
                <p className="form-hint">
                  Informe os hashes distintos do PDF e do débito real após
                  conferir ambos.
                </p>
                <label>
                  SHA-256 do PDF
                  <input
                    className="input"
                    value={sampleDocument}
                    maxLength={64}
                    disabled={!active || busy}
                    onChange={(event) => setSampleDocument(event.target.value)}
                  />
                </label>
                <label>
                  SHA-256 do débito
                  <input
                    className="input"
                    value={sampleCharge}
                    maxLength={64}
                    disabled={!active || busy}
                    onChange={(event) => setSampleCharge(event.target.value)}
                  />
                </label>
                <label className="sup-tariff-check">
                  <input
                    type="checkbox"
                    checked={proofConfirmed}
                    disabled={!active || busy}
                    onChange={(event) =>
                      setProofConfirmed(event.target.checked)
                    }
                  />{" "}
                  Conferi visualmente o PDF e o débito
                </label>
              </details>
              <label>
                Motivo
                <textarea
                  className="input"
                  rows={3}
                  maxLength={500}
                  value={certificateReason}
                  disabled={!active || busy}
                  onChange={(event) => setCertificateReason(event.target.value)}
                />
              </label>
              {reviewing === "certificate" ? (
                <div className="sup-tariff-review">
                  <strong>
                    Publicar {money(parseMoney(cost))} para {kind}?
                  </strong>
                  <button
                    type="button"
                    className="btn btn-primary btn-md"
                    disabled={busy}
                    onClick={() => void publishCertificate()}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => setReviewing(null)}
                  >
                    Voltar
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="btn btn-secondary btn-md"
                  disabled={!active || busy}
                >
                  Revisar tarifa
                </button>
              )}
            </form>
          </FormModal>
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
            onClick={() => setArispOpen(true)}
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
      <FormModal
        open={arispOpen}
        title="Nova tarifa da API de certidão"
        onClose={() => !busy && setArispOpen(false)}
      >
        {error && (
          <p className="alert alert-danger" role="alert">
            {error}
          </p>
        )}

        <form className="sup-form-grid" onSubmit={reviewArisp} noValidate>
          <label>
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
              value={orderFee}
              disabled={!active || busy}
              onChange={(event) => setOrderFee(event.target.value)}
            />
          </label>
          <label>
            Download (R$)
            <input
              className="input"
              inputMode="decimal"
              value={downloadFee}
              disabled={!active || busy}
              onChange={(event) => setDownloadFee(event.target.value)}
            />
          </label>
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
          <details>
            <summary>Tipo literal de ônus (opcional)</summary>
            <p className="form-hint">
              Cadastre somente se a conta aceitou este valor e você guardou a
              evidência da API.
            </p>
            <label>
              tipo_certidao aceito
              <input
                className="input"
                value={certificateType}
                maxLength={80}
                disabled={!active || busy}
                onChange={(event) => setCertificateType(event.target.value)}
              />
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
            <label className="sup-tariff-check">
              <input
                type="checkbox"
                checked={typeConfirmed}
                disabled={!active || busy}
                onChange={(event) => setTypeConfirmed(event.target.checked)}
              />{" "}
              Conferi o tipo aceito na conta
            </label>
          </details>
          <label>
            Motivo
            <textarea
              className="input"
              rows={3}
              maxLength={500}
              value={arispReason}
              disabled={!active || busy}
              onChange={(event) => setArispReason(event.target.value)}
            />
          </label>
          {reviewing === "arisp" ? (
            <div className="sup-tariff-review">
              <strong>
                Reserva da API{" "}
                {money(parseMoney(orderFee) + parseMoney(downloadFee) * 3)}?
              </strong>
              <button
                type="button"
                className="btn btn-primary btn-md"
                disabled={busy}
                onClick={() => void publishArisp()}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => setReviewing(null)}
              >
                Voltar
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="btn btn-secondary btn-md"
              disabled={!active || busy}
            >
              Revisar tarifa
            </button>
          )}
        </form>
      </FormModal>
    </div>
  );
}
