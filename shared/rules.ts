// shared/rules.ts
import { Card, GameOptions, GameState, Move, PlayerID, PlayerState, Rank, Suit } from "./types";

// Rank order from low to high (2 is a reset special)
const RANK_ORDER: Rank[] = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','JOKER'];

// Helpers
export const rankValue = (rank: Rank): number => RANK_ORDER.indexOf(rank);

export const newDeck = (numJokers: number): Card[] => {
  const suits: Suit[] = ['hearts','diamonds','clubs','spades'];
  const ranks: Exclude<Rank, 'JOKER'>[] = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const deck: Card[] = [];
  let id = 0;
  for (const s of suits) {
    for (const r of ranks) {
      deck.push({ id: `c${id++}`, suit: s, rank: r });
    }
  }
  for (let j = 0; j < Math.max(2, Math.min(5, numJokers)); j++) {
    deck.push({ id: `c${id++}`, suit: 'joker', rank: 'JOKER' });
  }
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const createGame = (id: string, names: string[], options: GameOptions): GameState => {
  const deck = newDeck(options.numJokers);
  const players: PlayerState[] = names.map((name, i) => ({
    id: `p${i+1}`,
    name,
    hand: [],
    drank: 0,
    connected: true,
  }));

  // Deal 3 to each
  for (let r = 0; r < 3; r++) {
    for (const p of players) {
      const c = deck.pop();
      if (c) p.hand.push(c);
    }
  }

  const gs: GameState = {
    id,
    players,
    turn: players[0].id,
    deck,
    discard: [],
    pile: [],
    topRankForComparison: null,
    started: true,
    finished: false,
    options,
    messages: [`Spelet startade med ${players.length} spelare.`]
  };
  enforceMinHand(gs);
  return gs;
};

const getPlayer = (gs: GameState, id: PlayerID) => gs.players.find(p => p.id === id)!;

const nextPlayerId = (gs: GameState): PlayerID => {
  const idx = gs.players.findIndex(p => p.id === gs.turn);
  return gs.players[(idx + 1) % gs.players.length].id;
};

const compareSetHigher = (prevRank: Rank | null, playedCards: Card[]): boolean => {
  const ranks = playedCards.map(c => (c.rank === 'JOKER' ? (c.asRank ?? '2') : c.rank));
  const unique = new Set(ranks);
  if (unique.size !== 1) return false; // must be same rank set
  const r = ranks[0];
  if (prevRank === null) return true;
  return rankValue(r) > rankValue(prevRank);
};

// Enforce "man ska alltid ha tre kort eller fler på hand, starta med tre kort."
export const enforceMinHand = (gs: GameState) => {
  for (const p of gs.players) {
    while (p.hand.length < 3) {
      // draw from deck, else from player with most cards
      let draw = gs.deck.pop();
      if (!draw) {
        const richest = gs.players.slice().sort((a,b)=>b.hand.length - a.hand.length)[0];
        if (richest.hand.length > 3) draw = richest.hand.pop()!;
      }
      if (!draw) break;
      p.hand.push(draw);
    }
  }
  // Check win: "Om ingen annan spelare har fler än tre kort är man ute ur spelet (dvs man vann)."
  for (const p of gs.players) {
    const others = gs.players.filter(x => x.id !== p.id);
    const anyOtherHasMoreThan3 = others.some(x => x.hand.length > 3);
    if (!anyOtherHasMoreThan3 && p.hand.length <= 3) {
      gs.finished = true;
      gs.winner = p.id;
      gs.messages.push(`${p.name} vann!`);
    }
  }
};

// Evaluate special rules triggered by the PILE (not just current play)
const evaluateSpecials = (pile: Card[]): {
  everyoneDrink?: boolean;
  waterfall?: boolean;
  spinBottle?: boolean;
  saxSectionDrink?: boolean;
  kkGive?: number;
  tripleKnull?: boolean;
  message: string[];
} => {
  const msg: string[] = [];
  // Count last contiguous same-rank block (top of pile sets)
  // The pile is a concatenation of all sets in order.
  const ranks = pile.map(c => c.rank === 'JOKER' ? (c.asRank ?? '2') : c.rank);
  const n = ranks.length;
  let lastRank = n ? ranks[n-1] : null;
  let countSame = 0;
  for (let i = n-1; i >= 0; i--) {
    if (ranks[i] === lastRank) countSame++;
    else break;
  }

  const result:any = { message: msg };

  // Four of a kind (or more) => alla dricker
  if (countSame >= 4) {
    result.everyoneDrink = true;
    msg.push(`Fyrtal i ${lastRank}: alla dricker!`);
  }

  // KK (2 eller fler kungar) => drick och dela ut en klunk
  if (lastRank === 'K' && countSame >= 2) {
    result.kkGive = 1;
    msg.push(`KK spelades: läggaren dricker och delar ut en klunk.`);
  }

  // Trippelknull: 3 knektar eller fler
  if (lastRank === 'J' && countSame >= 3) {
    result.tripleKnull = true;
    msg.push(`Trippelknull (3 knektar+): drick!`);
  }

  // Quadrupellsex: 4 sexor eller fler => vattenfall, läggaren börjar
  if (lastRank === '6' && countSame >= 4) {
    result.waterfall = true;
    msg.push(`Quadrupellsex (4 sexor+): VATTENFALL!`);
  }

  // 7or tre eller fler => snurra flaskan (1 klunk)
  if (lastRank === '7' && countSame >= 3) {
    result.spinBottle = true;
    msg.push(`Tre 7or+: Snurra flaskan!`);
  }

  // Damer två eller fler => saxsektionen dricker
  if (lastRank === 'Q' && countSame >= 2) {
    result.saxSectionDrink = true;
    msg.push(`Två damer+: Saxsektionen dricker.`);
  }

  return result;
};

// Apply a move; returns messages and drinking events
export const applyMove = (gs: GameState, move: Move): { ok: boolean; errors?: string[] } => {
  if (gs.finished) return { ok: false, errors: ['Spelet är slut.'] };
  if (gs.turn !== move.playerId) return { ok: false, errors: ['Inte din tur.'] };

  const p = getPlayer(gs, move.playerId);
  // validate cards are in hand
  for (const c of move.cards) {
    if (!p.hand.find(h => h.id === c.id)) return { ok: false, errors: ['Kortet finns inte i handen.'] };
  }
  // 69 rule special: if set is exactly one 6 and one 9 (in any order), it can be played on everything, then next must beat 9. Everyone drinks.
  const clonePlayed = move.cards.map(c => ({...c}));
  const playedRanks = clonePlayed.map(c => c.rank === 'JOKER' ? (c.asRank ?? '2') : c.rank);
  const is69 = playedRanks.length === 2 && playedRanks.includes('6') && playedRanks.includes('9');
  const isTwoReset = playedRanks.length >= 1 && new Set(playedRanks).size === 1 && playedRanks[0] === '2';

  // Ordinary set must be same-rank
  const sameRank = new Set(playedRanks).size === 1 || is69;

  if (!sameRank) return { ok: false, errors: ['Måste lägga samma valör (eller 69).'] };

  // Must beat previous (unless pile empty or 2/69 resets)
  if (!is69 && !isTwoReset) {
    if (!compareSetHigher(gs.topRankForComparison, clonePlayed)) {
      return { ok: false, errors: ['Du måste lägga högre än tidigare.'] };
    }
  }

  // Remove from hand and push to pile
  p.hand = p.hand.filter(h => !clonePlayed.find(pc => pc.id === h.id));
  gs.pile.push({ cards: clonePlayed, by: p.id });

  const flatPile: Card[] = gs.pile.flatMap(pe => pe.cards);
  // Specials based on whole pile
  const specials = evaluateSpecials(flatPile);

  // Set next comparison threshold
  if (isTwoReset) {
    gs.topRankForComparison = '2';
    gs.messages.push(`${p.name} spelade reset (2or). Nästa måste slå 2.`);
  } else if (is69) {
    gs.topRankForComparison = '9';
    gs.messages.push(`${p.name} spelade 69! Alla dricker. Nästa måste slå 9.`);
  } else {
    gs.topRankForComparison = (clonePlayed[0].rank === 'JOKER' ? (clonePlayed[0].asRank ?? '2') : clonePlayed[0].rank);
  }

  // Log specials
  if (specials.message.length) gs.messages.push(...specials.message);

  // Advance turn
  gs.turn = nextPlayerId(gs);

  // Enforce 3+ in hand
  enforceMinHand(gs);

  return { ok: true };
};

// When a player cannot play: they pick up the pile and "drinks"
export const takePile = (gs: GameState, playerId: PlayerID) => {
  if (gs.turn !== playerId) return { ok: false, errors: ['Inte din tur.'] };
  const p = gs.players.find(x=>x.id===playerId)!;
  const pickup = gs.pile.flatMap(pe => pe.cards);
  p.hand.push(...pickup);
  gs.pile = [];
  gs.topRankForComparison = null;
  p.drank += 1;
  gs.messages.push(`${p.name} tog upp bordet och drack.`);
  gs.turn = gs.players[(gs.players.findIndex(x=>x.id===playerId)+1)%gs.players.length].id;
  enforceMinHand(gs);
  return { ok: true };
};