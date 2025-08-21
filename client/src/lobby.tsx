import { useState } from "react";
import { socket } from "./socket";
import { GameState } from "../../shared/types";
import { Socket } from "socket.io-client";

const Lobby: React.FC<{
  start: (
    names: string[],
    jokers: number,
    online: boolean,
    socket?: Socket
  ) => void;
}> = ({ start }) => {
  const [error, setError] = useState<string>("");
  const [mode, setMode] = useState<"local" | "online">("local");
  const [names, setNames] = useState<string[]>(["Player 1", "Player 2"]);
  const [jokers, setJokers] = useState(2);
  const [room, setRoom] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [onlineState, setOnlineState] = useState<{
    joined: boolean;
    host: boolean;
    players: { id: string; name: string; connected: boolean }[];
  }>({ joined: false, host: false, players: [] });
  const [waiting, setWaiting] = useState(false);
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
  const canOnline = room.length > 0 && playerName.length > 0;

  const handleCreateOrJoin = (action: "create" | "join") => {
    socket.connect();
    setError("");
    if (!socket) {
      setWaiting(true);
      setOnlineState({
        joined: true,
        host: action === "create",
        players: [{ id: "me", name: playerName, connected: true }],
      });
      return;
    }

    if (action === "create") {
      socket.emit("create", { roomId: room, name: playerName }, (res: any) => {
        if (res && res.error) {
          setError(res.error);
          return;
        }
        setWaiting(true);
        setOnlineState((s) => ({ ...s, joined: true, host: true }));
      });
    } else {
      socket.emit("join", { roomId: room, name: playerName }, (res: any) => {
        if (res && res.error) {
          setError(res.error);
          return;
        }
        setWaiting(true);
        setOnlineState((s) => ({ ...s, joined: true, host: false }));
      });
    }

    socket.on("players", (playersObj: any) => {
      const players = Object.values(playersObj) as {
        id: string;
        name: string;
        connected: boolean;
      }[];
      setOnlineState((s) => ({ ...s, players }));
    });

    socket.on("start", (state: GameState) => {
      console.log("[DEBUG] Game started", state);
      start(
        state.players.map((p) => p.name),
        state.jokers,
        true,
        socket
      );
    });
  };

  const handleStartOnline = () => {
    if (!socket) return;
    // Only send the number of jokers to the server, let it handle dealing
    socket.emit("start", { roomId: room, jokers });
  };

  return (
    <div className="card">
      <h1>Bussfix</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <button
          className={"btn" + (mode === "local" ? "" : " secondary")}
          onClick={() => setMode("local")}
        >
          Local
        </button>
        <button
          className={"btn" + (mode === "online" ? "" : " secondary")}
          onClick={() => setMode("online")}
        >
          Online
        </button>
      </div>
      {error && <div style={{ color: "#d00", marginBottom: 8 }}>{error}</div>}
      {mode === "local" ? (
        <>
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
              onClick={() => start(names, jokers, false, socket)}
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
                    // Prevent duplicate names
                    const newName = e.target.value;
                    if (a.includes(newName) && newName !== n) {
                      setError("Duplicate player names are not allowed.");
                      return;
                    }
                    a[i] = newName;
                    setNames(a);
                    setError("");
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
          <button
            className="btn ghost"
            onClick={add}
            disabled={names.length >= 6}
          >
            + Add player
          </button>
        </>
      ) : (
        <>
          {!onlineState.joined ? (
            <>
              <p className="muted">
                Online game. Enter a room name and your player name.
              </p>
              <div className="row" style={{ alignItems: "center", gap: 12 }}>
                <label>
                  Room:
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Room name"
                    style={{ marginLeft: 8 }}
                  />
                </label>
                <label>
                  Name:
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Your name"
                    style={{ marginLeft: 8 }}
                  />
                </label>
                <button
                  className="btn"
                  disabled={!canOnline}
                  onClick={() => handleCreateOrJoin("create")}
                >
                  Create room
                </button>
                <button
                  className="btn secondary"
                  disabled={!canOnline}
                  onClick={() => handleCreateOrJoin("join")}
                >
                  Join room
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Waiting Room: {room}</h2>
              <div className="grid">
                {onlineState.players.map((p) => (
                  <div key={p.id} className="card" style={{ padding: 10 }}>
                    <b>{p.name}</b>
                    {p.connected ? (
                      ""
                    ) : (
                      <span className="muted"> (disconnected)</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                {onlineState.players.length >= 2 && onlineState.host && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <label>
                      Jokers:
                      <input
                        type="number"
                        min={2}
                        max={5}
                        value={jokers}
                        onChange={(e) =>
                          setJokers(parseInt(e.target.value || "2"))
                        }
                        style={{ marginLeft: 8 }}
                      />
                    </label>
                    <button className="btn" onClick={handleStartOnline}>
                      Start game
                    </button>
                  </div>
                )}
                <span className="muted">Waiting for more players...</span>
              </div>
            </>
          )}
        </>
      )}
      <div style={{ marginTop: 16 }} className="muted">
        Created for <b>PQ</b> and their friend orchestras in <b>SMASK</b> and{" "}
        <b>Risk‑SMASK</b>.
      </div>
    </div>
  );
};

export default Lobby;
