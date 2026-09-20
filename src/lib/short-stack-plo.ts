export const shortStackPlo = {
  title: "Short Stack PLO",
  subtitle: "A Practical Strategy for Shallow-Stack Live Pot-Limit Omaha",
  author: "River Potter",
  authorTitle: "PLO Specialist, War of Poker",
  publisher: "War of Poker",
  format: "Digital download",
  access: "Immediate access",
  cover: {
    src: "/books/short-stack-plo-cover.jpg",
    width: 1024,
    height: 1536,
  },
};

/** The sales page. Prices live in `src/lib/offers.ts`. */
export const PRODUCT_PATH = "/short-stack-plo";

/**
 * The free acquisition asset, and the site's primary call to action.
 *
 * Short on purpose: it is read aloud in videos, printed on cards, and encoded
 * in QR codes. `/plo-reality-check` redirects here -- see `next.config.mjs` --
 * because published links carry the content IDs the funnel is attributed on.
 */
export const CHALLENGE_PATH = "/plo-challenge";

/**
 * Where a "get the book" call to action goes. Checkout itself is started by
 * `BuyOfferButton`, which needs an offer id, so calls to action outside the
 * sales page send the reader to the pricing block to choose one.
 */
export const productPricingHref = `${PRODUCT_PATH}#pricing`;
