#!/usr/bin/env node
/**
 * CoinMarketCap Exchange API Helper
 *
 * Usage:
 *   node cmc-exchange.mjs <command> [args...]
 *
 * Commands:
 *   listings           — All exchanges with market data
 *   info <slug>        — Exchange metadata
 *   volume <slug>      — Latest volume metrics
 *   pairs <slug>       — Trading pairs on an exchange
 *   assets <slug>      — Holdings/proof-of-reserves
 *   map                — Map exchange names to CMC IDs
 *
 * Requires: CMC_PRO_API_KEY environment variable
 * Zero npm dependencies — uses only global fetch().
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = "https://pro-api.coinmarketcap.com";
const API_KEY = process.env.CMC_PRO_API_KEY;

if (!API_KEY) {
  console.log(JSON.stringify({ error: "CMC_PRO_API_KEY not set. Get one at https://pro.coinmarketcap.com" }, null, 2));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function cmcFetch(path) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    headers: {
      "X-CMC_PRO_API_KEY": API_KEY,
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CoinMarketCap API error: HTTP ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdListings() {
  const data = await cmcFetch("/v1/exchange/listings/latest");
  return data;
}

async function cmdInfo(args) {
  const slug = args[0];
  if (!slug) throw new Error("Missing argument: <slug>. Usage: info <slug> (e.g., info binance)");

  const data = await cmcFetch(`/v1/exchange/info?slug=${encodeURIComponent(slug)}`);
  return { slug, data: data.data };
}

async function cmdVolume(args) {
  const slug = args[0];
  if (!slug) throw new Error("Missing argument: <slug>. Usage: volume <slug> (e.g., volume binance)");

  const data = await cmcFetch(`/v1/exchange/quotes/latest?slug=${encodeURIComponent(slug)}`);
  return { slug, data: data.data };
}

async function cmdPairs(args) {
  const slug = args[0];
  if (!slug) throw new Error("Missing argument: <slug>. Usage: pairs <slug> (e.g., pairs binance)");

  const data = await cmcFetch(`/v1/exchange/market-pairs/latest?slug=${encodeURIComponent(slug)}`);
  return { slug, data: data.data };
}

async function cmdAssets(args) {
  const slug = args[0];
  if (!slug) throw new Error("Missing argument: <slug>. Usage: assets <slug> (e.g., assets binance)");

  const data = await cmcFetch(`/v1/exchange/assets?slug=${encodeURIComponent(slug)}`);
  return { slug, data: data.data };
}

async function cmdMap() {
  const data = await cmcFetch("/v1/exchange/map");
  return data;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function showHelp() {
  return {
    usage: "node cmc-exchange.mjs <command> [args...]",
    commands: {
      "listings": "All exchanges ranked by 24h volume",
      "info <slug>": "Exchange metadata (e.g., info binance)",
      "volume <slug>": "Latest volume metrics (e.g., volume kraken)",
      "pairs <slug>": "Trading pairs on an exchange (e.g., pairs coinbase-exchange)",
      "assets <slug>": "Proof-of-reserves / holdings (e.g., assets binance)",
      "map": "Map exchange names to CoinMarketCap IDs",
    },
    common_slugs: {
      "Binance": "binance",
      "Coinbase": "coinbase-exchange",
      "Kraken": "kraken",
      "OKX": "okx",
      "Bybit": "bybit",
      "KuCoin": "kucoin",
    },
    env: {
      "CMC_PRO_API_KEY": "Required. API key from pro.coinmarketcap.com",
    },
  };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

const COMMANDS = {
  listings: cmdListings,
  info: cmdInfo,
  volume: cmdVolume,
  pairs: cmdPairs,
  assets: cmdAssets,
  map: cmdMap,
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "--help" || command === "-h") {
    console.log(JSON.stringify(showHelp(), null, 2));
    return;
  }

  if (!command || !COMMANDS[command]) {
    const available = Object.keys(COMMANDS).join(", ");
    console.log(JSON.stringify({
      error: `Unknown command: ${command || "(none)"}. Available: ${available}`,
      hint: "Run with --help for usage details",
    }, null, 2));
    process.exit(1);
  }

  const result = await COMMANDS[command](args.slice(1));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ error: e.message || String(e) }, null, 2));
  process.exit(1);
});
