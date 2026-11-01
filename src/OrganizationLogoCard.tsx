import { LOGO_RULE } from "./file-rules";
import { ImageUploader } from "./ImageUploader";

export function OrganizationLogoCard({
  hasLogo,
  logoBlobUrl,
  logoError,
  logoNotice,
  isAdmin,
  onUpload,
  onRemove,
  onUnauthorized,
}: {
  hasLogo: boolean;
  logoBlobUrl: string | null;
  logoError: string;
  logoNotice: string;
  isAdmin: boolean;
  onUpload: (
    file: Blob,
    onProgress: (fraction: number) => void,
  ) => Promise<void>;
  onRemove: () => Promise<void>;
  onUnauthorized: () => void;
}) {
  return (
    <section className="card" aria-labelledby="logo-title">
      <div className="card-header">
        <h2 className="card-title" id="logo-title">
          Logo
        </h2>
        <span className="badge badge-neutral">
          {hasLogo ? "Disponível" : "Sem imagem"}
        </span>
      </div>
      <div className="card-body">
        <p className="form-hint">
          Imagem da organização, visível somente para a equipe nesta área.
        </p>
        <ImageUploader
          label="Logo"
          currentSrc={logoBlobUrl}
          rule={LOGO_RULE}
          shape="circle"
          canEdit={isAdmin}
          onUpload={onUpload}
          onRemove={onRemove}
          onUnauthorized={onUnauthorized}
        />
        {logoError && (
          <div className="alert alert-danger" role="alert">
            {logoError}
          </div>
        )}
        {logoNotice && (
          <div className="alert alert-success" role="status">
            {logoNotice}
          </div>
        )}
      </div>
    </section>
  );
}
