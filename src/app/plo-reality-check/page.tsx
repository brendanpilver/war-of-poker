import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { RealityCheckQuiz } from "@/components/quiz/reality-check-quiz";
import { quizIntro, sharedAssumptions } from "@/lib/quiz/reality-check";
import { QUIZ_PATH } from "@/lib/short-stack-plo";

const title = "The 3-Hand PLO Reality Check | War of Poker";
const description =
  "Three spots where Hold'em instincts get expensive in Pot-Limit Omaha. Answer, then see the full reasoning — no email required. By River Potter.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: QUIZ_PATH },
  openGraph: {
    type: "website",
    url: QUIZ_PATH,
    siteName: "War of Poker",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function PloRealityCheckPage() {
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
        <div className="mx-auto max-w-3xl px-5 pt-12 pb-20 sm:px-8 sm:pt-16 lg:pb-28">
          <header>
            <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
              Free · {quizIntro.standfirst}
            </p>
            <h1 className="mt-5 text-[2.4rem] leading-[0.98] font-bold tracking-[-0.02em] text-balance text-bone uppercase sm:text-5xl lg:text-6xl">
              {quizIntro.title}
            </h1>
            <p className="mt-4 text-sm text-bone-faint">{quizIntro.byline}</p>

            <div className="mt-7 space-y-4 text-lg leading-relaxed text-pretty text-bone-muted">
              {quizIntro.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <p className="mt-7 border border-line bg-ink-raised p-4 font-mono text-[11px] leading-relaxed tracking-[0.08em] text-bone-muted uppercase sm:p-5">
              <span className="text-bone-faint">Assume for all three:</span>{" "}
              {sharedAssumptions}
            </p>
          </header>

          <div className="mt-12">
            <RealityCheckQuiz />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
