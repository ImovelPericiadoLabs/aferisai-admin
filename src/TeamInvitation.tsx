import { useState, type FormEvent } from "react";
import {
  ApiError,
  confirmTeamInvitation,
  enrollTeamInvitation,
  type TeamInvitationEnrollment,
} from "./api";
import "./team-invitation.css";

function invitationToken(): string {
  const hash = window.location.hash;
  if (!hash.startsWith("#equipe-convite?")) return "";
  return (
    new URLSearchParams(hash.slice(hash.indexOf("?") + 1)).get("token") ?? ""
  );
}

function errorMessage(cause: unknown): string {
  if (cause instanceof ApiError) return cause.detail;
  return "Não foi possível conectar à API. Tente novamente.";
}

export function TeamInvitation() {
  const [token] = useState(invitationToken);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [enrollment, setEnrollment] = useState<TeamInvitationEnrollment | null>(
    null,
  );
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  async function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== passwordConfirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setEnrollment(await enrollTeamInvitation(token, password));
      setPassword("");
      setPasswordConfirmation("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await confirmTeamInvitation(token, otp);
      setEnrollment(null);
      setOtp("");
      setCompleted(true);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="team-invitation-layout">
      <section className="team-invitation-story" aria-label="AferisAI">
        <img src="/logo-light.svg" alt="AferisAI" />
        <div>
          <p className="eyebrow">Acesso interno</p>
          <h1>Uma equipe, decisões com responsabilidade.</h1>
          <p>Seu acesso é individual e protegido por senha e autenticador.</p>
        </div>
        <small>AferisAI · Operação e governança</small>
      </section>
      <section
        className="team-invitation-panel"
        aria-labelledby="invitation-title"
      >
        <div className="team-invitation-card">
          <p className="eyebrow">Convite para a equipe</p>
          {completed ? (
            <>
              <h2 id="invitation-title">Acesso ativado</h2>
              <p>
                Seu autenticador foi confirmado. Você já pode entrar na área da
                equipe.
              </p>
              <a className="button primary" href="/">
                Entrar no painel
              </a>
            </>
          ) : !token ? (
            <>
              <h2 id="invitation-title">Convite não encontrado</h2>
              <p>Abra o link completo que chegou ao seu e-mail.</p>
            </>
          ) : enrollment ? (
            <form
              className="team-invitation-form"
              onSubmit={(event) => void confirm(event)}
            >
              <h2 id="invitation-title">Ative seu autenticador</h2>
              <p>
                Cadastre a chave abaixo no seu aplicativo autenticador. Ela é
                exibida somente nesta etapa; mantenha esta página aberta até
                confirmar.
              </p>
              <div className="team-invitation-secret">
                <span>Chave do autenticador</span>
                <code>{enrollment.totp_secret}</code>
              </div>
              <label htmlFor="team-invitation-otp">Código de 6 dígitos</label>
              <input
                id="team-invitation-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, ""))
                }
                required
              />
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button primary"
                disabled={busy || otp.length !== 6}
              >
                {busy ? "Confirmando…" : "Confirmar e ativar acesso"}
              </button>
            </form>
          ) : (
            <form
              className="team-invitation-form"
              onSubmit={(event) => void enroll(event)}
            >
              <h2 id="invitation-title">Crie seu acesso</h2>
              <p>
                Defina uma senha exclusiva. Em seguida, confirme o código do seu
                aplicativo autenticador.
              </p>
              <label htmlFor="team-invitation-password">Nova senha</label>
              <input
                id="team-invitation-password"
                type="password"
                autoComplete="new-password"
                minLength={15}
                maxLength={1024}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <label htmlFor="team-invitation-password-confirmation">
                Repita a senha
              </label>
              <input
                id="team-invitation-password-confirmation"
                type="password"
                autoComplete="new-password"
                minLength={15}
                maxLength={1024}
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                required
              />
              <small>
                Use pelo menos 15 caracteres. O convite expira em 24 horas.
              </small>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button primary"
                disabled={
                  busy ||
                  password.length < 15 ||
                  passwordConfirmation.length < 15
                }
              >
                {busy ? "Preparando…" : "Continuar"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
