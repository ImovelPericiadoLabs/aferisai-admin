import { useState, type FormEvent } from "react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import {
  ApiError,
  beginPasskeyLogin,
  createSession,
  currentMember,
  finishPasskeyLogin,
} from "./api";
import { Brand } from "./TeamBrand";
import { teamErrorMessage, type Session } from "./team-session";

export function TeamLogin({
  onLogin,
}: {
  onLogin: (session: Session) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loginMode, setLoginMode] = useState<"passkey" | "password">(
    browserSupportsWebAuthn() ? "passkey" : "password",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginMode === "passkey") {
      await submitPasskey();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await createSession({ email, password, otp });
      const member = await currentMember();
      setPassword("");
      setOtp("");
      onLogin({ csrf: result.csrf_token, member });
    } catch (cause) {
      setError(teamErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitPasskey() {
    if (!email.trim()) {
      setError("Informe seu e-mail para entrar com a chave de acesso.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const options = await beginPasskeyLogin(email.trim());
      const credential = await startAuthentication({
        optionsJSON:
          options.public_key as unknown as PublicKeyCredentialRequestOptionsJSON,
      });
      const result = await finishPasskeyLogin(
        email.trim(),
        options.challenge_id,
        credential as unknown as Record<string, unknown>,
      );
      const member = await currentMember();
      onLogin({ csrf: result.csrf_token, member });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? teamErrorMessage(cause)
          : "A chave de acesso não foi confirmada pelo dispositivo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-story">
        <Brand light />
        <div>
          <p className="eyebrow">AferisAI</p>
          <h1>Clareza para cada decisão.</h1>
          <p>
            Acompanhe operações, análises e parcerias em um espaço seguro,
            organizado para a sua equipe.
          </p>
          <svg
            className="login-illustration"
            viewBox="0 0 420 185"
            fill="none"
            role="img"
            aria-label="Fluxo de documentos, análise e decisão"
          >
            <path
              d="M24 96h368"
              stroke="#6F95CE"
              strokeWidth="2"
              strokeDasharray="5 8"
            />
            <rect
              x="24"
              y="49"
              width="94"
              height="94"
              rx="17"
              fill="#12325B"
              stroke="#557BAE"
            />
            <path
              d="M55 73h32M55 87h32M55 101h23"
              stroke="#A6C4F2"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <rect
              x="163"
              y="35"
              width="94"
              height="122"
              rx="17"
              fill="#12325B"
              stroke="#557BAE"
            />
            <path
              d="m191 98 16 16 26-32"
              stroke="#79ACFF"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="302"
              y="49"
              width="94"
              height="94"
              rx="17"
              fill="#075BFF"
              stroke="#81AFFF"
            />
            <path
              d="M329 83h40M329 97h40M329 111h25"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <small>AferisAI · Operação e governança</small>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <p className="eyebrow">Acesso da equipe</p>
          <h1 id="login-title">Entrar na área da equipe</h1>
          <p className="muted">
            {loginMode === "passkey"
              ? "Informe seu e-mail e confirme a chave de acesso no dispositivo."
              : "Use sua senha e o código atual do aplicativo autenticador."}
          </p>
          <form onSubmit={submit} className="form">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {loginMode === "password" && (
              <>
                <label htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <label htmlFor="otp">Código do autenticador</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  required
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, ""))
                  }
                />
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy
                ? "Verificando…"
                : loginMode === "passkey"
                  ? "Entrar com chave de acesso"
                  : "Entrar com senha e código"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          {(loginMode === "passkey" || browserSupportsWebAuthn()) && (
            <div className="passkey-login-option">
              <p>
                {loginMode === "passkey"
                  ? "Ainda não cadastrou uma chave?"
                  : "Já tem uma chave de acesso?"}
              </p>
              <button
                type="button"
                className="button secondary full"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setLoginMode(
                    loginMode === "passkey" ? "password" : "passkey",
                  );
                }}
              >
                {loginMode === "passkey"
                  ? "Usar senha e código"
                  : "Usar chave de acesso"}{" "}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}
          <p className="fine-print">
            {loginMode === "passkey"
              ? "A chave privada permanece no seu dispositivo ou gerenciador de senhas."
              : "Sua senha e o código do autenticador não são salvos neste navegador."}
          </p>
          <a className="partner-team-link" href="/#parceiro">
            Sou parceiro · acessar minha integração
          </a>
        </div>
        <svg
          className="login-mobile-art"
          viewBox="0 0 240 48"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 24h240"
            stroke="#DCE8F7"
            strokeWidth="2"
            strokeDasharray="4 7"
          />
          <rect
            x="20"
            y="9"
            width="31"
            height="31"
            rx="9"
            fill="#EDF4FF"
            stroke="#C7DAF6"
          />
          <path
            d="M29 19h13M29 25h9"
            stroke="#075BFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="120" cy="24" r="18" fill="#E7F0FF" stroke="#B9D1F7" />
          <path
            d="m111 24 6 6 12-13"
            stroke="#075BFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="189"
            y="9"
            width="31"
            height="31"
            rx="9"
            fill="#EDF4FF"
            stroke="#C7DAF6"
          />
          <path
            d="M198 19h13M198 25h9"
            stroke="#075BFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </section>
    </main>
  );
}
