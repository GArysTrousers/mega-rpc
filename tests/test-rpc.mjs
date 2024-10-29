import { test } from "node:test";
import { equal, ok } from "node:assert"
import { RpcClient, RpcServer } from "../dist/index.js";
import { WebSocket } from "ws";
import { delay } from "../dist/utils.js";

const users = [
  { username: "qwe", password: "pass", name: "John", age: 28 },
  { username: "asd", password: "pass", name: "John", age: 28 },
  { username: "zxc", password: "pass", name: "John", age: 28 },
];

const ping = (params) => {
  return 'pong';
}

const auth = (params) => {
  const { username, password } = params;
  const user = users.find((v) => (username == v.username && password == v.password));
  if (user) return user;
  return false;
}

const throwError = async (params) => {
  throw new Error("This is an error")
}

const timeout = async (params) => {
  await delay(2000);
}



const procedures = [
  ["ping", ping],
  ["timeout", timeout],
  ["throwError", throwError]
];

const serverProcs = [

];
const clientProcs = [
  ['auth', auth]
];

const server = new RpcServer(8080, [...procedures, ...serverProcs]);

const client = new RpcClient(
  new WebSocket('ws://localhost:8080'), 
  [...procedures, ...clientProcs],
  {
    timeoutLength: 1000,
    debug: true,
  }
);


await test("connect", async () => {
  await new Promise((resolve) => {
    client.ws.onopen = async () => {
      resolve();
    }
  });
  equal(server.clients.length, 1);
})

await test("ping pong", async () => {
  const res = await client.call('ping', {});
  ok(res === "pong");
})

await test("pong ping", async () => {
  const res = await server.clients[0].call('ping', {});
  ok(res === "pong");
})

await test("auth", async () => {
  const res = await server.clients[0].call('auth', { username: "asd", password: "pass" })
  equal(res.name, "John");
})

await test("error thrown", async () => {
  try {
    await client.call('throwError', {});
    ok(false);
  } catch (e) {
    equal("This is an error", e.message)
  }
})

await test("timeout", async () => {
  try {
    await client.call('timeout', {});
    ok(false);
  } catch (e) {
    equal("Reply Timed Out", e.message)
  }
})

await test("missing rpc", async () => {
  try {
    await client.call('noSuchThing', {});
    ok(false);
  } catch (e) {
    equal("No RPC found with name: noSuchThing", e.message)
  }
})

client.close();
server.close();

