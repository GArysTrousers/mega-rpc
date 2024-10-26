import { test } from "node:test";
import { equal, ok } from "node:assert"
import { RpcClient, RpcServer } from "../dist/index.js";
import { WebSocket } from "ws";
import { delay } from "../dist/utils.js";

// const server = new AuthServer()

// server.addClient("Test Relay", '12345')

// const relay = new AuthClient('ws://localhost:8080', '12345')

// await test("hello", async () => {
//   await server.authRequest("user", "password");

// })

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

const timeout = async (params) => {
  await delay(2000);
}

const procedures = [
  ["ping", ping],
  ["timeout", timeout]
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
  {timeoutLength: 1000}
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

await test("timeout", async () => {
  try {
    const res = await client.call('timeout', {});
    console.log("successfully failed:", res);
    ok(false);
  } catch (e) {
    equal("Reply Timed Out", e.message)
  }
})

client.close();
server.close();

