import { Suspense } from "react";
import { TrackedCta } from "@/components/analytics/tracked-cta";
import { fieldKitCount } from "@/lib/field-kit";
import { formatPrice, offers } from "@/lib/offers";
import { totalHands } from "@/lib/quiz/hands";
import { CHALLENGE_PATH, shortStackPlo } from "@/lib/short-stack-plo";
import { BuyOfferButton } from "./buy-offer-button";
import { PlayerPriceNotice } from "./player-price-notice";
import { Section, SectionHeading } from "./section";

/**
 * The three ways in, at equal size and in decision order: buy the system, earn
 * it cheaper, or buy the book.
 *
 * They are sold as different products, not as a bundle and its discount: the
 * book teaches the method, the Complete System teaches it and hands you the
 * tools for applying it. Nothing here breaks the system's price into parts or
 * quotes a value for the Field Kit — the $39 is what the package costs, and the
 * difference between the columns is what each one does.
 *
 * **The middle column sells the challenge, not a cheaper checkout.** It carries
 * no buy button, because $29 is earned by finishing the challenge and a buy
 * button at that price for every visitor would retire the thing it rewards. The
 * price is named in figures all the same: withholding it meant nobody could
 * tell what finishing was worth, and "your player price is unlocked" is not an
 * offer to anyone reading it for the first time.
 *
 * Book Only is a full, plainly described choice with its own real button and
 * its own price. There is no countdown and no scarcity is implied anywhere.
 *
 * `PlayerPriceNotice` is separate and conditional: a completer who asked for
 * their results by email arrives back through a link carrying `?offer=player`,
 * and the buy button at that price renders for them only.
 */

export const PRICING_SECTION_ID = "pricing";

const systemIncludes = [
  `The complete ${shortStackPlo.title} book`,
  `All ${fieldKitCount} printable Field Kit tools`,
  "20-Hand Capstone Quiz + Answer Key",
];

const playerIncludes = [
  `Everything in the Complete System`,
  `${totalHands} live PLO decisions, worked`,
  "No email needed to see the answers",
];

const bookIncludes = [
  `The complete ${shortStackPlo.title} book`,
  "Fully worked example hands",
];

/** One column. Every card is the same size; only the accent and button differ. */
function Option({
  eyebrow,
  title,
  price,
  priceNote,
  description,
  includes,
  accent,
  action,
  footnote,
}: {
  eyebrow: string;
  title: string;
  price: string;
  priceNote?: string;
  description: string;
  includes: string[];
  accent: "primary" | "earn" | "quiet";
  action: React.ReactNode;
  footnote: string;
}) {
  const rule =
    accent === "quiet" ? "border-t border-line" : "border-t-2 border-gold";
  const eyebrowTone = accent === "quiet" ? "text-bone-faint" : "text-gold";
  const bulletTone = accent === "quiet" ? "text-bone-faint" : "text-gold";
  const itemTone = accent === "quiet" ? "text-bone-muted" : "text-bone";

  return (
    <div className={`flex flex-col ${rule} bg-ink-card p-6 sm:p-8`}>
      <p
        className={`font-mono text-[11px] tracking-[0.18em] uppercase ${eyebrowTone}`}
      >
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-bold text-bone uppercase">{title}</h3>
      <p className="mt-5 flex flex-wrap items-baseline gap-x-3">
        <span className="text-5xl font-bold text-bone tabular-nums">{price}</span>
        {priceNote && (
          <span className="text-sm text-bone-faint">{priceNote}</span>
        )}
      </p>
      <p className="mt-3 leading-snug text-pretty text-bone-muted">
        {description}
      </p>

      <ul className="mt-6 space-y-2.5">
        {includes.map((item) => (
          <li
            key={item}
            className={`flex gap-3 leading-snug text-pretty ${itemTone}`}
          >
            <span aria-hidden className={bulletTone}>
              —
            </span>
            {item}
          </li>
        ))}
      </ul>

      {/* Pushed to the bottom so the three buttons line up however much copy
          each column carries. */}
      <div className="mt-8 flex flex-col pt-0 md:mt-auto md:pt-8">
        {action}
        <p className="mt-4 text-sm text-bone-faint">{footnote}</p>
      </div>
    </div>
  );
}

export function Pricing() {
  const system = offers.system;
  const book = offers.book;
  const player = offers["system-quiz"];
  const access = `${shortStackPlo.format} · ${shortStackPlo.access}`;

  return (
    <Section
      id={PRICING_SECTION_ID}
      tone="raised"
      aria-labelledby="pricing-title"
    >
      <Suspense fallback={null}>
        <PlayerPriceNotice />
      </Suspense>

      <SectionHeading id="pricing-title" eyebrow="Pricing">
        Three ways in.
      </SectionHeading>

      <div className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
        <Option
          eyebrow="Learn it and apply it"
          title="Complete System"
          price={formatPrice(system.amountCents)}
          description={system.description}
          includes={systemIncludes}
          accent="primary"
          footnote={access}
          action={
            <BuyOfferButton
              offerId="system"
              location="pricing"
              className="w-full"
              // "Get the Complete System — $39" is wider than this column: the
              // button does not wrap, so the longest label a card can hold is
              // the product and its price.
              label={`Complete System — ${formatPrice(system.amountCents)}`}
            />
          }
        />

        <Option
          eyebrow="Earn it"
          title="Player Price"
          price={formatPrice(player.amountCents)}
          priceNote={`instead of ${formatPrice(system.amountCents)}`}
          description={`Finish the free ${totalHands}-Hand Challenge and the same Complete System is yours at your player price.`}
          includes={playerIncludes}
          accent="earn"
          footnote="Free to take · Instant results"
          action={
            <TrackedCta
              href={CHALLENGE_PATH}
              location="pricing-player-price"
              label={`Take the ${totalHands}-Hand Challenge`}
              className="inline-flex w-full items-center justify-center rounded-[2px] border border-gold px-6 py-3.5 text-center font-semibold whitespace-nowrap text-gold transition-colors duration-150 hover:bg-gold hover:text-ink active:translate-y-px"
            >
              Take the {totalHands}-Hand Challenge
            </TrackedCta>
          }
        />

        <Option
          eyebrow="Learn the method"
          title="Book Only"
          price={formatPrice(book.amountCents)}
          description={book.description}
          includes={bookIncludes}
          accent="quiet"
          footnote={access}
          action={
            <BuyOfferButton
              offerId="book"
              location="pricing"
              variant="secondary"
              className="w-full"
              label={`Get the Book — ${formatPrice(book.amountCents)}`}
            />
          }
        />
      </div>
    </Section>
  );
}
