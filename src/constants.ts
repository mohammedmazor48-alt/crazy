import { Suit, Rank, Card } from "./types";

export const SUITS = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
export const RANKS = [
  Rank.ACE,
  Rank.TWO,
  Rank.THREE,
  Rank.FOUR,
  Rank.FIVE,
  Rank.SIX,
  Rank.SEVEN,
  Rank.EIGHT,
  Rank.NINE,
  Rank.TEN,
  Rank.JACK,
  Rank.QUEEN,
  Rank.KING,
];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({ suit, rank, id: `${rank}-${suit}` });
    });
  });
  return shuffle(deck);
};

export const shuffle = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const getSuitSymbol = (suit: Suit) => {
  switch (suit) {
    case Suit.HEARTS: return "♥";
    case Suit.DIAMONDS: return "♦";
    case Suit.CLUBS: return "♣";
    case Suit.SPADES: return "♠";
  }
};

export const getSuitColor = (suit: Suit) => {
  return suit === Suit.HEARTS || suit === Suit.DIAMONDS ? "text-red-500" : "text-slate-900";
};
