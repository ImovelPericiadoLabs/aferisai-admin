import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  ApiError,
  completePartnerMfaRecovery,
  requestPartnerMfaRecovery,
  verifyPartnerMfaRecovery,
} from "./api";
import "./partner-mfa-recovery.css";

type RecoveryStep = "credentials" | "email-code" | "authenticator" | "done";

function recoveryMessage(cause: unknown): string {
  if (!(cause instanceof ApiError))
    return "Não foi possível concluir a recuperação. Tente novamente.";
  if (cause.code === "partner.invitation_conflict")
    return "Este acesso tem um convite ativo ou outra operação em andamento. Aguarde a confirmação do convite antes de recuperar o autenticador.";
  if (cause.code.includes("recovery") && cause.status === 409)
    return "Já existe uma recuperação em andamento para este acesso. Use o código recebido ou aguarde ele expirar para iniciar outra.";
  if (cause.status === 401 || cause.status === 403)
    return "Não foi possível validar os dados informados. Confira o e-mail e a senha.";
  return cause.detail;
}

export function PartnerMfaRecovery({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<RecoveryStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [secret, setSecret] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!otpauthUri) return;
    let live = true;
    QRCode.toDataURL(otpauthUri, {
      width: 216,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#102a56", light: "#ffffff" },
    }).then((url) => {
      if (live) setQrDataUrl(url);
    });
    return () => {
      live = false;
    };
  }, [otpauthUri]);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await requestPartnerMfaRecovery(email.trim(), password);
      if (!result.challenge_id) {
        setError(
          "Não foi possível iniciar a recuperação. Use a senha da conta de parceiro (a mesma criada no convite). Por segurança, o sistema não informa se o e-mail existe e não envia código quando os dados não conferem.",
        );
        return;
      }
      setChallengeId(result.challenge_id);
      setStep("email-code");
    } catch (cause) {
      setError(recoveryMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await verifyPartnerMfaRecovery({
        challenge_id: challengeId,
        email: email.trim(),
        password,
        code: emailCode,
      });
      setRecoveryToken(result.recovery_token);
      setSecret(result.totp_secret);
      setOtpauthUri(result.otpauth_uri);
      setEmailCode("");
      setStep("authenticator");
    } catch (cause) {
      setError(recoveryMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await completePartnerMfaRecovery(recoveryToken, otp);
      setPassword("");
      setSecret("");
      setOtpauthUri("");
      setRecoveryToken("");
      setStep("done");
    } catch (cause) {
      setError(recoveryMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = step === "credentials" ? 1 : step === "email-code" ? 2 : 3;

  return (
    <div className="pp-recovery">
      <button type="button" className="pp-recovery-back" onClick={onBack}>
        <span aria-hidden="true">←</span> Voltar para o acesso
      </button>
      <div className="pp-recovery-heading">
        <span className="pp-recovery-icon" aria-hidden="true">
          ⌁
        </span>
        <div>
          <p className="pp-kicker">Recuperação protegida</p>
          <h1 className="pp-title">Troque seu autenticador</h1>
        </div>
      </div>
      {step !== "done" && (
        <ol className="pp-recovery-steps" aria-label="Etapas da recuperação">
          {["Confirmar acesso", "Código por e-mail", "Novo autenticador"].map(
            (label, index) => (
              <li
                key={label}
                className={index + 1 <= stepIndex ? "active" : ""}
              >
                <span>{index + 1}</span>
                {label}
              </li>
            ),
          )}
        </ol>
      )}

      {step === "credentials" && (
        <form
          className="pp-stack"
          onSubmit={(event) => void requestCode(event)}
        >
          <p className="pp-recovery-lead">
            Confirme sua identidade para receber um código no e-mail cadastrado.
            Por segurança, a senha não fica salva neste navegador.
          </p>
          <div className="form-field">
            <label className="form-field-label" htmlFor="recovery-email">
              E-mail da parceria
            </label>
            <input
              id="recovery-email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="recovery-password">
              Senha atual
            </label>
            <input
              id="recovery-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <button className="btn btn-primary btn-md" disabled={busy}>
            {busy ? "Enviando código…" : "Receber código por e-mail"}
          </button>
        </form>
      )}

      {step === "email-code" && (
        <form className="pp-stack" onSubmit={(event) => void verifyCode(event)}>
          <p className="pp-recovery-lead">
            Enviamos um código de 6 caracteres para <strong>{email}</strong>.
            Ele vale por alguns minutos.
          </p>
          <div className="pp-code-callout">
            <span aria-hidden="true">✉</span>
            <span>
              Confira também a pasta de spam. Nunca compartilhe este código.
            </span>
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="recovery-email-code">
              Código recebido
            </label>
            <input
              id="recovery-email-code"
              className="input pp-otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={emailCode}
              onChange={(event) =>
                setEmailCode(event.target.value.replace(/\D/g, ""))
              }
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
            disabled={busy || emailCode.length !== 6}
          >
            {busy ? "Validando…" : "Continuar"}
          </button>
          <button
            type="button"
            className="pp-recovery-secondary"
            onClick={() => {
              setStep("credentials");
              setError("");
            }}
          >
            Usar outro e-mail
          </button>
        </form>
      )}

      {step === "authenticator" && (
        <form className="pp-stack" onSubmit={(event) => void complete(event)}>
          <p className="pp-recovery-lead">
            Escaneie o QR Code no seu aplicativo autenticador. Depois, confirme
            o primeiro código para encerrar sessões antigas e ativar o novo
            dispositivo.
          </p>
          <div className="pp-qr-panel">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code para cadastrar o novo autenticador"
              />
            ) : (
              <span className="pp-qr-skeleton" aria-label="Gerando QR Code" />
            )}
            <div>
              <strong>Abra seu autenticador</strong>
              <span>
                Google Authenticator, 1Password, Microsoft Authenticator ou
                similar.
              </span>
            </div>
          </div>
          <div className="pp-secret-panel">
            <span className="form-field-label">Se não puder escanear</span>
            <code>{secret}</code>
            <small>
              Cadastre esta chave manualmente. Ela aparece somente nesta etapa.
            </small>
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="recovery-totp">
              Código do novo autenticador
            </label>
            <input
              id="recovery-totp"
              className="input pp-otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
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
            disabled={busy || otp.length !== 6}
          >
            {busy ? "Ativando…" : "Confirmar novo autenticador"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="pp-recovery-success" role="status">
          <span className="pp-success-mark" aria-hidden="true">
            ✓
          </span>
          <h2>Autenticador atualizado</h2>
          <p>
            O novo autenticador foi confirmado e suas sessões antigas foram
            encerradas.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={onBack}
          >
            Voltar para entrar
          </button>
        </div>
      )}
    </div>
  );
}
