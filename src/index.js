/**
 * Discord Interactions endpoint for Panda Federation.
 * Verifies Ed25519 request signatures, answers PING, and handles /tools.
 * No gateway, no long-lived server.
 */

const INTERACTION_PING = 1;
const INTERACTION_APPLICATION_COMMAND = 2;
const RESPONSE_PONG = 1;
const RESPONSE_CHANNEL_MESSAGE = 4;

const SITE = "https://pandafederation.com";
const GITHUB = "https://github.com/pandadad0214";

// Catalog facts from /workspace/pf-site inventory (generated 2026-11-10, America/Phoenix).
// Names and categories only — counts change and live on the site.
const TOOLS_EMBED = {
  title: "Panda Federation tools",
  description:
    "Free and low-cost public-data tools for leads, public funding, research, and web security.",
  url: SITE,
  color: 0x1f6feb,
  fields: [
    {
      name: "MCP servers",
      value:
        "Panda Research Tools, Panda Public Funding Tools, Panda Leads Tools, Panda Web Security Tools, the umbrella package, and Quiet File Team MCP.",
    },
    {
      name: "Apify Actors",
      value:
        "Public-data Actors for research, federal funding, official lead lists, and site safety.",
    },
    {
      name: "Apps & repos",
      value:
        "Steel Panda, Watchdog Panda, Hidden AI Instructions Watch, Manual Remake, Quiet File Team, Panda Federation H.Q., and Spirit Panda.",
    },
    {
      name: "Links",
      value: `[Catalog](${SITE}) · [GitHub](${GITHUB})`,
    },
  ],
  footer: { text: "Live catalog and counts: pandafederation.com" },
};

export function hexToBytes(hex) {
  if (typeof hex !== "string") return null;
  const clean = hex.trim();
  if (!clean || clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function verifyDiscordRequest(request, body, publicKeyHex) {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  if (!signature || !timestamp || !publicKeyHex) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const sig = hexToBytes(signature);
  const keyBytes = hexToBytes(publicKeyHex);
  if (!sig || !keyBytes || keyBytes.length !== 32) return false;

  try {
    const key = await crypto.subtle.importKey("raw", keyBytes, "Ed25519", false, ["verify"]);
    const message = new TextEncoder().encode(timestamp + body);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, sig, message);
  } catch {
    return false;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function handleInteraction(interaction) {
  if (interaction.type === INTERACTION_PING) {
    return json({ type: RESPONSE_PONG });
  }

  if (interaction.type === INTERACTION_APPLICATION_COMMAND) {
    const name = interaction.data?.name;
    if (name === "tools") {
      return json({
        type: RESPONSE_CHANNEL_MESSAGE,
        data: { embeds: [TOOLS_EMBED] },
      });
    }
    return json({
      type: RESPONSE_CHANNEL_MESSAGE,
      data: { content: "Unknown command." },
    });
  }

  return new Response("Unsupported interaction type", { status: 400 });
}

export default {
  async fetch(request, env) {
    if (request.method === "GET" || request.method === "HEAD") {
      return new Response("Panda Federation Discord interactions endpoint\n", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed\n", {
        status: 405,
        headers: { Allow: "GET, HEAD, POST" },
      });
    }

    const body = await request.text();
    const ok = await verifyDiscordRequest(request, body, env.PUBLIC_KEY);
    if (!ok) {
      return new Response("invalid request signature", { status: 401 });
    }

    let interaction;
    try {
      interaction = JSON.parse(body);
    } catch {
      return new Response("invalid request signature", { status: 401 });
    }

    return handleInteraction(interaction);
  },
};
