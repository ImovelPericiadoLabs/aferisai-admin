import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  getApplicationProfile,
  replaceApplicationProfile,
  type ApplicationProfile,
} from "./api";

type Props = {
  applicationId: string;
  csrfToken: string;
  canEdit: boolean;
  onUnauthorized: () => void;
};

type Draft = Omit<ApplicationProfile, "application_id" | "version">;

const EMPTY: Draft = {
  description: null,
  logo_url: null,
  website_url: null,
  privacy_url: null,
  terms_url: null,
  support_url: null,
};

const fields: {
  key: keyof Draft;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "description",
    label: "Descrição da aplicação",
    hint: "Até 500 caracteres; aparece no consentimento OAuth.",
    placeholder: "Ex.: Integração segura para acompanhar análises.",
  },
  {
    key: "logo_url",
    label: "Logo",
    hint: "URL HTTPS ou caminho relativo acessível ao titular.",
    placeholder: "https://parceiro.example/logo.svg",
  },
  {
    key: "website_url",
    label: "Site",
    hint: "URL HTTPS pública da aplicação.",
    placeholder: "https://parceiro.example",
  },
  {
    key: "privacy_url",
    label: "Política de privacidade",
    hint: "Link exibido antes da aprovação.",
    placeholder: "https://parceiro.example/privacidade",
  },
  {
    key: "terms_url",
    label: "Termos da aplicação",
    hint: "Link das regras específicas do parceiro.",
    placeholder: "https://parceiro.example/termos",
  },
  {
    key: "support_url",
    label: "Suporte",
    hint: "Canal público para dúvidas da integração.",
    placeholder: "https://parceiro.example/suporte",
  },
];

/** Manage the public metadata shown in delegated OAuth consent. */
export function ApplicationProfileManagement({
  applicationId,
  csrfToken,
  canEdit,
  onUnauthorized,
}: Props) {
  const [profile, setProfile] = useState<ApplicationProfile | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let live = true;
    void getApplicationProfile(applicationId)
      .then((result) => {
        if (!live) return;
        setProfile(result);
        setDraft({
          description: result.description,
          logo_url: result.logo_url,
          website_url: result.website_url,
          privacy_url: result.privacy_url,
          terms_url: result.terms_url,
          support_url: result.support_url,
        });
      })
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else if (live) setError("Não foi possível consultar o perfil público.");
      });
    return () => {
      live = false;
    };
  }, [applicationId, onUnauthorized]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile || !canEdit) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await replaceApplicationProfile(
        applicationId,
        draft,
        profile.version,
        csrfToken,
      );
      setProfile(result);
      setNotice(
        "Perfil público atualizado. A próxima tela de consentimento já usará estes dados.",
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else if (cause instanceof ApiError && cause.status === 409)
        setError(
          "O perfil mudou em outra sessão. Recarregue antes de salvar novamente.",
        );
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível salvar o perfil público.",
        );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cred" aria-label="Perfil público OAuth">
      <div>
        <h3 className="appws-section-title">Perfil público do consentimento</h3>
        <p className="form-hint">
          Esses dados aparecem para o titular antes de permitir o acesso. Não
          coloque segredo, token ou dado pessoal.
        </p>
      </div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {profile && (
        <form className="app-profile-form" onSubmit={save}>
          {fields.map((field) => (
            <label className="app-profile-field" key={field.key}>
              <span className="form-field-label">{field.label}</span>
              {field.key === "description" ? (
                <textarea
                  className="input"
                  rows={3}
                  maxLength={500}
                  disabled={!canEdit || busy}
                  placeholder={field.placeholder}
                  value={draft[field.key] ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [field.key]: event.target.value || null,
                    })
                  }
                />
              ) : (
                <input
                  className="input"
                  type="url"
                  disabled={!canEdit || busy}
                  placeholder={field.placeholder}
                  value={draft[field.key] ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [field.key]: event.target.value || null,
                    })
                  }
                />
              )}
              <span className="form-hint">{field.hint}</span>
            </label>
          ))}
          {canEdit && (
            <button
              className="btn btn-primary btn-md"
              type="submit"
              disabled={busy || !profile}
            >
              {busy ? "Salvando…" : "Salvar perfil público"}
            </button>
          )}
          {!canEdit && (
            <p className="form-hint">
              Somente leitura: seu perfil não pode editar os dados públicos da
              aplicação.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
