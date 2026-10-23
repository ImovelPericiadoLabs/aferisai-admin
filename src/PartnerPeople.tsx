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
  invitePartnerMember,
  listPartnerPeople,
  listPartnerPersonEvents,
  reactivatePartnerPerson,
  resendPartnerInvitation,
  revokePartnerInvitation,
  suspendPartnerPerson,
  type PartnerManagementEvent,
  type PartnerPerson,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldAction } from "./FieldAction";
import { relativeTime } from "./integration-insights-model";
import {
  countPeople,
  eventLabel,
  filterPeople,
  invitationNote,
  personView,
  statusValueLabel,
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
  organizationId,
  organizationName,
  csrfToken,
  isAdmin,
  onUnauthorized,
  onToast,
}: {
  organizationId: string;
  organizationName: string;
  csrfToken: string;
  isAdmin: boolean;
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
        const page = await listPartnerPeople(organizationId, cursor);
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
    [organizationId, onUnauthorized],
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
      const page = await listPartnerPersonEvents(organizationId, person.id);
      setEvents(page.items);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setEventsFailed(true);
    }
  }

  async function confirmAction(reason: string) {
    if (!pending) return;
    const { action, person } = pending;
    setBusy(true);
    try {
      if (action === "resend" && person.invitation)
        await resendPartnerInvitation(
          organizationId,
          person.invitation.id,
          reason,
          csrfToken,
        );
      else if (action === "revoke" && person.invitation)
        await revokePartnerInvitation(
          organizationId,
          person.invitation.id,
          reason,
          csrfToken,
        );
      else if (action === "suspend")
        await suspendPartnerPerson(
          organizationId,
          person.id,
          reason,
          csrfToken,
        );
      else if (action === "reactivate")
        await reactivatePartnerPerson(
          organizationId,
          person.id,
          reason,
          csrfToken,
        );
      onToast(actionCopy[action].success, "success");
      setPending(null);
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
    setInviteError("");
    setInviteConfirm(true);
  }

  async function sendInvite() {
    setBusy(true);
    try {
      await invitePartnerMember(organizationId, inviteEmail.trim(), csrfToken);
      onToast(
        "Convite enviado por e-mail. O link vale por 24 horas.",
        "success",
      );
      setInviteEmail("");
      setInviteEditable(false);
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
        <span className="badge badge-neutral">{counts.all}</span>
      </div>
      <div className="card-body">
        {isAdmin && (
          <form noValidate onSubmit={requestInvite}>
            <FieldAction
              id="partner-invite-email"
              label="Convidar pessoa responsável"
              hint={
                inviteError ? (
                  <span role="alert">{inviteError}</span>
                ) : (
                  "Ela cria a senha e ativa o autenticador antes de entrar."
                )
              }
              action={
                <button
                  className="btn btn-primary btn-md"
                  disabled={busy || !inviteEmail.trim()}
                >
                  Enviar convite
                </button>
              }
            >
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
            </FieldAction>
          </form>
        )}

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
                    <strong>{person.email}</strong>
                    <small>
                      {note ??
                        (person.last_access_at
                          ? `Último acesso ${relativeTime(person.last_access_at, now)}`
                          : person.membership_status === "active"
                            ? "Nunca acessou"
                            : "—")}
                    </small>
                  </div>
                  <span className={`badge badge-${view.tone}`}>
                    {view.label}
                  </span>
                  <div className="people-actions">
                    {view.actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        className={`btn btn-sm ${actionCopy[action].danger ? "btn-ghost-danger" : "btn-secondary"}`}
                        disabled={busy}
                        onClick={() => setPending({ action, person })}
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
        confirmLabel={copy?.confirm ?? ""}
        busy={busy}
        onConfirm={(reason) => void confirmAction(reason)}
        onCancel={() => setPending(null)}
      />

      {createPortal(
        <>
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
                            {event.actor_team_member_id
                              ? "pela equipe Aferis"
                              : "pela própria pessoa"}
                          </small>
                          {(event.previous_value || event.new_value) && (
                            <small>
                              {statusValueLabel(event.previous_value)} →{" "}
                              {statusValueLabel(event.new_value)}
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
