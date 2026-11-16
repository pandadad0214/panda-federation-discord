# Panda Federation Discord bot

A tiny [Cloudflare Worker](https://developers.cloudflare.com/workers/) that acts as a Discord **Interactions Endpoint**. There is no gateway connection and no always-on server.

It:

- Verifies Discord's Ed25519 request signatures (`PUBLIC_KEY`)
- Answers Discord's `PING` with `PONG` (required when you save the endpoint URL)
- Handles the `/tools` slash command with a short embed of Panda Federation tool categories

Live endpoint (Interactions Endpoint URL):

`https://panda-federation-discord.pandafederation.workers.dev`

This was built so the account that owns the Discord application can earn the [Active Developer](https://discord.com/developers/active-developer) badge. Someone has to use a slash command on an app you own at least once in the last 30 days, then you claim the badge on that page.

## Current status (16 November 2026)

This Worker is already deployed on the Panda Federation Cloudflare account. It is wired to the existing Discord application **Steel_Panda** (Application ID `1471578093540868127`):

- `PUBLIC_KEY` is set on the Worker
- The global `/tools` command is registered
- Discord's Interactions Endpoint URL is saved and passed Discord's signed `PING`

An unsigned POST to the endpoint returns HTTP 401 (`invalid request signature`).

`register-commands.mjs` still reads `DISCORD_APP_ID` and `DISCORD_BOT_TOKEN` from the environment only. Do not commit those values.

## What is left: invite, run `/tools`, claim the badge

### 1. Invite the bot and run `/tools`

Open this URL and add **Steel_Panda** to a server you can type in:

```
https://discord.com/oauth2/authorize?client_id=1471578093540868127&scope=bot%20applications.commands&permissions=0
```

Then run `/tools`. You should get an embed listing MCP servers, Apify Actors, and apps, with links to [pandafederation.com](https://pandafederation.com) and [github.com/pandadad0214](https://github.com/pandadad0214). Global commands can take up to an hour to appear in every server; they are usually much faster.

### 2. Claim the badge

After the command has been used, open [Active Developer](https://discord.com/developers/active-developer) and claim the badge on the Discord account that owns the app. Discord may take up to 24 hours to notice the first use.

### If you ever need to rotate credentials

```bash
npx wrangler secret put PUBLIC_KEY
npx wrangler deploy
export DISCORD_APP_ID="1471578093540868127"
export DISCORD_BOT_TOKEN="your-bot-token"
node register-commands.mjs
```

## Local development

```bash
npm install
npm test
npx wrangler dev
```

`wrangler.toml` does not include a real `PUBLIC_KEY`. For local pings against `wrangler dev`, put it in `.dev.vars` (gitignored):

```
PUBLIC_KEY=your-hex-public-key
```

## How signature checks work

Discord signs `timestamp + raw body` with Ed25519 and sends:

- `X-Signature-Ed25519`
- `X-Signature-Timestamp`

The Worker verifies that with the Web Crypto API (no `tweetnacl` dependency). Unsigned or stale (older than 5 minutes) requests get HTTP 401 and the body `invalid request signature`.

## Catalog copy

The `/tools` embed uses category and product names from the official site inventory (MCP servers, Apify Actor families, and apps/repos). It does not hard-code catalog counts, which change. Live counts stay on [pandafederation.com](https://pandafederation.com).
