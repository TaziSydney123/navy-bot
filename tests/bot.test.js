console.log("halp")

const { group, test, command, beforeStart, afterAll, expect } = require("corde");
// You can also import const corde = require("corde"); This is a default export with all others
// functions.
const { client, loginBot } = require("../bot");

beforeStart(() => {
  loginBot();
});

group("main commands", () => {
  test("Ping command should return \"Pong!\"", () => {
    expect("ping").toReturn("Pong!");
  });
});

afterAll(() => {
  client.destroy();
});