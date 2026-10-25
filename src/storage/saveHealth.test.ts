/**
 * Save health (ticket 26, review finding #3): a tiny observable the persister
 * reports write outcomes to, so the app can warn the moment saving stops
 * working and clear the warning once a save lands again.
 */

import { createSaveHealthMonitor } from './saveHealth';

describe('the save-health monitor', () => {
  it('starts healthy', () => {
    expect(createSaveHealthMonitor().get()).toBe('healthy');
  });

  it('turns failing when a save fails and healthy again when one lands', () => {
    const monitor = createSaveHealthMonitor();

    monitor.reportFailure();
    expect(monitor.get()).toBe('failing');

    monitor.reportSuccess();
    expect(monitor.get()).toBe('healthy');
  });

  it('notifies subscribers only when the status actually changes', () => {
    const monitor = createSaveHealthMonitor();
    const listener = vi.fn();
    monitor.subscribe(listener);

    monitor.reportSuccess(); // already healthy: no change, no call
    expect(listener).not.toHaveBeenCalled();

    monitor.reportFailure();
    monitor.reportFailure(); // still failing: one change only
    expect(listener).toHaveBeenCalledOnce();

    monitor.reportSuccess();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying after unsubscribe', () => {
    const monitor = createSaveHealthMonitor();
    const listener = vi.fn();
    const unsubscribe = monitor.subscribe(listener);

    unsubscribe();
    monitor.reportFailure();

    expect(listener).not.toHaveBeenCalled();
  });
});
