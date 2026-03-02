#!/usr/bin/env node
/**
 * DexScreener API Helper — Token analytics and discovery for BSC
 *
 * Usage:
 *   node dexscreener.mjs <command> [args...]
 *
 * Commands:
 *   search <query>          — Search for tokens/pairs by name or symbol
 *   pair <pairAddress>      — Get detailed pair info
 *   token <tokenAddress>    — Get all pairs for a token
 *   trending                — Get trending/boosted pairs on BSC
 *   new-pairs               — Get recently created pairs on BSC
 *   profile <tokenAddress>  — Get token profile info
 *
 * No environment variables required. DexScreener API is free and open.
 *
 * Zero npm dependencies — uses only global fetch().
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = "https://api.dexscreener.com";

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function dexFetch(path) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "orbofi-dexscreener-skill/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`DexScreener API error: HTTP ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Pair formatting helper
// ---------------------------------------------------------------------------

function formatPair(p) {
  return {
    chainId: p.chainId,
    dexId: p.dexId,
    pairAddress: p.pairAddress,
    baseToken: p.baseToken
      ? { address: p.baseToken.address, name: p.baseToken.name, symbol: p.baseToken.symbol }
      : null,
    quoteToken: p.quoteToken
      ? { address: p.quoteToken.address, name: p.quoteToken.name, symbol: p.quoteToken.symbol }
      : null,
    priceNative: p.priceNative || null,
    priceUsd: p.priceUsd || null,
    volume: p.volume || null,
    priceChange: p.priceChange || null,
    liquidity: p.liquidity || null,
    fdv: p.fdv || null,
    marketCap: p.marketCap || null,
    pairCreatedAt: p.pairCreatedAt || null,
    txns: p.txns || null,
    url: p.url || null,
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdSearch(args) {
  const query = args.join(" ");
  if (!query) throw new Error("Missing argument: <query>");

  const data = await dexFetch(`/latest/dex/search?q=${encodeURIComponent(query)}`);

  // Filter to BSC pairs only
  const bscPairs = (data.pairs || []).filter(
    (p) => p.chainId === "bsc"
  );

  return {
    query,
    totalResults: bscPairs.length,
    pairs: bscPairs.slice(0, 20).map(formatPair),
  };
}

async function cmdPair(args) {
  const pairAddress = args[0];
  if (!pairAddress) throw new Error("Missing argument: <pairAddress>");

  const data = await dexFetch(`/latest/dex/pairs/bsc/${pairAddress}`);

  if (!data.pair && (!data.pairs || data.pairs.length === 0)) {
    return {
      pairAddress,
      error: "Pair not found on BSC",
    };
  }

  const pair = data.pair || data.pairs[0];
  return {
    pair: formatPair(pair),
  };
}

async function cmdToken(args) {
  const tokenAddress = args[0];
  if (!tokenAddress) throw new Error("Missing argument: <tokenAddress>");

  const data = await dexFetch(`/latest/dex/tokens/${tokenAddress}`);

  // Filter to BSC pairs
  const bscPairs = (data.pairs || []).filter(
    (p) => p.chainId === "bsc"
  );

  if (bscPairs.length === 0) {
    return {
      tokenAddress,
      pairs: [],
      message: "No BSC pairs found for this token",
    };
  }

  return {
    tokenAddress,
    totalPairs: bscPairs.length,
    pairs: bscPairs.map(formatPair),
  };
}

async function cmdTrending() {
  // Use the token-boosts endpoint to get trending/boosted tokens
  const data = await dexFetch("/token-boosts/top/v1");

  // Filter to BSC tokens
  const bscTokens = (Array.isArray(data) ? data : []).filter(
    (t) => t.chainId === "bsc"
  );

  return {
    chain: "bsc",
    totalTrending: bscTokens.length,
    trending: bscTokens.slice(0, 20).map((t) => ({
      tokenAddress: t.tokenAddress,
      chainId: t.chainId,
      amount: t.amount || null,
      totalAmount: t.totalAmount || null,
      icon: t.icon || null,
      header: t.header || null,
      description: t.description || null,
      links: t.links || [],
      url: t.url || null,
    })),
  };
}

async function cmdNewPairs() {
  // Use the token-profiles endpoint and filter for recent BSC tokens
  // The latest/dex/pairs endpoint with chain filter gives newest pairs
  const data = await dexFetch("/token-profiles/latest/v1");

  // Filter to BSC
  const bscProfiles = (Array.isArray(data) ? data : []).filter(
    (t) => t.chainId === "bsc"
  );

  if (bscProfiles.length === 0) {
    return {
      chain: "bsc",
      newPairs: [],
      message: "No new BSC token profiles found. Try the 'search' command for specific tokens.",
    };
  }

  return {
    chain: "bsc",
    totalNew: bscProfiles.length,
    newPairs: bscProfiles.slice(0, 20).map((t) => ({
      tokenAddress: t.tokenAddress,
      chainId: t.chainId,
      icon: t.icon || null,
      header: t.header || null,
      description: t.description || null,
      links: t.links || [],
      url: t.url || null,
    })),
  };
}

async function cmdProfile(args) {
  const tokenAddress = args[0];
  if (!tokenAddress) throw new Error("Missing argument: <tokenAddress>");

  const data = await dexFetch("/token-profiles/latest/v1");

  // Find matching BSC token profile
  const profile = (Array.isArray(data) ? data : []).find(
    (t) => t.chainId === "bsc" &&
      t.tokenAddress && t.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
  );

  if (!profile) {
    // Fallback: try to get pair data which includes token info
    const tokenData = await dexFetch(`/latest/dex/tokens/${tokenAddress}`);
    const bscPairs = (tokenData.pairs || []).filter((p) => p.chainId === "bsc");

    if (bscPairs.length > 0) {
      const firstPair = bscPairs[0];
      return {
        tokenAddress,
        chainId: "bsc",
        name: firstPair.baseToken?.name || null,
        symbol: firstPair.baseToken?.symbol || null,
        priceUsd: firstPair.priceUsd || null,
        totalPairs: bscPairs.length,
        profile: null,
        message: "No DexScreener profile found, but token data is available via pairs.",
      };
    }

    return {
      tokenAddress,
      error: "No profile or pair data found for this token on BSC.",
    };
  }

  return {
    tokenAddress: profile.tokenAddress,
    chainId: profile.chainId,
    icon: profile.icon || null,
    header: profile.header || null,
    description: profile.description || null,
    links: profile.links || [],
    url: profile.url || null,
  };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

const COMMANDS = {
  search: cmdSearch,
  pair: cmdPair,
  token: cmdToken,
  trending: cmdTrending,
  "new-pairs": cmdNewPairs,
  profile: cmdProfile,
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || !COMMANDS[command]) {
    const available = Object.keys(COMMANDS).join(", ");
    console.log(JSON.stringify({
      error: `Unknown command: ${command || "(none)"}. Available: ${available}`,
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
