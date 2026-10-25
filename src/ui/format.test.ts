import { formatBytes, luckText, prText, skillBand } from './format';

describe('prText', () => {
  it('scales the EMG error rate to XG-style PR (×500), lower is better', () => {
    // 0.01 equity lost per decision is a PR of 5.0, half the old mEMG 10.0.
    expect(prText(0.01)).toBe('5.0');
    expect(prText(0.03)).toBe('15.0');
    expect(prText(0)).toBe('0.0');
  });
});

describe('skillBand', () => {
  it('names the familiar band a PR falls in, lower is better', () => {
    expect(skillBand(0.008)).toBe('World-class'); // PR 4
    expect(skillBand(0.014)).toBe('Expert'); // PR 7
    expect(skillBand(0.02)).toBe('Advanced'); // PR 10
    expect(skillBand(0.03)).toBe('Intermediate'); // PR 15
    expect(skillBand(0.05)).toBe('Beginner'); // PR 25
  });

  it('puts each band boundary on the lower (better) side', () => {
    expect(skillBand(0.01)).toBe('Expert'); // PR 5, not World-class
    expect(skillBand(0.016)).toBe('Advanced'); // PR 8, not Expert
    expect(skillBand(0.026)).toBe('Intermediate'); // PR 13, not Advanced
    expect(skillBand(0.04)).toBe('Beginner'); // PR 20, not Intermediate
  });
});

describe('luckText', () => {
  it('shows net luck signed to two decimals, lucky is positive', () => {
    expect(luckText(0.42)).toBe('+0.42');
    expect(luckText(1.5)).toBe('+1.50');
  });

  it('uses a real minus sign for unlucky figures', () => {
    expect(luckText(-1.1)).toBe('−1.10');
  });

  it('shows a neutral zero with no sign', () => {
    expect(luckText(0)).toBe('0.00');
    expect(luckText(0.004)).toBe('0.00');
  });
});

describe('formatBytes', () => {
  it('shows plain bytes below a kilobyte', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });

  it('scales to KB, MB and GB with one decimal', () => {
    expect(formatBytes(1_024)).toBe('1.0 KB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });
});
