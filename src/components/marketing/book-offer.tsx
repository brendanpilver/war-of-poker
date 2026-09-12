import { PURCHASE_SECTION_ID, shortStackPlo } from "@/lib/short-stack-plo";
import { BookCover } from "./book-cover";
import { BookSubtitle } from "./book-subtitle";
import { BuyButton } from "./buy-button";
import { Eyebrow } from "./section-intro";

const included = [
  "PLO fundamentals for Hold’em players",
  "Starting-hand construction",
  "Position, preflop strategy, and SPR",
  "Board texture, draws, and equity quality",
  "Turn and river decisions",
  "Live player types and exploits",
  "Session and stack management",
  "Complete hand walkthroughs",
];

export function BookOffer() {
  const details = [
    { label: "Format", value: shortStackPlo.format },
    { label: "Access", value: shortStackPlo.access },
    { label: "Price", value: shortStackPlo.price },
  ];

  return (
    <section
      id={PURCHASE_SECTION_ID}
      aria-labelledby="book-title"
      className="border-t border-line bg-ink-raised py-20 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="reveal grid border border-line bg-ink-card lg:grid-cols-12">
          <div className="flex items-center justify-center border-b border-line bg-ink px-8 py-12 sm:py-14 lg:col-span-5 lg:border-r lg:border-b-0">
            <BookCover
              sizes="(min-width: 1024px) 288px, 240px"
              className="w-full max-w-[15rem] lg:max-w-[18rem]"
            />
          </div>

          <div className="p-6 sm:p-10 lg:col-span-7 lg:p-12">
            <Eyebrow index="06">Get the Book</Eyebrow>
            <h2
              id="book-title"
              className="mt-5 text-4xl font-bold tracking-[0.02em] text-bone uppercase sm:text-5xl"
            >
              {shortStackPlo.title}
            </h2>
            <p className="mt-3 text-lg leading-snug text-pretty text-gold-light">
              <BookSubtitle />
            </p>

            <p className="mt-6 text-bone">{shortStackPlo.author}</p>
            <p className="text-sm text-bone-faint">
              Published by {shortStackPlo.publisher}
            </p>

            <h3 className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-bone-faint">
              Inside the book
            </h3>
            <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-snug text-bone">
                  <span aria-hidden className="text-gold">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <dl className="mt-8 flex flex-col divide-y divide-line border-y border-line sm:flex-row sm:divide-x sm:divide-y-0">
              {details.map((detail) => (
                <div key={detail.label} className="py-4 sm:px-6 sm:first:pl-0 sm:last:pr-0">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-faint">
                    {detail.label}
                  </dt>
                  <dd className="mt-1 text-lg text-bone">{detail.value}</dd>
                </div>
              ))}
            </dl>

            <BuyButton className="mt-8 w-full sm:w-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
