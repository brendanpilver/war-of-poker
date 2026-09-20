import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedCta } from "@/components/analytics/tracked-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ChallengeCta } from "@/components/marketing/challenge-cta";
import { articles, findArticle, type ArticleSection } from "@/lib/content/articles";
import { PRODUCT_PATH, shortStackPlo } from "@/lib/short-stack-plo";
import { siteUrl } from "@/lib/site";

/**
 * The article template.
 *
 * Structured sections rather than raw HTML, so headings, lists and callouts all
 * render with the same typography and an article can never inject markup. Each
 * page carries Article structured data and its own canonical URL.
 */

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) return { title: "Not found | War of Poker" };

  return {
    title: `${article.title} | War of Poker`,
    description: article.description,
    alternates: { canonical: `/learn/${article.slug}` },
    authors: [{ name: article.author }],
    openGraph: {
      type: "article",
      url: `/learn/${article.slug}`,
      siteName: "War of Poker",
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: [article.author],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function Section({ section }: { section: ArticleSection }) {
  switch (section.kind) {
    case "h2":
      return (
        <h2
          id={section.id}
          className="mt-12 scroll-mt-24 text-2xl leading-snug font-semibold text-pretty text-bone sm:text-3xl"
        >
          {section.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-9 text-xl leading-snug font-semibold text-pretty text-bone">
          {section.text}
        </h3>
      );
    case "list":
      return (
        <ul className="mt-5 space-y-2.5">
          {section.items.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-pretty text-bone-muted">
              <span aria-hidden className="text-gold">
                —
              </span>
              {item}
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <p className="mt-6 border-l-2 border-gold pl-4 text-lg leading-relaxed text-pretty text-bone">
          {section.text}
        </p>
      );
    default:
      return (
        <p className="mt-5 text-lg leading-relaxed text-pretty text-bone-muted">
          {section.text}
        </p>
      );
  }
}

export default async function ArticlePage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: { "@type": "Person", name: article.author },
    publisher: {
      "@type": "Organization",
      name: shortStackPlo.publisher,
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/brand/war-of-poker-stencil-logo.png`,
      },
    },
    mainEntityOfPage: `${siteUrl}/learn/${article.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-2xl px-5 pt-14 pb-16 sm:px-8 lg:pt-20">
          <Link
            href="/learn"
            className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase transition-colors hover:text-bone"
          >
            ← Learn
          </Link>

          <h1 className="mt-7 text-[2.2rem] leading-[1.05] font-bold tracking-[-0.02em] text-balance text-bone sm:text-5xl">
            {article.title}
          </h1>

          <p className="mt-6 font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase">
            By {article.author}
            {" · "}
            <time dateTime={article.publishedAt}>
              {dateFormat.format(new Date(article.publishedAt))}
            </time>
            {article.updatedAt && (
              <>
                {" · Updated "}
                <time dateTime={article.updatedAt}>
                  {dateFormat.format(new Date(article.updatedAt))}
                </time>
              </>
            )}
            {" · "}
            {article.readingMinutes} min read
          </p>

          <p className="mt-7 text-xl leading-relaxed text-pretty text-gold-light">
            {article.description}
          </p>

          <div className="mt-10">
            {article.sections.map((section, index) => (
              <Section key={index} section={section} />
            ))}
          </div>

          <aside className="mt-14 border border-line bg-ink-card p-6 sm:p-8">
            <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
              From the book
            </p>
            <h2 className="mt-3 text-xl font-semibold text-pretty text-bone">
              {shortStackPlo.title}
            </h2>
            <p className="mt-2.5 leading-relaxed text-pretty text-bone-muted">
              {shortStackPlo.subtitle}. The book, a seven-piece Field Kit, and a
              20-hand capstone quiz.
            </p>
            <TrackedCta
              href={PRODUCT_PATH}
              location={`article-${article.slug}`}
              label="See the Complete System"
              className="mt-6 inline-flex items-center justify-center rounded-[2px] bg-gold px-6 py-3 font-semibold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px"
            >
              See the Complete System
            </TrackedCta>
          </aside>
        </article>

        <ChallengeCta location={`article-${article.slug}`} />
      </main>
      <SiteFooter />
    </>
  );
}
