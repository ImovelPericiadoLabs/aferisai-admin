import { useState, type FormEvent } from "react";
import { ApiError, createOrganization, type OnboardingResult } from "./api";
import {
  suggestedSlug,
  validateApplication,
  validateCompany,
  type OnboardingErrors,
} from "./partner-onboarding-model";
import { SecretReveal } from "./SecretReveal";
import "./partner-onboarding.css";

const steps = ["Empresa", "Aplicação", "Revisão"] as const;

export function PartnerOnboarding({
  csrf,
  onCancel,
  onDone,
  onUnauthorized,
}: {
  csrf: string;
  onCancel: () => void;
  onDone: () => void;
  onUnauthorized: () => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [application, setApplication] = useState("");
  const [customSlug, setCustomSlug] = useState(false);
  const [showIdentifier, setShowIdentifier] = useState(false);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<OnboardingResult | null>(null);

  function check(target: 0 | 1): boolean {
    const found =
      target === 0
        ? validateCompany(name, slug)
        : validateApplication(application);
    if (found.slug) setShowIdentifier(true);
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 2) {
      if (check(step as 0 | 1)) setStep((step + 1) as 0 | 1 | 2);
      return;
    }
    if (!check(0)) return setStep(0);
    if (!check(1)) return setStep(1);
    setBusy(true);
    setError("");
    try {
      const result = await createOrganization(
        {
          organization_slug: slug,
          organization_name: name,
          application_name: application,
        },
        csrf,
      );
      setCreated(result);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else if (
        cause instanceof ApiError &&
        cause.code === "organization.slug_taken"
      ) {
        setErrors({
          slug: "Este identificador já está em uso. Escolha outro.",
        });
        setShowIdentifier(true);
        setStep(0);
      } else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível cadastrar o parceiro agora.",
        );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page onboarding" aria-labelledby="onboarding-title">
      <button
        className="btn btn-ghost btn-sm onboarding-back"
        type="button"
        onClick={onCancel}
      >
        ← Parceiros
      </button>
      <header className="page-header">
        <div>
          <h1 className="page-title" id="onboarding-title">
            Novo parceiro
          </h1>
          <p className="page-subtitle">
            Crie a empresa e a primeira aplicação em três passos. A credencial
            inicial aparece uma única vez, ao concluir.
          </p>
        </div>
      </header>

      <ol className="stepper" aria-label="Etapas do cadastro">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              className="stepper-step"
              disabled={busy || index > step}
              aria-current={step === index ? "step" : undefined}
              data-done={index < step}
              onClick={() => {
                setStep(index as 0 | 1 | 2);
                setErrors({});
              }}
            >
              <span aria-hidden="true">{index < step ? "✓" : index + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <form
        className="onboarding-layout"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <div className="card onboarding-main">
          {step === 0 && (
            <fieldset className="form-section">
              <legend className="form-section-title">Dados da empresa</legend>
              <div className="form-field">
                <label className="form-field-label" htmlFor="org-name">
                  Nome da empresa
                </label>
                <input
                  id="org-name"
                  className="input"
                  autoFocus
                  maxLength={255}
                  value={name}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "org-name-error" : undefined}
                  placeholder="Ex.: Cartório Central"
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!customSlug) setSlug(suggestedSlug(event.target.value));
                    setErrors({});
                  }}
                />
                {errors.name && (
                  <span
                    className="form-hint onboarding-error"
                    id="org-name-error"
                    role="alert"
                  >
                    {errors.name}
                  </span>
                )}
              </div>
              <div className="onboarding-identifier">
                <span>
                  Identificador:{" "}
                  <strong>{slug || "gerado a partir do nome"}</strong>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-expanded={showIdentifier}
                  aria-controls="org-identifier-edit"
                  onClick={() => setShowIdentifier((visible) => !visible)}
                >
                  {showIdentifier ? "Ocultar edição" : "Editar"}
                </button>
              </div>
              {showIdentifier && (
                <div className="form-field" id="org-identifier-edit">
                  <label className="form-field-label" htmlFor="org-slug">
                    Identificador
                  </label>
                  <input
                    id="org-slug"
                    className="input"
                    maxLength={120}
                    value={slug}
                    aria-invalid={Boolean(errors.slug)}
                    aria-describedby="org-slug-hint"
                    placeholder="cartorio-central"
                    onChange={(event) => {
                      setCustomSlug(true);
                      setSlug(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""),
                      );
                      setErrors({});
                    }}
                  />
                  <span
                    className={`form-hint${errors.slug ? " onboarding-error" : ""}`}
                    id="org-slug-hint"
                    role={errors.slug ? "alert" : undefined}
                  >
                    {errors.slug ??
                      "Letras minúsculas, números e hífens. Deve ser único."}
                  </span>
                </div>
              )}
            </fieldset>
          )}
          {step === 1 && (
            <fieldset className="form-section">
              <legend className="form-section-title">Primeira aplicação</legend>
              <div className="form-field">
                <label className="form-field-label" htmlFor="app-name">
                  Nome da aplicação
                </label>
                <input
                  id="app-name"
                  className="input"
                  autoFocus
                  maxLength={255}
                  value={application}
                  aria-invalid={Boolean(errors.application)}
                  aria-describedby="app-name-hint"
                  placeholder="Ex.: Integração principal"
                  onChange={(event) => {
                    setApplication(event.target.value);
                    setErrors({});
                  }}
                />
                <span
                  className={`form-hint${errors.application ? " onboarding-error" : ""}`}
                  id="app-name-hint"
                  role={errors.application ? "alert" : undefined}
                >
                  {errors.application ??
                    "Use um nome que a equipe reconheça. A credencial inicial é mostrada uma única vez ao concluir."}
                </span>
              </div>
              <div className="alert" role="note">
                <strong>Consulta da própria aplicação</strong> é a permissão
                inicial obrigatória. Outros acessos podem ser configurados
                depois.
              </div>
            </fieldset>
          )}
          {step === 2 && (
            <fieldset className="form-section">
              <legend className="form-section-title">Revisar cadastro</legend>
              <dl className="detail-panel-field">
                <dt>Empresa</dt>
                <dd>{name.trim()}</dd>
                <dt>Identificador</dt>
                <dd>{slug}</dd>
                <dt>Aplicação</dt>
                <dd>{application.trim()}</dd>
                <dt>Acesso inicial</dt>
                <dd>Consulta da própria aplicação</dd>
              </dl>
              <p className="form-hint">
                O cadastro não cria uma conta de usuário. Convites e
                configurações adicionais ficam no detalhe da parceria.
              </p>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
            </fieldset>
          )}
          <footer className="onboarding-actions">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={busy}
              onClick={() =>
                step === 0 ? onCancel() : setStep((step - 1) as 0 | 1 | 2)
              }
            >
              {step === 0 ? "Cancelar" : "Voltar"}
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={busy}
            >
              {step < 2
                ? "Próximo →"
                : busy
                  ? "Cadastrando…"
                  : "Cadastrar parceiro"}
            </button>
          </footer>
        </div>
        <aside
          className="card onboarding-preview"
          aria-label="Resumo em tempo real"
        >
          <p className="onboarding-preview-label">Prévia do cadastro</p>
          <h2>{name.trim() || "Nome da empresa"}</h2>
          <p className="form-hint">{slug || "identificador"}</p>
          <dl className="detail-panel-field">
            <dt>Aplicação inicial</dt>
            <dd>{application.trim() || "A definir"}</dd>
            <dt>Credencial</dt>
            <dd>Gerada ao concluir</dd>
            <dt>Permissão inicial</dt>
            <dd>Consultar aplicação</dd>
          </dl>
        </aside>
      </form>

      {created && (
        <SecretReveal
          title="Parceiro cadastrado"
          description="Guarde a credencial por um canal seguro. O segredo não pode ser consultado de novo pela API."
          secretLabel="Client secret"
          secret={created.client_secret}
          details={[
            { label: "Client ID", value: created.client_id },
            { label: "Organização", value: created.organization_id },
            { label: "Aplicação", value: created.application_id },
          ]}
          onDismiss={() => {
            setCreated(null);
            onDone();
          }}
        />
      )}
    </section>
  );
}
