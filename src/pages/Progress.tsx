/**
 * The Progress area (spec story 27): White's error rate per match over time,
 * blunder counts per match, and simple aggregates — computed only over
 * non-tutor-assisted games (src/progress). Charts are hand-rolled SVG:
 * single-series, hairline grid, tooltips that never gate (a table view
 * carries every number), hollow markers where a match was partially
 * tutor-assisted.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DIFFICULTY_LABELS } from '../engine';
import {
  buildProgress,
  type ProgressData,
  type ProgressPoint,
} from '../progress';
import {
  getMatchStorage,
  isStoredMatch,
  type MatchStorage,
  type StoredMatch,
} from '../storage';
import { errorRatePr, prText, skillBand } from '../ui/format';
import './progress.css';

const DIFFICULTY_LABEL: Record<string, string> = DIFFICULTY_LABELS;

/** "7-point vs Expert" — the tooltip's and table's match name. */
function matchLabel(point: ProgressPoint): string {
  if (point.difficulty === 'online') {
    return `${point.length}-point online`;
  }
  const difficulty = DIFFICULTY_LABEL[point.difficulty] ?? 'the computer';
  return `${point.length}-point vs ${difficulty}`;
}

function dateText(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function tickDateText(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** "1 of 3 games was tutor-assisted and excluded" (plural-aware). */
function exclusionText(point: ProgressPoint): string {
  const total = point.gamesCounted + point.gamesExcluded;
  const verb = point.gamesExcluded === 1 ? 'was' : 'were';
  return `${point.gamesExcluded} of ${total} games ${verb} tutor-assisted and excluded`;
}

/* ------------------------------------------------------------------ */
/* Chart geometry                                                       */
/* ------------------------------------------------------------------ */

const CHART_W = 660;
const MARGIN = { left: 42, right: 12, top: 14, bottom: 26 } as const;

interface Layout {
  readonly width: number;
  readonly height: number;
  readonly plotLeft: number;
  readonly plotRight: number;
  readonly plotTop: number;
  readonly plotBottom: number;
  readonly step: number;
  readonly x: (index: number) => number;
}

function layoutFor(height: number, points: number): Layout {
  const plotLeft = MARGIN.left;
  const plotRight = CHART_W - MARGIN.right;
  const step = (plotRight - plotLeft) / Math.max(1, points);
  return {
    width: CHART_W,
    height,
    plotLeft,
    plotRight,
    plotTop: MARGIN.top,
    plotBottom: height - MARGIN.bottom,
    step,
    x: (index) => plotLeft + (index + 0.5) * step,
  };
}

/** A clean tick step (1/2/2.5/5 × 10^k) covering max/target. */
function niceStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough));
  const unit = rough / power;
  const factor =
    unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return factor * power;
}

/** Ascending ticks from 0 to the first clean step at or above max. */
function ticksFor(max: number, integers: boolean): number[] {
  const safeMax = max > 0 ? max : 1;
  let step = niceStep(safeMax / 3);
  if (integers) {
    step = Math.max(1, Math.ceil(step));
  }
  const ticks: number[] = [];
  for (let value = 0; value < safeMax + step / 2; value += step) {
    ticks.push(integers ? Math.round(value) : value);
  }
  return ticks;
}

/** At most five x ticks, always including the first and last match. */
function tickIndices(n: number): number[] {
  if (n <= 5) {
    return Array.from({ length: n }, (_, i) => i);
  }
  const picks = [0, (n - 1) / 4, (n - 1) / 2, (3 * (n - 1)) / 4, n - 1];
  return [...new Set(picks.map(Math.round))];
}

/** The two rounded top corners of a column; square at the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, h, w / 2);
  const bottom = y + h;
  return [
    `M${x},${bottom}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + w - r},${y}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `L${x + w},${bottom}`,
    'Z',
  ].join(' ');
}

/* ------------------------------------------------------------------ */
/* Shared chart pieces                                                  */
/* ------------------------------------------------------------------ */

function Grid({
  layout,
  ticks,
  max,
  format,
}: {
  layout: Layout;
  ticks: readonly number[];
  max: number;
  format: (value: number) => string;
}) {
  const y = (value: number) =>
    layout.plotBottom - (value / max) * (layout.plotBottom - layout.plotTop);
  return (
    <g>
      {ticks.map((tick) => (
        <g key={tick}>
          {tick > 0 && (
            <line
              className="chart-grid"
              x1={layout.plotLeft}
              x2={layout.plotRight}
              y1={y(tick)}
              y2={y(tick)}
            />
          )}
          <text
            className="chart-tick"
            x={layout.plotLeft - 6}
            y={y(tick) + 3}
            textAnchor="end"
          >
            {format(tick)}
          </text>
        </g>
      ))}
      <line
        className="chart-baseline"
        x1={layout.plotLeft}
        x2={layout.plotRight}
        y1={layout.plotBottom}
        y2={layout.plotBottom}
      />
    </g>
  );
}

function XAxis({
  layout,
  points,
}: {
  layout: Layout;
  points: readonly ProgressPoint[];
}) {
  return (
    <g>
      {tickIndices(points.length).map((index) => (
        <text
          key={points[index].matchId}
          className="chart-tick"
          x={layout.x(index)}
          y={layout.height - 8}
          textAnchor="middle"
        >
          {tickDateText(points[index].when)}
        </text>
      ))}
    </g>
  );
}

interface TooltipState {
  readonly index: number;
  readonly xRatio: number;
  readonly yRatio: number;
}

function Tooltip({
  point,
  state,
  lead,
}: {
  point: ProgressPoint;
  state: TooltipState;
  lead: 'rate' | 'blunders';
}) {
  return (
    <div
      className="chart-tooltip"
      style={{
        left: `${state.xRatio * 100}%`,
        top: `${state.yRatio * 100}%`,
      }}
    >
      <p className="tooltip-when">
        {dateText(point.when)} — {matchLabel(point)}
      </p>
      <p className="tooltip-value">
        {lead === 'rate' ? (
          <>
            <strong>{prText(point.errorRate)}</strong> PR
          </>
        ) : (
          <>
            <strong>{point.blunders}</strong>{' '}
            {point.blunders === 1 ? 'blunder' : 'blunders'}
          </>
        )}
      </p>
      <p className="tooltip-detail">
        {lead === 'rate'
          ? `${skillBand(point.errorRate)} · ${count(point.blunders, 'blunder')} · ${point.decisions} decisions`
          : `PR ${prText(point.errorRate)} · ${point.decisions} decisions`}
      </p>
      {point.gamesExcluded > 0 && (
        <p className="tooltip-note">{exclusionText(point)}</p>
      )}
    </div>
  );
}

/**
 * One focusable button per match, overlaid on the plot as full-height hit
 * bands (wider than the marks they cover). Hover and keyboard focus show
 * the same readout; a click pins it — the tablet path.
 */
function PointButtons({
  layout,
  points,
  label,
  onHover,
  onPin,
  yRatioFor,
}: {
  layout: Layout;
  points: readonly ProgressPoint[];
  label: (point: ProgressPoint, index: number) => string;
  onHover: (state: TooltipState | null) => void;
  onPin: (state: TooltipState) => void;
  yRatioFor: (index: number) => number;
}) {
  return (
    <div className="chart-hits">
      {points.map((point, index) => {
        const state: TooltipState = {
          index,
          xRatio: layout.x(index) / layout.width,
          yRatio: yRatioFor(index),
        };
        return (
          <button
            key={point.matchId}
            type="button"
            className="chart-hit"
            style={{
              left: `${((layout.x(index) - layout.step / 2) / layout.width) * 100}%`,
              width: `${(layout.step / layout.width) * 100}%`,
              top: `${(layout.plotTop / layout.height) * 100}%`,
              height: `${((layout.plotBottom - layout.plotTop) / layout.height) * 100}%`,
            }}
            aria-label={label(point, index)}
            onPointerEnter={() => onHover(state)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(state)}
            onBlur={() => onHover(null)}
            onClick={() => onPin(state)}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The two charts                                                       */
/* ------------------------------------------------------------------ */

function RateChart({ points }: { points: readonly ProgressPoint[] }) {
  const [hover, setHover] = useState<TooltipState | null>(null);
  const [pinned, setPinned] = useState<TooltipState | null>(null);
  const shown = hover ?? pinned;
  const pin = (state: TooltipState) =>
    setPinned((current) => (current?.index === state.index ? null : state));
  const height = 240;
  const layout = layoutFor(height, points.length);
  const values = points.map((point) => errorRatePr(point.errorRate));
  const ticks = ticksFor(Math.max(...values), false);
  const max = ticks[ticks.length - 1];
  const y = (value: number) =>
    layout.plotBottom - (value / max) * (layout.plotBottom - layout.plotTop);

  const path = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'}${layout.x(i)},${y(values[i])}`)
    .join(' ');

  const last = points.length - 1;
  const lastY = y(values[last]);

  return (
    <figure className="progress-chart">
      <figcaption>
        <h2>PR per match</h2>
        <p className="chart-subtitle">
          Performance rating — equity lost per unforced decision, on the scale
          serious players use. Lower is better.
        </p>
      </figcaption>
      <div className="chart-plot">
        <svg
          viewBox={`0 0 ${layout.width} ${height}`}
          className="chart-svg"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <Grid
            layout={layout}
            ticks={ticks}
            max={max}
            format={(v) => String(v)}
          />
          <XAxis layout={layout} points={points} />
          {shown && (
            <line
              className="chart-crosshair"
              x1={layout.x(shown.index)}
              x2={layout.x(shown.index)}
              y1={layout.plotTop}
              y2={layout.plotBottom}
            />
          )}
          <g>
            {points.length > 1 && <path className="rate-line" d={path} />}
            {points.map((point, i) => (
              <circle
                key={point.matchId}
                className={
                  point.gamesExcluded > 0
                    ? 'rate-dot rate-dot--partial'
                    : 'rate-dot'
                }
                cx={layout.x(i)}
                cy={y(values[i])}
                r={4}
              />
            ))}
            <text
              className="chart-end-label"
              x={Math.min(layout.x(last), layout.plotRight - 14)}
              y={lastY < layout.plotTop + 20 ? lastY + 20 : lastY - 11}
              textAnchor="middle"
            >
              {prText(points[last].errorRate)}
            </text>
          </g>
        </svg>
        <PointButtons
          layout={layout}
          points={points}
          yRatioFor={(i) => y(values[i]) / height}
          onHover={setHover}
          onPin={pin}
          label={(point, i) =>
            `Match ${i + 1} of ${points.length}, ${dateText(point.when)}, ` +
            `${matchLabel(point)}: PR ${prText(point.errorRate)} over ` +
            `${point.decisions} decisions, ${count(point.blunders, 'blunder')}` +
            (point.gamesExcluded > 0 ? `. ${exclusionText(point)}.` : '.')
          }
        />
        {shown && (
          <Tooltip point={points[shown.index]} state={shown} lead="rate" />
        )}
      </div>
    </figure>
  );
}

function BlunderChart({ points }: { points: readonly ProgressPoint[] }) {
  const [hover, setHover] = useState<TooltipState | null>(null);
  const [pinned, setPinned] = useState<TooltipState | null>(null);
  const shown = hover ?? pinned;
  const pin = (state: TooltipState) =>
    setPinned((current) => (current?.index === state.index ? null : state));
  const height = 180;
  const layout = layoutFor(height, points.length);
  const ticks = ticksFor(Math.max(...points.map((p) => p.blunders)), true);
  const max = ticks[ticks.length - 1];
  const y = (value: number) =>
    layout.plotBottom - (value / max) * (layout.plotBottom - layout.plotTop);
  const barWidth = Math.min(24, Math.max(4, layout.step - 2));

  return (
    <figure className="progress-chart">
      <figcaption>
        <h2>Blunders per match</h2>
        <p className="chart-subtitle">
          Decisions that lost 0.08 equity or more — fewer is better.
        </p>
      </figcaption>
      <div className="chart-plot">
        <svg
          viewBox={`0 0 ${layout.width} ${height}`}
          className="chart-svg"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <Grid
            layout={layout}
            ticks={ticks}
            max={max}
            format={(v) => String(v)}
          />
          <XAxis layout={layout} points={points} />
          <g>
            {points.map(
              (point, i) =>
                point.blunders > 0 && (
                  <path
                    key={point.matchId}
                    className={
                      shown?.index === i
                        ? 'blunder-bar blunder-bar--active'
                        : 'blunder-bar'
                    }
                    d={barPath(
                      layout.x(i) - barWidth / 2,
                      y(point.blunders),
                      barWidth,
                      layout.plotBottom - y(point.blunders),
                    )}
                  />
                ),
            )}
          </g>
        </svg>
        <PointButtons
          layout={layout}
          points={points}
          yRatioFor={(i) => y(points[i].blunders) / height}
          onHover={setHover}
          onPin={pin}
          label={(point, i) =>
            `Match ${i + 1} of ${points.length}, ${dateText(point.when)}, ` +
            `${matchLabel(point)}: ${count(point.blunders, 'blunder')}` +
            (point.gamesExcluded > 0 ? `. ${exclusionText(point)}.` : '.')
          }
        />
        {shown && (
          <Tooltip point={points[shown.index]} state={shown} lead="blunders" />
        )}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Aggregates, table, page                                              */
/* ------------------------------------------------------------------ */

function StatStrip({ data }: { data: ProgressData }) {
  const { totals } = data;
  return (
    <section className="progress-stats" aria-label="Progress summary">
      <div className="stat">
        <span className="stat-label">Matches analyzed</span>
        <span className="stat-value">{totals.matches}</span>
      </div>
      <div className="stat">
        <span className="stat-label">
          PR, last {totals.recentCount}{' '}
          {totals.recentCount === 1 ? 'match' : 'matches'}
        </span>
        <span className="stat-value">
          {totals.recentErrorRate === null
            ? '–'
            : prText(totals.recentErrorRate)}
        </span>
        {totals.recentErrorRate !== null && (
          <span className="stat-band">{skillBand(totals.recentErrorRate)}</span>
        )}
      </div>
      <div className="stat">
        <span className="stat-label">Blunders in all</span>
        <span className="stat-value">{totals.blunders}</span>
      </div>
      <p className="stat-hint">
        PR (performance rating) is equity lost per unforced decision, on the
        scale serious players use — lower is better.
      </p>
    </section>
  );
}

function NumbersTable({ points }: { points: readonly ProgressPoint[] }) {
  return (
    <details className="progress-table">
      <summary>View the numbers</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">Match</th>
            <th scope="col">Finished</th>
            <th scope="col">PR</th>
            <th scope="col">Blunders</th>
            <th scope="col">Decisions</th>
            <th scope="col">Games counted</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.matchId}>
              <th scope="row">{matchLabel(point)}</th>
              <td>{dateText(point.when)}</td>
              <td>{prText(point.errorRate)}</td>
              <td>{point.blunders}</td>
              <td>{point.decisions}</td>
              <td>
                {point.gamesCounted} of{' '}
                {point.gamesCounted + point.gamesExcluded}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export interface ProgressProps {
  /** Injectable for tests; defaults to the shared IndexedDB storage. */
  storage?: MatchStorage;
}

export function Progress({ storage: injectedStorage }: ProgressProps = {}) {
  const [storage] = useState(() => injectedStorage ?? getMatchStorage());
  const [rows, setRows] = useState<readonly StoredMatch[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    storage
      .list()
      .then((listed) => setRows(listed.filter((row) => isStoredMatch(row))))
      .catch(() => setFailed(true));
  }, [storage]);

  const data = useMemo(() => buildProgress(rows ?? []), [rows]);

  if (failed) {
    return (
      <section className="progress-area">
        <h1>Progress</h1>
        <p>
          Your match history could not be loaded, so there is nothing to plot.
          It may recover on reload.
        </p>
      </section>
    );
  }

  if (rows === null) {
    return (
      <section className="progress-area">
        <h1>Progress</h1>
      </section>
    );
  }

  if (data.points.length === 0) {
    return (
      <section className="progress-area">
        <h1>Progress</h1>
        <div className="progress-empty">
          <p className="progress-empty-lead">No analyzed matches yet.</p>
          {rows.length > 0 && (
            <p>
              None of your matches can be scored yet: hot-seat matches and
              tutor-assisted games are excluded, in-progress matches count once
              finished, and a finished match is analyzed the first time it is
              opened in Analyze.
            </p>
          )}
          <p>
            Finish a match against the computer and its analysis lands here — PR
            over time, blunder counts, and how both are trending. Tutor-assisted
            games are excluded, so leave Tutor mode off when you want a match to
            move these charts.
          </p>
          <Link className="progress-empty-link" to="/">
            Start a match
          </Link>
        </div>
      </section>
    );
  }

  const anyPartial = data.points.some((point) => point.gamesExcluded > 0);

  return (
    <section className="progress-area">
      <h1>Progress</h1>
      <StatStrip data={data} />
      <p className="progress-note">
        Tutor-assisted games are excluded from everything on this page
        {anyPartial
          ? ' — a hollow point marks a match where only some games counted'
          : ''}
        .
      </p>
      <RateChart points={data.points} />
      <BlunderChart points={data.points} />
      <NumbersTable points={data.points} />
    </section>
  );
}
