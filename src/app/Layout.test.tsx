import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { useSettings } from '../state/settings';
import { useStorageHealth } from '../state/storage';
import { useTerminal } from '../terminal';
import { RAIL } from './paths';
import { resetPwaForTests, usePwa } from './pwa';
import { routes } from './routes';
import { pageTitle } from './LayoutItems';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

function onboard() {
  useSettings.setState({ name: 'Lachie', onboarded: true, motion: 'reduce' });
}

function narrowScreen() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: query.includes('max-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

describe('Layout', () => {
  beforeEach(() => {
    useSettings.setState({ motion: 'reduce' });
  });
  afterEach(() => {
    useSettings.getState().reset();
    useTerminal.setState({ open: false });
    useStorageHealth.setState({ ok: true, reason: null, messages: [] });
    resetPwaForTests();
    vi.unstubAllGlobals();
  });

  it('redirects every route to /welcome until first run is done, with no rail or status bar', async () => {
    const router = renderAt('/review');
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome to COLDBOOT' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/welcome');
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    expect(screen.queryByRole('contentinfo', { name: 'Status' })).toBeNull();
    expect(document.title).toBe('Welcome - COLDBOOT');
  });

  it('shows the rail with every destination, the terminal button, and footer links', async () => {
    onboard();
    renderAt('/review');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    for (const item of RAIL) expect(within(nav).getByRole('link', { name: item.label })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Review' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'About' })).toBeInTheDocument();
    expect(within(nav).getByText('COLDBOOT')).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: 'Open terminal' }));
    expect(useTerminal.getState().open).toBe(true);
    expect(within(nav).getByRole('button', { name: 'Close terminal' })).toBeInTheDocument();
    expect(document.title).toBe('Review - COLDBOOT');
  });

  it('starts with a skip link that moves focus to the main column', async () => {
    onboard();
    renderAt('/');
    const skip = await screen.findByRole('link', { name: 'Skip to main content' });
    const all = document.body.querySelectorAll('a[href], button, input');
    expect(all[0]).toBe(skip);
    fireEvent.click(skip);
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('shows the status bar once onboarded', async () => {
    onboard();
    renderAt('/');
    const bar = await screen.findByRole('contentinfo', { name: 'Status' });
    expect(within(bar).getByText(/until the exam|exam is underway|exam has finished/)).toBeInTheDocument();
    expect(within(bar).getByText(/^(No reviews|\d+ reviews?) due$/)).toBeInTheDocument();
  });

  it('sends an onboarded user away from /welcome', async () => {
    onboard();
    const router = renderAt('/welcome');
    await screen.findByRole('navigation', { name: 'Main' });
    expect(router.state.location.pathname).toBe('/');
    expect(document.title).toBe('Home - COLDBOOT');
  });

  it('opens the terminal on a backtick even before the drawer has loaded', async () => {
    onboard();
    renderAt('/');
    await screen.findByRole('navigation', { name: 'Main' });
    act(() => {
      fireEvent.keyDown(document.body, { key: '`' });
    });
    expect(useTerminal.getState().open).toBe(true);
    const drawer = await screen.findByRole('dialog', { name: 'Terminal' });
    await waitFor(() => expect(drawer).toHaveAttribute('data-open', 'true'));
  });

  it('moves focus to the main column after navigating', async () => {
    onboard();
    renderAt('/');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    await act(async () => {
      fireEvent.click(within(nav).getByRole('link', { name: 'Drill' }));
    });
    // Drill is its own chunk; focus moves once the new page is in.
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });

  it('moves focus to the main column when a navigation within the same route drops it', async () => {
    onboard();
    const router = renderAt('/about');
    await screen.findByRole('heading', { level: 1, name: 'About COLDBOOT' });
    expect(document.activeElement).toBe(document.body);
    // For example "Change drill" (/drill?mode=random to /drill): the button that had focus is gone.
    await act(async () => {
      await router.navigate('/about?from=link');
    });
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });

  it('leaves focus alone after a navigation within the same route when something still has it', async () => {
    onboard();
    const router = renderAt('/about');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    const link = within(nav).getByRole('link', { name: 'About' });
    link.focus();
    await act(async () => {
      await router.navigate('/about?from=link');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(link).toHaveFocus();
  });

  it('uses five tabs and a More menu below 720 px', async () => {
    onboard();
    narrowScreen();
    renderAt('/');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    const tabs = within(nav).getAllByRole('listitem');
    expect(tabs.map((t) => t.textContent)).toEqual(['Home', 'Review', 'Drill', 'Terminal', 'More']);
    const more = within(nav).getByRole('button', { name: 'More' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    for (const label of ['Written', 'Exam', 'Map', 'Stats', 'Settings', 'About']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveFocus();
    // The phone header keeps the terminal button for touch.
    expect(screen.getByRole('button', { name: 'Open terminal' })).toBeInTheDocument();
  });

  it('closes the More menu after choosing an item, and marks More as current there', async () => {
    onboard();
    narrowScreen();
    const router = renderAt('/');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    fireEvent.click(within(nav).getByRole('button', { name: 'More' }));
    await act(async () => {
      fireEvent.click(within(nav).getByRole('link', { name: 'Settings' }));
    });
    expect(router.state.location.pathname).toBe('/settings');
    // Settings is its own chunk: the page (and the open menu) change once it has loaded.
    await waitFor(() => expect(within(nav).queryByRole('link', { name: 'Settings' })).toBeNull());
    expect(within(nav).getByRole('button', { name: 'More' }).className).toMatch(/tabActive/);
  });

  it('shows every storage warning in a persistent banner', async () => {
    onboard();
    useStorageHealth.setState({ ok: false, reason: 'b', messages: ['Storage is full.', 'Two records were set aside.'] });
    renderAt('/');
    const alert = (await screen.findByText("There's a problem with your saved progress")).closest('[role="alert"]');
    expect(alert).toHaveTextContent("There's a problem with your saved progress");
    expect(alert).toHaveTextContent('Storage is full.');
    expect(alert).toHaveTextContent('Two records were set aside.');
  });

  it('offers the update with Reload and Later', async () => {
    onboard();
    renderAt('/');
    await screen.findByRole('navigation', { name: 'Main' });
    act(() => usePwa.setState({ needRefresh: true, updateWaiting: true }));
    const region = screen.getByRole('region', { name: 'Update' });
    expect(region).toHaveTextContent('Update ready. Reload now?');
    expect(within(region).getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    fireEvent.click(within(region).getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('region', { name: 'Update' })).toBeNull();
  });

  it('shows the not found page for unknown routes', async () => {
    onboard();
    renderAt('/nowhere');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Page not found - COLDBOOT');
  });
});

describe('pageTitle', () => {
  it('names every route', () => {
    expect(pageTitle('/review')).toBe('Review - COLDBOOT');
    expect(pageTitle('/map')).toBe('Syllabus map - COLDBOOT');
    expect(pageTitle('/run')).toBe("Today's run - COLDBOOT");
    expect(pageTitle('/x')).toBe('Page not found - COLDBOOT');
  });
});
