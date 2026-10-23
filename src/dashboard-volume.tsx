import { groupSum, type DashboardGroup } from "./dashboard-model";

export function DashboardVolumeChart({ groups }: { groups: DashboardGroup[] }) {
  const max = Math.max(1, ...groups.map(groupSum));
  return (
    <section className="dash-volume" aria-labelledby="dash-volume-title">
      <header>
        <div>
          <p className="dash-eyebrow">COMPARAÇÃO ATUAL</p>
          <h2 id="dash-volume-title">Volume por módulo</h2>
          <p>Registros nos estados exibidos, lado a lado.</p>
        </div>
        <span className="dash-snapshot-badge">
          <span aria-hidden="true" />▥ Atual
        </span>
      </header>
      <div className="dash-volume-axis" aria-hidden="true">
        <span>0</span>
        <span>{Math.round(max / 2).toLocaleString("pt-BR")}</span>
        <span>{max.toLocaleString("pt-BR")}</span>
      </div>
      <div
        className="dash-volume-rows"
        role="img"
        aria-label="Barras empilhadas do volume atual por módulo. A tabela abaixo detalha os valores."
      >
        {groups.map((group) => (
          <div className="dash-volume-row" key={group.key}>
            <div className="dash-volume-label">
              <strong>{group.title}</strong>
              <span>{groupSum(group).toLocaleString("pt-BR")}</span>
            </div>
            <div className="dash-volume-track">
              {group.items.map((item) => (
                <span
                  key={item.label}
                  className={`dash-volume-segment dash-tone-${item.tone}`}
                  title={`${item.label}: ${item.value.toLocaleString("pt-BR")}`}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <details className="dash-definition">
        <summary>Como ler este gráfico</summary>
        <p>
          O comprimento total compara quantos registros aparecem nos estados
          exibidos de cada módulo. As divisões coloridas representam estados
          próprios de cada módulo; não formam um funil nem medem transições.
        </p>
      </details>
      <details className="dash-data-details">
        <summary>Ver valores em tabela</summary>
        <div className="dash-table-wrap">
          <table>
            <caption>Contagens atuais por módulo e estado</caption>
            <thead>
              <tr>
                <th scope="col">Módulo</th>
                <th scope="col">Estado</th>
                <th scope="col">Registros</th>
              </tr>
            </thead>
            <tbody>
              {groups.flatMap((group) =>
                group.items.map((item) => (
                  <tr key={`${group.key}-${item.label}`}>
                    <th scope="row">{group.title}</th>
                    <td>{item.label}</td>
                    <td>{item.value.toLocaleString("pt-BR")}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
