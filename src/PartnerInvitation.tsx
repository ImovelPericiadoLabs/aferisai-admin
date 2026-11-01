import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  acceptPartnerOrganizationInvitation,
  confirmPartnerInvitation,
  currentPartnerMember,
  enrollPartnerInvitation,
  renewPartnerCsrf,
  switchPartnerOrganization,
  type PartnerMember,
} from "./api";
import { PartnerAuthShell } from "./PartnerAuthShell";

export function PartnerInvitation() {
  const token =
    new URLSearchParams(window.location.hash.split("?")[1] || "").get(
      "token",
    ) || "";
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [existingMember, setExistingMember] = useState<PartnerMember | null>(
    null,
  );
  const [existingCsrf, setExistingCsrf] = useState("");

  useEffect(() => {
    let live = true;
    currentPartnerMember()
      .then(async (member) => {
        const csrf = await renewPartnerCsrf();
        if (live) {
          setExistingMember(member);
          setExistingCsrf(csrf.csrf_token);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function acceptExisting() {
    if (!existingCsrf) return;
    setBusy(true);
    setError("");
    try {
      const accepted = await acceptPartnerOrganizationInvitation(
        token,
        existingCsrf,
      );
      await switchPartnerOrganization(accepted.organization_id, existingCsrf);
      window.history.replaceState(null, "", "/#parceiro");
      window.location.reload();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.status === 503
            ? "O serviço está em manutenção. Tente novamente em instantes."
            : cause.detail
          : "Não foi possível aceitar o convite.",
      );
      setBusy(false);
    }
  }

  async function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await enrollPartnerInvitation(token, password);
      setSecret(result.totp_secret);
      setPassword("");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.status === 503
            ? "O serviço está em manutenção. Tente novamente em instantes."
            : cause.detail
          : "Não foi possível preparar o acesso. Confira o convite e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await confirmPartnerInvitation(token, otp);
      setSecret("");
      setOtp("");
      setCompleted(true);
      window.history.replaceState(null, "", "/#convite");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.status === 503
            ? "O serviço está em manutenção. Tente novamente em instantes."
            : cause.detail
          : "Não foi possível confirmar o autenticador.",
      );
    } finally {
      setBusy(false);
    }
  }

  const err = error && (
    <div className="alert alert-danger" role="alert">
      {error}
    </div>
  );
  return (
    <PartnerAuthShell>
      <p className="pp-kicker">Convite para parceria</p>
      {completed ? (
        <>
          <h1 className="pp-title">Acesso preparado</h1>
          <p className="form-hint">
            Seu autenticador está confirmado. Entre com seu e-mail, senha e
            código atual.
          </p>
          <a className="btn btn-primary btn-md" href="/#parceiro">
            Entrar na integração
          </a>
        </>
      ) : !token ? (
        <>
          <h1 className="pp-title">Convite não encontrado</h1>
          <p className="form-hint">
            Abra o link recebido por e-mail para preparar seu acesso.
          </p>
        </>
      ) : existingMember ? (
        <div className="pp-stack">
          <h1 className="pp-title">Adicionar empresa ao seu acesso</h1>
          <p className="form-hint">
            Convite para {existingMember.email}. Você poderá trocar de empresa
            no topo do painel.
          </p>
          {err}
          <button
            type="button"
            className="btn btn-primary btn-md"
            disabled={busy || !existingCsrf}
            onClick={() => void acceptExisting()}
          >
            {busy ? "Adicionando…" : "Aceitar convite"}
          </button>
        </div>
      ) : !secret ? (
        <form className="pp-stack" onSubmit={(event) => void enroll(event)}>
          <h1 className="pp-title">Crie seu acesso</h1>
          <p className="form-hint">
            Defina uma senha para a sua parceria. Depois, ative o código do
            autenticador.
          </p>
          <div className="form-field">
            <label className="form-field-label" htmlFor="partner-new-password">
              Senha
            </label>
            <input
              id="partner-new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={15}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <span className="form-hint">Use pelo menos 15 caracteres.</span>
          </div>
          {err}
          <button
            className="btn btn-primary btn-md"
            disabled={busy || password.length < 15}
          >
            {busy ? "Preparando…" : "Continuar"}
          </button>
        </form>
      ) : (
        <form className="pp-stack" onSubmit={(event) => void confirm(event)}>
          <h1 className="pp-title">Ative o autenticador</h1>
          <p className="form-hint">
            Adicione esta chave ao aplicativo autenticador. Ela aparece somente
            agora.
          </p>
          <div className="secret-reveal-box">
            <span className="form-field-label">Chave do autenticador</span>
            <code>{secret}</code>
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="partner-confirm-otp">
              Código de 6 dígitos
            </label>
            <input
              id="partner-confirm-otp"
              className="input"
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
          </div>
          {err}
          <button
            className="btn btn-primary btn-md"
            disabled={busy || otp.length !== 6}
          >
            {busy ? "Confirmando…" : "Confirmar acesso"}
          </button>
        </form>
      )}
    </PartnerAuthShell>
  );
}
