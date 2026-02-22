import { Type } from "@google/genai";

export enum Suit {
  HEARTS = "HEARTS",
  DIAMONDS = "DIAMONDS",
  CLUBS = "CLUBS",
  SPADES = "SPADES",
}

export enum Rank {
  ACE = "A",
  TWO = "2",
  THREE = "3",
  FOUR = "4",
  FIVE = "5",
  SIX = "6",
  SEVEN = "7",
  EIGHT = "8",
  NINE = "9",
  TEN = "10",
  JACK = "J",
  QUEEN = "Q",
  KING = "K",
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export type GameStatus = "START" | "PLAYING" | "WILD_SELECTION" | "GAME_OVER";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface GameState {
  deck: Card[];
  playerHand: Card[];
  aiHand: Card[];
  discardPile: Card[];
  currentTurn: "PLAYER" | "AI";
  status: GameStatus;
  winner: "PLAYER" | "AI" | null;
  activeSuit: Suit | null; // For wild 8s
  difficulty: Difficulty;
}
