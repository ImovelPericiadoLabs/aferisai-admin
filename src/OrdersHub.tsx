import { useState } from "react";
import { DocTabs } from "./DocTabs";
import { RegistryRequestDirectory } from "./RegistryRequestDirectory";
import { RequestDirectory } from "./RequestDirectory";

const TABS = [
  { id: "files", label: "Arquivos enviados" },
  { id: "registry", label: "Compras registrais" },
] as const;

/** Both kinds of purchase in one place, one tab each. */
export function OrdersHub({
  canRead,
  onUnauthorized,
  openSource,
  openReview,
}: {
  canRead: boolean;
  onUnauthorized: () => void;
  openSource: (requestId: string) => void;
  openReview: (workId: string) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("files");
  return (
    <>
      <div className="page oh-tabs">
        <DocTabs
          label="Tipo de compra"
          items={TABS}
          value={tab}
          onChange={setTab}
          idPrefix="oh"
        />
      </div>
      {tab === "files" ? (
        <RequestDirectory
          canRead={canRead}
          onUnauthorized={onUnauthorized}
          openSource={openSource}
          openReview={openReview}
        />
      ) : (
        <RegistryRequestDirectory onUnauthorized={onUnauthorized} />
      )}
    </>
  );
}
