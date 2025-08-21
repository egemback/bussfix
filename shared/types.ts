// shared/types.ts
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type Rank =
  | 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2' | 'JOKER';

export interface Card {
  id: string;      // unique id
  suit: Suit;
  rank: Rank;
  // If joker: what it currently represents (rank only, suit-agnostic)
  asRank?: Exclude<Rank, 'JOKER'>;
}

export type PlayerID = string;

export interface PlayerState {
  id: PlayerID;
  name: string;
  hand: Card[];
  drank: number; // number of sips taken (for UI/stats only)
  connected?: boolean;
}

export interface Move {
  playerId: PlayerID;
  cards: Card[]; // the cards being played (can include jokers with chosen asRank)
}

export interface PileEntry {
  cards: Card[]; // set played this turn (could be 1..4+)
  by: PlayerID;
}

export interface GameOptions {
  numJokers: number; // 2..5
  maxPlayers: number; // 2..6
}

export interface GameState {
  id: string;
  players: PlayerState[];
  turn: PlayerID; // whose turn
  deck: Card[];
  discard: Card[];
  pile: PileEntry[]; // chronological
  topRankForComparison: Rank | null; // rank threshold to beat; null means any
  started: boolean;
  finished: boolean;
  winner?: PlayerID;
  options: GameOptions;
  messages: string[]; // event log
}