import { Card, GameState, Rank, Suit } from "./types";

export const RANKS: Exclude<Rank, "JOKER">[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
const SUITS: Exclude<Suit, "joker">[] = [
  "hearts",
  "diamonds",
  "clubs",
  "spades",
];

export const rankValue = (r: Exclude<Rank, "JOKER">) => RANKS.indexOf(r);

export const newDeck = (jokers: number): Card[] => {
  const deck: Card[] = [];
  let id = 1;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: id++, suit: suit, rank: rank });
    }
  }
  for (let j = 0; j < jokers; j++)
    deck.push({ id: 10000 + j, suit: "joker", rank: "JOKER" });
  return shuffle(deck);
};

export const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const suitSymbol = (s: Suit) =>
  s === "hearts"
    ? "♥"
    : s === "diamonds"
    ? "♦"
    : s === "clubs"
    ? "♣"
    : s === "spades"
    ? "♠"
    : "🃏";

export const effRank = (c: Card): Exclude<Rank, "JOKER"> =>
  c.rank === "JOKER" ? c.asRank ?? "2" : c.rank;

export const contiguousTop = (pile: Card[]) => {
  if (pile.length === 0)
    return { rank: null as null | Exclude<Rank, "JOKER">, count: 0 };
  const eranks = pile.map(effRank);
  const top = eranks[eranks.length - 1];
  let count = 0;
  for (let i = eranks.length - 1; i >= 0; i--) {
    if (eranks[i] === top) count++;
    else break;
  }
  return { rank: top, count };
};

export const validatePlay = (
  gs: GameState,
  selected: Card[]
): { ok: boolean; reason?: string } => {
  if (selected.length === 0)
    return { ok: false, reason: "Select one or more cards." };

  // Ensure jokers have asRank set
  for (const c of selected) {
    if (c.rank === "JOKER" && !c.asRank)
      return { ok: false, reason: "Choose a rank for each Joker." };
  }

  // Check same-rank set OR 69
  const ranks = selected.map(effRank);
  const isSame = new Set(ranks).size === 1;
  const is69 = ranks.length === 2 && ranks.includes("6") && ranks.includes("9");
  const isTwoReset = ranks.every((r) => r === "2");

  if (!isSame && !is69) {
    return { ok: false, reason: "Play a set of the same rank, or a 69 (6+9)." };
  }

  // Empty table allows anything
  if (gs.pile.length === 0) return { ok: true };

  // Always allow 69, or any number of 2s as reset
  if (is69 || isTwoReset) return { ok: true };

  const prev = gs.compareRank; // previous comparative rank
  const played = ranks[0]; // same-rank set

  if (prev === null) return { ok: true };

  // Beat previous or equal?
  if (rankValue(played) >= rankValue(prev)) return { ok: true };

  // OR equal rank that completes 4-of-a-kind across top of pile
  const top = contiguousTop(gs.pile);
  if (top.rank && top.rank === played && top.count + selected.length >= 4) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `Must beat or match ${prev}.`,
  };
};

export const applyPlay = (
  gs: GameState,
  selected: Card[],
  giveSip: () => void,
  spinBottle: () => void
): void => {
  // Remove from current player's hand & push to pile
  const cur = gs.players[gs.turn];
  const ids = new Set(selected.map((c) => c.id));
  cur.hand = cur.hand.filter((c) => !ids.has(c.id));
  gs.pile.push(...selected);

  // Update compareRank
  const ranks = selected.map(effRank);
  const is69 = ranks.length === 2 && ranks.includes("6") && ranks.includes("9");
  const isTwoReset = ranks.every((r) => r === "2");
  if (is69) {
    gs.compareRank = "9";
    gs.messages.unshift(
      `${cur.name} played 69 — everyone drinks, next must beat 9.`
    );
    everyoneDrinks(gs, 1);
  } else if (isTwoReset) {
    gs.compareRank = "2";
    gs.messages.unshift(
      `${cur.name} played a 2 — pile reset, next must beat 2.`
    );
  } else {
    gs.compareRank = ranks[0];
    gs.messages.unshift(`${cur.name} played ${labelCards(selected)}.`);
  }

  // Specials based on pile top block
  const top = contiguousTop(gs.pile);
  if (top.count >= 4) {
    gs.messages.unshift(`Four-of-a-kind (${top.rank}) — everyone drinks!`);
    everyoneDrinks(gs, 1);
  }
  if (top.rank === "K" && top.count >= 2) {
    gs.messages.unshift(`KK — ${cur.name} drinks and gives 1 sip.`);
    cur.drank += 1;
    giveSip();
  }
  if (top.rank === "J" && top.count >= 3) {
    gs.messages.unshift(`Trippelknull (3+ Jacks) — everyone drinks!`);
    everyoneDrinks(gs, 1);
  }
  if (top.rank === "6" && top.count >= 4) {
    gs.messages.unshift(
      `Quadrupellsex (4+ sixes) — WATERFALL! ${cur.name} starts.`
    );
  }
  if (top.rank === "7" && top.count >= 3) {
    gs.messages.unshift(
      `Three or more 7s — Spin the bottle (choose a target to drink 1).`
    );
    spinBottle();
  }
  if (top.rank === "Q" && top.count >= 2) {
    gs.messages.unshift(`Two or more Queens — Sax section drinks!`);
  }
};

export const takePile = (gs: GameState): void => {
  const cur = gs.players[gs.turn];
  cur.hand.push(...gs.pile);
  gs.pile = [];
  gs.compareRank = null;
  cur.drank += 1;
  gs.messages.unshift(`${cur.name} picked up the pile and drank.`);
};

export const advanceTurn = (gs: GameState): void => {
  const n = gs.players.length;
  for (let i = 1; i <= n; i++) {
    gs.turn = (gs.turn + 1) % n;
    const p = gs.players[gs.turn];
    if (!p.out) break;
  }
  topUpToThree(gs);
};

export const topUpToThree = (gs: GameState): void => {
  const p = gs.players[gs.turn];
  if (p.out) return;
  while (p.hand.length < 3) {
    if (gs.deck.length > 0) {
      p.hand.push(gs.deck.pop()!);
    } else {
      // draw from player with most cards (>3)
      const donors = gs.players
        .filter((x) => !x.out && x !== p)
        .sort((a, b) => b.hand.length - a.hand.length);
      if (donors.length === 0 || donors[0].hand.length <= 3) {
        // No one has >3 — p is OUT (winner)
        p.out = true;
        gs.winners.push(p.name);
        gs.messages.unshift(`${p.name} is out (won)!`);
        // If only one remains, end game
        const remaining = gs.players.filter((x) => !x.out);
        if (remaining.length <= 1) {
          gs.stage = "ended";
          if (remaining.length === 1) {
            gs.messages.unshift(`${remaining[0].name} is the last one left.`);
          }
          return;
        }
        // Move on to next active player
        advanceTurn(gs);
        return;
      } else {
        const donor = donors[0];
        p.hand.push(donor.hand.pop()!);
      }
    }
  }
};

export const labelCards = (cards: Card[]): string => {
  return cards
    .map((c) => (c.rank === "JOKER" ? `J(${c.asRank ?? "?"})` : `${c.rank}`))
    .join(" ");
};

export const everyoneDrinks = (gs: GameState, sips: number) => {
  for (const p of gs.players) if (!p.out) p.drank += sips;
};
