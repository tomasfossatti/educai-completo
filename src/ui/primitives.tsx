import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm disabled:bg-brand-200",
  secondary: "bg-surface text-ink border border-line-strong hover:border-brand-500 hover:text-brand-700",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "bg-error-600 text-white hover:brightness-95",
  inverse: "bg-white text-brand-700 hover:bg-brand-50 shadow-sm",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-5 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", full = false) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed",
    VARIANT[variant],
    SIZE[size],
    full && "w-full",
  );
}

export function Button({
  variant = "primary",
  size = "md",
  full,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; full?: boolean }) {
  return <button className={cx(buttonClass(variant, size, full), className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  full,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; full?: boolean }) {
  return <Link className={cx(buttonClass(variant, size, full), className)} {...props} />;
}

export function Card({ className, children, as: As = "section", ...rest }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" } & Record<string, unknown>) {
  return (
    <As className={cx("rounded-lg border border-line bg-surface shadow-[var(--shadow-card)]", className)} {...rest}>
      {children}
    </As>
  );
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="text-[15px] font-semibold tracking-tight text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted", className)}>{children}</p>;
}

export function Pill({ children, tone = "neutral", icon }: { children: ReactNode; tone?: "neutral" | "brand" | "attention" | "solid" | "developing"; icon?: ReactNode }) {
  const t = {
    neutral: "bg-unknown-50 text-ink-soft",
    brand: "bg-brand-50 text-brand-700",
    attention: "bg-attention-50 text-attention-700",
    solid: "bg-solid-50 text-solid-700",
    developing: "bg-developing-50 text-developing-700",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", t)}>{icon}{children}</span>;
}

export function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-sm text-ink-muted", className)}>{children}</p>;
}
