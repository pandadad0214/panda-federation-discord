# Panda Federation Discord bot

A tiny [Cloudflare Worker](https://developers.cloudflare.com/workers/) that acts as a Discord **Interactions Endpoint**. There is no gateway connection and no always-on server.

It:

- Verifies Discord's Ed25519 request signatures (`PUBLIC_KEY`)
- Answers Discord's `PING` with `PONG` (required when you save the endpoint URL)
- Handles the `/tools` slash command with a short embed of Panda Federation tool categories

Live endpoint (Interactions Endpoint URL):

`https://panda-federation-discord.pandafederation.workers.dev`

This was built so the account that owns the Discord application can earn the [Active Developer](https://discord.com/developers/active-developer) badge. Someone has to use a slash command on an app you own at least once in the last 30 days, then you claim the badge on that page.

## What you need from the Discord Developer Portal

Create the application yourself (we cannot log into Discord for you):

1. Open [Discord Applications](https://discord.com/developers/applications) and click **New Application**. A name like "Panda Federation Tools" is fine.
2. On **General Information**, copy the **Application ID** and the **Public Key**.
3. Open the **Bot** tab, click **Reset Token** / **Add Bot** if needed, and copy the **bot token**. Turn off unused Privileged Gateway Intents; this bot does not use the gateway.
4. Send the Application ID, Public Key, and bot token through a private channel (not a public repo, group chat, or screenshot). After that, we can finish the steps below. If you prefer to do them yourself, keep going.

Do not commit these values. `register-commands.mjs` reads `DISCORD_APP_ID` and `DISCORD_BOT_TOKEN` from the environment only.

## Finish setup once the credentials exist

### 1. Put the Public Key on the Worker

```bash
npx wrangler secret put PUBLIC_KEY
```

Paste the Public Key when prompted, then redeploy if the CLI does not already:

```bash
npx wrangler deploy
```

Until the real Public Key is set, Discord's own PING will fail signature checks (the placeholder key only exists so unsigned test POSTs return 401).

### 2. Register the `/tools` command

```bash
export DISCORD_APP_ID="your-application-id"
export DISCORD_BOT_TOKEN="your-bot-token"
node register-commands.mjs
```

This `PUT`s a single global chat-input command named `tools`. Global commands can take up to an hour to appear in every server; they are usually much faster.

### 3. Paste the Interactions Endpoint URL

In the Discord app's **General Information**, set **Interactions Endpoint URL** to:

`https://panda-federation-discord.pandafederation.workers.dev`

Discord will immediately send a signed `PING`. It only saves the URL if the Worker returns a `PONG`. That only works after step 1.

### 4. Invite the bot and run `/tools`

Open this URL, replacing `APP_ID` with the Application ID:

```
https://discord.com/oauth2/authorize?client_id=APP_ID&scope=bot%20applications.commands&permissions=0
```

Add it to a server you can type in, then run `/tools`. You should get an embed listing MCP servers, Apify Actors, and apps, with links to [pandafederation.com](https://pandafederation.com) and [github.com/pandadad0214](https://github.com/pandadad0214).

### 5. Claim the badge

After the command has been used, open [Active Developer](https://discord.com/developers/active-developer) and claim the badge. Discord may take up to 24 hours to notice the first use.

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
