import { formatPrice, offers } from "@/lib/offers";
import { totalHands } from "@/lib/quiz/hands";
import { siteUrl } from "@/lib/site";

/**
 * The email sequence.
 *
 * Every strategic principle below is drawn from the approved Short Stack PLO
 * publication set -- the book, and the Survival Card's eight Hold'em-to-PLO
 * translation errors. Nothing here introduces strategy that is not already in
 * that material.
 *
 * The worked examples are original and deliberately distinct: an email
 * introduces an idea with a small example of its own, the 10-Hand Challenge
 * tests it through a different situation, and the book and the Field Kit's
 * Capstone Quiz develop it with their own. Do not reuse a challenge hand, a
 * book worked hand, or a Capstone question here.
 *
 * Email 0 is transactional and sends the moment an address is captured. It is
 * the retention half of the results screen: a reader who was not ready to buy
 * gets their score back, the concepts worth reviewing, the Survival Card, and
 * the link that returns them to their player price. Emails 1-5 are dispatched
 * on the schedule in `sequence`, by `/api/email/dispatch`.
 *
 * The two offer-led steps link to the player price rather than the public one.
 * The challenge is the only way onto this list, so everyone receiving them
 * earned it; the link is not a security boundary either way, because
 * `/api/checkout` resolves every amount server-side from the offer id.
 */

export type SequenceKey =
  | "welcome"
  | "expensive-mistake"
  | "draw-quality"
  | "worked-hand"
  | "inside-the-system"
  | "offer-reminder";

export type EmailContent = {
  subject: string;
  /** Paragraphs and headings, rendered to both HTML and plain text. */
  blocks: Block[];
  cta?: { label: string; href: string };
  /** Secondary content rendered beneath the `cta` button, so it never outranks it. */
  after?: Block[];
};

type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  /** A second, quieter link where the single `cta` button is already spoken for. */
  | { kind: "link"; text: string; href: string };

const signature = "— River Potter · PLO Specialist, War of Poker";

function link(path: string, sequenceKey: SequenceKey): string {
  // Sequence emails carry their own source so the dashboard can tell which
  // email produced a click, alongside the original content ID already stored
  // against the subscriber.
  return `${siteUrl}${path}?src=email-${sequenceKey}`;
}

/**
 * The sales page, showing the earned price rather than the public one. See
 * `src/components/marketing/player-price-notice.tsx`.
 */
function playerPriceLink(sequenceKey: SequenceKey): string {
  return `${link("/short-stack-plo", sequenceKey)}&offer=player`;
}

/**
 * Email 0: the player's results, the Survival Card, and the way back to their
 * player price.
 *
 * The concept lists are the same diagnostic the results screen showed, carried
 * over so the email is a continuation of the challenge rather than a receipt
 * for an address. They are computed by `/api/subscribe` from the answers that
 * arrive with the signup, so nothing here has to be generated.
 */
export function welcomeEmail(options: {
  quizScore: number | null;
  /** Concept labels answered correctly, in hand order. */
  strongConcepts?: string[];
  /** Concept labels worth reviewing, in hand order. */
  watchConcepts?: string[];
  survivalCardUrl: string;
  playerPriceUrl: string;
}): EmailContent {
  const finished = options.quizScore !== null;
  const strong = options.strongConcepts ?? [];
  const watch = options.watchConcepts ?? [];

  const scoreLine = !finished
    ? "Here is the Survival Card you asked for."
    : options.quizScore === totalHands
      ? `${totalHands} for ${totalHands} on the challenge. Here are your results, and the Survival Card.`
      : `You matched ${options.quizScore} of ${totalHands} decisions in the challenge. Here are your results, and the Survival Card.`;

  const player = offers["system-quiz"];
  const publicPrice = player.compareAtCents ?? offers.system.amountCents;

  const blocks: Block[] = [{ kind: "p", text: scoreLine }];

  if (strong.length > 0) {
    blocks.push({ kind: "h", text: "You had these" });
    blocks.push({ kind: "list", items: strong });
  }
  if (watch.length > 0) {
    blocks.push({ kind: "h", text: "Worth reviewing" });
    blocks.push({ kind: "list", items: watch });
    blocks.push({
      kind: "p",
      text: "Each of those is covered in the book and worked onto a printable card in the Field Kit.",
    });
  }

  blocks.push({
    kind: "p",
    text: "The NLH Player's PLO Survival Card: eight expensive Hold'em habits to drop before you sit in a PLO game. Two pages — the eight translation errors, the four street questions, and the $2/$5 60 BB numbers worth remembering.",
  });
  blocks.push({
    kind: "p",
    text: "Over the next week or so I'll send you four short notes working through the ideas behind those hands — where Hold'em instincts misfire, how to count and grade a big draw, and what changes when the turn changes the board.",
  });

  if (finished) {
    blocks.push({ kind: "h", text: "You unlocked the Player Price" });
    blocks.push({
      kind: "p",
      text: `Because you finished the challenge, you can get Short Stack PLO + the complete Field Kit for ${formatPrice(player.amountCents)}. That is the whole Complete System — the book and all seven Field Kit tools — which is regularly ${formatPrice(publicPrice)}. The link below holds it open; there is no countdown behind it.`,
    });
    blocks.push({
      kind: "link",
      text: `Get the Book + Field Kit — ${formatPrice(player.amountCents)}`,
      href: options.playerPriceUrl,
    });
  }

  blocks.push({ kind: "p", text: signature });

  return {
    subject: finished
      ? "Your challenge results and PLO Survival Card"
      : "Your PLO Survival Card",
    blocks,
    cta: { label: "Download the Survival Card", href: options.survivalCardUrl },
  };
}

export const sequence: {
  key: SequenceKey;
  /** Days after signup before this email is due. */
  delayDays: number;
  content: EmailContent;
}[] = [
  {
    key: "expensive-mistake",
    delayDays: 1,
    content: {
      subject: "An overpair is a strong made hand (in the other game)",
      blocks: [
        {
          kind: "p",
          text: "The costliest PLO errors are not sloppy play. They are accurate Hold'em instincts applied to a game that changed the inputs.",
        },
        {
          kind: "p",
          text: "Four hole cards mean players make stronger hands, pick up bigger draws, and hold far more equity against one another. So the instinct that was right in Hold'em becomes the expensive one.",
        },
        { kind: "h", text: "The clearest example" },
        {
          kind: "p",
          text: "In Hold'em, an overpair is a strong made hand. In PLO, A♥A♦Q♣2♠ on 7♥6♥4♣ is one pair and little else: a single heart makes no flush draw, and the queen and deuce connect with nothing. Against heavy action at a meaningful SPR, it can quickly become a fold — 8-5 and 5-3 already make straights, sets are ahead, and the biggest draws, such as a wrap with a heart draw, can even be favourites over one pair.",
        },
        {
          kind: "p",
          text: "Aces gain from suits, connectivity and low SPR, not from being aces. A correct preflop raise with aces is regularly followed by a correct flop fold.",
        },
        {
          kind: "p",
          text: "And a low SPR describes the size of the remaining bet. It does not describe your cards, and it is not an instruction to commit.",
        },
        { kind: "quote", text: "If you can't name what a bet earns, don't bet." },
        { kind: "p", text: signature },
      ],
      cta: {
        label: "Take the challenge again",
        href: link("/plo-challenge", "expensive-mistake"),
      },
    },
  },
  {
    key: "draw-quality",
    delayDays: 3,
    content: {
      subject: "Clean outs, dirty outs, and the straight that loses",
      blocks: [
        {
          kind: "p",
          text: "Counting outs is the part of drawing everyone already does. Grading them is the part that decides whether you win.",
        },
        {
          kind: "p",
          text: "Take a small one. You hold K♣Q♦6♥5♥ and the flop is 8♠7♠2♦. Any four or any nine gives you a straight — eight cards. In Hold'em you'd call that eight outs and move on.",
        },
        {
          kind: "p",
          text: "Now grade them. The 4♥, 4♦ and 4♣ make 8-7-6-5-4, the best straight on that board: clean. The 4♠ makes the same straight but puts a third spade out, so any two spades beat you. And every nine makes 9-8-7-6-5 — the bottom of a board where T-6 and J-T make bigger straights. You'd be completing your draw into someone else's better hand.",
        },
        {
          kind: "p",
          text: "Eight cards that make a straight. Three that make the best hand without a catch.",
        },
        { kind: "h", text: "Two steps, not one" },
        {
          kind: "list",
          items: [
            "Count unique cards. Point to the two hole cards and three board cards that make each hand.",
            "Grade every out: nut · clean · vulnerable · dirty.",
          ],
        },
        {
          kind: "p",
          text: "Then price it: what you owe, divided by the final pot. A call that isn't all-in buys one card, not two — the rule of four prices two cards when you are buying one.",
        },
        { kind: "p", text: signature },
      ],
      cta: {
        label: "Count one yourself",
        href: link("/plo-challenge", "draw-quality"),
      },
    },
  },
  {
    key: "worked-hand",
    delayDays: 5,
    content: {
      subject: "When the turn changes the board, start over",
      blocks: [
        {
          kind: "p",
          text: "A short hand, worked through the four questions the whole system runs on: Hand · SPR · Equity · Player.",
        },
        {
          kind: "p",
          text: "You hold Q♦J♣7♥3♠. The flop is Q♠J♥4♦: top two pair, and on that flop only a set beats you. You bet and get called. The turn is the T♠.",
        },
        { kind: "h", text: "Hand" },
        {
          kind: "p",
          text: "Still queens and jacks. Nothing about your cards changed — and that is the trap, because the board did. A-K, K-9 and 9-8 now make straights, and the T♠ put a second spade out.",
        },
        { kind: "h", text: "SPR" },
        {
          kind: "p",
          text: "It tells you how much is left to play for. It doesn't tell you whether you are still ahead.",
        },
        { kind: "h", text: "Equity" },
        {
          kind: "p",
          text: "On the flop your two pair was ahead of almost everything that could call. On this turn it trails every straight, and only the four remaining queens and jacks fill it up to a full house.",
        },
        { kind: "h", text: "Player" },
        {
          kind: "p",
          text: "Ask what called the flop. Hands like A-K, K-9 and 9-8 had gutshots and wraps on Q-J-4, and the ten is the card they were waiting for. A player who calls flops with draws and now bets big is telling you which part of that range arrived.",
        },
        {
          kind: "p",
          text: "The flop assessment was right. It just belongs to a board that no longer exists. Every new card, run the four questions again.",
        },
        { kind: "p", text: signature },
      ],
      cta: {
        label: "Take the 10-Hand Challenge",
        href: link("/plo-challenge", "worked-hand"),
      },
    },
  },
  {
    key: "inside-the-system",
    delayDays: 7,
    content: {
      subject: "What's inside the Short Stack PLO Complete System",
      blocks: [
        {
          kind: "p",
          text: "Everything in these emails comes from one place. Here is what that place actually contains.",
        },
        { kind: "h", text: "The book" },
        {
          kind: "p",
          text: "Short Stack PLO: hand construction, preflop, pot geometry, SPR and commitment, flop play, draw quality and redraws, turn resets, river decisions, live reads, and session and stack management — with fully worked hands.",
        },
        { kind: "h", text: "The Field Kit — seven printable tools" },
        {
          kind: "list",
          items: [
            "Full-Hand Decision Map",
            "60 BB Preflop + Pot Geometry Guide",
            "Flop + Draw Quality Card",
            "River Decision Card",
            "Player Read + Live Exploit Card",
            "Session + Hand Review Workbook",
            "20-Hand Capstone Quiz + Answer Key",
          ],
        },
        {
          kind: "p",
          text: "The Capstone Quiz is twenty applied situations — game, stacks, positions, what you know about the player, the action, the board, and the price — with a full answer key.",
        },
        { kind: "p", text: signature },
      ],
      cta: {
        label: "See the Complete System",
        href: playerPriceLink("inside-the-system"),
      },
    },
  },
  {
    key: "offer-reminder",
    delayDays: 10,
    content: {
      subject: "Your player price is still on",
      blocks: [
        {
          kind: "p",
          text: "A short note rather than a long one.",
        },
        {
          kind: "p",
          text: `Because you finished the challenge, you can get Short Stack PLO + the complete Field Kit for ${formatPrice(offers["system-quiz"].amountCents)} instead of the regular ${formatPrice(offers.system.amountCents)} — everything, for only ${formatPrice(offers["system-quiz"].amountCents - offers.book.amountCents)} more than the book alone. That is your Player Price, and it is still open.`,
        },
        {
          kind: "p",
          text: "One avoided stack-sized mistake in a $2/$5 game is worth several times that. That is the whole argument; there isn't a countdown behind it.",
        },
        {
          kind: "p",
          text: "If PLO isn't where your time is going right now, that's a perfectly good answer. The Survival Card is yours either way.",
        },
        { kind: "p", text: signature },
      ],
      cta: {
        label: `Get the Book + Field Kit — ${formatPrice(offers["system-quiz"].amountCents)}`,
        href: playerPriceLink("offer-reminder"),
      },
    },
  },
];

export function purchaseEmail(options: {
  productName: string;
  includes: string[];
  downloadUrl: string;
  expiresLabel: string;
  /**
   * A book purchase's permanent upgrade link. Rendered beneath the download
   * button as a secondary offer, never above it.
   */
  upgradeUrl?: string;
}): EmailContent {
  const blocks: Block[] = [
    { kind: "p", text: "Thank you. Your purchase is confirmed." },
    { kind: "h", text: `Short Stack PLO — ${options.productName}` },
    { kind: "list", items: options.includes },
    {
      kind: "p",
      text: `Use the link below to open your download page. It is unique to your purchase, so keep it to yourself; it stays valid for ${options.expiresLabel}. If it lapses, reply to this email and I'll send a fresh one.`,
    },
  ];

  blocks.push({ kind: "p", text: signature });

  const upgradePrice = formatPrice(offers["field-kit-upgrade"].amountCents);
  const after: Block[] | undefined = options.upgradeUrl
    ? [
        {
          kind: "p",
          text: `Want the Field Kit later? As a Short Stack PLO owner, you can add the complete Field Kit anytime for ${upgradePrice}.`,
        },
        {
          kind: "link",
          text: `Add the Field Kit for ${upgradePrice}`,
          href: options.upgradeUrl,
        },
      ]
    : undefined;

  return {
    subject: `Your copy of Short Stack PLO — ${options.productName}`,
    blocks,
    cta: { label: "Open your downloads", href: options.downloadUrl },
    after,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plain, table-free HTML with inline styles. Email clients are not browsers:
 * this keeps to what renders consistently rather than reproducing the site.
 */
function blocksHtml(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case "h":
          return `<h2 style="margin:28px 0 8px;font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:#8a6a1d;">${escapeHtml(block.text)}</h2>`;
        case "quote":
          return `<p style="margin:20px 0;padding-left:14px;border-left:2px solid #d6a129;font-style:italic;color:#3d3a33;">${escapeHtml(block.text)}</p>`;
        case "list":
          return `<ul style="margin:12px 0;padding-left:20px;color:#3d3a33;">${block.items
            .map((item) => `<li style="margin:6px 0;">${escapeHtml(item)}</li>`)
            .join("")}</ul>`;
        case "link":
          return `<p style="margin:18px 0;"><a href="${escapeHtml(block.href)}" style="color:#8a6a1d;font-weight:700;">${escapeHtml(block.text)}</a></p>`;
        default:
          return `<p style="margin:14px 0;color:#3d3a33;">${escapeHtml(block.text)}</p>`;
      }
    })
    .join("");
}

export function renderHtml(content: EmailContent): string {
  const body = blocksHtml(content.blocks);
  const after = content.after ? blocksHtml(content.after) : "";

  const cta = content.cta
    ? `<p style="margin:32px 0;"><a href="${escapeHtml(content.cta.href)}" style="display:inline-block;background:#d6a129;color:#0b0a09;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:2px;">${escapeHtml(content.cta.label)}</a></p>`
    : "";

  return [
    `<!doctype html><html><body style="margin:0;padding:24px;background:#f4efe8;">`,
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;">`,
    body,
    cta,
    after,
    `<hr style="margin:32px 0 16px;border:0;border-top:1px solid #e2dbd0;">`,
    `<p style="margin:0;font-size:12px;color:#8a8375;">War of Poker · <a href="${siteUrl}" style="color:#8a8375;">warofpoker.com</a></p>`,
    `</div></body></html>`,
  ].join("");
}

function blocksText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case "h":
          return `\n${block.text.toUpperCase()}\n`;
        case "list":
          return block.items.map((item) => `  - ${item}`).join("\n");
        case "link":
          return `${block.text}: ${block.href}`;
        default:
          return block.text;
      }
    })
    .join("\n\n");
}

export function renderText(content: EmailContent): string {
  const body = blocksText(content.blocks);
  const cta = content.cta ? `\n\n${content.cta.label}: ${content.cta.href}` : "";
  const after = content.after ? `\n\n${blocksText(content.after)}` : "";
  return `${body}${cta}${after}\n\n—\nWar of Poker · ${siteUrl}\n`;
}
