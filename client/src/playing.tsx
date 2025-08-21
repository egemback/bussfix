import { act, useMemo, useState } from "react";
import { socket } from "./socket";
import { useEffect } from "react";
import { Card, GameState, Player, Rank, RANKS } from "../../shared/types";
import {
  advanceTurn,
  applyPlay,
  effRank,
  validatePlay,
} from "../../shared/game";
import NewCard from "./newCard";

const Playing: React.FC<{
  gs: GameState;
  setGs: React.Dispatch<React.SetStateAction<GameState>>;
  playersHand: Card[];
}> = ({ gs, setGs, playersHand }) => {
  const current = gs.players[gs.turn];
  // Use array of card ids for selection
  const [selected, setSelected] = useState<number[]>([]);

  // Drink notification state
  const [drinkMsg, setDrinkMsg] = useState<string>("");

  // Detect online mode by presence of socket connection
  const isOnline = !!socket && socket.connected;

  // In online mode, use playerId to identify 'me'
  let isMyTurn = false;
  console.log("[DEBUG] Playing component", {
    isOnline,
    current: current?.name,
    turn: gs.turn,
  });
  isMyTurn = !!(gs.players[gs.turn] && !gs.players[gs.turn].out);

  useEffect(() => {
    if (!current) return;
    const lastMsg = gs.messages[0] || "";
    // Show drink message if log contains current player's name and 'drink', or if drank value increased
    let shouldDrink = false;
    if (
      (lastMsg.toLowerCase().includes("drink") &&
        lastMsg.includes(current.name)) ||
      lastMsg.includes("everyone drinks")
    ) {
      shouldDrink = true;
    }
    if (shouldDrink) {
      setDrinkMsg("DRINK! 🍻");
      const timer = setTimeout(() => setDrinkMsg(""), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [gs.messages, current?.drank]);

  const setJokerRank = (cid: number, r: Exclude<Rank, "JOKER">) => {
    if (!isMyTurn) return;
    if (isOnline) {
      socket.emit("setJokerRank", { cardId: cid, rank: r });
    } else {
      setGs((s) => {
        const copy = structuredClone(s);
        const card = copy.players[copy.turn].hand.find((c) => c.id === cid);
        if (card && card.rank === "JOKER") card.asRank = r;
        return copy;
      });
    }
  };

  const playSelected = () => {
    if (!isMyTurn) return;
    if (isOnline) {
      const cards = gs.players[gs.turn].hand
        .filter((c) => selected.includes(c.id))
        .map((c) => ({
          suit: c.suit,
          rank: c.rank,
          asRank: c.asRank,
          id: c.id,
        }));
      if (cards.length === 0) return;
      socket.emit("play", cards, (newState: GameState) => {
        console.log("[ONLINE] Play response:", newState);
        setGs(newState);
      });
    } else {
      setGs((s) => {
        if (s.stage !== "playing") return s;
        const copy = structuredClone(s);
        const cur = copy.players[copy.turn];
        const cards = cur.hand.filter((c) => selected.includes(c.id));
        const valid = validatePlay(copy, cards);
        if (!valid.ok) {
          copy.messages.unshift(`❌ ${valid.reason}`);
          return copy;
        }
        applyPlay(copy, cards, giveSip, spinBottle);
        advanceTurn(copy);
        return copy;
      });
    }
    setSelected([]);
    console.log("[DEBUG] Pile:", gs.pile);
  };

  const pickup = () => {
    if (!isMyTurn) return;
    if (isOnline) {
      socket.emit("pickup", (newState: GameState) => {
        console.log("[ONLINE] Pickup response:", newState);
        setGs(newState);
      });
    } else {
      setGs((s: GameState) => {
        if (s.stage !== "playing") return s;
        const copy = structuredClone(s);
        const cur = copy.players[copy.turn];
        cur.hand.push(...copy.pile);
        copy.pile = [];
        copy.compareRank = null;
        cur.drank += 1;
        copy.messages.unshift(`${cur.name} picks up the pile and drinks.`);
        advanceTurn(copy);
        return copy;
      });
    }
    setSelected([]);
  };

  const clearTable = () => {
    if (!isMyTurn) return;
    if (isOnline) {
      socket.emit("clearTable", (newState: GameState) => {
        console.log("[ONLINE] Clear table response:", newState);
        setGs(newState);
      });
    } else {
      setGs((s) => {
        const copy = structuredClone(s);
        copy.pile = [];
        copy.compareRank = null;
        copy.messages.unshift(`Pile cleared (finished drink).`);
        return copy;
      });
    }
  };

  const giveSip = () => {
    let target = prompt("Give 1 sip to which player? Enter name exactly.");
    let p: Player | undefined = undefined;
    if (!target) return;
    setGs((s) => {
      const copy = structuredClone(s);
      p = copy.players.find((x) => x.name === target && !x.out);
      while (!p) {
        target = prompt(
          `No active player named "${target}". Try again or leave empty to cancel.`
        );
        p = copy.players.find((x) => x.name === target && !x.out);
      }
      p.drank += 1;
      copy.messages.unshift(
        `KK - ${current.name} drinks and gives 1 sip to ${p.name}.`
      );
      advanceTurn(copy);
      return copy;
    });
  };

  const spinBottle = () => {
    setGs((s) => {
      const copy = structuredClone(s);
      const active = copy.players.filter((p) => !p.out);
      if (active.length === 0) return copy;
      const target = active[(Math.random() * active.length) | 0];
      target.drank += 1;
      copy.messages.unshift(`Bottle spun → ${target.name} drinks 1 sip.`);
      advanceTurn(copy);
      return copy;
    });
  };

  const topBlock = useMemo(() => {
    const er = gs.pile.map(effRank);
    if (er.length === 0) return { rank: null as any, count: 0 };
    const t = er[er.length - 1];
    let c = 0;
    for (let i = er.length - 1; i >= 0; i--) {
      if (er[i] === t) c++;
      else break;
    }
    return { rank: t, count: c };
  }, [gs.pile]);

  return (
    <div className="wrap">
      {drinkMsg && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(255, 200, 0, 0.85)",
            color: "#b10000",
            fontSize: "5rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            pointerEvents: "none",
            textShadow: "2px 2px 8px #fff, 2px 2px 12px #b10000",
            animation: "drink-pop 0.5s cubic-bezier(.68,-0.55,.27,1.55)",
          }}
        >
          {drinkMsg}
        </div>
      )}
      <div className="row">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 600px",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", margin: "auto" }}
          >
            <div className="card">
              <h1>Table</h1>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span className="badge">
                  Turn: <b>{current?.name ?? "-"}</b>
                </span>
                <span className="badge">
                  Needs to beat: <b>{gs.compareRank ?? "—"}</b>
                </span>
                <span className="badge">
                  Top block: <b>{topBlock.rank ?? "—"}</b> × {topBlock.count}
                </span>
                <button className="btn secondary" onClick={clearTable}>
                  Clear table
                </button>
              </div>
              <div className="table" style={{ marginTop: 12 }}>
                {gs.pile && gs.pile.length > 0 ? (
                  <NewCard
                    key={gs.pile[gs.pile.length - 1].id}
                    c={gs.pile[gs.pile.length - 1]}
                    selected={false}
                    onClick={() => {}}
                  />
                ) : (
                  <span style={{ color: "#888" }}>Pile is empty</span>
                )}
              </div>
            </div>
            <div
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                margin: "auto",
              }}
            >
              <h2>Your Hand</h2>
              <div className="hand">
                {isOnline
                  ? playersHand && playersHand.length > 0
                    ? playersHand.map((c) => (
                        <NewCard
                          key={c.id}
                          c={c}
                          selected={selected.includes(c.id)}
                          onClick={() => {
                            setSelected((prev) =>
                              prev.includes(c.id)
                                ? prev.filter((x) => x !== c.id)
                                : [...prev, c.id]
                            );
                          }}
                          onRank={(r) => setJokerRank(c.id, r)}
                        />
                      ))
                    : "No cards in hand"
                  : current?.hand && current.hand.length > 0
                  ? [...current.hand].map((c) => (
                      <NewCard
                        key={c.id}
                        c={c}
                        selected={selected.includes(c.id)}
                        onClick={() => {
                          setSelected((prev) =>
                            prev.includes(c.id)
                              ? prev.filter((x) => x !== c.id)
                              : [...prev, c.id]
                          );
                        }}
                        onRank={(r) => setJokerRank(c.id, r)}
                      />
                    ))
                  : null}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  className="btn"
                  onClick={playSelected}
                  disabled={selected.length === 0 || !isMyTurn}
                >
                  Play selected
                </button>
                <button
                  className="btn secondary"
                  onClick={pickup}
                  disabled={!gs.pile || gs.pile.length === 0 || !isMyTurn}
                >
                  Pick up & drink
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={{ width: 320 }}>
          <h2>Players</h2>
          <div className="grid">
            {gs.players.map((p, i) => (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: 10,
                  borderColor: i === gs.turn ? "#0ea5e9" : "#333",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <b>{p.name}</b>{" "}
                    {p.out && <span className="winner">(out / won)</span>}
                  </div>
                  <div className="badge">Hand: {p.hand.length}</div>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Drank: {p.drank}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: 12 }}>Log</h2>
          <div className="log">
            {gs.messages.map((m, i) => (
              <div key={i}>• {m}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playing;
