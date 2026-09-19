import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LegalPage } from "@/components/legal/legal-page";
import { legalContactEmail } from "@/lib/legal";

const title = "Contact | War of Poker";
const description =
  "Get in touch with War of Poker about Short Stack PLO, WARPLAN, or the site.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    url: "/contact",
    siteName: "War of Poker",
    title,
    description,
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function ContactPage() {
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
        <LegalPage
          title="Contact"
          intro={
            <p>
              Questions about Short Stack PLO, WARPLAN, or anything else on
              the site — reach us at the email below.
            </p>
          }
        >
          <a
            href={`mailto:${legalContactEmail}`}
            className="text-lg font-medium text-gold underline underline-offset-4 transition-colors duration-150 hover:text-gold-light"
          >
            {legalContactEmail}
          </a>
        </LegalPage>
      </main>
      <SiteFooter />
    </>
  );
}
