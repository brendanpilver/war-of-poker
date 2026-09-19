import type { Metadata } from "next";
import { TrackedCta } from "@/components/analytics/tracked-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { BookCover } from "@/components/marketing/book-cover";
import { BookSubtitle } from "@/components/marketing/book-subtitle";
import { fourQuestions } from "@/lib/quiz/reality-check";
import { PRODUCT_PATH, QUIZ_PATH, shortStackPlo } from "@/lib/short-stack-plo";
import { siteUrl } from "@/lib/site";

/**
 * The author page.
 *
 * Deliberately minimal and faceless: no portrait, no biography, no results, no
 * credentials. Nothing is asserted about River Potter beyond the published
 * byline and the work itself, because nothing else has been supplied.
 */

const title = "River Potter — PLO Specialist | War of Poker";
const description =
  "River Potter is the PLO specialist at War of Poker and the author of Short Stack PLO: A Practical Strategy for Shallow-Stack Live Pot-Limit Omaha.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/river-potter" },
  openGraph: {
    type: "profile",
    url: "/river-potter",
    siteName: "War of Poker",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: shortStackPlo.author,
  jobTitle: shortStackPlo.authorTitle,
  url: `${siteUrl}/river-potter`,
  worksFor: { "@type": "Organization", name: shortStackPlo.publisher, url: siteUrl },
};

export default function RiverPotterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 pt-16 pb-20 sm:px-8 lg:pt-20 lg:pb-28">
          <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
            {shortStackPlo.authorTitle}
          </p>
          <h1 className="mt-5 text-[2.6rem] leading-[0.98] font-bold tracking-[-0.02em] text-bone uppercase sm:text-6xl">
            {shortStackPlo.author}
          </h1>

          <div className="mt-8 space-y-5 text-lg leading-relaxed text-pretty text-bone-muted">
            <p>
              River Potter writes the PLO material at War of Poker. The work is
              built for live players: real stacks, real opponents, and decisions
              made in thirty seconds without software.
            </p>
            <p>
              Every piece runs on the same four questions, revisited on every
              street — {fourQuestions.join(" · ")}. One lens, used the same way,
              updated whenever a new card or a new action changes the situation.
            </p>
          </div>

          <section
            aria-labelledby="works-title"
            className="mt-14 border-t border-line pt-12"
          >
            <h2
              id="works-title"
              className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase"
            >
              Published work
            </h2>

            <div className="mt-8 grid gap-8 sm:grid-cols-12 sm:items-start">
              <div className="sm:col-span-4">
                <BookCover sizes="200px" className="w-full max-w-[10rem]" />
              </div>
              <div className="sm:col-span-8">
                <h3 className="text-2xl font-bold text-bone uppercase">
                  {shortStackPlo.title}
                </h3>
                <p className="mt-2 leading-snug text-pretty text-gold-light">
                  <BookSubtitle />
                </p>
                <p className="mt-4 leading-relaxed text-pretty text-bone-muted">
                  The book, a seven-piece printable Field Kit, and a 20-hand
                  capstone quiz. Published by {shortStackPlo.publisher}.
                </p>
                <TrackedCta
                  href={PRODUCT_PATH}
                  location="river-potter"
                  label="Short Stack PLO"
                  className="mt-6 inline-flex items-center justify-center rounded-[2px] bg-gold px-6 py-3 font-semibold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px"
                >
                  See Short Stack PLO
                </TrackedCta>
              </div>
            </div>

            <div className="mt-12 border-t border-line pt-8">
              <h3 className="text-xl font-semibold text-bone">
                The 3-Hand PLO Reality Check
              </h3>
              <p className="mt-2 leading-relaxed text-pretty text-bone-muted">
                A free three-hand diagnostic. Three spots where Hold&apos;em
                instincts get expensive.
              </p>
              <TrackedCta
                href={QUIZ_PATH}
                location="river-potter-quiz"
                label="Reality Check"
                className="mt-4 inline-block text-bone underline decoration-bone/30 underline-offset-4 transition-colors hover:decoration-gold"
              >
                Take the Reality Check
              </TrackedCta>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
