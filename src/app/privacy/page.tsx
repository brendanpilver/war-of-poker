import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { legalContactEmail, legalEntityName, privacyUpdated } from "@/lib/legal";

const title = "Privacy Policy | War of Poker";
const description =
  "How War of Poker collects, uses, and protects information from visitors and customers of warofpoker.com.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
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

export default function PrivacyPage() {
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
          title="Privacy Policy"
          updated={privacyUpdated}
          intro={
            <p>
              This Privacy Policy explains what information{" "}
              {legalEntityName} collects through warofpoker.com (the
              &ldquo;Site&rdquo;) and how we use it. See also our{" "}
              <Link href="/terms" className={linkClass}>
                Terms of Service
              </Link>
              .
            </p>
          }
        >
          <LegalSection heading="Information We Collect">
            <p>
              Browsing the Site: you can browse War of Poker without creating
              an account or providing any personal information.
            </p>
            <p>
              Information you provide directly: if you email us, we receive
              your email address and whatever else you include in your
              message.
            </p>
            <p>
              Purchase information: if you buy Short Stack PLO or another
              product, our payment processor collects the information needed
              to complete that purchase, such as your email address and
              payment details. We do not store your full payment card number
              on our own servers.
            </p>
          </LegalSection>

          <LegalSection heading="Cookies and Analytics">
            <p>
              The Site does not currently use analytics, advertising, or
              tracking cookies. If that changes, we will update this policy
              first.
            </p>
          </LegalSection>

          <LegalSection heading="How We Use Information">
            <p>
              We use the information we have to deliver the products you
              purchase and communicate with you about them, respond to
              messages you send us, and keep the Site secure and working
              correctly.
            </p>
          </LegalSection>

          <LegalSection heading="Sharing of Information">
            <p>
              We do not sell personal information. We share information only
              with service providers who help us run the Site and process
              payments, only to the extent needed for them to do that work, or
              when required by law.
            </p>
          </LegalSection>

          <LegalSection heading="Data Retention">
            <p>
              We keep purchase records and correspondence for as long as
              needed to support your purchase, meet legal or accounting
              obligations, and resolve disputes.
            </p>
          </LegalSection>

          <LegalSection heading="Your Rights and Choices">
            <p>
              Depending on where you live, you may have the right to access,
              correct, or delete the personal information we hold about you.
              To make a request, contact us using the details below.
            </p>
          </LegalSection>

          <LegalSection heading="Children's Privacy">
            <p>
              The Site is not directed to children, and we do not knowingly
              collect personal information from anyone under 13.
            </p>
          </LegalSection>

          <LegalSection heading="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. The date
              at the top shows when it was last revised. Continued use of the
              Site after an update means you accept the revised policy.
            </p>
          </LegalSection>

          <LegalSection heading="Contact Us">
            <p>
              Questions about this policy? Email{" "}
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
