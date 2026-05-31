// Shared navigation helper utilities
// Extracted to eliminate duplication across nav components

/* eslint-disable react-refresh/only-export-components */

/** Standard nav button class with active/inactive state */
export const navBtnClass = (isActive: boolean) =>
  `cursor-pointer w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${
    isActive
      ? 'bg-surface-elevated text-brand-gold border-transparent'
      : 'bg-surface-elevated text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent hover:border-border-hover'
  }`;

/** Static nav button (no active state) */
export const NAV_BTN_STATIC =
  'cursor-pointer w-10 h-10 rounded-full bg-surface-elevated hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border-hover';

/** Nav section divider */
export const NavDivider = ({ strong = false }: { strong?: boolean }) => (
  <div className={`w-6 h-px my-1 dark:bg-white/5 ${strong ? 'bg-border-strong' : 'bg-border'}`} />
);
