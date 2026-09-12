import type { ReactNode } from "react";

type EyebrowProps = {
  index?: string;
  children: ReactNode;
  className?: string;
};

export function Eyebrow({ index, children, className = "" }: EyebrowProps) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-gold ${className}`}
    >
      {index && (
        <>
          <span className="text-bone-faint tabular-nums">{index}</span>
          <span aria-hidden className="h-px w-8 bg-line" />
        </>
      )}
      {children}
    </p>
  );
}

type SectionIntroProps = {
  index?: string;
  label: string;
  title: ReactNode;
  titleId: string;
  children?: ReactNode;
  className?: string;
};

export function SectionIntro({
  index,
  label,
  title,
  titleId,
  children,
  className = "",
}: SectionIntroProps) {
  return (
    <div className={className}>
      <Eyebrow index={index}>{label}</Eyebrow>
      <h2
        id={titleId}
        className="mt-5 text-3xl leading-[1.08] font-semibold tracking-[-0.02em] text-balance text-bone sm:text-4xl lg:text-[2.75rem]"
      >
        {title}
      </h2>
      {children && (
        <div className="mt-5 max-w-xl space-y-4 text-lg leading-relaxed text-pretty text-bone-muted">
          {children}
        </div>
      )}
    </div>
  );
}
