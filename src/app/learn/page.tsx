import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { QuizCta } from "@/components/marketing/quiz-cta";
import { articles, plannedTopics } from "@/lib/content/articles";

const title = "Learn — Live PLO strategy | War of Poker";
const description =
  "Practical Pot-Limit Omaha articles for live players, written from the Short Stack PLO material by River Potter.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/learn" },
  openGraph: {
    type: "website",
    url: "/learn",
    siteName: "War of Poker",
    title,
    description,
  },
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export default function LearnIndexPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-5 pt-16 pb-16 sm:px-8 lg:pt-20">
          <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
            Learn
          </p>
          <h1 className="mt-5 text-[2.6rem] leading-[0.98] font-bold tracking-[-0.02em] text-balance text-bone uppercase sm:text-5xl lg:text-6xl">
            Live PLO, written down
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-pretty text-bone-muted">
            Practical Pot-Limit Omaha for players in real card rooms. Every
            article is written from the Short Stack PLO material rather than
            generated around a search term.
          </p>

          {articles.length > 0 ? (
            <ul className="mt-14 divide-y divide-line border-y border-line">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/learn/${article.slug}`}
                    className="group block py-7 transition-colors"
                  >
                    <p className="font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase">
                      <time dateTime={article.publishedAt}>
                        {dateFormat.format(new Date(article.publishedAt))}
                      </time>
                      {" · "}
                      {article.readingMinutes} min read
                    </p>
                    <h2 className="mt-2.5 text-2xl leading-snug font-semibold text-pretty text-bone transition-colors group-hover:text-gold-light">
                      {article.title}
                    </h2>
                    <p className="mt-2.5 max-w-2xl leading-relaxed text-pretty text-bone-muted">
                      {article.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <section aria-labelledby="queued-title" className="mt-14">
              <h2
                id="queued-title"
                className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase"
              >
                In the queue
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-pretty text-bone-muted">
                Nothing is published here yet. These are the pieces being
                written — each one worked from the book rather than assembled
                from a keyword list.
              </p>
              <ul className="mt-7 grid gap-px border border-line bg-line sm:grid-cols-2">
                {plannedTopics.map((topic) => (
                  <li
                    key={topic}
                    className="bg-ink p-4 leading-snug text-pretty text-bone-muted sm:p-5"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
              <p className="mt-8 leading-relaxed text-pretty text-bone-muted">
                In the meantime, the Reality Check below is the fastest way to
                find out which PLO habits are costing you money.
              </p>
            </section>
          )}
        </div>

        <QuizCta location="learn-index" />
      </main>
      <SiteFooter />
    </>
  );
}
