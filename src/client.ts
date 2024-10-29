import { WebSocket } from "ws";
import { v4 as uuid } from "uuid";
import { delay } from "./utils";
import { Call, Reply, Rpc, RpcParamList } from "./types";

export type ClientOptions = {
  timeoutLength?: number;
  debug?: boolean;
}

const defaultOptions = {
  timeoutLength: 10000,
  debug: false,
}

export class RpcClient {
  ws: WebSocket;
  replies = new Map<string, Reply>();
  procedures: Map<string, Rpc>;

  // Options
  timeoutLength: number;
  debug: boolean;

  constructor(ws: WebSocket | string, procedures: [string, Rpc][], options: ClientOptions = {}) {
    this.procedures = new Map(procedures)
    if (typeof ws === 'string') this.ws = new WebSocket(ws)
    else this.ws = ws
    this.ws.on('error', console.error);
    this.ws.on('message', async (data: any) => {
      const message = JSON.parse(data.toString())

      if (message.type === 'call') {
        const call = message as Call
        if (this.debug) console.log("Call:", call);
        const reply: Reply = {
          id: call.id,
          type: 'reply',
          ok: true,
          data: null,
        }
        const rpc = this.procedures.get(call.func)
        if (rpc === undefined) {
          reply.ok = false
          reply.data = `No RPC found with name: ${call.func}`
        } else {
          try {
            reply.data = await rpc.call(this, call.params)
          } catch (e) {
            reply.ok = false
            if (e instanceof Error) {
              reply.data = e.message
            } else {
              reply.data = "Unknown Error"
            }
          }
        }
        this.ws.send(JSON.stringify(reply))

      }
      else if (message.type === 'reply') {
        if (this.debug) console.log("Reply:", message);
        this.replies.set(message.id, message)
      }
    });

    options = { ...defaultOptions, ...options }
    this.timeoutLength = options.timeoutLength;
    this.debug = options.debug;
  }

  call(procedure: string, params: RpcParamList) {
    return new Promise(async (resolve, reject) => {
      const message: Call = {
        id: uuid(),
        type: 'call',
        func: procedure,
        params,
      }
      this.ws.send(JSON.stringify(message))
      this.waitForReply(message.id).then(
        (v) => resolve(v),
        (v) => reject(v)
      )
    })
  }

  async waitForReply(id: string): Promise<Reply> {
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
          if (res.ok === false) {
            return reject(new Error(res.data))
          } else {
            return resolve(res.data);
          }
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