import { GameState } from "./types";

const Ended: React.FC<{ gs: GameState; setGs: (gs: GameState) => void }> = ({
  gs,
  setGs,
}) => {
  return (
    <div className="wrap">
      <div className="card">
        <h1>Game Over</h1>
        <p>
          Winners:{" "}
          {gs.winners.length > 0
            ? gs.winners.join(", ")
            : "No winners (everyone out)."}
        </p>
        <button
          className="btn"
          onClick={() => setGs({ ...gs, stage: "lobby" })}
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
};

export default Ended;
