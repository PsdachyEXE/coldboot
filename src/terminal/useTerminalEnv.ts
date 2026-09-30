import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { TerminalEnv } from './commands';
import { useTerminal } from './useTerminal';

/** What commands need from the presentation they were typed in: navigation and closing the drawer. */
export function useTerminalEnv(presentation: TerminalEnv['presentation']): TerminalEnv {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      presentation,
      navigate: (to: string) => {
        void navigate(to);
      },
      closeDrawer: () => useTerminal.getState().setOpen(false),
    }),
    [navigate, presentation],
  );
}
