import React, { useState } from "react";
import { GameState, Player } from "./types";
import Lobby from "./lobby";
import Ended from "./ended";
import Playing from "./playing";
import { newDeck } from "./game";

const App: React.FC = () => {
  const [gs, setGs] = useState<GameState>({
    stage: "lobby",
    jokers: 2,
    players: [],
    turn: 0,
    deck: [],
    pile: [],
    compareRank: null,
    messages: [],
    winners: [],
  });

  const start = (names: string[], jokers: number) => {
    const deck = newDeck(jokers);
    const players: Player[] = names.map((n, i) => ({
      id: String(i + 1),
      name: n,
      hand: [],
      drank: 0,
      out: false,
    }));
    for (let r = 0; r < 3; r++)
      for (const p of players) p.hand.push(deck.pop()!);
    const next: GameState = {
      stage: "playing",
      jokers,
      players,
      turn: 0,
      deck,
      pile: [],
      compareRank: null,
      messages: [`Game started. ${players[0].name} begins.`],
      winners: [],
    };
    setGs(next);
  };

  if (gs.stage === "lobby") {
    console.log("Lobby stage, waiting for players to start.");
    return (
      <div className="wrap">
        <Lobby start={start} />
      </div>
    );
  } else if (gs.stage === "ended") {
    console.log("Game ended, showing results.");
    return (
      <div className="wrap">
        <Ended gs={gs} setGs={setGs} />
      </div>
    );
  } else if (gs.stage === "playing") {
    console.log("Playing stage, showing game state.");
    return (
      <div className="wrap">
        <Playing gs={gs} setGs={setGs} />
      </div>
    );
  }
};

export default App;
