import { Suspense } from "react";
import { TrackedCta } from "@/components/analytics/tracked-cta";
import { fieldKitCount } from "@/lib/field-kit";
import { formatPrice, offers, SEPARATE_TOTAL_CENTS } from "@/lib/offers";
import { totalHands } from "@/lib/quiz/hands";
import { CHALLENGE_PATH, shortStackPlo } from "@/lib/short-stack-plo";
import { BuyOfferButton } from "./buy-offer-button";
import { PlayerPriceNotice } from "./player-price-notice";
import { Section, SectionHeading } from "./section";

/**
 * The pricing block, in the order of the hierarchy it has to make obvious:
 *
 * 1. **Complete System — $39.** The main offer: the book and the complete Field
 *    Kit. Its card says what the two cost bought separately ($44).
 * 2. **Player Price — $29.** The promotional path: finish the free challenge and
 *    get the same book and complete Field Kit for $29. Its copy names both
 *    products outright so nobody has to work out what $29 buys.
 * 3. **Everything else, quietly.** Book only ($25), the Field Kit only ($19),
 *    and the $15 upgrade for book owners sit in one understated row beneath
 *    the two cards, so none of them competes with the main path.
 *
 * **The Player Price card sells the challenge, not a cheaper checkout.** It
 * carries no buy button, because $29 is earned by finishing the challenge and a
 * buy button at that price for every visitor would retire the thing it rewards.
 * There is no countdown and no scarcity is implied anywhere.
 *
 * The upgrade has no button here. It is sold only against proof of owning the
 * book -- the permanent upgrade link in the book purchase email -- so this
 * block points to that link, and the button lives on `/upgrade` and
 * `/downloads`.
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
  `The complete ${shortStackPlo.title} book`,
  `The complete Field Kit — all ${fieldKitCount} tools`,
  `Only ${formatPrice(offers["system-quiz"].amountCents - offers.book.amountCents)} more than the book alone`,
];

/** One card. Both are the same size; only the copy and button differ. */
function Option({
  eyebrow,
  title,
  price,
  priceNote,
  description,
  includes,
  action,
  footnote,
}: {
  eyebrow: string;
  title: string;
  price: string;
  priceNote?: string;
  description: string;
  includes: string[];
  action: React.ReactNode;
  footnote: string;
}) {
  return (
    <div className="flex flex-col border-t-2 border-gold bg-ink-card p-6 sm:p-8">
      <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
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
            className="flex gap-3 leading-snug text-pretty text-bone"
          >
            <span aria-hidden className="text-gold">
              —
            </span>
            {item}
          </li>
        ))}
      </ul>

      {/* Pushed to the bottom so the two buttons line up however much copy
          each card carries. */}
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
  const fieldKit = offers["field-kit"];
  const upgrade = offers["field-kit-upgrade"];
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
        The Complete System, two ways.
      </SectionHeading>

      <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
        <Option
          eyebrow="Learn it and apply it"
          title="Complete System"
          price={formatPrice(system.amountCents)}
          priceNote={`${formatPrice(SEPARATE_TOTAL_CENTS)} bought separately`}
          description={system.description}
          includes={systemIncludes}
          footnote={access}
          action={
            <BuyOfferButton
              offerId="system"
              location="pricing"
              className="w-full"
              label={`Get the Complete System — ${formatPrice(system.amountCents)}`}
            />
          }
        />

        <Option
          eyebrow="Earn it"
          title="Player Price"
          price={formatPrice(player.amountCents)}
          priceNote={`instead of ${formatPrice(system.amountCents)}`}
          description={`Take the free ${totalHands}-Hand Challenge and unlock the complete ${formatPrice(system.amountCents)} system for ${formatPrice(player.amountCents)}. Everything for ${formatPrice(player.amountCents)}: the book and the complete Field Kit, not a discount on one of them.`}
          includes={playerIncludes}
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
      </div>

      {/* The secondary options: present and buyable, but one quiet row rather
          than cards that compete with the two above. */}
      <div className="mt-8 grid gap-6 border-t border-line pt-8 md:grid-cols-3">
        <div>
          <p className="text-bone">
            Prefer to start with the book? Get {shortStackPlo.title} for{" "}
            {formatPrice(book.amountCents)}.
          </p>
          <p className="mt-1.5 text-sm text-bone-faint">{book.description}</p>
          <BuyOfferButton
            offerId="book"
            location="pricing"
            variant="secondary"
            className="mt-4 w-full sm:w-auto"
            label={`Get the Book — ${formatPrice(book.amountCents)}`}
          />
        </div>
        <div>
          <p className="text-bone">
            Just the tools? The Field Kit on its own is{" "}
            {formatPrice(fieldKit.amountCents)}.
          </p>
          <p className="mt-1.5 text-sm text-bone-faint">{fieldKit.description}</p>
          <BuyOfferButton
            offerId="field-kit"
            location="pricing"
            variant="secondary"
            className="mt-4 w-full sm:w-auto"
            label={`Get the Field Kit — ${formatPrice(fieldKit.amountCents)}`}
          />
        </div>
        <div>
          <p className="text-bone">
            Already own the book? Add the complete Field Kit for{" "}
            {formatPrice(upgrade.amountCents)}.
          </p>
          <p className="mt-1.5 text-sm text-bone-faint">
            Use the upgrade link in your book purchase email — it doesn&apos;t
            expire.
          </p>
        </div>
      </div>
    </Section>
  );
}
