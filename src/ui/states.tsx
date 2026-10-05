import type { ReactNode } from "react";
import { cx } from "./primitives";

/** EmptyState (UX §46): siempre ofrece un próximo paso real. */
export function EmptyState({ icon, title, children, action, className }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong bg-surface p-6", className)}>
      {icon && <div className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-700">{icon}</div>}
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {children && <div className="mt-1 text-sm text-ink-soft">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function ErrorNotice({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-error-600/20 bg-error-50 p-4">
      <p className="font-semibold text-error-600">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}
