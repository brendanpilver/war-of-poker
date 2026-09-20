import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Challenge } from "@/components/quiz/challenge";
import { challengeIntro, sharedAssumptions, totalHands } from "@/lib/quiz/hands";
import { CHALLENGE_PATH } from "@/lib/short-stack-plo";

/**
 * The challenge's own route.
 *
 * It is a standalone destination, not a section of the sales page: a link in a
 * video description, a QR code on a table card, or a post on any platform can
 * point straight here and the visitor gets the whole experience without
 * meeting the offer first. The path is short enough to say out loud.
 */

const title = `The ${totalHands}-Hand Short Stack PLO Challenge | War of Poker`;
const description =
  "Ten live PLO hands, ten decisions. Answer, then see River Potter's reasoning immediately — no email required. Finish it and your player price on the Complete System is unlocked.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: CHALLENGE_PATH },
  openGraph: {
    type: "website",
    url: CHALLENGE_PATH,
    siteName: "War of Poker",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function PloChallengePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Skip to content
      </a>
      <SiteHeader />

      <main id="main" className="flex-1">
        <div className="mx-auto max-w-3xl px-5 pt-10 pb-20 sm:px-8 sm:pt-16 lg:pb-28">
          <header>
            <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
              Free · {challengeIntro.standfirst}
            </p>
            <h1 className="mt-3.5 text-[2rem] leading-[0.98] font-bold tracking-[-0.02em] text-balance text-bone uppercase sm:mt-5 sm:text-5xl lg:text-6xl">
              {challengeIntro.title}
            </h1>
            <p className="mt-3.5 text-sm text-bone-faint">{challengeIntro.byline}</p>

            <div className="mt-5 space-y-3.5 text-[17px] leading-relaxed text-pretty text-bone-muted sm:mt-7 sm:space-y-4 sm:text-lg">
              {challengeIntro.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {/* Collapsed by default: it is reference, not reading, and on a
                phone it otherwise pushes the first decision another screen
                down. */}
            <details className="group mt-6 border border-line bg-ink-raised">
              <summary className="cursor-pointer list-none p-3.5 font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase select-none hover:text-bone sm:p-4">
                Table conditions
                <span aria-hidden className="ml-2 text-gold group-open:hidden">
                  +
                </span>
                <span aria-hidden className="ml-2 hidden text-gold group-open:inline">
                  —
                </span>
              </summary>
              <p className="border-t border-line p-3.5 font-mono text-[11px] leading-relaxed tracking-[0.08em] text-bone-muted uppercase sm:p-4">
                {sharedAssumptions}
              </p>
            </details>
          </header>

          <div className="mt-8 sm:mt-12">
            <Challenge />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
