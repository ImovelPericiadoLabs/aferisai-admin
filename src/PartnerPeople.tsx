import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  type PartnerManagementEvent,
  type PartnerPerson,
  type PartnerRole,
  type PeopleApi,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { relativeTime } from "./integration-insights-model";
import { roleLabel } from "./partner-roles";
import { RolePicker } from "./RolePicker";
import {
  countPeople,
  eventActor,
  eventLabel,
  eventValueLabel,
  filterPeople,
  invitationNote,
  personView,
  type PeopleFilter,
  type PersonAction,
} from "./partner-people-model";
import type { ToastKind } from "./useToast";
import { useDialogFocus } from "./useDialogFocus";
import "./partner-people.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const filters: { value: PeopleFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "pending", label: "Convites" },
  { value: "suspended", label: "Suspensas" },
];

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const actionCopy: Record<
  PersonAction,
  {
    button: string;
    title: string;
    description: string;
    confirm: string;
    success: string;
    danger: boolean;
  }
> = {
  resend: {
    button: "Reenviar",
    title: "Reenviar o convite?",
    description:
      "O link anterior deixa de valer e um novo link é enviado por e-mail, válido por 24 horas.",
    confirm: "Reenviar convite",
    success: "Convite reenviado.",
    danger: false,
  },
  revoke: {
    button: "Revogar convite",
    title: "Revogar o convite?",
    description:
      "O link enviado deixa de funcionar. A pessoa não consegue mais aceitar.",
    confirm: "Revogar convite",
    success: "Convite revogado.",
    danger: true,
  },
  suspend: {
    button: "Suspender acesso",
    title: "Suspender o acesso desta pessoa?",
    description:
      "As sessões atuais são encerradas na hora e ela perde o acesso a todas as aplicações desta parceria.",
    confirm: "Suspender acesso",
    success: "Acesso suspenso. As sessões da pessoa foram encerradas.",
    danger: true,
  },
  "change-role": {
    button: "Alterar papel",
    title: "Alterar o papel desta pessoa?",
    description:
      "O novo papel vale só nesta parceria. As sessões atuais da pessoa são encerradas e ela precisa entrar de novo.",
    confirm: "Alterar papel",
    success: "Papel alterado. A pessoa precisa entrar de novo.",
    danger: false,
  },
  reactivate: {
    button: "Reativar acesso",
    title: "Reativar o acesso desta pessoa?",
    description:
      "Ela volta a entrar na parceria, mas precisa fazer login de novo.",
    confirm: "Reativar acesso",
    success: "Acesso reativado.",
    danger: false,
  },
};

type Pending = { action: PersonAction; person: PartnerPerson };

export function PartnerPeople({
  api,
  organizationName,
  canManage: isAdmin,
  viewerId,
  onUnauthorized,
  onToast,
}: {
  api: PeopleApi;
  organizationName: string;
  canManage: boolean;
  viewerId?: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [items, setItems] = useState<PartnerPerson[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<PeopleFilter>("all");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [history, setHistory] = useState<PartnerPerson | null>(null);
  const [events, setEvents] = useState<PartnerManagementEvent[] | null>(null);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEditable, setInviteEditable] = useState(false);
  const [inviteConfirm, setInviteConfirm] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteRole, setInviteRole] = useState<PartnerRole | null>(null);
  const [newRole, setNewRole] = useState<PartnerRole | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const inviteRef = useRef<HTMLElement>(null);
  const inviteTrigger = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const lastOpened = useRef<string | null>(null);

  const fail = useCallback(
    (cause: unknown, fallback: string) => {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        onToast(cause instanceof ApiError ? cause.detail : fallback, "error");
    },
    [onUnauthorized, onToast],
  );

  const load = useCallback(
    async (cursor?: string) => {
      try {
        const page = await api.list(cursor);
        setItems((current) =>
          cursor ? [...current, ...page.items] : page.items,
        );
        setNextCursor(page.next_cursor);
        setNow(Date.now());
        setLoadFailed(false);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [api, onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const counts = useMemo(() => countPeople(items), [items]);
  const visible = useMemo(() => filterPeople(items, filter), [items, filter]);

  function closeHistory() {
    setHistory(null);
    setEvents(null);
    setEventsFailed(false);
  }

  useDialogFocus(history !== null, panelRef, closeHistory, {
    returnFocus: () =>
      document.querySelector<HTMLElement>(
        `[data-person-id="${lastOpened.current}"]`,
      ),
  });

  async function openHistory(person: PartnerPerson) {
    lastOpened.current = person.id;
    setHistory(person);
    setEvents(null);
    setEventsFailed(false);
    try {
      const page = await api.events(person.id);
      setEvents(page.items);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setEventsFailed(true);
    }
  }

  function closeInvite() {
    if (busy) return;
    setInviteOpen(false);
    setInviteConfirm(false);
    setInviteError("");
  }

  useDialogFocus(inviteOpen && !inviteConfirm, inviteRef, closeInvite, {
    returnFocus: () => inviteTrigger.current,
  });

  async function confirmAction(reason: string) {
    if (!pending) return;
    const { action, person } = pending;
    setBusy(true);
    try {
      if (action === "resend" && person.invitation)
        await api.resend(person.invitation.id, reason);
      else if (action === "revoke" && person.invitation)
        await api.revoke(person.invitation.id, reason);
      else if (action === "suspend") await api.suspend(person.id, reason);
      else if (action === "reactivate") await api.reactivate(person.id, reason);
      else if (action === "change-role" && newRole)
        await api.changeRole(person.id, newRole, reason);
      onToast(actionCopy[action].success, "success");
      setPending(null);
      setNewRole(null);
      await load();
    } catch (cause) {
      setPending(null);
      fail(
        cause,
        "Não foi possível concluir a ação. Atualize a lista antes de tentar de novo.",
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  function requestInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    if (!EMAIL_PATTERN.test(inviteEmail.trim())) {
      setInviteError("Informe um e-mail válido, como nome@empresa.com.br.");
      return;
    }
    if (!inviteRole) {
      setInviteError("Escolha o papel da pessoa nesta parceria.");
      return;
    }
    setInviteError("");
    setInviteConfirm(true);
  }

  async function sendInvite() {
    setBusy(true);
    try {
      if (!inviteRole) return;
      await api.invite(inviteEmail.trim(), inviteRole);
      onToast(
        "Convite enviado por e-mail. O link vale por 24 horas.",
        "success",
      );
      setInviteEmail("");
      setInviteRole(null);
      setInviteEditable(false);
      setInviteOpen(false);
      await load();
    } catch (cause) {
      fail(
        cause,
        "Não foi possível confirmar o envio do convite. Consulte a lista antes de tentar novamente.",
      );
      await load();
    } finally {
      setBusy(false);
      setInviteConfirm(false);
    }
  }

  const copy = pending ? actionCopy[pending.action] : null;

  return (
    <section className="card people" aria-labelledby="people-title">
      <div className="card-header">
        <div>
          <h2 className="card-title" id="people-title">
            Pessoas e convites
          </h2>
          <p className="people-sub">
            O acesso vale para todas as aplicações de {organizationName}.
          </p>
        </div>
        <div className="people-header-actions">
          <span className="badge badge-neutral">{counts.all}</span>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary btn-md"
              aria-haspopup="dialog"
              ref={inviteTrigger}
              onClick={() => setInviteOpen(true)}
            >
              Convidar pessoa
            </button>
          )}
        </div>
      </div>
      <div className="card-body">
        <div className="seg" role="group" aria-label="Filtrar pessoas">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className="seg-item"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span className="seg-count">{counts[item.value]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div
            className="rules-skeleton"
            role="status"
            aria-label="Carregando pessoas"
          >
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        ) : loadFailed ? (
          <div className="alert alert-danger" role="alert">
            Não foi possível carregar as pessoas da parceria.{" "}
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => {
                setLoading(true);
                void load();
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state" role="status">
            <strong>
              {items.length === 0
                ? "Ninguém com acesso ainda"
                : "Ninguém neste filtro"}
            </strong>
            <span>
              {items.length === 0
                ? isAdmin
                  ? "Convide a pessoa responsável pela integração para ela entrar no portal."
                  : "Peça a um administrador para convidar a pessoa responsável."
                : "Escolha outro filtro para ver as demais pessoas."}
            </span>
          </div>
        ) : (
          <ul className="people-list" aria-label="Pessoas da parceria">
            {visible.map((person) => {
              const view = personView(person, isAdmin);
              const note = invitationNote(person.invitation, now);
              return (
                <li key={person.membership_id}>
                  <span className="people-avatar" aria-hidden="true">
                    {person.email.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="people-main">
                    <strong>
                      {person.email}
                      {person.id === viewerId && " (você)"}
                    </strong>
                    <small>
                      {note ??
                        (person.last_access_at
                          ? `Último acesso ${relativeTime(person.last_access_at, now)}`
                          : person.membership_status === "active"
                            ? "Nunca acessou"
                            : "—")}
                    </small>
                  </div>
                  <span className="people-status">
                    <span className="badge badge-neutral people-role">
                      {roleLabel(person.role)}
                    </span>
                    <span className={`badge badge-${view.tone}`}>
                      {view.label}
                    </span>
                  </span>
                  <div className="people-actions">
                    {view.actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        className={`btn btn-sm ${actionCopy[action].danger ? "btn-ghost-danger" : "btn-secondary"}`}
                        disabled={busy}
                        onClick={() => {
                          setNewRole(null);
                          setPending({ action, person });
                        }}
                      >
                        {actionCopy[action].button}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      data-person-id={person.id}
                      aria-haspopup="dialog"
                      onClick={() => void openHistory(person)}
                    >
                      Histórico
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {nextCursor && (
          <button
            type="button"
            className="btn btn-secondary btn-md people-more"
            onClick={() => void load(nextCursor)}
          >
            Carregar mais
          </button>
        )}
      </div>

      <ConfirmDialog
        open={inviteConfirm}
        title="Enviar convite de acesso?"
        description="O convite será enviado agora por e-mail e o link vale por 24 horas. Confira o endereço: se estiver errado, outra pessoa receberá o acesso."
        details={[
          { label: "Parceria", value: organizationName },
          { label: "Enviar para", value: inviteEmail.trim() },
          { label: "Papel", value: roleLabel(inviteRole) },
        ]}
        confirmLabel="Enviar convite"
        busy={busy}
        onConfirm={() => void sendInvite()}
        onCancel={() => setInviteConfirm(false)}
      />
      <ConfirmDialog
        open={pending !== null}
        tone={copy?.danger ? "danger" : "primary"}
        title={copy?.title ?? ""}
        description={copy?.description}
        details={
          pending
            ? [
                { label: "Pessoa", value: pending.person.email },
                { label: "Parceria", value: organizationName },
              ]
            : []
        }
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 3,
          max: 500,
        }}
        confirmDisabled={
          pending?.action === "change-role" &&
          (newRole === null || newRole === pending.person.role)
        }
        confirmLabel={copy?.confirm ?? ""}
        busy={busy}
        onConfirm={(reason) => void confirmAction(reason)}
        onCancel={() => setPending(null)}
      >
        {pending?.action === "change-role" && (
          <RolePicker
            label={`Novo papel (atual: ${roleLabel(pending.person.role)})`}
            value={newRole ?? pending.person.role}
            disabled={busy}
            onChange={setNewRole}
          />
        )}
      </ConfirmDialog>

      {createPortal(
        <>
          {inviteOpen && (
            <div className="detail-panel-overlay" onClick={closeInvite} />
          )}
          <aside
            ref={inviteRef}
            className={`detail-panel${inviteOpen ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="people-invite-title"
            aria-hidden={!inviteOpen}
          >
            {inviteOpen && (
              <form
                noValidate
                onSubmit={requestInvite}
                className="people-invite"
              >
                <div className="detail-panel-header">
                  <div>
                    <h2 className="rules-panel-title" id="people-invite-title">
                      Convidar pessoa
                    </h2>
                    <p className="rules-panel-sub">{organizationName}</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Fechar"
                    onClick={closeInvite}
                  >
                    ✕
                  </button>
                </div>
                <div className="detail-panel-body">
                  <div className="form-field">
                    <label
                      className="form-field-label"
                      htmlFor="partner-invite-email"
                    >
                      E-mail da pessoa
                    </label>
                    <input
                      id="partner-invite-email"
                      className="input"
                      name="responsible-contact"
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      readOnly={!inviteEditable}
                      onFocus={() => setInviteEditable(true)}
                      value={inviteEmail}
                      onChange={(event) => {
                        setInviteEmail(event.target.value);
                        setInviteError("");
                      }}
                    />
                    <span className="form-hint">
                      Ela cria a senha e ativa o autenticador antes de entrar.
                    </span>
                  </div>
                  <RolePicker
                    label="Papel na parceria"
                    value={inviteRole}
                    disabled={busy}
                    onChange={(role) => {
                      setInviteRole(role);
                      setInviteError("");
                    }}
                  />
                  {inviteError && (
                    <div className="alert alert-danger" role="alert">
                      {inviteError}
                    </div>
                  )}
                </div>
                <div className="detail-panel-footer">
                  <button
                    className="btn btn-primary btn-md"
                    disabled={busy || !inviteEmail.trim() || !inviteRole}
                  >
                    Enviar convite
                  </button>
                  <button
                    className="btn btn-ghost btn-md"
                    type="button"
                    disabled={busy}
                    onClick={closeInvite}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </aside>
          {history && (
            <div className="detail-panel-overlay" onClick={closeHistory} />
          )}
          <aside
            ref={panelRef}
            className={`detail-panel${history ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="people-history-title"
            aria-hidden={!history}
          >
            {history && (
              <>
                <div className="detail-panel-header">
                  <div>
                    <h2 className="rules-panel-title" id="people-history-title">
                      Histórico
                    </h2>
                    <p className="rules-panel-sub">{history.email}</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Fechar"
                    onClick={closeHistory}
                  >
                    ✕
                  </button>
                </div>
                <div className="detail-panel-body">
                  {eventsFailed ? (
                    <div className="alert alert-danger" role="alert">
                      Não foi possível carregar o histórico.
                    </div>
                  ) : events === null ? (
                    <div
                      className="rules-skeleton"
                      role="status"
                      aria-label="Carregando"
                    >
                      <span className="skeleton" />
                      <span className="skeleton" />
                    </div>
                  ) : events.length === 0 ? (
                    <div className="empty-state" role="status">
                      <strong>Sem registros</strong>
                      <span>
                        Eventos anteriores à trilha de auditoria não são
                        inferidos.
                      </span>
                    </div>
                  ) : (
                    <ol className="people-timeline">
                      {events.map((event) => (
                        <li key={event.id}>
                          <strong>{eventLabel(event.action)}</strong>
                          <small>
                            {dateTime.format(new Date(event.created_at))} ·{" "}
                            {eventActor(event)}
                          </small>
                          {(event.previous_value || event.new_value) && (
                            <small>
                              {eventValueLabel(
                                event.action,
                                event.previous_value,
                              )}{" "}
                              → {eventValueLabel(event.action, event.new_value)}
                            </small>
                          )}
                          <p>{event.reason}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </>
            )}
          </aside>
        </>,
        document.body,
      )}
    </section>
  );
}
