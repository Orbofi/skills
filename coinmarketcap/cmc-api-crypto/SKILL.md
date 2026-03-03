---
name: cmc-api-crypto
description: "CoinMarketCap cryptocurrency API — real-time price quotes, listings, OHLCV data, trending assets, categories, and market pairs for 10,000+ cryptocurrencies. Powered by CoinMarketCap Pro API."
allowed-tools: Bash(cmc-api-crypto:*)
compatibility: Requires CMC_PRO_API_KEY from pro.coinmarketcap.com. Network access to pro-api.coinmarketcap.com.
---

# CoinMarketCap Cryptocurrency API Skill

## Overview

Access real-time cryptocurrency data from CoinMarketCap's Pro API. Covers price quotes, metadata, listings, trending tokens, gainers/losers, OHLCV data, categories, symbol-to-ID mapping, newly added coins, and market pairs for 10,000+ cryptocurrencies.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CMC_PRO_API_KEY` | Yes | API key from [pro.coinmarketcap.com](https://pro.coinmarketcap.com) |

## Helper Script

All commands go through the helper script:

```bash
SCRIPT=".claude/skills/cmc-api-crypto/scripts/cmc-crypto.mjs"
node $SCRIPT <command> [args...]
```

---

## Quick Start

### Get a price quote
```bash
node $SCRIPT quote BTC
```

### Get token metadata
```bash
node $SCRIPT info ETH
```

### Top coins by market cap
```bash
node $SCRIPT listings
```

### Currently trending
```bash
node $SCRIPT trending
```

---

## Commands Reference

### quote

Get the latest price quote for a cryptocurrency by symbol.

```bash
node $SCRIPT quote <symbol>
```

**API endpoint:** `GET /v2/cryptocurrency/quotes/latest?symbol=<SYMBOL>`

**Example:**
```bash
node $SCRIPT quote BTC
```

**Output:**
```json
{
  "symbol": "BTC",
  "data": {
    "BTC": [
      {
        "id": 1,
        "name": "Bitcoin",
        "symbol": "BTC",
        "quote": {
          "USD": {
            "price": 67500.00,
            "volume_24h": 25000000000,
            "percent_change_1h": 0.15,
            "percent_change_24h": 2.3,
            "percent_change_7d": -1.2,
            "market_cap": 1320000000000
          }
        }
      }
    ]
  }
}
```

---

### info

Get metadata (description, logo, URLs, launch date) for a cryptocurrency.

```bash
node $SCRIPT info <symbol>
```

**API endpoint:** `GET /v2/cryptocurrency/info?symbol=<SYMBOL>`

**Example:**
```bash
node $SCRIPT info SOL
```

---

### listings

Get the top cryptocurrencies ranked by market capitalization.

```bash
node $SCRIPT listings
```

**API endpoint:** `GET /v1/cryptocurrency/listings/latest?limit=100`

**Example:**
```bash
node $SCRIPT listings
```

Returns the top 100 cryptocurrencies with price, volume, market cap, and percentage changes.

---

### trending

Get currently trending cryptocurrencies on CoinMarketCap.

```bash
node $SCRIPT trending
```

**API endpoint:** `GET /v1/cryptocurrency/trending/latest`

---

### gainers

Get the top gainers and losers over the past 24 hours.

```bash
node $SCRIPT gainers
```

**API endpoint:** `GET /v1/cryptocurrency/trending/gainers-losers`

---

### ohlcv

Get the latest OHLCV (Open, High, Low, Close, Volume) data for a cryptocurrency.

```bash
node $SCRIPT ohlcv <symbol>
```

**API endpoint:** `GET /v2/cryptocurrency/ohlcv/latest?symbol=<SYMBOL>`

**Example:**
```bash
node $SCRIPT ohlcv ETH
```

---

### categories

List all cryptocurrency categories (DeFi, Layer 1, Meme, etc.) with aggregate stats.

```bash
node $SCRIPT categories
```

**API endpoint:** `GET /v1/cryptocurrency/categories`

---

### map

Map a cryptocurrency symbol to its CoinMarketCap ID. Useful for resolving ambiguous symbols.

```bash
node $SCRIPT map <symbol>
```

**API endpoint:** `GET /v1/cryptocurrency/map?symbol=<SYMBOL>`

**Example:**
```bash
node $SCRIPT map DOGE
```

---

### new

Get the most recently added cryptocurrencies on CoinMarketCap.

```bash
node $SCRIPT new
```

**API endpoint:** `GET /v1/cryptocurrency/listings/new`

---

### pairs

Get active market pairs for a cryptocurrency (exchanges where it trades).

```bash
node $SCRIPT pairs <symbol>
```

**API endpoint:** `GET /v2/cryptocurrency/market-pairs/latest?symbol=<SYMBOL>`

**Example:**
```bash
node $SCRIPT pairs BNB
```

---

## Workflow Examples

### Research a coin before buying
```bash
SCRIPT=".claude/skills/cmc-api-crypto/scripts/cmc-crypto.mjs"

# 1. Get basic info and metadata
node $SCRIPT info AVAX

# 2. Check current price and market data
node $SCRIPT quote AVAX

# 3. Look at OHLCV for recent price action
node $SCRIPT ohlcv AVAX

# 4. Find which exchanges list it
node $SCRIPT pairs AVAX
```

### Discover trending opportunities
```bash
SCRIPT=".claude/skills/cmc-api-crypto/scripts/cmc-crypto.mjs"

# 1. What's trending right now?
node $SCRIPT trending

# 2. Who are the biggest gainers?
node $SCRIPT gainers

# 3. What new coins just launched?
node $SCRIPT new
```

### Market analysis
```bash
SCRIPT=".claude/skills/cmc-api-crypto/scripts/cmc-crypto.mjs"

# 1. Top coins by market cap
node $SCRIPT listings

# 2. Browse categories
node $SCRIPT categories

# 3. Resolve a symbol to its CMC ID
node $SCRIPT map SHIB
```

---

## Error Handling

All errors are returned as JSON:

```json
{
  "error": "Description of what went wrong"
}
```

Common errors:
- `"CMC_PRO_API_KEY not set"` -- Environment variable not configured
- `"Missing argument: <symbol>"` -- Required symbol argument not provided
- `"CoinMarketCap API error: HTTP 401"` -- Invalid API key
- `"CoinMarketCap API error: HTTP 429"` -- Rate limit exceeded

## Rate Limits

CoinMarketCap enforces rate limits based on your plan tier:
- **Basic (free):** 333 calls/day, 10,000/month
- **Hobbyist:** 1,000 calls/day
- **Startup:** 3,333 calls/day
- **Standard+:** Higher limits

All endpoints count toward your daily/monthly credit usage. The `listings` and `categories` endpoints consume more credits than single-symbol lookups.

## Important Notes

- All data is **read-only** -- this skill never sends transactions.
- Symbols are case-insensitive but conventionally uppercase (BTC, ETH, SOL).
- Some symbols map to multiple coins (e.g., "LUNA"). Use the `map` command to resolve ambiguity.
- The `listings` command returns the top 100 by default.
- OHLCV data uses daily candles by default.
- Free-tier API keys have access to most endpoints but with lower rate limits and delayed data.
