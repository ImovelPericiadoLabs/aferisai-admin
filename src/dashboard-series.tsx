import { useState } from "react";
import { type DashboardDailySeries, type DashboardSeriesResponse } from "./api";
import "./dashboard-series.css";
import type { DashboardGroup, DashboardGroupKey } from "./dashboard-model";

function formatDay(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function pathFor(values: { count: number }[], max: number): string {
  if (!values.length) return "";
  return values
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"} ${40 + (index / Math.max(1, values.length - 1)) * 540} ${182 - (item.count / max) * 150}`,
    )
    .join(" ");
}

export function SeriesChart({
  title,
  series,
  compare,
}: {
  title: string;
  series?: DashboardDailySeries;
  compare: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const current = series?.current ?? [];
  const previous = compare ? (series?.previous ?? []) : [];
  const safeIndex = Math.min(selected, Math.max(0, current.length - 1));
  const max = Math.max(
    1,
    ...current.map((day) => day.count),
    ...previous.map((day) => day.count),
  );
  const tickValues = [max, Math.round((max * 2) / 3), Math.round(max / 3), 0];
  const shown = current[safeIndex];
  const prior = previous[safeIndex];
  const x = 40 + (safeIndex / Math.max(1, current.length - 1)) * 540;
  const allZero =
    current.every((day) => day.count === 0) &&
    previous.every((day) => day.count === 0);
  if (!current.length)
    return (
      <p className="dash-series-empty">
        Nenhuma série foi retornada para este período.
      </p>
    );
  return (
    <div className="dash-series">
      <div className="dash-series-heading">
        <div>
          <span className="dash-series-kicker">REGISTROS CRIADOS · UTC</span>
          <h3>Evolução diária</h3>
        </div>
        <div className="dash-series-legend">
          <span>
            <i className="is-current" />
            Período atual
          </span>
          {previous.length > 0 && (
            <span>
              <i className="is-previous" />
              Período anterior
            </span>
          )}
        </div>
      </div>
      <svg
        className="dash-series-plot"
        viewBox="0 0 600 225"
        role="img"
        aria-label={`Gráfico de registros criados por dia para ${title}. Use o seletor abaixo ou a tabela para ler os valores.`}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const svgX = ((event.clientX - rect.left) / rect.width) * 600;
          setSelected(
            Math.max(
              0,
              Math.min(
                current.length - 1,
                Math.round(((svgX - 40) / 540) * (current.length - 1)),
              ),
            ),
          );
        }}
      >
        {tickValues.map((tick, index) => (
          <g key={index}>
            <line
              className="dash-series-grid"
              x1="40"
              x2="580"
              y1={32 + index * 50}
              y2={32 + index * 50}
            />
            <text
              className="dash-series-axis"
              x="32"
              y={36 + index * 50}
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        ))}
        {previous.length > 0 && (
          <path
            className="dash-series-line is-previous"
            d={pathFor(previous, max)}
          />
        )}
        <path
          className="dash-series-line is-current"
          d={pathFor(current, max)}
        />
        <line className="dash-series-cursor" x1={x} x2={x} y1="32" y2="182" />
        <circle
          className="dash-series-point is-current"
          cx={x}
          cy={182 - (shown.count / max) * 150}
          r="5"
        />
        {prior && (
          <circle
            className="dash-series-point is-previous"
            cx={x}
            cy={182 - (prior.count / max) * 150}
            r="5"
          />
        )}
        <text className="dash-series-axis" x="40" y="211">
          {formatDay(current[0].date).slice(0, 5)}
        </text>
        <text className="dash-series-axis" x="580" y="211" textAnchor="end">
          {formatDay(current[current.length - 1].date).slice(0, 5)}
        </text>
      </svg>
      <div className="dash-series-inspector">
        <label htmlFor={`dash-day-${title.replace(/\s/g, "-")}`}>
          Explorar dias
        </label>
        <input
          id={`dash-day-${title.replace(/\s/g, "-")}`}
          type="range"
          min="0"
          max={Math.max(0, current.length - 1)}
          value={safeIndex}
          onChange={(event) => setSelected(Number(event.target.value))}
          aria-label={`Dia da série de ${title}`}
        />
        <div className="dash-series-selection" aria-live="polite">
          <strong>{formatDay(shown.date)}</strong>
          <span>
            Atual <b>{shown.count.toLocaleString("pt-BR")}</b>
          </span>
          {prior && (
            <span>
              Anterior {formatDay(prior.date)}{" "}
              <b>{prior.count.toLocaleString("pt-BR")}</b>
            </span>
          )}
        </div>
      </div>
      {allZero && (
        <p className="dash-series-empty">
          Nenhum registro criado nos períodos exibidos.
        </p>
      )}
      <details className="dash-series-table">
        <summary>Ver série diária em tabela</summary>
        <div>
          <table>
            <caption>{title}: registros criados por dia UTC</caption>
            <thead>
              <tr>
                <th scope="col">Dia atual</th>
                <th scope="col">Registros</th>
                {previous.length > 0 && (
                  <>
                    <th scope="col">Dia anterior</th>
                    <th scope="col">Registros</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {current.map((day, index) => (
                <tr key={day.date}>
                  <th scope="row">{formatDay(day.date)}</th>
                  <td>{day.count}</td>
                  {previous[index] && (
                    <>
                      <td>{formatDay(previous[index].date)}</td>
                      <td>{previous[index].count}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function CombinedSeriesChart({
  groups,
  response,
  compare,
}: {
  groups: DashboardGroup[];
  response?: DashboardSeriesResponse | null;
  compare: boolean;
}) {
  const [hidden, setHidden] = useState<DashboardGroupKey[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const available = groups.filter(
    (group) => response?.series[group.key]?.current.length,
  );
  const visible = available.filter((group) => !hidden.includes(group.key));
  const length = available[0]
    ? response!.series[available[0].key]!.current.length
    : 0;
  const safeIndex = Math.min(
    selected ?? Math.max(0, length - 1),
    Math.max(0, length - 1),
  );
  const max = Math.max(
    1,
    ...visible.flatMap((group) => {
      const series = response!.series[group.key]!;
      return [
        ...series.current,
        ...(compare ? (series.previous ?? []) : []),
      ].map((day) => day.count);
    }),
  );
  if (!available.length)
    return (
      <p className="dash-series-empty">
        Nenhuma série autorizada está disponível para este período.
      </p>
    );
  const grid = [max, Math.round((max * 2) / 3), Math.round(max / 3), 0];
  const x = 48 + (safeIndex / Math.max(1, length - 1)) * 820;
  return (
    <div className="dash-master">
      <div
        className="dash-master-legend"
        role="group"
        aria-label="Mostrar ou ocultar módulos no gráfico"
      >
        {available.map((group) => (
          <button
            key={group.key}
            type="button"
            className={`dash-master-toggle dash-master-${group.key}`}
            aria-pressed={!hidden.includes(group.key)}
            onClick={() =>
              setHidden((current) =>
                current.includes(group.key)
                  ? current.filter((key) => key !== group.key)
                  : [...current, group.key],
              )
            }
          >
            <i aria-hidden="true" />
            {group.title}
          </button>
        ))}
      </div>
      {visible.length ? (
        <>
          <svg
            className="dash-master-plot"
            viewBox="0 0 900 295"
            role="img"
            aria-label="Gráfico comparativo de registros criados por dia UTC nos módulos selecionados. Explore os valores com o controle abaixo."
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const svgX = ((event.clientX - rect.left) / rect.width) * 900;
              setSelected(
                Math.max(
                  0,
                  Math.min(
                    length - 1,
                    Math.round(((svgX - 48) / 820) * (length - 1)),
                  ),
                ),
              );
            }}
          >
            {grid.map((tick, index) => (
              <g key={index}>
                <line
                  className="dash-series-grid"
                  x1="48"
                  x2="868"
                  y1={30 + index * 70}
                  y2={30 + index * 70}
                />
                <text
                  className="dash-series-axis"
                  x="38"
                  y={34 + index * 70}
                  textAnchor="end"
                >
                  {tick}
                </text>
              </g>
            ))}
            {visible.map((group) => {
              const series = response!.series[group.key]!;
              const makePath = (values: { count: number }[]) =>
                values
                  .map(
                    (day, index) =>
                      `${index ? "L" : "M"} ${48 + (index / Math.max(1, values.length - 1)) * 820} ${240 - (day.count / max) * 210}`,
                  )
                  .join(" ");
              return (
                <g key={group.key} className={`dash-master-${group.key}`}>
                  {compare && series.previous?.length && (
                    <path
                      className="dash-master-line is-previous"
                      d={makePath(series.previous)}
                    />
                  )}
                  <path
                    className="dash-master-line"
                    d={makePath(series.current)}
                  />
                  <circle
                    className="dash-master-point"
                    cx={x}
                    cy={240 - (series.current[safeIndex].count / max) * 210}
                    r="5"
                  />
                </g>
              );
            })}
            <line
              className="dash-series-cursor"
              x1={x}
              x2={x}
              y1="30"
              y2="240"
            />
            <text className="dash-series-axis" x="48" y="278">
              {formatDay(
                response!.series[available[0].key]!.current[0].date,
              ).slice(0, 5)}
            </text>
            <text className="dash-series-axis" x="868" y="278" textAnchor="end">
              {formatDay(
                response!.series[available[0].key]!.current[length - 1].date,
              ).slice(0, 5)}
            </text>
          </svg>
          <div className="dash-master-controls">
            <label htmlFor="dash-master-day">Explorar dia</label>
            <input
              id="dash-master-day"
              type="range"
              min="0"
              max={Math.max(0, length - 1)}
              value={safeIndex}
              onChange={(event) => setSelected(Number(event.target.value))}
              aria-label="Dia do gráfico comparativo"
            />
            <strong>
              {formatDay(
                response!.series[available[0].key]!.current[safeIndex].date,
              )}
            </strong>
          </div>
          <div className="dash-master-values" aria-live="polite">
            {visible.map((group) => {
              const series = response!.series[group.key]!;
              return (
                <div key={group.key} className={`dash-master-${group.key}`}>
                  <i aria-hidden="true" />
                  <span>{group.title}</span>
                  <strong>
                    {series.current[safeIndex].count.toLocaleString("pt-BR")}
                  </strong>
                  {compare && series.previous?.[safeIndex] && (
                    <small>
                      anterior{" "}
                      {series.previous[safeIndex].count.toLocaleString("pt-BR")}
                    </small>
                  )}
                </div>
              );
            })}
          </div>
          <p className="dash-master-note">
            Linhas contínuas: período atual. Linhas tracejadas: período
            anterior, alinhado por dia do intervalo. Unidade: registros criados
            por dia UTC.
          </p>
          <details className="dash-definition dash-master-definition">
            <summary>Como ler esta tendência</summary>
            <p>
              Cada linha representa um módulo autorizado e pode ser ocultada
              pela legenda. Os pontos contam registros criados no dia UTC, não
              pagamentos, conclusões, mudanças de estado ou pessoas únicas. A
              comparação usa o período imediatamente anterior com a mesma
              duração.
            </p>
          </details>
        </>
      ) : (
        <p className="dash-series-empty">
          Selecione pelo menos um módulo na legenda para exibir o gráfico.
        </p>
      )}
    </div>
  );
}
