import React, { useState } from "react";
import { Card, GameState, Player } from "../../shared/types";
import Lobby from "./lobby";
import Ended from "./ended";
import Playing from "./playing";
import { newDeck } from "../../shared/game";
import { socket } from "./socket";
import { Socket } from "socket.io-client";

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
  const [playersHand, setPlayerHand] = useState<Card[]>([]);

  // Called from Lobby when starting a local or online game
  const start = (
    names: string[],
    jokers: number,
    online: boolean,
    socket?: Socket
  ) => {
    if (!online) {
      socket?.disconnect();
    }
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

  socket.on("state", (state: GameState) => {
    setGs(state);
    if (state.stage === "playing") {
      const player = state.players.find((p) => p.id === socket.id);
      if (player) setPlayerHand(player.hand);
    }
  });

  if (gs.stage === "lobby") {
    return (
      <div className="wrap">
        <Lobby
          start={(
            names: string[],
            jokers: number,
            online: boolean,
            socket?: Socket
          ) => start(names, jokers, online, socket ? socket : undefined)}
        />
      </div>
    );
  } else if (gs.stage === "ended") {
    return (
      <div className="wrap">
        <Ended gs={gs} setGs={setGs} />
      </div>
    );
  } else if (gs.stage === "playing") {
    return (
      <div className="wrap">
        <Playing gs={gs} setGs={setGs} playersHand={playersHand} />
      </div>
    );
  }
};

export default App;
