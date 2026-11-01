import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  listRegistryArispTariffs,
  listRegistryCertificateTariffs,
  publishRegistryArispTariff,
  publishRegistryCertificateTariff,
  type RegistryArispTariff,
  type RegistryArispTariffPage,
  type RegistryCertificateTariff,
  type RegistryCertificateTariffPage,
  type RegistrySupplierAccount,
} from "./api";
import { SettingCard } from "./SupplierUi";
import {
  ArispTariffHistory,
  CertificateTariffHistory,
} from "./RegistryTariffHistory";
import type { ToastKind } from "./useToast";
import { RegistryArispTariffComposer } from "./RegistryArispTariffComposer";
import { RegistryCertificateTariffComposer } from "./RegistryCertificateTariffComposer";
import { parseMoney } from "./registry-optional-tariffs-model";
import {
  useArispTariffForm,
  useCertificateTariffForm,
  type Reviewing,
} from "./useRegistryTariffForms";

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
  const [reviewing, setReviewing] = useState<Reviewing>(null);
  const [arispRaw, setArispRaw] = useState<RegistryArispTariffPage["limits"]>();
  const [certRaw, setCertRaw] =
    useState<RegistryCertificateTariffPage["limits"]>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cert = useCertificateTariffForm({
    certificates,
    limits: certRaw,
    reviewing,
  });
  const arispForm = useArispTariffForm({ limits: arispRaw, reviewing });
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

  function reviewCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cert.setAttempted(true);
    if (cert.missing().length > 0) return;
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
          code: cert.kind,
          state:
            cert.kind === "estadual" ? cert.state.trim().toUpperCase() : null,
          unit_cost_cents: parseMoney(cert.cost),
          evidence_mode: cert.evidenceMode,
          evidence_sha256:
            cert.evidenceMode === "supplier_file" ? cert.evidence : null,
          operational_attestation:
            cert.evidenceMode === "admin_declaration" &&
            cert.operationalAttested
              ? true
              : null,
          sample_document_sha256: cert.sampleDocument || null,
          sample_charge_sha256: cert.sampleCharge || null,
          delivery_proof_confirmed: cert.proofConfirmed ? true : null,
          reason: cert.reason.trim(),
          contract_verified: true,
          supplier_fee_covered: true,
        },
        csrf,
      );
      setReviewing(null);
      cert.resetAfterPublish();
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
    arispForm.setAttempted(true);
    if (arispForm.missing().length > 0) return;
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
            account.provider === "infosimples"
              ? account.id
              : arispForm.linkedAccount,
          onr_account_id:
            account.provider === "onr" ? account.id : arispForm.linkedAccount,
          order_fee_cents: parseMoney(arispForm.orderFee),
          download_fee_cents: parseMoney(arispForm.downloadFee),
          evidence_mode: arispForm.evidenceMode,
          evidence_sha256:
            arispForm.evidenceMode === "supplier_file"
              ? arispForm.evidence
              : null,
          reason: arispForm.reason.trim(),
          contract_verified: true,
          supplier_fee_covered: true,
          certificate_type: arispForm.certificateType.trim() || null,
          certificate_type_evidence_sha256:
            arispForm.certificateTypeEvidence || null,
          certificate_type_verified: arispForm.typeConfirmed ? true : null,
        },
        csrf,
      );
      setReviewing(null);
      arispForm.resetAfterPublish();
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
            help="Informe a tarifa total desta conta. Se não houver PDF e débito de amostra, o administrador pode aprovar a oferta por melhor esforço com declaração auditada."
            actions={
              <button
                type="button"
                className="btn btn-primary btn-md"
                aria-haspopup="dialog"
                disabled={!active}
                onClick={() => {
                  cert.setAttempted(false);
                  cert.setOpen(true);
                }}
              >
                Nova tarifa
              </button>
            }
          >
            {loading && !certificates.length && (
              <p role="status">Carregando tarifas…</p>
            )}
            <CertificateTariffHistory items={certificates} />
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
          {cert.open && (
            <RegistryCertificateTariffComposer
              form={cert}
              active={active}
              busy={busy}
              error={error}
              setError={setError}
              reviewing={reviewing}
              setReviewing={setReviewing}
              onPublish={() => void publishCertificate()}
              onReview={reviewCertificate}
            />
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
              arispForm.setAttempted(false);
              arispForm.setOpen(true);
            }}
          >
            Nova tarifa
          </button>
        }
      >
        {loading && !arisp.length && <p role="status">Carregando tarifas…</p>}
        <ArispTariffHistory items={arisp} />
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
      {arispForm.open && (
        <RegistryArispTariffComposer
          form={arispForm}
          active={active}
          busy={busy}
          error={error}
          setError={setError}
          reviewing={reviewing}
          setReviewing={setReviewing}
          onPublish={() => void publishArisp()}
          onReview={reviewArisp}
          arisp={arisp}
          otherProvider={otherProvider}
          otherAccounts={otherAccounts}
        />
      )}
    </div>
  );
}
