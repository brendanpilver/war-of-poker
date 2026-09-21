import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FieldKitUpgrade } from "@/components/marketing/field-kit-upgrade";
import { verifyUpgradeEntitlement } from "@/lib/book-ownership";
import { legalContactEmail } from "@/lib/legal";
import { PRODUCT_PATH } from "@/lib/short-stack-plo";

/**
 * Where a book owner's permanent upgrade link lands.
 *
 * The entitlement in the URL is verified here to decide what to render -- the
 * same check `/api/checkout` repeats before it creates the $15 checkout, so
 * this page cannot be the only gate. It grants no downloads.
 */

export const metadata: Metadata = {
  title: "Add the Field Kit | War of Poker",
  description: "Add the complete Short Stack PLO Field Kit to the book you own.",
  robots: { index: false, follow: false },
};

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-[2.4rem] leading-[1] font-bold tracking-[-0.02em] text-balance text-bone uppercase sm:text-5xl">
        {title}
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-pretty text-bone-muted">
        {children}
      </p>
      <Link
        href={PRODUCT_PATH}
        className="mt-10 inline-block text-bone underline decoration-bone/30 underline-offset-4 hover:decoration-gold"
      >
        Back to Short Stack PLO
      </Link>
    </>
  );
}

const contact = (
  <a
    href={`mailto:${legalContactEmail}`}
    className="text-bone underline decoration-bone/30 underline-offset-4"
  >
    {legalContactEmail}
  </a>
);

export default async function UpgradePage({ searchParams }: PageProps<"/upgrade">) {
  const params = await searchParams;
  const raw = params.entitlement;
  const entitlement = typeof raw === "string" ? raw : null;
  const result = await verifyUpgradeEntitlement(entitlement);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 pt-16 pb-20 sm:px-8 lg:pt-20 lg:pb-28">
          {result.ok && entitlement ? (
            <>
              <p className="mb-5 font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
                For Short Stack PLO owners
              </p>
              <FieldKitUpgrade
                entitlement={entitlement}
                location="upgrade-page"
                headingLevel="h1"
              />
            </>
          ) : result.ok ? null : result.reason === "already-upgraded" ? (
            <Message title="Already upgraded">
              This book purchase already includes the Field Kit. Your download
              links went to the address you bought the book with. If you
              can&apos;t find them, email {contact}.
            </Message>
          ) : result.reason === "unavailable" ? (
            <Message title="Try again shortly">
              The upgrade can&apos;t be checked right now. Please try this link
              again in a few minutes, or email {contact}.
            </Message>
          ) : (
            <Message title="This link isn't valid">
              The upgrade is for readers who own the Short Stack PLO book. If you
              bought it and this link came from your purchase email, it may have
              been copied incompletely — email {contact} from the address you
              bought with and we&apos;ll send it again.
            </Message>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
