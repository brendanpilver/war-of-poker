import { BuyOfferButton } from "./buy-offer-button";
import { Eyebrow } from "./section-intro";
import { fieldKit } from "@/lib/field-kit";
import { formatPrice, offers } from "@/lib/offers";
import { shortStackPlo } from "@/lib/short-stack-plo";

/**
 * The two offers.
 *
 * The Complete System is visually dominant -- larger card, gold rule, primary
 * button -- because it is the offer the business wants chosen. What it is not
 * is manipulative: the Book Only option is a full, plainly described choice
 * with its own real button, there is no countdown, and no scarcity is implied.
 */

export const PRICING_SECTION_ID = "pricing";

const systemIncludes = [
  `The complete ${shortStackPlo.title} book`,
  ...fieldKit.map((piece) => piece.name),
];

const bookIncludes = [
  `The complete ${shortStackPlo.title} book`,
  "Hand construction, preflop, SPR and commitment",
  "Flop, draws and redraws, turn, river",
  "Live exploits, session and stack management",
];

function Includes({ items, dim = false }: { items: string[]; dim?: boolean }) {
  return (
    <ul className="mt-6 space-y-2.5">
      {items.map((item) => (
        <li
          key={item}
          className={`flex gap-3 text-[15px] leading-snug text-pretty ${dim ? "text-bone-muted" : "text-bone"}`}
        >
          <span aria-hidden className={dim ? "text-bone-faint" : "text-gold"}>
            —
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Pricing() {
  const system = offers.system;
  const book = offers.book;

  return (
    <section
      id={PRICING_SECTION_ID}
      aria-labelledby="pricing-title"
      className="scroll-mt-24 border-t border-line bg-ink-raised py-20 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Eyebrow index="09">Pricing</Eyebrow>
        <h2
          id="pricing-title"
          className="mt-5 text-3xl leading-[1.08] font-semibold tracking-[-0.02em] text-balance text-bone sm:text-4xl lg:text-[2.75rem]"
        >
          Two ways in.
        </h2>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-12">
          <div className="border-2 border-gold bg-ink-card p-6 sm:p-8 lg:col-span-7 lg:p-10">
            <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
              The complete system
            </p>
            <h3 className="mt-4 text-3xl font-bold text-bone uppercase sm:text-4xl">
              {shortStackPlo.title}
              <span className="block text-gold">Complete System</span>
            </h3>

            <p className="mt-6 text-5xl font-bold text-bone tabular-nums sm:text-6xl">
              {formatPrice(system.amountCents)}
            </p>
            <p className="mt-2 text-bone-muted">
              The book, the full seven-piece Field Kit, and the Capstone Quiz.
            </p>

            <Includes items={systemIncludes} />

            <BuyOfferButton
              offerId="system"
              location="pricing"
              className="mt-8 w-full"
              label={`Get the Complete System — ${formatPrice(system.amountCents)}`}
            />
            <p className="mt-4 font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
              {shortStackPlo.format} · {shortStackPlo.access}
            </p>
          </div>

          <div className="border border-line bg-ink-card p-6 sm:p-8 lg:col-span-5 lg:p-8">
            <p className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
              Book only
            </p>
            <h3 className="mt-4 text-2xl font-bold text-bone uppercase sm:text-3xl">
              {shortStackPlo.title}
            </h3>

            <p className="mt-6 text-4xl font-bold text-bone tabular-nums sm:text-5xl">
              {formatPrice(book.amountCents)}
            </p>
            <p className="mt-2 text-bone-muted">The book on its own.</p>

            <Includes items={bookIncludes} dim />

            <BuyOfferButton
              offerId="book"
              location="pricing"
              variant="secondary"
              className="mt-8 w-full"
              label={`Get the Book — ${formatPrice(book.amountCents)}`}
            />
            <p className="mt-4 font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
              {shortStackPlo.format} · {shortStackPlo.access}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
