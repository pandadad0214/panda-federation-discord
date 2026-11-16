#!/usr/bin/env node
/**
 * Register (or replace) the global /tools slash command.
 *
 * Usage:
 *   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node register-commands.mjs
 *
 * Reads credentials from the environment only. Never pass the token as a
 * command-line argument (it can end up in shell history).
 */

const APP_ID = process.env.DISCORD_APP_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !TOKEN) {
  console.error("Set DISCORD_APP_ID and DISCORD_BOT_TOKEN in the environment.");
  process.exit(1);
}

const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;

const commands = [
  {
    name: "tools",
    type: 1,
    description: "List Panda Federation public-data tool categories",
  },
];

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = text;
}

if (!res.ok) {
  console.error(`Register failed: HTTP ${res.status}`);
  console.error(typeof data === "string" ? data : JSON.stringify(data, null, 2));
  process.exit(1);
}

const names = Array.isArray(data) ? data.map((c) => `/${c.name}`).join(", ") : "(ok)";
console.log(`Registered global commands: ${names}`);
console.log("Global commands can take up to an hour to appear in every server; they are usually much faster.");
