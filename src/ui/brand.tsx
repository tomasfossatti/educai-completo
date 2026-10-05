import Link from "next/link";
import { cx } from "./primitives";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#4a49dc" />
      <path d="M9 17.2c0-4.3 3.1-7.7 7.2-7.7 3.9 0 6.8 2.9 6.8 7v1.1H12.6c.4 2.2 2.1 3.6 4.4 3.6 1.5 0 2.7-.5 3.7-1.5l1.9 2.2c-1.4 1.5-3.4 2.4-5.8 2.4C12.3 24.3 9 21.4 9 17.2Zm3.7-1.6h6.8c-.3-1.9-1.6-3.2-3.4-3.2-1.8 0-3.1 1.2-3.4 3.2Z" fill="#fff" />
      <circle cx="24.5" cy="8.5" r="2.5" fill="#8fe3c0" />
    </svg>
  );
}

export function Logo({ href = "/", subtitle }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Educai, inicio">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-tight text-ink">educai</span>
        {subtitle && <span className="mt-0.5 text-[11px] font-medium text-ink-muted">{subtitle}</span>}
      </span>
    </Link>
  );
}
