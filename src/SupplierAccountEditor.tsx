import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OFFICIAL_ORIGIN, changeSummary } from "./onr-endpoint-model";
import { ConfirmDialog } from "./ConfirmDialog";
import { RegistryVisualizationTariffs } from "./RegistryVisualizationTariffs";
import { AccountOverview } from "./AccountOverview";
import { AccountActivity } from "./AccountActivity";
import { PriceComposition } from "./PriceComposition";
import { readiness } from "./account-model";
import { useAccountSnapshot } from "./useAccountSnapshot";
import { useNow } from "./useNow";
import { RegistryOptionalTariffs } from "./RegistryOptionalTariffs";
import { SupplierCredentialRenewal } from "./SupplierCredentialRenewal";
import { SupplierCommercialTab } from "./SupplierCommercialTab";
import { SupplierConnectionTab } from "./SupplierConnectionTab";
import { SupplierEditorHeader } from "./SupplierEditorHeader";
import { editorNavGroups, type EditorTab } from "./supplier-editor-model";
import { useOnrConnection } from "./useOnrConnection";
import type { RegistrySupplierAccount } from "./api";
import type { ToastKind } from "./useToast";
import { useDialogFocus } from "./useDialogFocus";
import "./supplier-editor.css";

export function SupplierAccountEditor({
  account,
  accounts,
  csrf,
  returnFocus,
  onClose,
  onUnauthorized,
  onToast,
  onAccountsChanged,
  onStatusAction,
}: {
  account: RegistrySupplierAccount | null;
  accounts: RegistrySupplierAccount[];
  csrf: string;
  returnFocus: () => HTMLElement | null;
  onClose: () => void;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
  onAccountsChanged: () => void;
  onStatusAction: (
    action: "activate" | "suspend",
    account: RegistrySupplierAccount,
  ) => void;
}) {
  const open = account !== null;
  const panelRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<EditorTab>("overview");

  const accountId = account?.id ?? null;
  const accountProvider = account?.provider ?? null;
  const activeOnrAccount = accounts.find(
    (candidate) =>
      candidate.provider === "onr" && candidate.status === "active",
  );
  const now = useNow();
  const {
    snapshot,
    tariff,
    terms,
    reload: reloadSnapshot,
  } = useAccountSnapshot(account, onUnauthorized);
  useEffect(() => {
    if (accountId) reloadSnapshot();
  }, [tab, accountId, reloadSnapshot]);

  const conn = useOnrConnection({
    accountId,
    accountProvider,
    csrf,
    onUnauthorized,
    onToast,
  });
  const {
    busy,
    confirming,
    endpoint,
    restoring,
    target,
    keyNeeded,
    keyConfigured,
    commit,
    setConfirming,
  } = conn;

  function close() {
    if (busy) return;
    conn.setKey("");
    setTab("overview");
    onClose();
  }

  useDialogFocus(open, panelRef, () => !confirming && close(), { returnFocus });

  const ready = account ? readiness(account, snapshot, now) : [];
  const readyState = (id: string) => ready.find((row) => row.id === id)?.state;
  const groups = editorNavGroups(account, readyState);

  return (
    <>
      {createPortal(
        <>
          {open && <div className="detail-panel-overlay" onClick={close} />}
          <aside
            ref={panelRef}
            className={`detail-panel sup-ed-panel${open ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-editor-title"
            aria-hidden={!open}
          >
            {account && (
              <div className="sup-ed-shell">
                <SupplierEditorHeader
                  account={account}
                  busy={busy}
                  onClose={close}
                  onStatusAction={onStatusAction}
                />

                <div className="sup-ed-layout">
                  <nav
                    className="sup-ed-nav"
                    aria-label="Configurações da conta"
                  >
                    {groups.map((group) => (
                      <div key={group.title} className="sup-ed-group">
                        <p className="sup-ed-group-title">{group.title}</p>
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="sup-ed-nav-item"
                            aria-current={tab === item.id ? "page" : undefined}
                            onClick={() => setTab(item.id)}
                          >
                            <span>{item.label}</span>
                            {item.dot && (
                              <i
                                className="sup-dot"
                                data-state={item.dot}
                                aria-hidden="true"
                              />
                            )}
                            <small>{item.hint}</small>
                          </button>
                        ))}
                      </div>
                    ))}
                  </nav>

                  <div className="sup-ed-content">
                    {tab === "overview" && (
                      <AccountOverview
                        account={account}
                        snapshot={snapshot}
                        tariff={tariff}
                        terms={terms}
                        now={now}
                        onGoto={(section) => setTab(section)}
                      />
                    )}
                    {tab === "activity" && (
                      <AccountActivity
                        key={account.id}
                        accountId={account.id}
                        onUnauthorized={onUnauthorized}
                      />
                    )}

                    {tab === "credentials" && (
                      <SupplierCredentialRenewal
                        key={account.id}
                        account={account}
                        accounts={accounts}
                        csrf={csrf}
                        onCreated={onAccountsChanged}
                        onUnauthorized={onUnauthorized}
                        onToast={onToast}
                      />
                    )}

                    {tab === "connection" && account.provider === "onr" && (
                      <SupplierConnectionTab conn={conn} />
                    )}

                    {tab === "tariffs" && (
                      <>
                        <RegistryVisualizationTariffs
                          key={account.id}
                          account={account}
                          accounts={accounts}
                          csrf={csrf}
                          onUnauthorized={onUnauthorized}
                          onToast={onToast}
                        />
                        <RegistryOptionalTariffs
                          key={`${account.id}-optional`}
                          account={account}
                          accounts={accounts}
                          csrf={csrf}
                          onUnauthorized={onUnauthorized}
                          onToast={onToast}
                        />
                      </>
                    )}

                    {tab === "commercial" && (
                      <SupplierCommercialTab
                        account={account}
                        activeOnrAccount={activeOnrAccount}
                        csrf={csrf}
                        onUnauthorized={onUnauthorized}
                        onToast={onToast}
                      />
                    )}

                    {tab === "composition" && account.provider === "onr" && (
                      <PriceComposition
                        key={account.id}
                        accountId={account.id}
                        terms={terms}
                        onUnauthorized={onUnauthorized}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </>,
        document.body,
      )}

      <ConfirmDialog
        open={confirming && endpoint !== null}
        tone={restoring ? "danger" : "primary"}
        title={
          restoring ? "Voltar ao portal original?" : "Salvar esta conexão?"
        }
        description={
          restoring
            ? "A origem passa a ser o portal original e a chave do proxy é removida do cofre."
            : "O backend verifica o Worker (nega sem chave, aceita com chave) antes de gravar."
        }
        details={
          endpoint && account
            ? [
                { label: "Conta", value: account.label },
                ...(restoring
                  ? [
                      { label: "De", value: endpoint.origin },
                      { label: "Para", value: OFFICIAL_ORIGIN },
                    ]
                  : changeSummary(endpoint, {
                      origin: target,
                      replaceKey: keyNeeded,
                      keyConfigured,
                    })),
              ]
            : []
        }
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 10,
          max: 500,
        }}
        confirmLabel={restoring ? "Restaurar origem" : "Verificar e salvar"}
        busy={busy}
        onConfirm={(reason) => void commit(reason)}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
