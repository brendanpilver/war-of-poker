import { formatPrice, offers } from "@/lib/offers";
import { siteUrl } from "@/lib/site";

/**
 * The email sequence.
 *
 * Every strategic claim below is drawn from the approved Short Stack PLO
 * publication set -- the Survival Card's eight Hold'em-to-PLO translation
 * errors and the three Reality Check hands. Nothing here introduces strategy
 * that is not already in that material.
 *
 * Email 0 is transactional and sends the moment an address is captured. Emails
 * 1-5 are dispatched on the schedule in `sequence`, by `/api/email/dispatch`.
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
};

type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] };

const signature = "— River Potter · PLO Specialist, War of Poker";

function link(path: string, sequenceKey: SequenceKey): string {
  // Sequence emails carry their own source so the dashboard can tell which
  // email produced a click, alongside the original content ID already stored
  // against the subscriber.
  return `${siteUrl}${path}?src=email-${sequenceKey}`;
}

export function welcomeEmail(options: {
  quizScore: number | null;
  survivalCardUrl: string;
}): EmailContent {
  const scoreLine =
    options.quizScore === null
      ? "Here is the Survival Card you asked for."
      : options.quizScore === 3
        ? "Three for three on the Reality Check. Here is the Survival Card."
        : `You scored ${options.quizScore} of 3 on the Reality Check. Here is the Survival Card.`;

  const promo = offers["system-quiz"];

  return {
    subject: "Your PLO Survival Card",
    blocks: [
      { kind: "p", text: scoreLine },
      {
        kind: "p",
        text: "The NLH Player's PLO Survival Card: eight expensive Hold'em habits to drop before you sit in a PLO game. Two pages — the eight translation errors, the four street questions, and the $2/$5 60 BB numbers worth remembering.",
      },
      {
        kind: "p",
        text: "Over the next week or so I'll send you four short notes working through the ideas behind those three hands — where Hold'em instincts misfire, how to count and grade a big draw, and what a full hand looks like when you work it properly.",
      },
      { kind: "h", text: "Because you finished the Reality Check" },
      {
        kind: "p",
        text: `The Short Stack PLO Complete System — the book, the full seven-piece Field Kit, and the 20-Hand Capstone Quiz — is ${formatPrice(promo.amountCents)} for you instead of ${formatPrice(promo.compareAtCents ?? offers.system.amountCents)}.`,
      },
      { kind: "p", text: signature },
    ],
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
          text: "In Hold'em, an overpair is a strong made hand. In PLO, bare aces on 9-8-6 have to fold to real action — against a range full of rundowns and suited connectors, they are behind the straights, sets and big wraps that just connected.",
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
        label: "Retake the Reality Check",
        href: link("/plo-reality-check", "expensive-mistake"),
      },
    },
  },
  {
    key: "draw-quality",
    delayDays: 3,
    content: {
      subject: "Clean outs, dirty outs, and the 22 that were really 19",
      blocks: [
        {
          kind: "p",
          text: "Question 2 of the Reality Check is the one most people get wrong, and it is worth sitting with.",
        },
        {
          kind: "p",
          text: "K♠Q♠J♦9♦ on T♠8♠3♥ looks like 13 straight cards plus 9 spades — 22 outs. It isn't. That count uses 7♠, 9♠ and J♠ twice. They are one physical card each. Overlapping improvement labels never create extra outs.",
        },
        {
          kind: "p",
          text: "The honest count is 19 unique cards. Then grade them: 10 non-spade straight cards and the A♠ make the current nuts; the other eight spades give you a flush that can already be beaten by an A♠ holding — which is exactly what a betting range contains.",
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
          text: "Then price it. $60 into $123 makes a final pot of $243, so the call needs 24.7% — and a non-all-in call buys you one turn decision, not the river. The rule of four prices two cards when you are buying one.",
        },
        { kind: "p", text: signature },
      ],
      cta: {
        label: "See the full out count",
        href: link("/plo-reality-check", "draw-quality"),
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
          text: "Here is the third Reality Check hand worked through the four questions the whole system runs on: Hand · SPR · Equity · Player.",
        },
        {
          kind: "p",
          text: "You hold J♦T♦7♣6♠ on 9♠8♥2♦. You called a $100 flop lead. The turn is the 8♣ and the cutoff shoves $142 into $323.",
        },
        { kind: "h", text: "Hand" },
        {
          kind: "p",
          text: "A big wrap on the flop. After the 8♣, still twenty straight completions — and that is the trap, because completions are not winners.",
        },
        { kind: "h", text: "SPR" },
        {
          kind: "p",
          text: "Irrelevant to whether you are ahead. It tells you the decision is for the rest of the money, nothing more.",
        },
        { kind: "h", text: "Equity" },
        {
          kind: "p",
          text: "The 8♣ pairs the board. Flopped 99xx and 22xx are now full houses, 88xx is quads, and 98xx is a full house. Against those hands, none of your twenty straight cards win. Not some. None.",
        },
        { kind: "h", text: "Player" },
        {
          kind: "p",
          text: "This cutoff leads flops with sets and two pair more often than with draws. That is precisely the range the turn just promoted.",
        },
        {
          kind: "p",
          text: "The price is genuinely fine — you need 23.4%. You fold anyway, because the equity died, not because the price is bad. Paying a turn price with flop equity is the classic error: the number was computed against a board that no longer exists.",
        },
        { kind: "p", text: signature },
      ],
      cta: {
        label: "Work the hand yourself",
        href: link("/plo-reality-check", "worked-hand"),
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
        href: link("/short-stack-plo", "inside-the-system"),
      },
    },
  },
  {
    key: "offer-reminder",
    delayDays: 10,
    content: {
      subject: "Your Reality Check price is still on",
      blocks: [
        {
          kind: "p",
          text: "A short note rather than a long one.",
        },
        {
          kind: "p",
          text: `Because you finished the Reality Check, the Complete System — book, seven-piece Field Kit, and the 20-Hand Capstone Quiz — is ${formatPrice(offers["system-quiz"].amountCents)} rather than ${formatPrice(offers.system.amountCents)}.`,
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
        label: "Get the Complete System",
        href: link("/short-stack-plo", "offer-reminder"),
      },
    },
  },
];

export function purchaseEmail(options: {
  productName: string;
  includes: string[];
  downloadUrl: string;
  expiresLabel: string;
}): EmailContent {
  return {
    subject: `Your copy of Short Stack PLO — ${options.productName}`,
    blocks: [
      { kind: "p", text: "Thank you. Your purchase is confirmed." },
      { kind: "h", text: `Short Stack PLO — ${options.productName}` },
      { kind: "list", items: options.includes },
      {
        kind: "p",
        text: `Use the link below to open your download page. It is unique to your purchase, so keep it to yourself; it stays valid for ${options.expiresLabel}. If it lapses, reply to this email and I'll send a fresh one.`,
      },
      { kind: "p", text: signature },
    ],
    cta: { label: "Open your downloads", href: options.downloadUrl },
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
export function renderHtml(content: EmailContent): string {
  const body = content.blocks
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
        default:
          return `<p style="margin:14px 0;color:#3d3a33;">${escapeHtml(block.text)}</p>`;
      }
    })
    .join("");

  const cta = content.cta
    ? `<p style="margin:32px 0;"><a href="${escapeHtml(content.cta.href)}" style="display:inline-block;background:#d6a129;color:#0b0a09;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:2px;">${escapeHtml(content.cta.label)}</a></p>`
    : "";

  return [
    `<!doctype html><html><body style="margin:0;padding:24px;background:#f4efe8;">`,
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;">`,
    body,
    cta,
    `<hr style="margin:32px 0 16px;border:0;border-top:1px solid #e2dbd0;">`,
    `<p style="margin:0;font-size:12px;color:#8a8375;">War of Poker · <a href="${siteUrl}" style="color:#8a8375;">warofpoker.com</a></p>`,
    `</div></body></html>`,
  ].join("");
}

export function renderText(content: EmailContent): string {
  const body = content.blocks
    .map((block) => {
      switch (block.kind) {
        case "h":
          return `\n${block.text.toUpperCase()}\n`;
        case "list":
          return block.items.map((item) => `  - ${item}`).join("\n");
        default:
          return block.text;
      }
    })
    .join("\n\n");

  const cta = content.cta ? `\n\n${content.cta.label}: ${content.cta.href}` : "";
  return `${body}${cta}\n\n—\nWar of Poker · ${siteUrl}\n`;
}
