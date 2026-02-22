/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Hand as HandIcon, 
  Cpu, 
  Info,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Suit, Rank, Card, GameStatus, GameState, Difficulty } from './types';
import { createDeck, getSuitSymbol, getSuitColor, SUITS } from './constants';

const CARD_WIDTH = 100;
const CARD_HEIGHT = 140;

const DIFFICULTY_LABELS: Record<Difficulty, { label: string, color: string, desc: string }> = {
  EASY: { label: "简单", color: "bg-emerald-500", desc: "AI 会随意出牌" },
  MEDIUM: { label: "中等", color: "bg-amber-500", desc: "标准游戏体验" },
  HARD: { label: "困难", color: "bg-rose-500", desc: "AI 会深思熟虑" },
};

interface PlayingCardProps {
  card: Card;
  isFaceUp?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  className?: string;
  key?: React.Key;
}

const PlayingCard = ({ 
  card, 
  isFaceUp = true, 
  onClick, 
  isPlayable = false,
  className = ""
}: PlayingCardProps) => {
  const colorClass = getSuitColor(card.suit);
  const symbol = getSuitSymbol(card.suit);

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      whileHover={isPlayable ? { y: -10, scale: 1.05 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`relative rounded-xl shadow-lg cursor-pointer transition-shadow duration-200 overflow-hidden
        ${isFaceUp ? 'bg-white border-2 border-slate-200' : 'bg-indigo-700 border-2 border-indigo-400'}
        ${isPlayable ? 'ring-4 ring-emerald-400 shadow-emerald-200/50' : ''}
        ${className}`}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {isFaceUp ? (
        <div className={`h-full w-full p-2 flex flex-col justify-between ${colorClass}`}>
          <div className="flex flex-col items-start leading-none">
            <span className="text-xl font-bold">{card.rank}</span>
            <span className="text-lg">{symbol}</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <span className="text-6xl">{symbol}</span>
          </div>
          <div className="flex flex-col items-end leading-none rotate-180">
            <span className="text-xl font-bold">{card.rank}</span>
            <span className="text-lg">{symbol}</span>
          </div>
        </div>
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <div className="w-12 h-16 border-2 border-white/20 rounded-md flex items-center justify-center">
            <div className="w-8 h-10 border border-white/10 rounded-sm rotate-45" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    playerHand: [],
    aiHand: [],
    discardPile: [],
    currentTurn: "PLAYER",
    status: "START",
    winner: null,
    activeSuit: null,
    difficulty: "MEDIUM",
  });

  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("MEDIUM");
  const [message, setMessage] = useState<string>("欢迎来到疯狂 8 点！");
  const [aiThinkingTime, setAiThinkingTime] = useState<number>(0);

  // Initialize Game
  const initGame = useCallback((difficulty: Difficulty = "MEDIUM") => {
    const fullDeck = createDeck();
    const playerHand = fullDeck.splice(0, 8);
    const aiHand = fullDeck.splice(0, 8);
    
    // Initial discard cannot be an 8 for simplicity in starting
    let firstDiscardIndex = 0;
    while (fullDeck[firstDiscardIndex].rank === Rank.EIGHT) {
      firstDiscardIndex++;
    }
    const discardPile = [fullDeck.splice(firstDiscardIndex, 1)[0]];
    
    setGameState({
      deck: fullDeck,
      playerHand,
      aiHand,
      discardPile,
      currentTurn: "PLAYER",
      status: "PLAYING",
      winner: null,
      activeSuit: discardPile[0].suit,
      difficulty,
    });
    setAiThinkingTime(0);
    setMessage(`游戏开始！难度：${DIFFICULTY_LABELS[difficulty].label}`);
  }, []);

  const surrender = () => {
    setGameState(prev => ({
      ...prev,
      status: "GAME_OVER",
      winner: "AI",
    }));
    setMessage("你选择了放弃。");
  };

  const checkPlayable = (card: Card) => {
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    if (card.rank === Rank.EIGHT) return true;
    return card.suit === gameState.activeSuit || card.rank === topCard.rank;
  };

  const playCard = (card: Card, isPlayer: boolean) => {
    const newHand = isPlayer 
      ? gameState.playerHand.filter(c => c.id !== card.id)
      : gameState.aiHand.filter(c => c.id !== card.id);

    const newDiscardPile = [...gameState.discardPile, card];
    
    if (newHand.length === 0) {
      setGameState(prev => ({
        ...prev,
        playerHand: isPlayer ? [] : prev.playerHand,
        aiHand: isPlayer ? prev.aiHand : [],
        discardPile: newDiscardPile,
        status: "GAME_OVER",
        winner: isPlayer ? "PLAYER" : "AI",
      }));
      return;
    }

    if (card.rank === Rank.EIGHT) {
      setGameState(prev => ({
        ...prev,
        playerHand: isPlayer ? newHand : prev.playerHand,
        aiHand: isPlayer ? prev.aiHand : newHand,
        discardPile: newDiscardPile,
        status: isPlayer ? "WILD_SELECTION" : "PLAYING",
        activeSuit: isPlayer ? prev.activeSuit : null, // AI will set this immediately
      }));
      
      if (!isPlayer) {
        // AI logic for wild 8: pick the suit it has most of
        const suitCounts: Record<Suit, number> = {
          [Suit.HEARTS]: 0,
          [Suit.DIAMONDS]: 0,
          [Suit.CLUBS]: 0,
          [Suit.SPADES]: 0,
        };
        newHand.forEach(c => suitCounts[c.suit]++);
        let bestSuit = Suit.HEARTS;
        let maxCount = -1;
        SUITS.forEach(s => {
          if (suitCounts[s] > maxCount) {
            maxCount = suitCounts[s];
            bestSuit = s;
          }
        });
        
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            activeSuit: bestSuit,
            currentTurn: "PLAYER",
          }));
          setMessage(`AI played an 8 and changed suit to ${bestSuit}!`);
        }, 1000);
      }
    } else {
      setGameState(prev => ({
        ...prev,
        playerHand: isPlayer ? newHand : prev.playerHand,
        aiHand: isPlayer ? prev.aiHand : newHand,
        discardPile: newDiscardPile,
        activeSuit: card.suit,
        currentTurn: isPlayer ? "AI" : "PLAYER",
      }));
      setMessage(isPlayer ? "AI is thinking..." : "Your turn!");
    }
  };

  const drawCard = (isPlayer: boolean) => {
    if (gameState.deck.length === 0) {
      setMessage("Deck is empty! Skipping turn.");
      setGameState(prev => ({ ...prev, currentTurn: isPlayer ? "AI" : "PLAYER" }));
      return;
    }

    const newDeck = [...gameState.deck];
    const drawnCard = newDeck.pop()!;
    
    if (isPlayer) {
      setGameState(prev => ({
        ...prev,
        deck: newDeck,
        playerHand: [...prev.playerHand, drawnCard],
        currentTurn: checkPlayable(drawnCard) ? "PLAYER" : "AI"
      }));
      if (!checkPlayable(drawnCard)) {
        setMessage("Drawn card not playable. AI's turn.");
      } else {
        setMessage("You drew a playable card!");
      }
    } else {
      setGameState(prev => ({
        ...prev,
        deck: newDeck,
        aiHand: [...prev.aiHand, drawnCard],
        currentTurn: checkPlayable(drawnCard) ? "AI" : "PLAYER"
      }));
    }
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState.currentTurn === "AI" && gameState.status === "PLAYING") {
      setAiThinkingTime(0);
      const interval = setInterval(() => {
        setAiThinkingTime(prev => prev + 1);
      }, 1000);

      const timer = setTimeout(() => {
        const playableCards = gameState.aiHand.filter(checkPlayable);
        
        if (playableCards.length > 0) {
          let cardToPlay: Card;

          if (gameState.difficulty === "EASY") {
            // Easy: Just pick a random playable card
            cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
          } else if (gameState.difficulty === "MEDIUM") {
            // Medium: Prioritize non-8s
            const nonEight = playableCards.find(c => c.rank !== Rank.EIGHT);
            cardToPlay = nonEight || playableCards[0];
          } else {
            // Hard: Strategic
            const nonEights = playableCards.filter(c => c.rank !== Rank.EIGHT);
            if (nonEights.length > 0) {
              // Pick the card whose suit we have the most of (to keep options open)
              const suitCounts: Record<Suit, number> = {
                [Suit.HEARTS]: 0, [Suit.DIAMONDS]: 0, [Suit.CLUBS]: 0, [Suit.SPADES]: 0
              };
              gameState.aiHand.forEach(c => suitCounts[c.suit]++);
              
              cardToPlay = nonEights.reduce((prev, curr) => 
                suitCounts[curr.suit] > suitCounts[prev.suit] ? curr : prev
              );
            } else {
              // Only play an 8 if we have to
              cardToPlay = playableCards[0];
            }
          }
          
          playCard(cardToPlay, false);
        } else {
          drawCard(false);
        }
        clearInterval(interval);
      }, 1500);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else {
      setAiThinkingTime(0);
    }
  }, [gameState.currentTurn, gameState.status, gameState.difficulty]);

  const canSurrender = gameState.status === "PLAYING" && (
    aiThinkingTime >= 1 || (gameState.playerHand.length - gameState.aiHand.length > 2)
  );

  const selectWildSuit = (suit: Suit) => {
    setGameState(prev => ({
      ...prev,
      activeSuit: suit,
      status: "PLAYING",
      currentTurn: "AI",
    }));
    setMessage(`You changed the suit to ${suit}! AI's turn.`);
  };

  if (gameState.status === "START") {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <span className="text-white text-4xl font-black">8</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">疯狂 8 点</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            经典的纸牌游戏，匹配花色或点数。
            第一个清空手牌的人获胜！
          </p>

          <div className="space-y-3 mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left ml-1">选择难度</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all border-2 
                    ${selectedDifficulty === d 
                      ? `${DIFFICULTY_LABELS[d].color} text-white border-transparent shadow-md scale-105` 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                >
                  {DIFFICULTY_LABELS[d].label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 italic">
              {DIFFICULTY_LABELS[selectedDifficulty].desc}
            </p>
          </div>

          <button 
            onClick={() => initGame(selectedDifficulty)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            开始游戏 <ChevronRight size={20} />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-100 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-bold">8</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">CRAZY EIGHTS</h2>
        </div>
        
        <div className="flex items-center gap-6">
          <AnimatePresence>
            {canSurrender && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={surrender}
                className="px-4 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-sm font-bold hover:bg-rose-100 transition-colors flex items-center gap-2"
              >
                <AlertCircle size={14} /> 放弃
              </motion.button>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
            <Cpu size={16} className="text-slate-500" />
            <span className="text-sm font-bold">{gameState.aiHand.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
            <HandIcon size={16} className="text-slate-500" />
            <span className="text-sm font-bold">{gameState.playerHand.length}</span>
          </div>
          <button 
            onClick={initGame}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            title="Restart Game"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      {/* Game Area */}
      <main className="flex-1 relative flex flex-col items-center justify-between p-4 md:p-8 max-w-6xl mx-auto w-full">
        
        {/* AI Hand */}
        <div className="w-full flex justify-center py-4">
          <div className="flex -space-x-12 md:-space-x-16">
            {gameState.aiHand.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <PlayingCard card={card} isFaceUp={false} className="scale-75 md:scale-90" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Center: Deck and Discard Pile */}
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 my-8">
          {/* Deck */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-indigo-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div 
              className={`relative cursor-pointer transition-transform active:scale-95 ${gameState.currentTurn === 'PLAYER' ? 'hover:-translate-y-1' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => gameState.currentTurn === 'PLAYER' && drawCard(true)}
            >
              <div className="absolute top-1 left-1 w-full h-full bg-indigo-800 rounded-xl border-2 border-indigo-400"></div>
              <div className="absolute top-2 left-2 w-full h-full bg-indigo-900 rounded-xl border-2 border-indigo-400"></div>
              <PlayingCard 
                card={gameState.deck[0] || { suit: Suit.SPADES, rank: Rank.ACE, id: 'dummy' }} 
                isFaceUp={false} 
                className="relative z-10"
              />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-slate-400 uppercase tracking-widest">
                摸牌 ({gameState.deck.length})
              </div>
            </div>
          </div>

          {/* Discard Pile */}
          <div className="relative">
            <AnimatePresence mode="popLayout">
              {gameState.discardPile.slice(-3).map((card, i, arr) => (
                <motion.div
                  key={card.id}
                  initial={{ scale: 0.5, opacity: 0, rotate: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    rotate: (i - (arr.length - 1)) * 5,
                    x: (i - (arr.length - 1)) * 10
                  }}
                  className="absolute top-0 left-0"
                  style={{ zIndex: i }}
                >
                  <PlayingCard card={card} />
                </motion.div>
              ))}
            </AnimatePresence>
            <div style={{ width: CARD_WIDTH, height: CARD_HEIGHT }} className="invisible" />
            
            {/* Active Suit Indicator */}
            {gameState.activeSuit && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`absolute -top-12 -right-12 w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center border-4 border-slate-100 z-20 ${getSuitColor(gameState.activeSuit)}`}
              >
                <span className="text-3xl">{getSuitSymbol(gameState.activeSuit)}</span>
              </motion.div>
            )}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-slate-400 uppercase tracking-widest">
              弃牌
            </div>
          </div>
        </div>

        {/* Message Banner */}
        <div className="w-full max-w-md mx-auto mb-4">
          <motion.div 
            key={message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`px-4 py-3 rounded-xl border text-center font-medium shadow-sm flex items-center justify-center gap-2
              ${gameState.currentTurn === 'PLAYER' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}
          >
            {gameState.currentTurn === 'PLAYER' ? <Info size={18} /> : <Cpu size={18} />}
            {message}
          </motion.div>
        </div>

        {/* Player Hand */}
        <div className="w-full flex flex-col items-center gap-4 pb-8">
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 px-4">
            {gameState.playerHand.map((card) => (
              <PlayingCard 
                key={card.id} 
                card={card} 
                isPlayable={gameState.currentTurn === 'PLAYER' && gameState.status === 'PLAYING' && checkPlayable(card)}
                onClick={() => playCard(card, true)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Wild Selection Modal */}
      <AnimatePresence>
        {gameState.status === "WILD_SELECTION" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              <h3 className="text-2xl font-black mb-2">万能 8!</h3>
              <p className="text-slate-500 mb-8">请选择接下来的花色：</p>
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map((suit) => (
                  <button
                    key={suit}
                    onClick={() => selectWildSuit(suit)}
                    className={`p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-2 group ${getSuitColor(suit)}`}
                  >
                    <span className="text-4xl group-hover:scale-110 transition-transform">{getSuitSymbol(suit)}</span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">{suit}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState.status === "GAME_OVER" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border-t-8 border-indigo-600"
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl
                ${gameState.winner === 'PLAYER' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                {gameState.winner === 'PLAYER' ? <Trophy size={48} /> : <AlertCircle size={48} />}
              </div>
              
              <h2 className="text-4xl font-black mb-2 tracking-tight">
                {gameState.winner === 'PLAYER' ? "胜利！" : "失败"}
              </h2>
              <p className="text-slate-500 mb-10 leading-relaxed">
                {gameState.winner === 'PLAYER' 
                  ? "太棒了！你清空了手牌，战胜了 AI。" 
                  : "AI 技高一筹。别灰心，再来一局吧！"}
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => initGame(gameState.difficulty)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} /> 再来一局
                </button>
                <button 
                  onClick={() => setGameState(prev => ({ ...prev, status: 'START' }))}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all"
                >
                  返回主菜单
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-4">
          <span>规则：匹配花色或点数</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full" />
          <span>8 是万能牌</span>
        </div>
        <div>
          疯狂 8 点 v1.0
        </div>
      </footer>
    </div>
  );
}
