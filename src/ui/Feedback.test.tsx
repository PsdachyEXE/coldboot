import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Feedback } from './Feedback';
import { LiveRegions } from './LiveRegions';
import { useAnnouncer } from './announce';

describe('Feedback', () => {
  it('shows the ✓ glyph and the word Correct', () => {
    render(<Feedback correct />);
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.queryByText('Incorrect')).not.toBeInTheDocument();
  });

  it('shows the ✗ glyph and the word Incorrect, with detail', () => {
    render(
      <Feedback correct={false} summary="The answer is B.">
        <p>Binary search needs sorted data.</p>
      </Feedback>,
    );
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
    expect(screen.getByText('Binary search needs sorted data.')).toBeInTheDocument();
  });

  it('keeps the glyph out of the accessible text', () => {
    render(<Feedback correct />);
    expect(screen.getByText('✓')).toHaveAttribute('aria-hidden', 'true');
  });

  it('announces the verdict and summary through the polite live region', () => {
    render(
      <>
        <LiveRegions />
        <Feedback correct={false} summary="The answer is B." />
      </>,
    );
    expect(screen.getByTestId('live-polite')).toHaveTextContent('Incorrect. The answer is B.');
  });

  it('can stay silent when the screen announces for itself', () => {
    useAnnouncer.setState({ polite: '', politeSeq: 0 });
    render(
      <>
        <LiveRegions />
        <Feedback correct announce={false} />
      </>,
    );
    expect(screen.getByTestId('live-polite')).toHaveTextContent('');
  });
});
