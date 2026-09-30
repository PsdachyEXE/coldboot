/** Stub layout (owner: track A): rail, main column, status bar, terminal drawer, live regions. */
import { NavLink, Outlet } from 'react-router';
import { RAIL, paths } from './paths';
import { TerminalDrawer } from '../terminal';

export default function Layout() {
  return (
    <div>
      <nav aria-label="Main">
        {RAIL.map((r) => (
          <NavLink key={r.name} to={paths[r.name]}>
            {r.label}
          </NavLink>
        ))}
      </nav>
      <main>
        <Outlet />
      </main>
      <TerminalDrawer />
    </div>
  );
}
