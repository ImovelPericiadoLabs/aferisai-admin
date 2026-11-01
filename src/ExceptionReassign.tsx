import { Disclosure, RadioGroup } from "./controls";
import { EntityPicker } from "./EntityPicker";
import type { Asking } from "./exception-panel-model";
import type { PickerSearch } from "./picker-model";

export function ExceptionReassign({
  target,
  setTarget,
  newMember,
  setNewMember,
  block,
  memberSearch,
  busy,
  setAsking,
  onUnauthorized,
}: {
  target: "manager" | "financial";
  setTarget: (value: "manager" | "financial") => void;
  newMember: string;
  setNewMember: (value: string) => void;
  block: string | null;
  memberSearch: PickerSearch;
  busy: boolean;
  setAsking: (value: Asking) => void;
  onUnauthorized: () => void;
}) {
  return (
    <section className="detail-panel-section">
      <Disclosure title="Substituir responsável indisponível">
        <div className="exc-stack">
          <RadioGroup
            name="exc-target"
            legend="Função"
            value={target}
            onChange={(value) => {
              setTarget(value as "manager" | "financial");
              setNewMember("");
            }}
            options={[
              { value: "manager", label: "Gestor" },
              { value: "financial", label: "Financeiro" },
            ]}
          />
          <EntityPicker
            key={target}
            id="exc-member"
            label="Nova pessoa"
            placeholder="Buscar pelo e-mail"
            disabled={block !== null}
            value={newMember}
            search={memberSearch}
            cacheKey={target}
            onUnauthorized={onUnauthorized}
            onChange={(id) => setNewMember(id)}
          />
          {block && <p className="form-hint">{block}</p>}
          <button
            className="btn btn-secondary btn-md"
            type="button"
            disabled={busy || block !== null || !newMember}
            onClick={() => setAsking("reassign")}
          >
            Reatribuir
          </button>
        </div>
      </Disclosure>
    </section>
  );
}
