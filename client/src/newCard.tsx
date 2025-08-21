import { suitSymbol } from "../../shared/game";
import { Card, Rank } from "../../shared/types";

const NewCard: React.FC<{
  c: Card;
  selected: boolean;
  onClick: () => void;
  onRank?: (r: Exclude<Rank, "JOKER">) => void;
}> = ({ c, selected, onClick, onRank }) => {
  const red = c.suit === "hearts" || c.suit === "diamonds";
  return (
    <div
      className={
        "playing-card " +
        (red ? "red " : "") +
        (c.rank === "JOKER" ? "joker " : "") +
        (selected ? "selected" : "")
      }
      onClick={onClick}
      title={c.rank}
      style={{
        position: "relative",
        color: red ? "#d00" : "#222",
        border: selected ? "3px solid #0ea5e9" : undefined,
        boxShadow: selected ? "0 0 0 4px #0ea5e988" : undefined,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 6,
          fontSize: 18,
          fontWeight: "bold",
        }}
      >
        {c.rank === "JOKER" ? "" : c.rank}
        <br />
        {c.rank === "JOKER" ? "" : suitSymbol(c.suit)}
      </div>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 22,
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        {c.rank === "JOKER" ? c.asRank ?? "?" : suitSymbol(c.suit)}
        {c.rank === "JOKER" && selected ? (
          <div
            style={{
              position: "relative",
              top: 8,
              background: "#0b1220",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: 6,
              zIndex: 2,
              minWidth: 80,
              marginTop: 8,
              display: "inline-block",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <select
              value={c.asRank ?? ""}
              onChange={(e) => onRank && onRank(e.target.value as any)}
            >
              <option value="">?</option>
              {[
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
              ].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          right: 8,
          bottom: 6,
          fontSize: 18,
          fontWeight: "bold",
        }}
      >
        {c.rank === "JOKER" ? "" : c.rank}
        <br />
        {c.rank === "JOKER" ? "" : suitSymbol(c.suit)}
      </div>
    </div>
  );
};

export default NewCard;
