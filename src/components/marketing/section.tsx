import type { ReactNode } from "react";

/**
 * Shared section shell.
 *
 * The page previously stacked several emphasis devices at once — a numbered
 * index, a mono eyebrow, an uppercase heading, a border and a tinted panel —
 * so nothing read as more important than anything else. These primitives fix
 * the rhythm in one place: one heading weight, one measure, one optional
 * eyebrow, and alternating ground only where a section genuinely needs
 * separating.
 *
 * Body copy is `text-bone`. `text-bone-muted` is for supporting detail and
 * `text-bone-faint` for metadata only — never for an explanation the reader
 * needs.
 */

type SectionProps = {
  id?: string;
  /** `raised` tints the ground to separate a section from its neighbours. */
  tone?: "default" | "raised";
  /** Tightens vertical rhythm where two sections belong together. */
  size?: "default" | "compact";
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
};

export function Section({
  id,
  tone = "default",
  size = "default",
  className = "",
  children,
  ...rest
}: SectionProps) {
  const padding =
    size === "compact" ? "py-12 sm:py-14" : "py-16 sm:py-20 lg:py-24";
  const ground = tone === "raised" ? "border-y border-line bg-ink-raised" : "";

  return (
    <section id={id} className={`scroll-mt-20 ${ground} ${className}`} {...rest}>
      <div className={`mx-auto max-w-5xl px-5 sm:px-8 ${padding}`}>{children}</div>
    </section>
  );
}

type SectionHeadingProps = {
  id: string;
  /** Short mono label. Use sparingly — most sections do not need one. */
  eyebrow?: string;
  children: ReactNode;
  /** One sentence of context, in readable body contrast. */
  lead?: ReactNode;
};

export function SectionHeading({
  id,
  eyebrow,
  children,
  lead,
}: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="mb-4 font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
          {eyebrow}
        </p>
      )}
      <h2
        id={id}
        className="text-3xl leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-bone sm:text-4xl"
      >
        {children}
      </h2>
      {lead && (
        <p className="mt-5 text-lg leading-relaxed text-pretty text-bone">{lead}</p>
      )}
    </div>
  );
}
