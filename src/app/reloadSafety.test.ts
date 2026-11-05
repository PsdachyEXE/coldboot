import { afterEach, describe, expect, it } from 'vitest';
import { useTerminalSession } from '../terminal/session';
import { useTerminal } from '../terminal/useTerminal';
import { canReloadNow, routeOf } from './reloadSafety';

describe('reload safety', () => {
  afterEach(() => {
    useTerminal.setState({ open: false });
    useTerminalSession.setState({ game: null });
  });

  it('reads the route from the hash', () => {
    expect(routeOf('')).toBe('/');
    expect(routeOf('#/')).toBe('/');
    expect(routeOf('#/learn?kk=U3O1-KK04')).toBe('/learn');
  });

  it('allows a reload only on screens that hold no work in progress', () => {
    for (const quiet of ['', '#/', '#/learn', '#/learn?kk=PSM', '#/map', '#/stats', '#/settings', '#/about']) expect(canReloadNow(quiet)).toBe(true);
    for (const busy of ['#/run', '#/review', '#/drill?kk=U3O1-KK04', '#/written', '#/exam', '#/daily', '#/terminal', '#/welcome']) expect(canReloadNow(busy)).toBe(false);
  });

  it('waits while the terminal is open or a game is under way', () => {
    useTerminal.setState({ open: true });
    expect(canReloadNow('#/')).toBe(false);
    useTerminal.setState({ open: false });
    useTerminalSession.setState({ game: {} as never });
    expect(canReloadNow('#/')).toBe(false);
  });
});
