import { useMemo, useState } from "react";
import { Card, GameState, Rank } from "./types";
import { advanceTurn, applyPlay, effRank, newDeck, validatePlay } from "./game";
import NewCard from "./newCard";

const Playing: React.FC<{
  gs: GameState;
  setGs: React.Dispatch<React.SetStateAction<GameState>>;
}> = ({ gs, setGs }) => {
  const current = gs.players[gs.turn];

  const [selected, setSelected] = useState<number[]>([]);
  const toggle = (c: Card) => {
    if (gs.stage !== "playing") return;
    if (current.out) return;
    setSelected((s) =>
      s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]
    );
  };
  const setJokerRank = (cid: number, r: Exclude<Rank, "JOKER">) => {
    setGs((s) => {
      const copy = structuredClone(s);
      const card = copy.players[copy.turn].hand.find((c) => c.id === cid);
      if (card && card.rank === "JOKER") card.asRank = r;
      return copy;
    });
  };

  const playSelected = () => {
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
    setSelected([]);
  };

  const pickup = () => {
    setGs((s: GameState) => {
      if (s.stage !== "playing") return s;
      const copy = structuredClone(s);
      const cur = copy.players[copy.turn];
      cur.hand.push(...copy.pile);
      copy.pile = [];
      copy.compareRank = null;
      cur.drank += 1;
      copy.messages.unshift(`${cur.name} picked up the pile and drank.`);
      advanceTurn(copy);
      return copy;
    });
    setSelected([]);
  };

  const clearTable = () => {
    setGs((s) => {
      const copy = structuredClone(s);
      copy.pile = [];
      copy.compareRank = null;
      copy.messages.unshift(`Pile cleared (finished drink).`);
      return copy;
    });
  };

  // Assign a sip (for KK or spin-the-bottle). Simple prompt for now.
  const giveSip = () => {
    const target = prompt("Give 1 sip to which player? Enter name exactly.");
    if (!target) return;
    setGs((s) => {
      const copy = structuredClone(s);
      const p = copy.players.find((x) => x.name === target && !x.out);
      if (!p) {
        copy.messages.unshift(`❌ No active player named "${target}".`);
        return copy;
      }
      p.drank += 1;
      copy.messages.unshift(`${current.name} gave 1 sip to ${p.name}.`);
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
      copy.messages.unshift(`Bottle spun → ${target.name} drinks 1.`);
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
                {current?.hand && current.hand.length > 0
                  ? [...current.hand]
                      .sort((a, b) => {
                        const rankOrder = [
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
                          "2",
                          "JOKER",
                        ];
                        const aRankIdx = rankOrder.indexOf(a.rank);
                        const bRankIdx = rankOrder.indexOf(b.rank);
                        if (aRankIdx !== bRankIdx) return aRankIdx - bRankIdx;
                        if (a.suit && b.suit)
                          return a.suit.localeCompare(b.suit);
                        return 0;
                      })
                      .map((c) => (
                        <NewCard
                          key={c.id}
                          c={c}
                          selected={selected.includes(c.id)}
                          onClick={() => toggle(c)}
                          onRank={(r) => setJokerRank(c.id, r)}
                        />
                      ))
                  : null}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  className="btn"
                  onClick={playSelected}
                  disabled={selected.length === 0}
                >
                  Play selected
                </button>
                <button
                  className="btn secondary"
                  onClick={pickup}
                  disabled={!gs.pile || gs.pile.length === 0}
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
