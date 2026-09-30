import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../routes';
import RouteError from './RouteError';

function Broken(): never {
  throw new RangeError('Invalid time value');
}

describe('route error screen', () => {
  beforeEach(() => {
    // React and the router log the caught error; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is the root route error element, so no screen fault shows a stack trace', () => {
    expect(routes[0].errorElement).toEqual(<RouteError />);
  });

  it('says what happened and offers Settings and Home instead of a stack trace', () => {
    const router = createMemoryRouter([{ path: '/', element: <Broken />, errorElement: <RouteError /> }], { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('heading', { level: 1, name: "This screen couldn't be shown" })).toBeInTheDocument();
    expect(screen.queryByText(/Invalid time value/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Go to Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
  });
});
