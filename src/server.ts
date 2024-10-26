import { WebSocket, WebSocketServer } from "ws";
import { RpcClient } from "./client";
import { Rpc } from "./types";

export class RpcServer {
  replies = new Map<string, string>();
  clients: RpcClient[] = [];
  wss: WebSocketServer;

  constructor(port: number, procedures: [string, Rpc][]) {
    this.wss = new WebSocketServer({ port })
    this.wss.on('listening', () => {
      console.log("Server Started");
    })
    this.wss.on('connection', (ws: WebSocket) => {
      ws.on('close', () => {
        this.clients.filter((v) => v.ws != ws)
      })
      this.clients.push(new RpcClient(ws, procedures))
    })
  }

  close() {
    for (let i = 0; i < this.clients.length; i++) {
      this.clients[i].close();
    }
    this.wss.close()
  }
}