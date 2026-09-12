import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { BookContents } from "@/components/marketing/book-contents";
import { BookExcerpts } from "@/components/marketing/book-excerpts";
import { BookOffer } from "@/components/marketing/book-offer";
import { ComingNext } from "@/components/marketing/coming-next";
import { CoreFramework } from "@/components/marketing/core-framework";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { LivePlayers } from "@/components/marketing/live-players";
import { ShortStackIdea } from "@/components/marketing/short-stack-idea";
import { shortStackPlo } from "@/lib/short-stack-plo";
import { siteUrl } from "@/lib/site";

const title = "Short Stack PLO: Live Pot-Limit Omaha Strategy | War of Poker";
const description =
  "Short Stack PLO by River Potter is a practical strategy for shallow-stack live Pot-Limit Omaha, built on hand construction, SPR, equity, and player reads.";

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
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

// TODO: Add an Offer (price, currency, availability, checkout URL) once checkout exists.
const bookJsonLd = {
  "@context": "https://schema.org",
  "@type": "Book",
  name: shortStackPlo.title,
  alternativeHeadline: shortStackPlo.subtitle,
  author: { "@type": "Person", name: shortStackPlo.author },
  publisher: { "@type": "Organization", name: shortStackPlo.publisher, url: siteUrl },
  bookFormat: "https://schema.org/EBook",
  image: `${siteUrl}${shortStackPlo.cover.src}`,
  inLanguage: "en",
  url: siteUrl,
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(bookJsonLd).replace(/</g, "\\u003c"),
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
        <Hero />
        <ShortStackIdea />
        <CoreFramework />
        <BookContents />
        <BookExcerpts />
        <LivePlayers />
        <BookOffer />
        <Faq />
        <ComingNext />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
