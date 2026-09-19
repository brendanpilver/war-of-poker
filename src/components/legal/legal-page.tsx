import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  updated?: string;
  intro?: ReactNode;
  children: ReactNode;
};

export function LegalPage({ title, updated, intro, children }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold">
        War of Poker
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-[-0.01em] text-bone sm:text-4xl">
        {title}
      </h1>
      {updated && (
        <p className="mt-2 text-sm text-bone-faint">Last updated {updated}</p>
      )}
      {intro && (
        <div className="mt-6 max-w-2xl space-y-4 leading-relaxed text-pretty text-bone-muted">
          {intro}
        </div>
      )}
      <div className="mt-10 space-y-10">{children}</div>
    </div>
  );
}

type LegalSectionProps = {
  heading: string;
  children: ReactNode;
};

export function LegalSection({ heading, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.01em] text-bone">
        {heading}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-pretty text-bone-muted">
        {children}
      </div>
    </section>
  );
}
