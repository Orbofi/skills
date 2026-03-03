---
name: cmc-api-market
description: "CoinMarketCap market API — global crypto metrics, Fear & Greed index, CMC100/CMC20 indices, community trends, news, candlestick charts, and price conversion tools."
allowed-tools: Bash(cmc-api-market:*)
compatibility: Requires CMC_PRO_API_KEY from pro.coinmarketcap.com. Network access to pro-api.coinmarketcap.com.
---

# CoinMarketCap Market API Skill

## Overview

Access global crypto market data from CoinMarketCap. Get overall market metrics, Fear & Greed index, CMC100/CMC20 index values, community trending tokens and topics, latest crypto news, candlestick chart data, price conversion between currencies, and API key usage stats.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CMC_PRO_API_KEY` | Yes | API key from [pro.coinmarketcap.com](https://pro.coinmarketcap.com) |

## Helper Script

All commands go through the helper script:

```bash
SCRIPT=".claude/skills/cmc-api-market/scripts/cmc-market.mjs"
node $SCRIPT <command> [args...]
```

---

## Quick Start

### Global market overview
```bash
node $SCRIPT global
```

### Fear & Greed index
```bash
node $SCRIPT fear-greed
```

### Convert price between currencies
```bash
node $SCRIPT convert 1 BTC USD
```

### Latest crypto news
```bash
node $SCRIPT news
```

---

## Commands Reference

### global

Get global cryptocurrency market metrics (total market cap, BTC dominance, active cryptocurrencies, etc.).

```bash
node $SCRIPT global
```

**API endpoint:** `GET /v1/global-metrics/quotes/latest`

**Output includes:**
- Total market cap (USD)
- Total 24h volume
- BTC dominance percentage
- ETH dominance percentage
- Active cryptocurrencies count
- Active exchanges count

---

### fear-greed

Get the latest Fear & Greed index value, indicating overall market sentiment.

```bash
node $SCRIPT fear-greed
```

**API endpoint:** `GET /v3/fear-and-greed/latest`

**Output:**
- Index value (0-100)
- Classification: Extreme Fear, Fear, Neutral, Greed, Extreme Greed

---

### cmc100

Get the CMC Crypto 100 index (top 100 cryptocurrencies weighted index).

```bash
node $SCRIPT cmc100
```

**API endpoint:** `GET /v3/index/cmc100-latest`

---

### cmc20

Get the CMC Crypto 20 index (top 20 cryptocurrencies weighted index).

```bash
node $SCRIPT cmc20
```

**API endpoint:** `GET /v3/index/cmc20-latest`

---

### trending-tokens

Get community trending tokens on CoinMarketCap (based on user views and searches).

```bash
node $SCRIPT trending-tokens
```

**API endpoint:** `GET /v1/community/trending/token`

---

### trending-topics

Get trending topics in the CoinMarketCap community.

```bash
node $SCRIPT trending-topics
```

**API endpoint:** `GET /v1/community/trending/topic`

---

### news

Get the latest cryptocurrency news and articles from CoinMarketCap.

```bash
node $SCRIPT news
```

**API endpoint:** `GET /v1/content/latest`

---

### candles

Get OHLCV candlestick chart data for a cryptocurrency by its CoinMarketCap ID.

```bash
node $SCRIPT candles <cmcId>
```

**API endpoint:** `GET /v1/k-line/candles?id=<cmcId>`

**Example:**
```bash
# Get candle data for Bitcoin (CMC ID = 1)
node $SCRIPT candles 1
```

Use the `cmc-api-crypto` skill's `map` command to resolve a symbol to its CMC ID if needed.

---

### convert

Convert an amount from one currency to another using CoinMarketCap's real-time rates.

```bash
node $SCRIPT convert <amount> <from> <to>
```

**API endpoint:** `GET /v2/tools/price-conversion?amount=<amount>&symbol=<from>&convert=<to>`

**Example:**
```bash
# Convert 2.5 ETH to USD
node $SCRIPT convert 2.5 ETH USD

# Convert 1000 USD to BTC
node $SCRIPT convert 1000 USD BTC
```

---

### key-info

Get API key usage statistics (credits used, credits remaining, plan tier).

```bash
node $SCRIPT key-info
```

**API endpoint:** `GET /v1/key/info`

Useful for monitoring your API usage and ensuring you stay within rate limits.

---

## Workflow Examples

### Daily market check
```bash
SCRIPT=".claude/skills/cmc-api-market/scripts/cmc-market.mjs"

# 1. Global market snapshot
node $SCRIPT global

# 2. Check sentiment
node $SCRIPT fear-greed

# 3. Index performance
node $SCRIPT cmc100

# 4. Latest news
node $SCRIPT news
```

### Track community sentiment
```bash
SCRIPT=".claude/skills/cmc-api-market/scripts/cmc-market.mjs"

# 1. What tokens are people looking at?
node $SCRIPT trending-tokens

# 2. What topics are trending?
node $SCRIPT trending-topics

# 3. Overall market sentiment
node $SCRIPT fear-greed
```

### Portfolio valuation
```bash
SCRIPT=".claude/skills/cmc-api-market/scripts/cmc-market.mjs"

# Convert holdings to USD
node $SCRIPT convert 0.5 BTC USD
node $SCRIPT convert 10 ETH USD
node $SCRIPT convert 1000 SOL USD
```

### Monitor API usage
```bash
SCRIPT=".claude/skills/cmc-api-market/scripts/cmc-market.mjs"

# Check remaining credits
node $SCRIPT key-info
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
- `"Missing arguments"` -- Required arguments not provided
- `"CoinMarketCap API error: HTTP 401"` -- Invalid API key
- `"CoinMarketCap API error: HTTP 429"` -- Rate limit exceeded
- `"CoinMarketCap API error: HTTP 400"` -- Invalid parameters (bad symbol, invalid amount, etc.)

## Rate Limits

CoinMarketCap enforces rate limits based on your plan tier:
- **Basic (free):** 333 calls/day, 10,000/month
- **Hobbyist:** 1,000 calls/day
- **Startup:** 3,333 calls/day
- **Standard+:** Higher limits

Use the `key-info` command to check your current usage.

## Important Notes

- All data is **read-only** -- this skill never sends transactions.
- The `convert` command uses real-time exchange rates from CoinMarketCap.
- The `candles` command requires a CoinMarketCap ID (numeric), not a symbol. Use the `cmc-api-crypto` skill's `map` command to find the ID.
- Fear & Greed values: 0-24 = Extreme Fear, 25-49 = Fear, 50 = Neutral, 51-74 = Greed, 75-100 = Extreme Greed.
- Community trending data reflects CoinMarketCap platform user activity, not necessarily market performance.
- Some endpoints (indices, Fear & Greed) may require a paid API plan.
