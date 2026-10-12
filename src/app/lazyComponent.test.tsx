import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { lazyComponent } from './lazyComponent';

function Greeting({ name }: { name: string }) {
  return <p>Hello {name}</p>;
}

describe('lazyComponent', () => {
  it('shows the fallback until the chunk arrives', async () => {
    const Lazy = lazyComponent(async () => ({ default: Greeting }));
    render(
      <Suspense fallback={<p>Loading</p>}>
        <Lazy name="Kiri" />
      </Suspense>,
    );
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(await screen.findByText('Hello Kiri')).toBeInTheDocument();
  });

  it('renders straight away once loaded, without the fallback', async () => {
    const Lazy = lazyComponent(async () => ({ default: Greeting }));
    await Lazy.load();
    render(
      <Suspense fallback={<p>Loading</p>}>
        <Lazy name="Ari" />
      </Suspense>,
    );
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    expect(screen.getByText('Hello Ari')).toBeInTheDocument();
  });
});
