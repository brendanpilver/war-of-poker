import type { Metadata } from "next";
import { ProductViewed } from "@/components/analytics/product-viewed";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { BookExcerpts } from "@/components/marketing/book-excerpts";
import { EducationalDisclaimer } from "@/components/marketing/educational-disclaimer";
import { ExpensiveDecision } from "@/components/marketing/expensive-decision";
import { Faq } from "@/components/marketing/faq";
import { Pricing } from "@/components/marketing/pricing";
import { ProductHero } from "@/components/marketing/product-hero";
import { WhatYouGet } from "@/components/marketing/what-you-get";
import { WhatYouLearn } from "@/components/marketing/what-you-learn";
import { offers } from "@/lib/offers";
import { PRODUCT_PATH, shortStackPlo } from "@/lib/short-stack-plo";
import { siteUrl } from "@/lib/site";

/**
 * The sales page, reduced from twelve modules to seven sections.
 *
 * Order follows the decision a cold visitor actually makes: what it is and what
 * it costs, proof that the reasoning is real, what they'll learn, what they
 * get, a sample, the price, then the questions and the disclaimer. Pricing
 * moved well up from the foot of the page.
 */

const title = "Short Stack PLO: Live Pot-Limit Omaha Strategy | War of Poker";
const description =
  "A practical decision system for live Hold'em players moving into PLO. Hand, SPR, Equity, Player — applied on every street. By River Potter, published by War of Poker.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: PRODUCT_PATH },
  openGraph: {
    type: "website",
    url: PRODUCT_PATH,
    siteName: "War of Poker",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: shortStackPlo.title,
  description: shortStackPlo.subtitle,
  brand: { "@type": "Brand", name: shortStackPlo.publisher },
  image: `${siteUrl}${shortStackPlo.cover.src}`,
  url: `${siteUrl}${PRODUCT_PATH}`,
  offers: [offers.system, offers.book].map((offer) => ({
    "@type": "Offer",
    name: `${shortStackPlo.title} — ${offer.name}`,
    price: (offer.amountCents / 100).toFixed(2),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: `${siteUrl}${PRODUCT_PATH}#pricing`,
  })),
};

export default function ShortStackPloPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ProductViewed product="short-stack-plo" />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Skip to content
      </a>
      <SiteHeader />

      <main id="main" className="flex-1">
        <ProductHero variant="product" />
        <ExpensiveDecision ctaLocation="product-expensive-decision" />
        <WhatYouLearn />
        <WhatYouGet />
        <BookExcerpts />
        <Pricing />
        <Faq />
        <EducationalDisclaimer />
      </main>

      <SiteFooter />
    </>
  );
}
