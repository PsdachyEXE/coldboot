import { describe, expect, it } from 'vitest';
import { blockToSpeech, blocksToSpeech, stripMarkdown } from './speech';

describe('terminal speech digest', () => {
  it('leads with short feedback and adds the reason', () => {
    expect(blockToSpeech({ kind: 'feedback', correct: true, expected: '3, 1', reason: 'Pass 1 swaps 1 into place' })).toBe('Correct. Pass 1 swaps 1 into place.');
    expect(blockToSpeech({ kind: 'feedback', correct: false, expected: '3, 1', reason: 'Because.' })).toBe('Incorrect. Expected: 3, 1. Because.');
  });

  it('strips Markdown from bundled content', () => {
    expect(stripMarkdown('**Why not A:** use `x`')).toBe('Why not A: use x');
    expect(blockToSpeech({ kind: 'choices', options: ['**One**', 'Two'], markdown: true })).toBe('A: One. B: Two.');
    expect(blockToSpeech({ kind: 'choices', options: ['One', 'Two'], labels: 'numbers' })).toBe('1: One. 2: Two.');
  });

  it('reads tables row by row and skips echoes and rules', () => {
    expect(blockToSpeech({ kind: 'table', caption: 'Array', columns: ['Index', '0', '1'], rows: [['Value', '4', '9']] })).toBe('Array. Index, 0, 1. Value, 4, 9.');
    expect(blockToSpeech({ kind: 'command', prompt: 'a@coldboot:~$', input: 'ls' })).toBe('');
    expect(blockToSpeech({ kind: 'rule' })).toBe('');
    expect(blockToSpeech({ kind: 'progress', current: 3, total: 10 })).toBe('Question 3 of 10.');
    expect(blockToSpeech({ kind: 'pre', text: '[4, 2]\n[1]', label: 'Starting array' })).toBe('Starting array. [4, 2]. [1].');
  });

  it('says how long a listing is and where its array indexes start', () => {
    expect(blockToSpeech({ kind: 'pseudo', code: 'BEGIN\n    DISPLAY 1\nEND' })).toBe('Pseudocode listing, 3 lines, shown in the terminal.');
    expect(blockToSpeech({ kind: 'pseudo', code: 'BEGIN\n    DISPLAY a[1]\nEND', indexBase: 1 })).toBe('Pseudocode listing, 3 lines, shown in the terminal. Array indexes start at 1.');
  });

  it('names a figure and reads out its marked elements', () => {
    const figure = {
      id: 'f',
      kind: 'context' as const,
      width: 400,
      height: 200,
      system: { label: 'Booking system', x: 200, y: 100 },
      entities: [{ id: 'customer', label: 'Customer', x: 60, y: 100 }],
      flows: [{ id: 'f1', from: 'customer', to: 'system', label: 'booking_request' }],
    };
    expect(blockToSpeech({ kind: 'figure', figure })).toBe('Figure: context.');
    expect(blockToSpeech({ kind: 'figure', figure: { ...figure, title: 'Bookings' }, highlight: ['f1', 'customer'] })).toBe(
      'Figure: Bookings. Marked: A: booking_request from Customer (external entity) to Booking system (the system); B: Customer (external entity).',
    );
  });

  it('caps long digests on a word boundary', () => {
    const long = blocksToSpeech([{ kind: 'text', text: 'word '.repeat(500) }], 100);
    expect(long.length).toBeLessThan(160);
    expect(long).toMatch(/word … The rest is in the terminal output\.$/);
  });
});
