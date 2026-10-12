import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: string; action?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {back && <Link href={back.href} className="-ml-1 mb-1 inline-flex min-h-8 items-center px-1 text-sm font-medium text-accent">← {back.label}</Link>}
        <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[15px] text-muted">{children}</div>;
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
