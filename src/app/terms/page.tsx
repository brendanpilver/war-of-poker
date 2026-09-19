import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { legalContactEmail, legalEntityName, termsUpdated } from "@/lib/legal";
import { shortStackPlo } from "@/lib/short-stack-plo";

const title = "Terms of Service | War of Poker";
const description =
  "The terms that govern your use of warofpoker.com and War of Poker products, including Short Stack PLO.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "/terms",
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

const linkClass =
  "text-gold underline underline-offset-4 transition-colors duration-150 hover:text-gold-light";

export default function TermsPage() {
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
          title="Terms of Service"
          updated={termsUpdated}
          intro={
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) explain the rules
              for using warofpoker.com and buying products from{" "}
              {legalEntityName}, including {shortStackPlo.title}. See also our{" "}
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              .
            </p>
          }
        >
          <LegalSection heading="1. Acceptance of Terms">
            <p>
              By using the Site or purchasing a product, you agree to these
              Terms. If you do not agree, do not use the Site.
            </p>
          </LegalSection>

          <LegalSection heading="2. Eligibility">
            <p>
              You must be at least 18 years old to purchase a product from{" "}
              {legalEntityName}.
            </p>
          </LegalSection>

          <LegalSection heading="3. The Site and Products">
            <p>
              {legalEntityName} publishes poker strategy content, including
              WARPLAN and digital guides such as {shortStackPlo.title}.
              Products are informational and educational.{" "}
              {legalEntityName} is not a casino, card room, or gambling
              operator, and does not facilitate real-money gambling.
            </p>
          </LegalSection>

          <LegalSection heading="4. Purchases and Payment">
            <p>
              Prices are shown on the Site in U.S. dollars. Payment is
              processed by a third-party payment processor; we do not store
              your full payment card details. Digital products are delivered
              electronically after payment is confirmed.
            </p>
          </LegalSection>

          <LegalSection heading="5. Refunds">
            <p>
              Digital products are delivered immediately upon purchase.
              Because of this, all sales are final and we do not offer
              refunds, except where required by law.
            </p>
          </LegalSection>

          <LegalSection heading="6. License to Digital Products">
            <p>
              When you buy a digital product such as {shortStackPlo.title}, we
              grant you a personal, non-exclusive, non-transferable license to
              use it for your own reading and reference. You may not resell,
              redistribute, publicly share, or post the product or its
              contents elsewhere.
            </p>
          </LegalSection>

          <LegalSection heading="7. Intellectual Property">
            <p>
              War of Poker, WARPLAN, and all associated names, text, artwork,
              and other content on the Site are owned by {legalEntityName} or
              its licensors and are protected by copyright and other laws.
              Nothing in these Terms transfers any of that ownership to you.
            </p>
          </LegalSection>

          <LegalSection heading="8. Educational Purpose; No Guarantee of Results">
            <p>
              {legalEntityName}&rsquo;s content, including WARPLAN, reflects
              strategic opinions and educational material. It is not a
              guarantee of winnings or results, and poker involves risk
              regardless of strategy. You are responsible for playing within
              your means and for complying with the gambling laws that apply
              to you.
            </p>
          </LegalSection>

          <LegalSection heading="9. Disclaimer of Warranties">
            <p>
              The Site and its products are provided &ldquo;as is,&rdquo;
              without warranties of any kind, express or implied.
            </p>
          </LegalSection>

          <LegalSection heading="10. Limitation of Liability">
            <p>
              To the fullest extent permitted by law, {legalEntityName} is not
              liable for any indirect, incidental, or consequential damages
              arising from your use of the Site or its products. Our total
              liability for any claim will not exceed the amount you paid to{" "}
              {legalEntityName} in the twelve months before the claim.
            </p>
          </LegalSection>

          <LegalSection heading="11. Governing Law">
            <p>
              These Terms are governed by the laws applicable to your use of
              the Site, without regard to conflict-of-laws rules. If a
              dispute arises, contact us at the email below first so we can
              try to resolve it directly.
            </p>
          </LegalSection>

          <LegalSection heading="12. Changes to These Terms">
            <p>
              We may update these Terms from time to time. The date at the
              top shows when they were last revised. Continued use of the
              Site after an update means you accept the revised Terms.
            </p>
          </LegalSection>

          <LegalSection heading="13. Contact Us">
            <p>
              Questions about these Terms? Email{" "}
              <a href={`mailto:${legalContactEmail}`} className={linkClass}>
                {legalContactEmail}
              </a>
              .
            </p>
          </LegalSection>
        </LegalPage>
      </main>
      <SiteFooter />
    </>
  );
}
