export function Brand({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <img
        src={
          compact
            ? light
              ? "/icon-light.svg"
              : "/icon.svg"
            : light
              ? "/logo-light.svg"
              : "/logo-dark.svg"
        }
        alt="AferisAI"
      />
      {!compact && <span>Equipe</span>}
    </div>
  );
}
