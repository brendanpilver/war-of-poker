import type { Metadata } from "next";
import Link from "next/link";
import { TrackedCta } from "@/components/analytics/tracked-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { BookCover } from "@/components/marketing/book-cover";
import { BookSubtitle } from "@/components/marketing/book-subtitle";
import { ComingNext } from "@/components/marketing/coming-next";
import { Eyebrow, SectionIntro } from "@/components/marketing/section-intro";
import { formatPrice, offers } from "@/lib/offers";
import { fourQuestions } from "@/lib/quiz/reality-check";
import { PRODUCT_PATH, QUIZ_PATH, shortStackPlo } from "@/lib/short-stack-plo";
import { siteUrl } from "@/lib/site";

const title = "War of Poker — Poker is a battle of decisions. Have a plan.";
const description =
  "War of Poker builds practical decision systems for poker players. Start with Short Stack PLO by River Potter, or take the free 3-Hand PLO Reality Check.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "War of Poker",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "War of Poker",
  url: siteUrl,
  logo: `${siteUrl}/brand/war-of-poker-stencil-logo.png`,
};

const audience = [
  "Competent No-Limit Hold'em cash players moving into PLO",
  "Players sitting in live PLO for the first time",
  "Low- and mid-stakes live players",
  "Anyone commonly playing around shallow-to-moderate stacks",
];

const frameworkQuestions: Record<(typeof fourQuestions)[number], string> = {
  Hand: "What do all four cards contribute?",
  SPR: "What decisions does this action create?",
  Equity: "Which outs actually win against this range?",
  Player: "What does this action mean from this opponent?",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Skip to content
      </a>
      <SiteHeader />

      <main id="main" className="flex-1">
        <section aria-labelledby="home-title" className="border-b border-line">
          <div className="mx-auto max-w-6xl px-5 pt-16 pb-16 sm:px-8 sm:pt-20 lg:pt-24 lg:pb-20">
            <h1
              id="home-title"
              className="max-w-4xl text-[2.6rem] leading-[0.98] font-bold tracking-[-0.02em] text-balance text-bone uppercase sm:text-6xl lg:text-7xl"
            >
              Poker is a battle of decisions.{" "}
              <span className="text-gold">Have a plan.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-pretty text-bone-muted">
              War of Poker builds practical decision systems for players who want
              to think more clearly and play more deliberately. No hype, no
              guarantees, and no solver worship — just a repeatable way to work
              through the spots that cost real money.
            </p>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              <TrackedCta
                href={QUIZ_PATH}
                location="home-hero"
                label="Take the free Reality Check"
                className="inline-flex w-full items-center justify-center rounded-[2px] bg-gold px-6 py-3.5 text-center font-semibold whitespace-nowrap text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px sm:w-auto"
              >
                Take the free Reality Check
              </TrackedCta>
              <TrackedCta
                href={`${PRODUCT_PATH}#pricing`}
                location="home-hero-secondary"
                label="See the Complete System"
                className="text-sm font-medium text-bone underline decoration-bone/30 underline-offset-[6px] transition-colors duration-150 hover:decoration-gold"
              >
                See the Complete System — {formatPrice(offers.system.amountCents)}
              </TrackedCta>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="flagship-title"
          className="border-b border-line bg-ink-raised"
        >
          <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:items-center lg:py-20">
            <div className="order-2 lg:order-1 lg:col-span-7">
              <Eyebrow>The flagship</Eyebrow>
              <h2
                id="flagship-title"
                className="mt-5 text-4xl leading-[0.98] font-bold tracking-[-0.02em] text-bone uppercase sm:text-5xl"
              >
                <span className="block">Short Stack</span>
                <span className="block text-gold">PLO</span>
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-snug text-pretty text-gold-light">
                <BookSubtitle />
              </p>
              <p className="mt-3 text-sm text-bone-faint">
                By {shortStackPlo.author} · {shortStackPlo.authorTitle}
              </p>
              <p className="mt-6 max-w-xl leading-relaxed text-pretty text-bone-muted">
                A decision system for live Hold&apos;em players moving into PLO,
                where one bad decision can cost hundreds of dollars. The book,
                the seven-piece Field Kit, and a 20-hand capstone quiz.
              </p>
              <TrackedCta
                href={PRODUCT_PATH}
                location="home-flagship"
                label="Short Stack PLO"
                className="mt-7 inline-flex items-center justify-center rounded-[2px] border border-line bg-ink-card px-6 py-3.5 font-semibold text-bone transition-colors duration-150 hover:border-bone-faint hover:bg-ink active:translate-y-px"
              >
                See Short Stack PLO
              </TrackedCta>
            </div>
            <div className="order-1 lg:order-2 lg:col-span-5">
              <Link href={PRODUCT_PATH} className="block">
                <BookCover
                  sizes="(min-width: 1024px) 320px, 224px"
                  loading="eager"
                  className="mx-auto w-full max-w-[12rem] sm:max-w-[14rem] lg:max-w-[20rem]"
                />
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="home-framework-title" className="py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Eyebrow index="01">The system</Eyebrow>
            <h2
              id="home-framework-title"
              className="mt-6 flex flex-wrap items-center gap-x-1 text-4xl leading-[1.08] font-bold tracking-[-0.01em] text-bone uppercase sm:text-5xl lg:text-6xl"
            >
              {fourQuestions.map((term, index) => (
                <span key={term} className="inline-flex items-center whitespace-nowrap">
                  {index > 0 && (
                    <span aria-hidden className="mx-[0.3em] font-normal text-gold">
                      ·
                    </span>
                  )}
                  {term}
                </span>
              ))}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-bone-muted">
              One lens, used the same way on every street. Update it whenever a
              new card or a new action changes the situation.
            </p>

            <dl className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {fourQuestions.map((term) => (
                <div key={term} className="bg-ink p-6 sm:p-7">
                  <dt className="font-mono text-sm font-medium tracking-[0.18em] text-gold uppercase">
                    {term}
                  </dt>
                  <dd className="mt-3 text-lg leading-snug text-pretty text-bone">
                    {frameworkQuestions[term]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          aria-labelledby="home-quiz-title"
          className="border-y border-line bg-ink-raised"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:py-20">
            <SectionIntro
              index="02"
              label="Start free"
              titleId="home-quiz-title"
              title="The 3-Hand PLO Reality Check"
              className="lg:col-span-6"
            >
              <p>
                Three spots where Hold&apos;em instincts get expensive. Pick an
                answer and see the full reasoning immediately — no email needed
                to find out whether you were right.
              </p>
            </SectionIntro>

            <div className="lg:col-span-6">
              <h3 className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
                Written for
              </h3>
              <ul className="mt-5 divide-y divide-line border-y border-line">
                {audience.map((item) => (
                  <li
                    key={item}
                    className="flex gap-4 py-4 leading-snug text-pretty text-bone"
                  >
                    <span aria-hidden className="text-gold">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <TrackedCta
                href={QUIZ_PATH}
                location="home-quiz"
                label="Take the Reality Check"
                className="mt-8 inline-flex w-full items-center justify-center rounded-[2px] bg-gold px-6 py-3.5 text-center font-semibold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px sm:w-auto"
              >
                Take the Reality Check
              </TrackedCta>
            </div>
          </div>
        </section>

        <ComingNext />
      </main>

      <SiteFooter />
    </>
  );
}
