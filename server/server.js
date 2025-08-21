// server/server.js
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  validatePlay,
  applyPlay,
  advanceTurn,
  newDeck,
} from "../dist/shared/game.js";

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const rooms = new Map(); // roomId -> state

io.on("connection", (socket) => {
  // Host starts the game: deal cards, set up state, broadcast
  socket.on("start", ({ roomId, jokers }) => {
    const r = rooms.get(roomId);
    if (!r) {
      socket.emit("state", { error: "Room does not exist." });
      return;
    }
    if (r.host !== socket.id) {
      socket.emit("state", { error: "Only host can start the game." });
      return;
    }
    // Build deck and deal cards
    const deck = newDeck(jokers);
    const playerIds = Object.keys(r.players);
    const players = playerIds.map((id) => ({
      id,
      name: r.players[id].name,
      hand: [],
      drank: 0,
      out: false,
    }));
    // Deal 3 cards to each player
    for (let round = 0; round < 3; round++) {
      players.forEach((p) => {
        if (deck.length > 0) p.hand.push(deck.pop());
      });
    }
    const initialState = {
      stage: "playing",
      jokers,
      players,
      turn: 0,
      deck,
      pile: [],
      compareRank: null,
      messages: ["Game started!"],
      winners: [],
    };
    r.state = initialState;
    rooms.set(roomId, r);
    // Send filtered state to each player
    for (const pid of Object.keys(r.players)) {
      io.to(pid).emit("start", filteredStateForPlayer(initialState, pid));
    }
  });

  // Multiplayer game actions
  socket.on("play", (cards) => {
    // Find room and state
    let roomId, r;
    for (const [rid, room] of rooms) {
      if (room.players[socket.id]) {
        roomId = rid;
        r = room;
        break;
      }
    }
    console.log(
      `[PLAY] socket.id: ${socket.id}, roomId: ${roomId}, found room:`,
      !!r
    );
    if (!r || !r.state) {
      console.log(`[PLAY] No room or state for socket.id: ${socket.id}`);
      return;
    }
    const state = r.state;
    // Only allow if it's this player's turn
    console.log(
      `[PLAY] Current turn: ${state.turn}, player.id: ${
        state.players[state.turn].id
      }, socket.id: ${socket.id}`
    );
    if (state.players[state.turn].id !== socket.id) {
      console.log(`[PLAY] Not this player's turn.`);
      return;
    }

    // Find cards
    const cur = state.players[state.turn];
    console.log(
      `[PLAY] Player ${cur.name} attempting to play cards:`,
      cards,
      "Actual cards:",
      cards
    );
    const valid = validatePlay(state, cards);
    if (!valid.ok) {
      console.log(`[PLAY] Invalid play: ${valid.reason}`);
      return;
    }
    applyPlay(
      state,
      cards,
      () => {},
      () => {}
    );
    advanceTurn(state);
    r.state = state;
    rooms.set(roomId, r);
    console.log(
      `[PLAY] Play successful. Advancing turn to: ${state.turn}, next player: ${
        state.players[state.turn].name
      }`
    );
    // Notify all players
    for (const pid of Object.keys(r.players)) {
      io.to(pid).emit("state", filteredStateForPlayer(state, pid));
    }
  });

  socket.on("pickup", () => {
    let roomId, r;
    for (const [rid, room] of rooms) {
      if (room.players[socket.id]) {
        roomId = rid;
        r = room;
        break;
      }
    }
    if (!r || !r.state) return;
    const state = r.state;
    if (state.players[state.turn].id !== socket.id) return;
    const cur = state.players[state.turn];
    cur.hand.push(...state.pile);
    state.pile = [];
    state.compareRank = null;
    cur.drank += 1;
    state.messages.unshift(`${cur.name} picked up the pile and drank.`);
    advanceTurn(state);
    r.state = state;
    rooms.set(roomId, r);
    for (const pid of Object.keys(r.players)) {
      io.to(pid).emit("state", filteredStateForPlayer(state, pid));
    }
  });

  socket.on("clearTable", () => {
    let roomId, r;
    for (const [rid, room] of rooms) {
      if (room.players[socket.id]) {
        roomId = rid;
        r = room;
        break;
      }
    }
    if (!r || !r.state) return;
    const state = r.state;
    if (state.players[state.turn].id !== socket.id) return;
    state.pile = [];
    state.compareRank = null;
    state.messages.unshift(`Pile cleared (finished drink).`);
    r.state = state;
    rooms.set(roomId, r);
    for (const pid of Object.keys(r.players)) {
      io.to(pid).emit("state", filteredStateForPlayer(state, pid));
    }
  });

  socket.on("setJokerRank", ({ cardId, rank }) => {
    let roomId, r;
    for (const [rid, room] of rooms) {
      if (room.players[socket.id]) {
        roomId = rid;
        r = room;
        break;
      }
    }
    if (!r || !r.state) return;
    const state = r.state;
    if (state.players[state.turn].id !== socket.id) return;
    const cur = state.players[state.turn];
    const card = cur.hand.find((c) => c.id === cardId);
    if (card && card.rank === "JOKER") card.asRank = rank;
    r.state = state;
    rooms.set(roomId, r);
    for (const pid of Object.keys(r.players)) {
      io.to(pid).emit("state", filteredStateForPlayer(state, pid));
    }
  });

  // Helper: filter game state for a specific player
  function filteredStateForPlayer(state, playerId) {
    // Only hide other players' hands, but share pile, compareRank, messages, etc.
    return {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId ? p : { ...p, hand: Array(p.hand.length).fill({}) }
      ),
    };
  }

  socket.on("create", ({ roomId, name }, cb) => {
    if (rooms.has(roomId)) {
      cb && cb({ error: "Room already exists." });
      return;
    }
    socket.join(roomId);
    const r = { players: {}, host: socket.id, state: null };
    r.players[socket.id] = { id: socket.id, name, connected: true };
    rooms.set(roomId, r);
    io.to(roomId).emit("players", r.players);
    cb && cb({ ok: true });
  });

  socket.on("join", ({ roomId, name }, cb) => {
    const r = rooms.get(roomId);
    if (!r) {
      cb && cb({ error: "Room does not exist." });
      return;
    }
    if (r.state && r.state.stage === "playing") {
      cb && cb({ error: "Game already started." });
      return;
    }
    socket.join(roomId);
    r.players[socket.id] = { id: socket.id, name, connected: true };
    rooms.set(roomId, r);
    io.to(roomId).emit("players", r.players);
    cb && cb({ ok: true });
  });

  socket.on("leave", ({ roomId }) => {
    socket.leave(roomId);
    const r = rooms.get(roomId);
    if (!r) return;
    if (r.players[socket.id]) r.players[socket.id].connected = false;
    io.to(roomId).emit("players", r.players);
    // Remove disconnected after 10s
    setTimeout(() => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.players[socket.id] && !room.players[socket.id].connected) {
        delete room.players[socket.id];
        // Transfer host if needed
        if (room.host === socket.id) {
          const ids = Object.keys(room.players);
          room.host = ids.length > 0 ? ids[0] : null;
        }
        io.to(roomId).emit("players", room.players);
        // Remove room if empty
        if (Object.keys(room.players).length === 0) {
          rooms.delete(roomId);
        }
      }
    }, 10000);
  });

  socket.on("state", ({ roomId, state }, cb) => {
    const r = rooms.get(roomId);
    if (!r) {
      cb && cb({ error: "Room does not exist." });
      return;
    }
    if (r.host !== socket.id) {
      cb && cb({ error: "Only host can start the game." });
      return;
    }
    // Debug: log initial state and player hands
    console.log(`[STATE] Game starting in room ${roomId}`);
    state.players.forEach((p, i) => {
      console.log(
        `[STATE] Player ${i}: id=${p.id}, name=${p.name}, hand=${p.hand
          .map((c) => {
            c.suit, c.rank;
          })
          .join(",")}`
      );
    });
    r.state = state;
    rooms.set(roomId, r);
    // Send filtered state to each player
    for (const pid of Object.keys(r.players)) {
      io.to(pid).emit("state", filteredStateForPlayer(state, pid));
    }
    cb && cb({ ok: true });

    // Allow clients to request their filtered state
    socket.on("getState", ({ roomId }, cb) => {
      const r = rooms.get(roomId);
      if (!r || !r.state) {
        cb && cb({ error: "No game state." });
        return;
      }
      cb && cb({ state: filteredStateForPlayer(r.state, socket.id) });
    });
  });

  socket.on("disconnect", () => {
    for (const [roomId, r] of rooms) {
      if (r.players[socket.id]) {
        r.players[socket.id].connected = false;
        io.to(roomId).emit("players", r.players);
        // Remove disconnected after 10s
        setTimeout(() => {
          const room = rooms.get(roomId);
          if (!room) return;
          if (room.players[socket.id] && !room.players[socket.id].connected) {
            delete room.players[socket.id];
            // Transfer host if needed
            if (room.host === socket.id) {
              const ids = Object.keys(room.players);
              room.host = ids.length > 0 ? ids[0] : null;
            }
            io.to(roomId).emit("players", room.players);
            // Remove room if empty
            if (Object.keys(room.players).length === 0) {
              rooms.delete(roomId);
            }
          }
        }, 5000);
      }
    }
  });
});

app.get("/", (_req, res) => res.send("Bussfix server is running."));

const PORT = process.env.PORT || 5174;
httpServer.listen(PORT, () => console.log(`Server listening on ${PORT}`));
