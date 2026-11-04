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
import { PartnerHistoryPanel } from "./PartnerHistoryPanel";
import { PartnerInvitePanel } from "./PartnerInvitePanel";
import { PartnerPeopleDialogs } from "./PartnerPeopleDialogs";
import { PartnerPeopleList } from "./PartnerPeopleList";
import { EMAIL_PATTERN, actionCopy, filters } from "./partner-people-copy";
import {
  countPeople,
  filterPeople,
  type PeopleFilter,
  type PersonAction,
} from "./partner-people-model";
import type { ToastKind } from "./useToast";
import { useDialogFocus } from "./useDialogFocus";
import "./partner-people.css";

type Pending = { action: PersonAction; person: PartnerPerson };

export function PartnerPeople({
  api,
  organizationName,
  canManage: isAdmin,
  viewerId,
  onUnauthorized,
  onToast,
  onSupport,
}: {
  api: PeopleApi;
  organizationName: string;
  canManage: boolean;
  viewerId?: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
  onSupport?: (person: PartnerPerson) => void;
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
  const inviteSendLock = useRef(false);
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
    if (inviteSendLock.current || !inviteRole) return;
    inviteSendLock.current = true;
    setBusy(true);
    try {
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
      const fallback =
        "Não foi possível confirmar o envio do convite. Consulte a lista antes de tentar novamente.";
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setInviteError(cause instanceof ApiError ? cause.detail : fallback);
      await load();
    } finally {
      inviteSendLock.current = false;
      setBusy(false);
      setInviteConfirm(false);
    }
  }

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

        <PartnerPeopleList
          items={items}
          visible={visible}
          loading={loading}
          loadFailed={loadFailed}
          isAdmin={isAdmin}
          busy={busy}
          viewerId={viewerId}
          now={now}
          onRetry={() => {
            setLoading(true);
            void load();
          }}
          onAction={(action, person) => {
            setNewRole(null);
            setPending({ action, person });
          }}
          onHistory={(person) => void openHistory(person)}
          onSupport={onSupport}
        />
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

      <PartnerPeopleDialogs
        organizationName={organizationName}
        busy={busy}
        inviteConfirm={inviteConfirm}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        pending={pending}
        newRole={newRole}
        onSendInvite={() => void sendInvite()}
        onCancelInvite={() => setInviteConfirm(false)}
        onConfirmAction={(reason) => void confirmAction(reason)}
        onCancelAction={() => setPending(null)}
        onNewRole={setNewRole}
      />

      {createPortal(
        <>
          <PartnerInvitePanel
            open={inviteOpen}
            panelRef={inviteRef}
            organizationName={organizationName}
            email={inviteEmail}
            editable={inviteEditable}
            role={inviteRole}
            error={inviteError}
            busy={busy}
            onClose={closeInvite}
            onSubmit={requestInvite}
            onFocusEmail={() => setInviteEditable(true)}
            onEmail={(value) => {
              setInviteEmail(value);
              setInviteError("");
            }}
            onRole={(role) => {
              setInviteRole(role);
              setInviteError("");
            }}
          />
          <PartnerHistoryPanel
            history={history}
            events={events}
            eventsFailed={eventsFailed}
            panelRef={panelRef}
            onClose={closeHistory}
          />
        </>,
        document.body,
      )}
    </section>
  );
}
