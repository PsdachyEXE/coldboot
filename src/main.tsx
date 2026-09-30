import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import '@fontsource-variable/martian-mono';
import '@fontsource-variable/atkinson-hyperlegible-next';
import './ui/tokens.css';
import { createAppRouter } from './app/routes';

const router = createAppRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
