#!/usr/bin/env node
/**
 * CoinMarketCap Cryptocurrency API Helper
 *
 * Usage:
 *   node cmc-crypto.mjs <command> [args...]
 *
 * Commands:
 *   quote <symbol>    — Latest price quote
 *   info <symbol>     — Cryptocurrency metadata
 *   listings          — Top listings by market cap
 *   trending          — Currently trending coins
 *   gainers           — Top gainers/losers
 *   ohlcv <symbol>    — Historical OHLCV data
 *   categories        — List all categories
 *   map <symbol>      — Map symbol to CMC ID
 *   new               — Newly added cryptocurrencies
 *   pairs <symbol>    — Market pairs for a coin
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

async function cmdQuote(args) {
  const symbol = args[0];
  if (!symbol) throw new Error("Missing argument: <symbol>. Usage: quote <symbol>");

  const data = await cmcFetch(`/v2/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbol.toUpperCase())}`);
  return { symbol: symbol.toUpperCase(), data: data.data };
}

async function cmdInfo(args) {
  const symbol = args[0];
  if (!symbol) throw new Error("Missing argument: <symbol>. Usage: info <symbol>");

  const data = await cmcFetch(`/v2/cryptocurrency/info?symbol=${encodeURIComponent(symbol.toUpperCase())}`);
  return { symbol: symbol.toUpperCase(), data: data.data };
}

async function cmdListings() {
  const data = await cmcFetch("/v1/cryptocurrency/listings/latest?limit=100");
  return {
    total: data.data ? data.data.length : 0,
    data: data.data,
  };
}

async function cmdTrending() {
  const data = await cmcFetch("/v1/cryptocurrency/trending/latest");
  return data;
}

async function cmdGainers() {
  const data = await cmcFetch("/v1/cryptocurrency/trending/gainers-losers");
  return data;
}

async function cmdOhlcv(args) {
  const symbol = args[0];
  if (!symbol) throw new Error("Missing argument: <symbol>. Usage: ohlcv <symbol>");

  const data = await cmcFetch(`/v2/cryptocurrency/ohlcv/latest?symbol=${encodeURIComponent(symbol.toUpperCase())}`);
  return { symbol: symbol.toUpperCase(), data: data.data };
}

async function cmdCategories() {
  const data = await cmcFetch("/v1/cryptocurrency/categories");
  return data;
}

async function cmdMap(args) {
  const symbol = args[0];
  if (!symbol) throw new Error("Missing argument: <symbol>. Usage: map <symbol>");

  const data = await cmcFetch(`/v1/cryptocurrency/map?symbol=${encodeURIComponent(symbol.toUpperCase())}`);
  return { symbol: symbol.toUpperCase(), data: data.data };
}

async function cmdNew() {
  const data = await cmcFetch("/v1/cryptocurrency/listings/new");
  return data;
}

async function cmdPairs(args) {
  const symbol = args[0];
  if (!symbol) throw new Error("Missing argument: <symbol>. Usage: pairs <symbol>");

  const data = await cmcFetch(`/v2/cryptocurrency/market-pairs/latest?symbol=${encodeURIComponent(symbol.toUpperCase())}`);
  return { symbol: symbol.toUpperCase(), data: data.data };
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function showHelp() {
  return {
    usage: "node cmc-crypto.mjs <command> [args...]",
    commands: {
      "quote <symbol>": "Get latest price quote (e.g., quote BTC)",
      "info <symbol>": "Get cryptocurrency metadata (e.g., info ETH)",
      "listings": "Top 100 cryptocurrencies by market cap",
      "trending": "Currently trending cryptocurrencies",
      "gainers": "Top gainers and losers (24h)",
      "ohlcv <symbol>": "Latest OHLCV data (e.g., ohlcv SOL)",
      "categories": "List all cryptocurrency categories",
      "map <symbol>": "Map symbol to CoinMarketCap ID (e.g., map DOGE)",
      "new": "Newly added cryptocurrencies",
      "pairs <symbol>": "Market pairs for a coin (e.g., pairs BNB)",
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
  quote: cmdQuote,
  info: cmdInfo,
  listings: cmdListings,
  trending: cmdTrending,
  gainers: cmdGainers,
  ohlcv: cmdOhlcv,
  categories: cmdCategories,
  map: cmdMap,
  new: cmdNew,
  pairs: cmdPairs,
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
