import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { VisuallyHidden } from './VisuallyHidden';

export interface ExternalLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'> {
  href: string;
  children: ReactNode;
}

/** A text link to another site. Opens in a new tab with noopener and tells screen-reader users so. */
export function ExternalLink({ children, ...rest }: ExternalLinkProps) {
  return (
    <a target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      <VisuallyHidden>{' (opens in a new tab)'}</VisuallyHidden>
    </a>
  );
}
