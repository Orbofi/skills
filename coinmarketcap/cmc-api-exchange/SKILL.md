---
name: cmc-api-exchange
description: "CoinMarketCap exchange API — exchange metadata, listings, volume metrics, trading pairs, and proof-of-reserves/asset data for centralized exchanges."
allowed-tools: Bash(cmc-api-exchange:*)
compatibility: Requires CMC_PRO_API_KEY from pro.coinmarketcap.com. Network access to pro-api.coinmarketcap.com.
---

# CoinMarketCap Exchange API Skill

## Overview

Access centralized exchange data from CoinMarketCap's Pro API. Get exchange metadata, listings ranked by volume, latest volume metrics, trading pairs listed on an exchange, proof-of-reserves/asset holdings, and exchange-to-CMC-ID mapping.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CMC_PRO_API_KEY` | Yes | API key from [pro.coinmarketcap.com](https://pro.coinmarketcap.com) |

## Helper Script

All commands go through the helper script:

```bash
SCRIPT=".claude/skills/cmc-api-exchange/scripts/cmc-exchange.mjs"
node $SCRIPT <command> [args...]
```

---

## Quick Start

### List top exchanges
```bash
node $SCRIPT listings
```

### Get exchange info
```bash
node $SCRIPT info binance
```

### Check exchange volume
```bash
node $SCRIPT volume binance
```

### See trading pairs
```bash
node $SCRIPT pairs binance
```

---

## Commands Reference

### listings

Get all exchanges ranked by 24-hour trading volume.

```bash
node $SCRIPT listings
```

**API endpoint:** `GET /v1/exchange/listings/latest`

**Output includes:**
- Exchange name and slug
- 24h trading volume (USD)
- Number of market pairs
- Exchange score

---

### info

Get metadata for an exchange (description, logo, URLs, launch date, country).

```bash
node $SCRIPT info <slug>
```

**API endpoint:** `GET /v1/exchange/info?slug=<slug>`

**Example:**
```bash
node $SCRIPT info binance
node $SCRIPT info coinbase-exchange
node $SCRIPT info kraken
```

Exchange slugs are lowercase, hyphenated names as used on CoinMarketCap URLs.

---

### volume

Get the latest volume metrics and market data for an exchange.

```bash
node $SCRIPT volume <slug>
```

**API endpoint:** `GET /v1/exchange/quotes/latest?slug=<slug>`

**Example:**
```bash
node $SCRIPT volume binance
```

**Output includes:**
- 24h spot volume (USD)
- Volume change percentages
- Number of active pairs

---

### pairs

Get all active trading pairs listed on an exchange.

```bash
node $SCRIPT pairs <slug>
```

**API endpoint:** `GET /v1/exchange/market-pairs/latest?slug=<slug>`

**Example:**
```bash
node $SCRIPT pairs binance
```

**Output includes:**
- Trading pair (e.g., BTC/USDT)
- Current price
- 24h volume
- Last updated timestamp

---

### assets

Get proof-of-reserves and asset holdings for an exchange.

```bash
node $SCRIPT assets <slug>
```

**API endpoint:** `GET /v1/exchange/assets?slug=<slug>`

**Example:**
```bash
node $SCRIPT assets binance
```

**Output includes:**
- Asset name and symbol
- Wallet addresses
- Balance amounts
- Proof-of-reserves audit data (where available)

Not all exchanges provide proof-of-reserves data.

---

### map

Map exchange names/slugs to their CoinMarketCap IDs.

```bash
node $SCRIPT map
```

**API endpoint:** `GET /v1/exchange/map`

Returns a full list of exchanges with their CMC IDs, names, and slugs. Useful for resolving exchange identifiers.

---

## Workflow Examples

### Research an exchange
```bash
SCRIPT=".claude/skills/cmc-api-exchange/scripts/cmc-exchange.mjs"

# 1. Get exchange metadata
node $SCRIPT info binance

# 2. Check volume metrics
node $SCRIPT volume binance

# 3. See what pairs are available
node $SCRIPT pairs binance

# 4. Check proof-of-reserves
node $SCRIPT assets binance
```

### Compare exchanges
```bash
SCRIPT=".claude/skills/cmc-api-exchange/scripts/cmc-exchange.mjs"

# 1. Get full rankings
node $SCRIPT listings

# 2. Compare volume for specific exchanges
node $SCRIPT volume binance
node $SCRIPT volume coinbase-exchange
node $SCRIPT volume kraken
```

### Find where a token trades
```bash
SCRIPT=".claude/skills/cmc-api-exchange/scripts/cmc-exchange.mjs"

# 1. Check pairs on major exchanges
node $SCRIPT pairs binance
node $SCRIPT pairs coinbase-exchange

# Or use cmc-api-crypto pairs command for token-centric lookup
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
- `"Missing argument: <slug>"` -- Required exchange slug not provided
- `"CoinMarketCap API error: HTTP 401"` -- Invalid API key
- `"CoinMarketCap API error: HTTP 429"` -- Rate limit exceeded
- `"CoinMarketCap API error: HTTP 400"` -- Invalid exchange slug

## Rate Limits

CoinMarketCap enforces rate limits based on your plan tier:
- **Basic (free):** 333 calls/day, 10,000/month
- **Hobbyist:** 1,000 calls/day
- **Startup:** 3,333 calls/day
- **Standard+:** Higher limits

The `listings` and `pairs` endpoints consume more credits than single-exchange lookups.

## Important Notes

- All data is **read-only** -- this skill never interacts with exchanges or sends trades.
- Exchange slugs are lowercase, hyphenated (e.g., `binance`, `coinbase-exchange`, `crypto-com-exchange`).
- Use the `map` command to find the correct slug for an exchange.
- Proof-of-reserves (`assets` command) data depends on the exchange publishing this information.
- Volume data is aggregated from the exchange's reported figures and may include adjusted/unverified volume.
- Some exchange endpoints may require a paid API plan for full data access.

## Common Exchange Slugs

| Exchange | Slug |
|---|---|
| Binance | `binance` |
| Coinbase | `coinbase-exchange` |
| Kraken | `kraken` |
| OKX | `okx` |
| Bybit | `bybit` |
| KuCoin | `kucoin` |
| Bitfinex | `bitfinex` |
| Gate.io | `gate-io` |
| Crypto.com | `crypto-com-exchange` |
| Huobi | `huobi` |
