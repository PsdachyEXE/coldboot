/** Loads the study content for a screen, with a loading line and a retryable error. */
import type { ReactNode } from 'react';
import type { ContentIndex } from '../../content/loader';
import { useContent, useContentIndex } from '../../content/store';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import study from './study.module.css';

export interface ContentGateProps {
  /** The page heading shown while loading or after an error (the ready screen renders its own). */
  heading?: ReactNode;
  children: (index: ContentIndex) => ReactNode;
}

export function ContentGate({ heading, children }: ContentGateProps) {
  const index = useContentIndex();
  const status = useContent((s) => s.status);
  const error = useContent((s) => s.error);
  if (index) return <>{children(index)}</>;
  if (status === 'error') {
    return (
      <>
        {heading ? <h1>{heading}</h1> : null}
        <EmptyState
          title="Study content didn't load"
          action={
            <Button variant="primary" onClick={() => void useContent.getState().load()}>
              Try again
            </Button>
          }
        >
          <p role="alert">{error ?? "Study content couldn't be loaded. Check your connection, then try again."}</p>
        </EmptyState>
      </>
    );
  }
  return (
    <>
      {heading ? <h1>{heading}</h1> : null}
      <p role="status">Loading study content</p>
    </>
  );
}

/** For screens that work without content (Home, the map): says content failed and offers a retry. */
export function ContentErrorNotice() {
  const status = useContent((s) => s.status);
  const error = useContent((s) => s.error);
  if (status !== 'error') return null;
  return (
    <div className={study.notice}>
      <p role="alert">{error ?? "Study content couldn't be loaded. Check your connection, then try again."}</p>
      <p>
        <Button size="small" onClick={() => void useContent.getState().load()}>
          Try again
        </Button>
      </p>
    </div>
  );
}
