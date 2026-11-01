export function ImagePreviews({
  previewUrl,
  sizeLabel,
  framed,
}: {
  previewUrl: string;
  sizeLabel: string | undefined;
  framed: boolean;
}) {
  return (
    <div className="iu-previews" aria-label="Como vai aparecer">
      <p className="form-hint">
        Como vai aparecer
        {sizeLabel ? ` · ${sizeLabel}` : ""}
        {framed ? " · enquadramento aplicado" : ""}
      </p>
      <div className="iu-row">
        <span className={`iu-avatar iu-circle iu-lg`}>
          <img src={previewUrl} alt="Prévia circular" />
        </span>
        <span className={`iu-avatar iu-square iu-lg`}>
          <img src={previewUrl} alt="Prévia quadrada" />
        </span>
        <span className="iu-avatar iu-square iu-lg iu-dark">
          <img src={previewUrl} alt="Prévia em fundo escuro" />
        </span>
      </div>
    </div>
  );
}
