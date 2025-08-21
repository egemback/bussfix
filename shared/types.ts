// Canonical rank and suit orderings
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
export const SUITS: Exclude<Suit, "joker">[] = [
  "hearts",
  "diamonds",
  "clubs",
  "spades",
];
export type Suit = "hearts" | "diamonds" | "clubs" | "spades" | "joker";
export type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "10"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2"
  | "JOKER";

export interface Card {
  id: number;
  suit: Suit;
  rank: Rank;
  asRank?: Exclude<Rank, "JOKER">;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  drank: number;
  out: boolean;
}

export interface GameState {
  stage: "lobby" | "playing" | "ended";
  jokers: number;
  players: Player[];
  turn: number; // index in players array
  deck: Card[];
  pile: Card[];
  compareRank: Exclude<Rank, "JOKER"> | null;
  messages: string[];
  winners: string[];
}
