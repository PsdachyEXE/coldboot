import { describe, expect, it } from 'vitest';
import { complete, type CompletionSources } from './complete';

const src: CompletionSources = {
  commands: ['help', 'history', 'ls', 'man', 'play', 'daily', 'drill', 'due', 'exam', 'exit', 'review', 'report'],
  games: ['sort', 'search'],
  manTopics: ['sort', 'search', 'drill'],
  drillTargets: ['U3O1-KK01', 'U3O1-KK02', 'U3O1-KK12', 'U3O2-KK01', 'U3O1', 'U3O2', 'TERMS', 'PSM'],
  flags: { play: ['--easy', '--hard'], exam: ['--mini'] },
};

describe('tab completion', () => {
  it('completes a unique command and adds a space', () => {
    expect(complete('pl', src)).toEqual({ line: 'play ', options: [] });
    expect(complete('rev', src)).toEqual({ line: 'review ', options: [] });
  });

  it('lists several matches and extends to their common prefix', () => {
    expect(complete('h', src)).toEqual({ line: 'h', options: ['help', 'history'] });
    expect(complete('d', src)).toEqual({ line: 'd', options: ['daily', 'drill', 'due'] });
    expect(complete('e', src)).toEqual({ line: 'ex', options: ['exam', 'exit'] });
  });

  it('completes game names after play and man', () => {
    expect(complete('play so', src)).toEqual({ line: 'play sort ', options: [] });
    expect(complete('play s', src)).toEqual({ line: 'play s', options: ['sort', 'search'] });
    expect(complete('play ', src)).toEqual({ line: 'play s', options: ['sort', 'search'] });
    expect(complete('man dr', src)).toEqual({ line: 'man drill ', options: [] });
  });

  it('completes KK and area ids after drill, ignoring case', () => {
    expect(complete('drill u3o1-kk1', src)).toEqual({ line: 'drill U3O1-KK12 ', options: [] });
    expect(complete('drill u3o2', src)).toEqual({ line: 'drill U3O2', options: ['U3O2-KK01', 'U3O2'] });
    expect(complete('drill te', src)).toEqual({ line: 'drill TERMS ', options: [] });
    expect(complete('drill U3O1-KK0', src)).toEqual({ line: 'drill U3O1-KK0', options: ['U3O1-KK01', 'U3O1-KK02'] });
  });

  it('completes flags for the command', () => {
    expect(complete('play sort --h', src)).toEqual({ line: 'play sort --hard ', options: [] });
    expect(complete('play sort --', src)).toEqual({ line: 'play sort --', options: ['--easy', '--hard'] });
    expect(complete('exam --', src)).toEqual({ line: 'exam --mini ', options: [] });
    expect(complete('ls --', src)).toEqual({ line: 'ls --', options: [] });
  });

  it('leaves the line alone when nothing matches or the argument is already given', () => {
    expect(complete('xyz', src)).toEqual({ line: 'xyz', options: [] });
    expect(complete('play sort s', src)).toEqual({ line: 'play sort s', options: [] });
    expect(complete('whoami ', src)).toEqual({ line: 'whoami ', options: [] });
  });

  it('completes with an empty line to every command', () => {
    expect(complete('', src).options).toEqual(src.commands);
  });
});
