import type { FormEvent } from "react";
import { PartnerAuthShell } from "./PartnerAuthShell";

export function PartnerLoginForm({
  email,
  password,
  otp,
  busy,
  error,
  onEmailChange,
  onPasswordChange,
  onOtpChange,
  onSubmit,
  onRecoverMfa,
}: {
  email: string;
  password: string;
  otp: string;
  busy: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRecoverMfa: () => void;
}) {
  return (
    <PartnerAuthShell>
      <form className="pp-stack" onSubmit={onSubmit}>
        <p className="pp-kicker">Sua parceria</p>
        <h1 className="pp-title">Entre na sua integração</h1>
        <p className="form-hint">
          Consulte eventos, configure seu webhook e gerencie credenciais da sua
          aplicação.
        </p>
        <div className="form-field">
          <label className="form-field-label" htmlFor="partner-email">
            E-mail
          </label>
          <input
            id="partner-email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label className="form-field-label" htmlFor="partner-password">
            Senha
          </label>
          <input
            id="partner-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label className="form-field-label" htmlFor="partner-otp">
            Código do autenticador
          </label>
          <input
            id="partner-otp"
            className="input"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(event) =>
              onOtpChange(event.target.value.replace(/\D/g, ""))
            }
            required
          />
        </div>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary btn-md" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <button
          type="button"
          className="pp-recovery-link"
          onClick={onRecoverMfa}
        >
          Perdi meu autenticador
        </button>
        <a className="pp-link" href="/#">
          Acesso da equipe
        </a>
      </form>
    </PartnerAuthShell>
  );
}
