import { describe, expect, it } from 'vitest';
import { maskDefinition, namesInDefinition } from './mask';

describe('maskDefinition', () => {
  it('hides the term and its aliases as whole words, longest first', () => {
    expect(maskDefinition('A DFD, or data flow diagram, shows flows.', ['data flow diagram', 'DFD'])).toBe('A (this term), or (this term), shows flows.');
    expect(maskDefinition('Backups run on a schedule; a backup is a copy.', ['Backup', 'backups'])).toBe('(this term) run on a schedule; a (this term) is a copy.');
  });

  it('leaves longer words that only contain the term', () => {
    expect(maskDefinition('Validation checks input.', ['valid'])).toBe('Validation checks input.');
    expect(maskDefinition('Data is encrypted before it is sent.', ['Encryption'])).toBe('Data is encrypted before it is sent.');
  });
});

describe('namesInDefinition', () => {
  it('lists the spellings a definition uses as whole words, in any case', () => {
    expect(namesInDefinition('Linking digital systems creates a network.', ['Digital system', 'digital systems'])).toEqual(['digital systems']);
    expect(namesInDefinition('Empty areas around elements.', ['Space'])).toEqual([]);
    expect(namesInDefinition('Anything.', ['', ' '])).toEqual([]);
  });
});
