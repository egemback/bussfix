// server/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const rooms = new Map(); // roomId -> state

io.on('connection', (socket) => {
  socket.on('join', ({ roomId, name }) => {
    socket.join(roomId);
    const r = rooms.get(roomId) || { players: {}, host: socket.id, state: null };
    r.players[socket.id] = { id: socket.id, name, connected: true };
    rooms.set(roomId, r);
    io.to(roomId).emit('players', r.players);
  });

  socket.on('leave', ({ roomId }) => {
    socket.leave(roomId);
    const r = rooms.get(roomId);
    if (!r) return;
    if (r.players[socket.id]) r.players[socket.id].connected = false;
    io.to(roomId).emit('players', r.players);
  });

  socket.on('state', ({ roomId, state }) => {
    // authoritative state broadcast from host (client-side sim for now)
    const r = rooms.get(roomId) || { players: {}, host: socket.id, state: null };
    r.state = state;
    rooms.set(roomId, r);
    socket.to(roomId).emit('state', state);
  });

  socket.on('disconnect', () => {
    for (const [roomId, r] of rooms) {
      if (r.players[socket.id]) {
        r.players[socket.id].connected = false;
        io.to(roomId).emit('players', r.players);
      }
    }
  });
});

app.get('/', (_req, res) => res.send('Superspel server is running.'));

const PORT = process.env.PORT || 5174;
httpServer.listen(PORT, () => console.log(`Server listening on ${PORT}`));