#!/usr/bin/env node
/**
 * CoinMarketCap Market API Helper
 *
 * Usage:
 *   node cmc-market.mjs <command> [args...]
 *
 * Commands:
 *   global                        — Global market metrics
 *   fear-greed                    — Fear & Greed index
 *   cmc100                        — CMC100 index
 *   cmc20                         — CMC20 index
 *   trending-tokens               — Community trending tokens
 *   trending-topics               — Trending topics
 *   news                          — Latest news/articles
 *   candles <cmcId>               — OHLCV candlestick data
 *   convert <amount> <from> <to>  — Price conversion
 *   key-info                      — API key usage stats
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

async function cmdGlobal() {
  const data = await cmcFetch("/v1/global-metrics/quotes/latest");
  return data;
}

async function cmdFearGreed() {
  const data = await cmcFetch("/v3/fear-and-greed/latest");
  return data;
}

async function cmdCmc100() {
  const data = await cmcFetch("/v3/index/cmc100-latest");
  return data;
}

async function cmdCmc20() {
  const data = await cmcFetch("/v3/index/cmc20-latest");
  return data;
}

async function cmdTrendingTokens() {
  const data = await cmcFetch("/v1/community/trending/token");
  return data;
}

async function cmdTrendingTopics() {
  const data = await cmcFetch("/v1/community/trending/topic");
  return data;
}

async function cmdNews() {
  const data = await cmcFetch("/v1/content/latest");
  return data;
}

async function cmdCandles(args) {
  const cmcId = args[0];
  if (!cmcId) throw new Error("Missing argument: <cmcId>. Usage: candles <cmcId> (use cmc-api-crypto map to find ID)");

  const data = await cmcFetch(`/v1/k-line/candles?id=${encodeURIComponent(cmcId)}`);
  return { cmcId, data: data.data };
}

async function cmdConvert(args) {
  const [amount, from, to] = args;
  if (!amount || !from || !to) throw new Error("Missing arguments: <amount> <from> <to>. Usage: convert 1 BTC USD");

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) throw new Error(`Invalid amount: ${amount}. Must be a number.`);

  const data = await cmcFetch(
    `/v2/tools/price-conversion?amount=${numAmount}&symbol=${encodeURIComponent(from.toUpperCase())}&convert=${encodeURIComponent(to.toUpperCase())}`
  );
  return {
    amount: numAmount,
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    data: data.data,
  };
}

async function cmdKeyInfo() {
  const data = await cmcFetch("/v1/key/info");
  return data;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function showHelp() {
  return {
    usage: "node cmc-market.mjs <command> [args...]",
    commands: {
      "global": "Global cryptocurrency market metrics",
      "fear-greed": "Fear & Greed index (0-100)",
      "cmc100": "CMC Crypto 100 index",
      "cmc20": "CMC Crypto 20 index",
      "trending-tokens": "Community trending tokens",
      "trending-topics": "Trending community topics",
      "news": "Latest crypto news and articles",
      "candles <cmcId>": "OHLCV candlestick data (e.g., candles 1 for BTC)",
      "convert <amount> <from> <to>": "Price conversion (e.g., convert 1 BTC USD)",
      "key-info": "API key usage statistics",
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
  global: cmdGlobal,
  "fear-greed": cmdFearGreed,
  cmc100: cmdCmc100,
  cmc20: cmdCmc20,
  "trending-tokens": cmdTrendingTokens,
  "trending-topics": cmdTrendingTopics,
  news: cmdNews,
  candles: cmdCandles,
  convert: cmdConvert,
  "key-info": cmdKeyInfo,
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
