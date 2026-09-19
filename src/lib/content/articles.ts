import { shortStackPlo } from "@/lib/short-stack-plo";

/**
 * The /learn article registry.
 *
 * Articles are TypeScript modules rather than a CMS: there is no CMS decision
 * yet, and a typed registry gives the same structured metadata without adding a
 * service. When volume justifies one, this is the seam to replace.
 *
 * `articles` is intentionally empty. The section exists and is ready; filling it
 * with generated SEO articles would work against the brand it is meant to
 * build. `plannedTopics` records what is queued, so the index has something
 * honest to show and the sitemap has nothing to over-claim.
 */

export type ArticleSection =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string; id: string }
  | { kind: "h3"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "callout"; text: string };

export type Article = {
  slug: string;
  title: string;
  description: string;
  /** ISO date, e.g. "2026-09-19". */
  publishedAt: string;
  updatedAt?: string;
  author: string;
  /** Roughly how long the piece takes to read, in minutes. */
  readingMinutes: number;
  sections: ArticleSection[];
};

export const articles: Article[] = [];

/**
 * Queued topics. Each one has to be written from the approved Short Stack PLO
 * material before it is published -- these are commitments, not placeholders to
 * be auto-filled.
 */
export const plannedTopics = [
  "PLO starting hands for live players",
  "PLO SPR explained",
  "How to count outs in PLO",
  "Clean versus dirty outs",
  "The NLH to PLO transition",
  "Shallow-stack PLO strategy",
  "Calculating a pot-limit raise",
  "Redraws in PLO",
  "Why bare aces are not automatically committed",
  "River bluff-catching in live PLO",
];

export function findArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}

export const defaultArticleAuthor = shortStackPlo.author;
