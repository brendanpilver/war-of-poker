import type { Metadata } from "next";
import { ProductViewed } from "@/components/analytics/product-viewed";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ExpensiveDecision } from "@/components/marketing/expensive-decision";
import { FrameworkStrip } from "@/components/marketing/framework-strip";
import { Pricing } from "@/components/marketing/pricing";
import { ProductHero } from "@/components/marketing/product-hero";
import { QuizCta } from "@/components/marketing/quiz-cta";
import { Section } from "@/components/marketing/section";
import { WhatYouGet } from "@/components/marketing/what-you-get";
import { offers } from "@/lib/offers";
import { PRODUCT_PATH, shortStackPlo } from "@/lib/short-stack-plo";
import { siteUrl } from "@/lib/site";

/**
 * The homepage is now a focused Short Stack PLO storefront.
 *
 * It previously opened on War of Poker brand philosophy and closed on a
 * platform roadmap — WARPLAN, courses, tools, gear — which asked a cold visitor
 * to care about the company before the product. Five sections now: the product,
 * one real decision, what you get, the framework, and the choice between the
 * free quiz and buying. The brand lives in the header and footer.
 */

const title = "Short Stack PLO — Live Pot-Limit Omaha strategy | War of Poker";
const description =
  "A practical decision system for live Hold'em players moving into PLO. Book, 7-piece Field Kit, and a 20-hand capstone quiz. By River Potter.";

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

export default function Home() {
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
        <ProductHero variant="home" />
        <ExpensiveDecision ctaLocation="home-expensive-decision" />
        <WhatYouGet compact />
        <Section size="compact" aria-labelledby="home-framework-title">
          <FrameworkStrip headingId="home-framework-title" />
        </Section>
        <QuizCta location="home-quiz" />
        <Pricing />
      </main>

      <SiteFooter />
    </>
  );
}
