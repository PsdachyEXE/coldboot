import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useState } from 'react';
import { Button, ButtonLink, ExternalButtonLink } from './Button';
import { Checkbox, RadioGroup, TextField } from './Field';
import { Meter } from './Meter';
import { EmptyState } from './EmptyState';
import { Banner } from './Banner';
import { KkTag } from './Tag';
import { LiveRegions } from './LiveRegions';
import { announce } from './announce';
import { Dialog } from './Dialog';

describe('Button', () => {
  it('defaults to type="button" and respects disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Reset progress
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Reset progress' });
    expect(b).toHaveAttribute('type', 'button');
    fireEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders router and external links as links', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/review">Start review</ButtonLink>
        <ExternalButtonLink href="https://example.com/">Open page</ExternalButtonLink>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Start review' })).toHaveAttribute('href', '/review');
    const ext = screen.getByRole('link', { name: /^Open page ?\(opens in a new tab\)$/ });
    expect(ext).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('fields', () => {
  it('labels the control and links hint and error', () => {
    render(<TextField label="Display name" hint="Up to 24 characters." error="Enter a display name." />);
    const input = screen.getByLabelText('Display name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Up to 24 characters. Error: Enter a display name.');
  });

  it('runs a radio group and a checkbox from the keyboard-accessible native inputs', () => {
    function Harness() {
      const [v, setV] = useState<'a' | 'b'>('a');
      const [on, setOn] = useState(false);
      return (
        <>
          <RadioGroup<'a' | 'b'> legend="Pick one" name="t" value={v} onChange={setV} options={[{ value: 'a', label: 'First' }, { value: 'b', label: 'Second' }]} />
          <Checkbox label="Play sounds" checked={on} onChange={(e) => setOn(e.target.checked)} />
          <output>{`${v} ${on}`}</output>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Pick one' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Second'));
    fireEvent.click(screen.getByLabelText('Play sounds'));
    expect(screen.getByText('b true')).toBeInTheDocument();
  });
});

describe('Meter', () => {
  it('prints its value in words and exposes it to assistive tech', () => {
    render(<Meter label="U3O1-KK04 mastery" value={62} />);
    const m = screen.getByRole('meter', { name: 'U3O1-KK04 mastery' });
    expect(m).toHaveAttribute('aria-valuenow', '62');
    expect(m).toHaveAttribute('aria-valuetext', '62%');
    expect(screen.getByText('62%')).toBeInTheDocument();
  });

  it('shows unseen distinctly from zero', () => {
    render(
      <>
        <Meter label="Unseen KK" value={null} />
        <Meter label="Weak KK" value={0} />
      </>,
    );
    expect(screen.getByRole('meter', { name: 'Unseen KK' })).toHaveAttribute('aria-valuetext', 'Unseen');
    expect(screen.getByRole('meter', { name: 'Weak KK' })).toHaveAttribute('aria-valuetext', '0%');
  });

  it('counts progress', () => {
    render(<Meter label="Cards" value={3} max={10} format="count" kind="progress" />);
    expect(screen.getByRole('progressbar', { name: 'Cards' })).toHaveAttribute('aria-valuetext', '3 of 10');
  });
});

describe('small primitives', () => {
  it('EmptyState says what to do next', () => {
    render(<EmptyState title="No reviews due" action={<Button>Start a drill</Button>}>Drill your weakest topic next.</EmptyState>);
    expect(screen.getByRole('heading', { name: 'No reviews due' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start a drill' })).toBeInTheDocument();
  });

  it('Banner is a status by default and an alert on request', () => {
    render(
      <>
        <Banner title="Update ready" />
        <Banner title="Not saving" role="alert" />
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Update ready');
    expect(screen.getByRole('alert')).toHaveTextContent('Not saving');
  });

  it('KkTag shows the id and gives screen readers the title', () => {
    render(<KkTag kk="U3O1-KK04" />);
    expect(screen.getByText('U3O1-KK04')).toBeInTheDocument();
    expect(screen.getByText('Data types')).toBeInTheDocument();
  });
});

describe('LiveRegions', () => {
  it('re-announces a repeated message in a fresh node', () => {
    render(<LiveRegions />);
    act(() => announce('Correct'));
    const first = screen.getByTestId('live-polite').firstChild;
    act(() => announce('Correct'));
    const second = screen.getByTestId('live-polite').firstChild;
    expect(second).toHaveTextContent('Correct');
    expect(second).not.toBe(first);
  });

  it('keeps polite and assertive messages apart', () => {
    render(<LiveRegions />);
    act(() => {
      announce('Two minutes left', 'assertive');
    });
    expect(screen.getByTestId('live-assertive')).toHaveTextContent('Two minutes left');
  });
});

describe('Dialog', () => {
  it('is labelled by its title and closes from its own button', () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} onClose={() => setOpen(false)} title="Replace your progress?" actions={<Button onClick={() => setOpen(false)}>Cancel</Button>}>
          <p>This can't be undone.</p>
        </Dialog>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('dialog', { name: 'Replace your progress?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText("This can't be undone.")).not.toBeInTheDocument();
  });

  it('speaks what is announced while it is open from live regions inside it, and nothing older', () => {
    // A native modal makes the shell's live regions inert, so a time warning must reach these.
    act(() => announce('Correct. The answer is B.'));
    render(
      <Dialog open onClose={() => {}} title="Submit your paper?">
        <p>Once you submit, your answers can't be changed.</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Submit your paper?' });
    expect(within(dialog).getByTestId('dialog-live-polite')).toHaveTextContent('');
    act(() => announce('5 minutes of writing time left.', 'assertive'));
    expect(within(dialog).getByTestId('dialog-live-assertive')).toHaveTextContent('5 minutes of writing time left.');
    expect(within(dialog).getByTestId('dialog-live-polite')).toHaveTextContent('');
  });

  it('returns focus to the page heading when the control that opened it has gone', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      const [submitted, setSubmitted] = useState(false);
      return (
        <main id="main" tabIndex={-1}>
          {submitted ? (
            <h1 tabIndex={-1}>Mark your paper</h1>
          ) : (
            <>
              <h1 tabIndex={-1}>Mini paper</h1>
              <Button onClick={() => setOpen(true)}>Report a problem</Button>
            </>
          )}
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            title="Report a content problem"
            actions={
              <>
                <Button onClick={() => setSubmitted(true)}>Run out of time</Button>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </>
            }
          >
            <p>What's wrong?</p>
          </Dialog>
        </main>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Report a problem' });
    opener.focus();
    fireEvent.click(opener);
    // Writing time ends behind the dialog: the view, and the button that opened it, change.
    fireEvent.click(screen.getByRole('button', { name: 'Run out of time' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Mark your paper' })).toHaveFocus();
  });
});
