import { WebSocket } from "ws";
import { v4 as uuid } from "uuid";
import { delay } from "./utils";

export type ClientOptions = {
  timeoutLength?: number;
}

const defaultOptions = {
  timeoutLength: 10000,
}

export class RpcClient {
  ws: WebSocket;
  replies = new Map<string, string>();
  procedures: Map<string, Rpc>;

  // Options
  timeoutLength: number;

  constructor(ws: WebSocket, procedures: [string, Rpc][], options: ClientOptions = {}) {
    this.procedures = new Map(procedures)
    this.ws = ws
    this.ws.on('error', console.error);
    this.ws.on('message', async (data: any) => {
      const message = JSON.parse(data.toString())
      if (message.type === 'call') {
        const call = message as Call
        // console.log("Call:", call);
        const reply: Reply = {
          id: call.id,
          type: 'reply',
          data: await this.procedures.get(call.func)?.call(this, call.params)
        }
        ws.send(JSON.stringify(reply))
      }
      else if (message.type === 'reply') {
        // console.log("Reply:", message);
        this.replies.set(message.id, message.data)
      }
    });

    options = {...defaultOptions, ...options}
    this.timeoutLength = options.timeoutLength
  }

  call(procedure: string, params: RpcParamList) {
    return new Promise((resolve, reject) => {
      const message: Call = {
        id: uuid(),
        type: 'call',
        func: procedure,
        params,
      }
      this.ws.send(JSON.stringify(message))
      this.waitForReply(message.id)
        .catch((v) => reject(v))
        .then((v) => resolve(v))
    })
  }

  async waitForReply(id: string) {
    return new Promise(async (resolve, reject) => {
      // timeout - stops waiting for reply and cleans up
      let timeoutFired = false;
      const timeout = setTimeout(() => {
        timeoutFired = true;
      }, this.timeoutLength)

      // wait for reply
      while (true) {
        if (this.replies.has(id)) {
          clearTimeout(timeout)
          const res = this.replies.get(id)
          this.replies.delete(id)
          return resolve(res);
        } else if (timeoutFired) {
          return reject(new Error("Reply Timed Out"));
        } else {
          await delay()
        }
      }
    })
  }

  close() {
    this.replies.clear()
    this.ws.close()
  }
}