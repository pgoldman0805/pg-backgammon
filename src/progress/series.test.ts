import {
  gameAnalysis,
  gameRecord,
  legacyGameRecord,
  matchAnalysis,
  progressRow as row,
  summary,
} from '../test/progressRows';
import { buildProgress } from './series';

/* ------------------------------------------------------------------ */
/* The golden history: mixed tutor and non-tutor games                  */
/* ------------------------------------------------------------------ */

describe('buildProgress', () => {
  it('recomputes a match point over non-tutor games only (golden history)', () => {
    // Three games: the middle one was tutor-assisted and must not count.
    // Non-tutor games: 20 decisions / 0.200 lost / 1 blunder / 2 errors /
    // 1 dubious, then 5 decisions / 0.100 lost / 1 blunder / 2 dubious.
    // Recomputed: 25 decisions, 0.300 lost, rate 0.012, 2 blunders,
    // 2 errors, 3 dubious. The stored match summary (which includes the
    // tutor game's 10 decisions / 0.900 / 5 blunders) must be ignored.
    const stored = row({
      id: 'golden',
      games: [gameRecord(false), gameRecord(true), gameRecord(false)],
      analysis: matchAnalysis([
        gameAnalysis(summary(20, 0.2, 1, 2, 1)),
        gameAnalysis(summary(10, 0.9, 5, 0, 0)),
        gameAnalysis(summary(5, 0.1, 1, 0, 2)),
      ]),
      updatedAt: 5_000,
    });

    const { points } = buildProgress([stored]);

    expect(points).toHaveLength(1);
    const point = points[0];
    expect(point.matchId).toBe('golden');
    expect(point.when).toBe(5_000);
    expect(point.decisions).toBe(25);
    expect(point.equityLost).toBeCloseTo(0.3, 10);
    expect(point.errorRate).toBeCloseTo(0.012, 10);
    expect(point.blunders).toBe(2);
    expect(point.errors).toBe(2);
    expect(point.dubious).toBe(3);
    expect(point.gamesCounted).toBe(2);
    expect(point.gamesExcluded).toBe(1);
  });

  it('a match whose games were all tutor-assisted contributes nothing', () => {
    const stored = row({
      id: 'all-tutor',
      games: [gameRecord(true), gameRecord(true)],
      analysis: matchAnalysis([
        gameAnalysis(summary(12, 0.4, 2)),
        gameAnalysis(summary(9, 0.1, 1)),
      ]),
    });

    expect(buildProgress([stored]).points).toHaveLength(0);
  });

  it('treats an absent tutorAssisted field (pre-ticket-09 rows) as not assisted', () => {
    const stored = row({
      id: 'legacy',
      games: [legacyGameRecord()],
      analysis: matchAnalysis([gameAnalysis(summary(10, 0.05, 0, 1, 0))]),
    });

    const { points } = buildProgress([stored]);

    expect(points).toHaveLength(1);
    expect(points[0].decisions).toBe(10);
    expect(points[0].errorRate).toBeCloseTo(0.005, 10);
  });

  it('excludes in-progress, unanalyzed, corrupt, hot-seat and unknown-mode rows', () => {
    const analyzed = matchAnalysis([gameAnalysis(summary(10, 0.1, 1))]);
    const rows = [
      row({ id: 'counts', games: [gameRecord(false)], analysis: analyzed }),
      row({
        id: 'live',
        games: [gameRecord(false)],
        analysis: analyzed,
        status: 'in-progress',
      }),
      row({ id: 'unanalyzed', games: [gameRecord(false)] }),
      row({
        id: 'corrupt',
        games: [gameRecord(false)],
        analysis: { format: 99, games: 'nope' },
      }),
      row({
        id: 'hotseat',
        games: [gameRecord(false)],
        analysis: analyzed,
        mode: 'hotseat',
      }),
      row({
        id: 'imported-unknown-side',
        games: [gameRecord(false)],
        analysis: analyzed,
        mode: 'imported',
      }),
    ];

    const { points } = buildProgress(rows);

    expect(points.map((point) => point.matchId)).toEqual(['counts']);
  });

  it('orders points by finish time ascending, whatever the input order', () => {
    const analysisOf = (lost: number) =>
      matchAnalysis([gameAnalysis(summary(10, lost))]);
    const rows = [
      row({
        id: 'newest',
        games: [gameRecord(false)],
        analysis: analysisOf(0.3),
        updatedAt: 3_000,
      }),
      row({
        id: 'oldest',
        games: [gameRecord(false)],
        analysis: analysisOf(0.1),
        updatedAt: 1_000,
      }),
      row({
        id: 'middle',
        games: [gameRecord(false)],
        analysis: analysisOf(0.2),
        updatedAt: 2_000,
      }),
    ];

    const { points } = buildProgress(rows);

    expect(points.map((point) => point.matchId)).toEqual([
      'oldest',
      'middle',
      'newest',
    ]);
    expect(points.map((point) => point.when)).toEqual([1_000, 2_000, 3_000]);
  });

  it('aggregates totals and averages the error rate over the last 10 matches', () => {
    // Twelve matches, each 10 decisions and one blunder; match n loses
    // n × 0.01. The last ten are matches 3..12, so the recent average is
    // mean(0.003..0.012) = 0.0075. Total blunders: 12.
    const rows = Array.from({ length: 12 }, (_, i) =>
      row({
        id: `m${i + 1}`,
        games: [gameRecord(false)],
        analysis: matchAnalysis([gameAnalysis(summary(10, (i + 1) * 0.01, 1))]),
        updatedAt: (i + 1) * 1_000,
      }),
    );

    const { totals } = buildProgress(rows);

    expect(totals.matches).toBe(12);
    expect(totals.blunders).toBe(12);
    expect(totals.recentCount).toBe(10);
    expect(totals.recentErrorRate).toBeCloseTo(0.0075, 10);
  });

  it('reports empty totals for an empty history', () => {
    const { points, totals } = buildProgress([]);

    expect(points).toEqual([]);
    expect(totals).toEqual({
      matches: 0,
      blunders: 0,
      recentErrorRate: null,
      recentCount: 0,
    });
  });
});
