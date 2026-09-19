import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { assetsFor, TOKEN_TTL_LABEL, verifyDeliveryToken } from "@/lib/delivery";
import { legalContactEmail } from "@/lib/legal";

/**
 * The purchaser's download page.
 *
 * Access is the signed token alone -- there are no accounts. The token is
 * verified here to decide what to render, and again by the download route
 * before any file is signed for, so this page cannot be the only gate.
 */

export const metadata: Metadata = {
  title: "Your downloads | War of Poker",
  description: "Download your Short Stack PLO files.",
  robots: { index: false, follow: false },
};

export default async function DownloadsPage({
  searchParams,
}: PageProps<"/downloads">) {
  const params = await searchParams;
  const raw = params.token;
  const token = typeof raw === "string" ? raw : null;
  const payload = verifyDeliveryToken(token);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 pt-16 pb-20 sm:px-8 lg:pt-20 lg:pb-28">
          {payload && token ? (
            <>
              <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
                Your files
              </p>
              <h1 className="mt-5 text-[2.4rem] leading-[1] font-bold tracking-[-0.02em] text-bone uppercase sm:text-5xl">
                Short Stack PLO
              </h1>
              <p className="mt-6 leading-relaxed text-pretty text-bone-muted">
                Each link opens a fresh, short-lived download. This page stays
                valid for {TOKEN_TTL_LABEL} from purchase — bookmark it, and
                keep it to yourself.
              </p>

              <ul className="mt-10 divide-y divide-line border-y border-line">
                {assetsFor(payload.product).map((asset) => (
                  <li
                    key={asset.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-5"
                  >
                    <span className="text-lg leading-snug text-pretty text-bone">
                      {asset.name}
                    </span>
                    <a
                      href={`/api/download/${asset.id}?token=${encodeURIComponent(token)}`}
                      className="shrink-0 rounded-[2px] border border-line bg-ink-card px-5 py-2.5 text-sm font-semibold text-bone transition-colors duration-150 hover:border-gold hover:text-gold"
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-sm text-bone-faint">
                Trouble with a file? Contact{" "}
                <a
                  href={`mailto:${legalContactEmail}`}
                  className="text-bone-muted underline decoration-bone/25 underline-offset-4"
                >
                  {legalContactEmail}
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[2.4rem] leading-[1] font-bold tracking-[-0.02em] text-balance text-bone uppercase sm:text-5xl">
                This link isn&apos;t valid
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-pretty text-bone-muted">
                Download links expire {TOKEN_TTL_LABEL} after purchase. If yours
                has lapsed, or the link was copied incompletely, email{" "}
                <a
                  href={`mailto:${legalContactEmail}`}
                  className="text-bone underline decoration-bone/30 underline-offset-4"
                >
                  {legalContactEmail}
                </a>{" "}
                from the address you bought with and we&apos;ll send a fresh
                one.
              </p>
              <Link
                href="/short-stack-plo"
                className="mt-10 inline-block text-bone underline decoration-bone/30 underline-offset-4 hover:decoration-gold"
              >
                Back to Short Stack PLO
              </Link>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
