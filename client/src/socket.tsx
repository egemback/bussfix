import { io, Socket } from "socket.io-client";

const URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5174";
export const socket: Socket = io(URL, { autoConnect: false });
