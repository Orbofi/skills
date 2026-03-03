#!/usr/bin/env node
/**
 * CoinMarketCap DEX API Helper
 *
 * Usage:
 *   node cmc-dex.mjs <command> [args...]
 *
 * Commands:
 *   token <network> <address>      — Token details by contract address
 *   price <network> <address>      — Latest DEX price
 *   pools <network> <address>      — Liquidity pools for a token
 *   txns <network> <address>       — Recent transactions
 *   trending                       — Trending DEX tokens
 *   new                            — Newly launched DEX tokens
 *   meme                           — Meme tokens
 *   security <network> <address>   — Token security/rug risk
 *   search <query>                 — Search DEX tokens/pairs
 *   platforms                      — List supported DEX platforms
 *   pairs <network> <address>      — DEX pair quotes
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
// Fetch helpers
// ---------------------------------------------------------------------------

async function cmcGet(path) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: "GET",
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

async function cmcPost(path, body = {}) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-CMC_PRO_API_KEY": API_KEY,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const respBody = await res.text().catch(() => "");
    throw new Error(`CoinMarketCap API error: HTTP ${res.status} ${res.statusText}${respBody ? ` — ${respBody.slice(0, 200)}` : ""}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdToken(args) {
  const [network, address] = args;
  if (!network || !address) throw new Error("Missing arguments: <network> <address>. Usage: token <network> <address>");

  const data = await cmcGet(`/v1/dex/token?network_slug=${encodeURIComponent(network)}&contract_address=${encodeURIComponent(address)}`);
  return { network, address, data: data.data };
}

async function cmdPrice(args) {
  const [network, address] = args;
  if (!network || !address) throw new Error("Missing arguments: <network> <address>. Usage: price <network> <address>");

  const data = await cmcGet(`/v1/dex/token/price?network_slug=${encodeURIComponent(network)}&contract_address=${encodeURIComponent(address)}`);
  return { network, address, data: data.data };
}

async function cmdPools(args) {
  const [network, address] = args;
  if (!network || !address) throw new Error("Missing arguments: <network> <address>. Usage: pools <network> <address>");

  const data = await cmcGet(`/v1/dex/token/pools?network_slug=${encodeURIComponent(network)}&contract_address=${encodeURIComponent(address)}`);
  return { network, address, data: data.data };
}

async function cmdTxns(args) {
  const [network, address] = args;
  if (!network || !address) throw new Error("Missing arguments: <network> <address>. Usage: txns <network> <address>");

  const data = await cmcGet(`/v1/dex/tokens/transactions?network_slug=${encodeURIComponent(network)}&contract_address=${encodeURIComponent(address)}`);
  return { network, address, data: data.data };
}

async function cmdTrending() {
  const data = await cmcPost("/v1/dex/tokens/trending/list", {});
  return data;
}

async function cmdNew() {
  const data = await cmcPost("/v1/dex/new/list", {});
  return data;
}

async function cmdMeme() {
  const data = await cmcPost("/v1/dex/meme/list", {});
  return data;
}

async function cmdSecurity(args) {
  const [network, address] = args;
  if (!network || !address) throw new Error("Missing arguments: <network> <address>. Usage: security <network> <address>");

  const data = await cmcGet(`/v1/dex/security/detail?network_slug=${encodeURIComponent(network)}&contract_address=${encodeURIComponent(address)}`);
  return { network, address, data: data.data };
}

async function cmdSearch(args) {
  const query = args.join(" ");
  if (!query) throw new Error("Missing argument: <query>. Usage: search <query>");

  const data = await cmcGet(`/v1/dex/search?keyword=${encodeURIComponent(query)}`);
  return { query, data: data.data };
}

async function cmdPlatforms() {
  const data = await cmcGet("/v1/dex/platform/list");
  return data;
}

async function cmdPairs(args) {
  const [network, address] = args;
  if (!network || !address) throw new Error("Missing arguments: <network> <address>. Usage: pairs <network> <address>");

  const data = await cmcGet(`/v4/dex/pairs/quotes/latest?network_slug=${encodeURIComponent(network)}&contract_address=${encodeURIComponent(address)}`);
  return { network, address, data: data.data };
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function showHelp() {
  return {
    usage: "node cmc-dex.mjs <command> [args...]",
    commands: {
      "token <network> <address>": "Token details by contract address",
      "price <network> <address>": "Latest DEX price for a token",
      "pools <network> <address>": "Liquidity pools for a token",
      "txns <network> <address>": "Recent transactions for a token",
      "trending": "Trending DEX tokens (all chains)",
      "new": "Newly launched DEX tokens",
      "meme": "Meme tokens on DEXes",
      "security <network> <address>": "Token security/rug risk analysis",
      "search <query>": "Search DEX tokens or pairs",
      "platforms": "List supported DEX platforms/networks",
      "pairs <network> <address>": "DEX pair quotes",
    },
    networks: "ethereum, bsc, solana, polygon, arbitrum, avalanche, base, optimism",
    env: {
      "CMC_PRO_API_KEY": "Required. API key from pro.coinmarketcap.com",
    },
  };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

const COMMANDS = {
  token: cmdToken,
  price: cmdPrice,
  pools: cmdPools,
  txns: cmdTxns,
  trending: cmdTrending,
  new: cmdNew,
  meme: cmdMeme,
  security: cmdSecurity,
  search: cmdSearch,
  platforms: cmdPlatforms,
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
