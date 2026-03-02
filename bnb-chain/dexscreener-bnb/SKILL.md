---
name: dexscreener-bnb
description: "Token analytics and discovery for BNB Chain (BSC) via DexScreener — real-time price data, trending token pairs, new token launches, liquidity charts, and trading volume analysis."
allowed-tools: Bash(dexscreener-bnb:*)
compatibility: "No wallet or API key required. Read-only analytics. Network access to api.dexscreener.com required."
---

# DexScreener BNB Skill

## Overview

Token analytics and discovery for BNB Chain (BSC) via the DexScreener API. Provides real-time price data, trending token pairs, new token launches, liquidity information, and trading volume analysis. This is a read-only skill that requires no wallet, API key, or authentication.

## Environment Variables

None required. DexScreener API is free and does not require authentication.

## Helper Script

All commands go through the helper script:

```bash
SCRIPT=".claude/skills/dexscreener-bnb/scripts/dexscreener.mjs"
node $SCRIPT <command> [args...]
```

---

## Quick Start

### Search for a token
```bash
node $SCRIPT search CAKE
```

### Get pair details
```bash
node $SCRIPT pair 0xPairAddress
```

### Get all pairs for a token
```bash
node $SCRIPT token 0xTokenAddress
```

### See trending pairs on BSC
```bash
node $SCRIPT trending
```

### See new pair launches on BSC
```bash
node $SCRIPT new-pairs
```

---

## Commands Reference

### search

Search for tokens or trading pairs by name, symbol, or address.

```bash
node $SCRIPT search <query>
```

**Example:**
```bash
node $SCRIPT search CAKE
```

**Output:**
```json
{
  "query": "CAKE",
  "pairs": [
    {
      "chainId": "bsc",
      "dexId": "pancakeswap",
      "pairAddress": "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
      "baseToken": {
        "address": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
        "name": "PancakeSwap Token",
        "symbol": "CAKE"
      },
      "quoteToken": {
        "address": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "name": "Wrapped BNB",
        "symbol": "WBNB"
      },
      "priceUsd": "2.45",
      "volume24h": 15000000,
      "liquidity": { "usd": 50000000 },
      "priceChange24h": -1.5,
      "txns24h": { "buys": 5000, "sells": 4800 }
    }
  ]
}
```

---

### pair

Get detailed information about a specific trading pair by its pair address.

```bash
node $SCRIPT pair <pairAddress>
```

**Example:**
```bash
node $SCRIPT pair 0x0eD7e52944161450477ee417DE9Cd3a859b14fD0
```

**Output:**
```json
{
  "pair": {
    "chainId": "bsc",
    "dexId": "pancakeswap",
    "pairAddress": "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
    "baseToken": {
      "address": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      "name": "PancakeSwap Token",
      "symbol": "CAKE"
    },
    "quoteToken": {
      "address": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "name": "Wrapped BNB",
      "symbol": "WBNB"
    },
    "priceNative": "0.00389",
    "priceUsd": "2.45",
    "volume": {
      "h1": 500000,
      "h6": 3000000,
      "h24": 15000000
    },
    "priceChange": {
      "h1": 0.5,
      "h6": -0.8,
      "h24": -1.5
    },
    "liquidity": {
      "usd": 50000000,
      "base": 20000000,
      "quote": 30000
    },
    "fdv": 500000000,
    "pairCreatedAt": 1619827200000
  }
}
```

---

### token

Get all trading pairs across all DEXes for a specific token address.

```bash
node $SCRIPT token <tokenAddress>
```

**Example (CAKE):**
```bash
node $SCRIPT token 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82
```

**Output:**
```json
{
  "tokenAddress": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  "pairs": [
    {
      "dexId": "pancakeswap",
      "pairAddress": "0x...",
      "priceUsd": "2.45",
      "volume24h": 15000000,
      "liquidity": { "usd": 50000000 }
    },
    {
      "dexId": "biswap",
      "pairAddress": "0x...",
      "priceUsd": "2.44",
      "volume24h": 200000,
      "liquidity": { "usd": 500000 }
    }
  ]
}
```

---

### trending

Get trending/boosted token pairs on BSC. Shows tokens gaining the most attention.

```bash
node $SCRIPT trending
```

**Output:**
```json
{
  "chain": "bsc",
  "trending": [
    {
      "tokenAddress": "0x...",
      "chainId": "bsc",
      "icon": "https://...",
      "description": "...",
      "links": []
    }
  ]
}
```

---

### new-pairs

Get recently created trading pairs on BSC. Useful for finding new token launches.

```bash
node $SCRIPT new-pairs
```

**Output:**
```json
{
  "chain": "bsc",
  "newPairs": [
    {
      "pairAddress": "0x...",
      "baseToken": {
        "address": "0x...",
        "name": "New Token",
        "symbol": "NEW"
      },
      "quoteToken": {
        "symbol": "WBNB"
      },
      "priceUsd": "0.001",
      "liquidity": { "usd": 50000 },
      "pairCreatedAt": 1709000000000
    }
  ]
}
```

---

### profile

Get the token profile information (icon, description, social links) for a token.

```bash
node $SCRIPT profile <tokenAddress>
```

**Example:**
```bash
node $SCRIPT profile 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82
```

**Output:**
```json
{
  "tokenAddress": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  "chainId": "bsc",
  "icon": "https://dd.dexscreener.com/ds-data/tokens/bsc/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82.png",
  "description": "PancakeSwap is the leading DEX on BNB Chain...",
  "links": [
    { "type": "website", "url": "https://pancakeswap.finance" },
    { "type": "twitter", "url": "https://twitter.com/pancakeswap" }
  ]
}
```

---

## Workflow Examples

### Research a token before buying
```bash
SCRIPT=".claude/skills/dexscreener-bnb/scripts/dexscreener.mjs"

# 1. Search for the token
node $SCRIPT search "SomeToken"

# 2. Get detailed pair info (price, volume, liquidity)
node $SCRIPT pair 0xPairAddress

# 3. Get all pairs to compare prices across DEXes
node $SCRIPT token 0xTokenAddress

# 4. Check the token profile for legitimacy
node $SCRIPT profile 0xTokenAddress
```

### Find new opportunities
```bash
SCRIPT=".claude/skills/dexscreener-bnb/scripts/dexscreener.mjs"

# 1. Check what's trending on BSC
node $SCRIPT trending

# 2. See newly launched pairs
node $SCRIPT new-pairs

# 3. Investigate a promising new pair
node $SCRIPT pair 0xNewPairAddress
```

### Compare token prices across DEXes
```bash
SCRIPT=".claude/skills/dexscreener-bnb/scripts/dexscreener.mjs"

# Get all pairs for a token — shows price on every DEX
node $SCRIPT token 0xTokenAddress
```

### Monitor a trading pair
```bash
SCRIPT=".claude/skills/dexscreener-bnb/scripts/dexscreener.mjs"

# Check current price, volume, and liquidity
node $SCRIPT pair 0xPairAddress
```

## Error Handling

All errors are returned as JSON:

```json
{
  "error": "Description of what went wrong"
}
```

Common errors:
- `"Missing argument: <query>"` — No search query provided
- `"Missing argument: <pairAddress>"` — No pair address provided
- `"No pairs found"` — Search returned no results
- `"Network error"` — Cannot reach DexScreener API

## Important Notes

- DexScreener API is **free** and requires no authentication.
- All data is **read-only** — this skill never sends transactions.
- Results include pairs from **all DEXes** on BSC (PancakeSwap, Biswap, Thena, etc.).
- Price data is **real-time** and reflects the latest on-chain state.
- The `search` command filters results to BSC pairs only (chainId = "bsc").
- The `trending` command uses the token-boosts API, which shows tokens with active promotional boosts on DexScreener.
- New pairs may have very low liquidity — always check the `liquidity.usd` field before interacting.
- DexScreener has rate limits. If you get rate-limited, wait a few seconds before retrying.
