export const shortStackPlo = {
  title: "Short Stack PLO",
  subtitle: "A Practical Strategy for Shallow-Stack Live Pot-Limit Omaha",
  author: "River Potter",
  publisher: "War of Poker",
  price: "$29",
  format: "Digital guide",
  access: "Immediate access",
  cover: {
    src: "/books/short-stack-plo-cover.jpg",
    width: 1024,
    height: 1536,
  },
};

/** The homepage section that presents the book for purchase. */
export const PURCHASE_SECTION_ID = "book";

/**
 * TODO: Checkout is not configured. Set this to the checkout URL once it exists
 * and every "Get Short Stack PLO" call to action will use it. Until then they
 * lead to the purchase section on the homepage.
 */
const checkoutUrl: string | null = null;

export const shortStackPloCheckoutHref =
  checkoutUrl ?? `/#${PURCHASE_SECTION_ID}`;
