import { useState, type FormEvent } from "react";
import {
  ApiError,
  completePartnerPasswordRecovery,
  requestPartnerPasswordRecovery,
} from "./api";
import { PartnerAuthShell } from "./PartnerAuthShell";

function tokenFromLocation() {
  return (
    new URLSearchParams(window.location.hash.split("?")[1] || "").get(
      "token",
    ) || ""
  );
}

export function PartnerPasswordRecovery({ onBack }: { onBack: () => void }) {
  const token = tokenFromLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [sent, setSent] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestPartnerPasswordRecovery(email.trim());
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível solicitar a recuperação.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 15 || password !== confirmation) {
      setError(
        password !== confirmation
          ? "As senhas não conferem."
          : "Use pelo menos 15 caracteres.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await completePartnerPasswordRecovery(token, password);
      setPassword("");
      setConfirmation("");
      setCompleted(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "O link expirou ou já foi utilizado.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PartnerAuthShell>
      <button type="button" className="pp-recovery-back" onClick={onBack}>
        <span aria-hidden="true">←</span> Voltar para o acesso
      </button>
      <p className="pp-kicker">Recuperação segura</p>
      <h1 className="pp-title">
        {token ? "Crie uma nova senha" : "Recupere sua senha"}
      </h1>
      {completed ? (
        <div className="pp-stack">
          <p className="form-hint">
            Senha alterada. Todas as sessões anteriores foram encerradas.
          </p>
          <a className="btn btn-primary btn-md" href="/#parceiro">
            Voltar para o acesso
          </a>
        </div>
      ) : token ? (
        <form
          className="pp-stack"
          onSubmit={(event) => void resetPassword(event)}
        >
          <p className="form-hint">
            Escolha uma senha com pelo menos 15 caracteres. O link vale por 15
            minutos e só pode ser usado uma vez.
          </p>
          <div className="form-field">
            <label
              className="form-field-label"
              htmlFor="partner-reset-password"
            >
              Nova senha
            </label>
            <input
              id="partner-reset-password"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={15}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label
              className="form-field-label"
              htmlFor="partner-reset-password-confirm"
            >
              Repita a nova senha
            </label>
            <input
              id="partner-reset-password-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={15}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </div>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <button
            className="btn btn-primary btn-md"
            disabled={busy || password.length < 15 || confirmation.length < 15}
          >
            {busy ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      ) : sent ? (
        <div className="pp-stack">
          <p className="form-hint">
            Se houver uma conta elegível para este e-mail, enviaremos as
            instruções. Confira também o spam.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={onBack}
          >
            Voltar para entrar
          </button>
        </div>
      ) : (
        <form
          className="pp-stack"
          onSubmit={(event) => void requestLink(event)}
        >
          <p className="form-hint">
            Informe o e-mail usado no convite. A resposta é igual para contas
            existentes e inexistentes.
          </p>
          <div className="form-field">
            <label
              className="form-field-label"
              htmlFor="partner-recovery-email"
            >
              E-mail da parceria
            </label>
            <input
              id="partner-recovery-email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <button className="btn btn-primary btn-md" disabled={busy}>
            {busy ? "Enviando…" : "Enviar link por e-mail"}
          </button>
        </form>
      )}
    </PartnerAuthShell>
  );
}
