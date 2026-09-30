import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/tokens.css';

function Placeholder() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', color: '#DCEAFF', background: '#000', minHeight: '100vh', padding: 24 }}>
      <h1>COLDBOOT</h1>
      <p>Build in progress. Revision for VCE Applied Computing: Software Development, Units 3 and 4.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Placeholder />
  </StrictMode>,
);
