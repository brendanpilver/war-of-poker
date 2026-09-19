import { Section, SectionHeading } from "./section";

/**
 * Three short samples, enough to show the book has a voice and a method.
 *
 * The previous version carried a four-row starting-hand comparison table plus
 * three pull quotes — more reading than a sample needs, and the table competed
 * with the Field Kit further up. Reduced to the quotes, each labelled with the
 * concept it belongs to.
 *
 * Verbatim from the Short Stack PLO manuscript. Re-check against the final
 * edition before changing a word.
 */

const samples = [
  {
    topic: "On hand selection",
    text: "We don't play loose because we're short. We use a strong starting range so that when the pot gets big, our range holds up better than theirs.",
  },
  {
    topic: "On turn play",
    text: "Do not pay turn prices with flop equity.",
  },
  {
    topic: "On player reads",
    text: "Your cards do not change based on who sits across from you. Their range does.",
  },
];

export function BookExcerpts() {
  return (
    <Section id="from-the-book" aria-labelledby="excerpts-title">
      <SectionHeading id="excerpts-title" eyebrow="From the book">
        How the book thinks.
      </SectionHeading>

      <ul className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
        {samples.map((sample) => (
          <li key={sample.topic}>
            <figure className="border-l-2 border-gold pl-5">
              <blockquote className="text-lg leading-snug text-pretty text-bone">
                &ldquo;{sample.text}&rdquo;
              </blockquote>
              <figcaption className="mt-3 font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase">
                {sample.topic}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
