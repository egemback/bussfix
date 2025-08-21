import { useState } from "react";

const Lobby: React.FC<{ start: (names: string[], jokers: number) => void }> = ({
  start,
}) => {
  const [names, setNames] = useState<string[]>(["Player 1", "Player 2"]);
  const [jokers, setJokers] = useState(2);
  const add = () => {
    if (names.length < 6) setNames([...names, `Player ${names.length + 1}`]);
  };
  const remove = (i: number) => {
    const a = [...names];
    a.splice(i, 1);
    setNames(a);
  };
  const canStart =
    names.length >= 2 && names.length <= 6 && jokers >= 2 && jokers <= 5;
  return (
    <div className="card">
      <h1>Bussfix</h1>
      <p className="muted">
        Local pass‑and‑play. 2–6 players. Choose 2–5 jokers.
      </p>
      <div className="row" style={{ alignItems: "center" }}>
        <label>
          Jokers:{" "}
          <input
            type="number"
            min={2}
            max={5}
            value={jokers}
            onChange={(e) => setJokers(parseInt(e.target.value || "2"))}
          />
        </label>
        <button
          className="btn"
          disabled={!canStart}
          onClick={() => start(names, jokers)}
        >
          Start game
        </button>
      </div>
      <h2>Players</h2>
      <div className="grid">
        {names.map((n, i) => (
          <div key={i} className="card" style={{ padding: 10 }}>
            <input
              value={n}
              onChange={(e) => {
                const a = [...names];
                a[i] = e.target.value;
                setNames(a);
              }}
            />
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                className="btn secondary"
                onClick={() => remove(i)}
                disabled={names.length <= 2}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="btn ghost" onClick={add} disabled={names.length >= 6}>
        + Add player
      </button>
      <div style={{ marginTop: 16 }} className="muted">
        Created for <b>PQ</b> and their friend orchestras in <b>SMASK</b> and{" "}
        <b>Risk‑SMASK</b>.
      </div>
    </div>
  );
};

export default Lobby;
