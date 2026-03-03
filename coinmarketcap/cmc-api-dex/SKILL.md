---
name: cmc-api-dex
description: "CoinMarketCap DEX API — token lookup by contract address, DEX prices, liquidity pools, transactions, trending DEX tokens, meme tokens, security analysis, and new token launches across Ethereum, BSC, Solana, and more."
allowed-tools: Bash(cmc-api-dex:*)
compatibility: Requires CMC_PRO_API_KEY from pro.coinmarketcap.com. Network access to pro-api.coinmarketcap.com.
---

# CoinMarketCap DEX API Skill

## Overview

Access decentralized exchange data from CoinMarketCap's DEX API. Look up tokens by contract address, get DEX prices, browse liquidity pools, view transactions, discover trending DEX tokens, check meme tokens, analyze token security/rug risk, search DEX pairs, and find newly launched tokens across Ethereum, BSC, Solana, and other chains.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CMC_PRO_API_KEY` | Yes | API key from [pro.coinmarketcap.com](https://pro.coinmarketcap.com) |

## Helper Script

All commands go through the helper script:

```bash
SCRIPT=".claude/skills/cmc-api-dex/scripts/cmc-dex.mjs"
node $SCRIPT <command> [args...]
```

---

## Quick Start

### Look up a token by contract address
```bash
node $SCRIPT token ethereum 0xdAC17F958D2ee523a2206206994597C13D831ec7
```

### Get DEX price for a token
```bash
node $SCRIPT price bsc 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82
```

### See trending DEX tokens
```bash
node $SCRIPT trending
```

### Check token security
```bash
node $SCRIPT security bsc 0xTokenAddress
```

---

## Commands Reference

### token

Get token details by contract address on a specific network.

```bash
node $SCRIPT token <network> <address>
```

**API endpoint:** `GET /v1/dex/token?network_slug=<network>&contract_address=<address>`

**Example:**
```bash
node $SCRIPT token ethereum 0xdAC17F958D2ee523a2206206994597C13D831ec7
```

**Network slugs:** `ethereum`, `bsc`, `solana`, `polygon`, `arbitrum`, `avalanche`, `base`, `optimism`

---

### price

Get the latest DEX price for a token by contract address.

```bash
node $SCRIPT price <network> <address>
```

**API endpoint:** `GET /v1/dex/token/price?network_slug=<network>&contract_address=<address>`

**Example:**
```bash
node $SCRIPT price bsc 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82
```

---

### pools

Get liquidity pools for a token.

```bash
node $SCRIPT pools <network> <address>
```

**API endpoint:** `GET /v1/dex/token/pools?network_slug=<network>&contract_address=<address>`

**Example:**
```bash
node $SCRIPT pools ethereum 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
```

---

### txns

Get recent transactions for a token.

```bash
node $SCRIPT txns <network> <address>
```

**API endpoint:** `GET /v1/dex/tokens/transactions?network_slug=<network>&contract_address=<address>`

**Example:**
```bash
node $SCRIPT txns solana So11111111111111111111111111111111111111112
```

---

### trending

Get trending DEX tokens across all chains. Uses a POST endpoint.

```bash
node $SCRIPT trending
```

**API endpoint:** `POST /v1/dex/tokens/trending/list`

---

### new

Get newly launched DEX tokens. Uses a POST endpoint.

```bash
node $SCRIPT new
```

**API endpoint:** `POST /v1/dex/new/list`

---

### meme

Get trending meme tokens on DEXes. Uses a POST endpoint.

```bash
node $SCRIPT meme
```

**API endpoint:** `POST /v1/dex/meme/list`

---

### security

Get security and rug-pull risk analysis for a token.

```bash
node $SCRIPT security <network> <address>
```

**API endpoint:** `GET /v1/dex/security/detail?network_slug=<network>&contract_address=<address>`

**Example:**
```bash
node $SCRIPT security bsc 0xSuspiciousTokenAddress
```

Returns security flags such as honeypot risk, ownership renouncement, liquidity lock status, and contract verification.

---

### search

Search for DEX tokens or pairs by keyword.

```bash
node $SCRIPT search <query>
```

**API endpoint:** `GET /v1/dex/search?keyword=<query>`

**Example:**
```bash
node $SCRIPT search pepe
```

---

### platforms

List all supported DEX platforms/networks.

```bash
node $SCRIPT platforms
```

**API endpoint:** `GET /v1/dex/platform/list`

---

### pairs

Get DEX pair quotes for a specific pair by contract address.

```bash
node $SCRIPT pairs <network> <address>
```

**API endpoint:** `GET /v4/dex/pairs/quotes/latest?network_slug=<network>&contract_address=<address>`

**Example:**
```bash
node $SCRIPT pairs ethereum 0xPairContractAddress
```

---

## Workflow Examples

### Investigate a token before trading
```bash
SCRIPT=".claude/skills/cmc-api-dex/scripts/cmc-dex.mjs"

# 1. Look up token details
node $SCRIPT token bsc 0xTokenAddress

# 2. Check current DEX price
node $SCRIPT price bsc 0xTokenAddress

# 3. Run security analysis
node $SCRIPT security bsc 0xTokenAddress

# 4. View liquidity pools
node $SCRIPT pools bsc 0xTokenAddress

# 5. Check recent transactions
node $SCRIPT txns bsc 0xTokenAddress
```

### Discover new opportunities
```bash
SCRIPT=".claude/skills/cmc-api-dex/scripts/cmc-dex.mjs"

# 1. What's trending on DEXes?
node $SCRIPT trending

# 2. Newly launched tokens
node $SCRIPT new

# 3. Meme token activity
node $SCRIPT meme

# 4. Search for a specific token
node $SCRIPT search "dog"
```

### Check supported chains
```bash
SCRIPT=".claude/skills/cmc-api-dex/scripts/cmc-dex.mjs"

# List all supported DEX platforms
node $SCRIPT platforms
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
- `"Missing arguments: <network> <address>"` -- Required arguments not provided
- `"CoinMarketCap API error: HTTP 401"` -- Invalid API key
- `"CoinMarketCap API error: HTTP 429"` -- Rate limit exceeded

## Rate Limits

CoinMarketCap enforces rate limits based on your plan tier. DEX endpoints may consume more credits than standard cryptocurrency endpoints. Check your plan's credit allocation at [pro.coinmarketcap.com](https://pro.coinmarketcap.com).

## Important Notes

- All data is **read-only** -- this skill never sends transactions or interacts with smart contracts.
- Network slugs are lowercase: `ethereum`, `bsc`, `solana`, `polygon`, `arbitrum`, `avalanche`, `base`, `optimism`.
- Contract addresses must be the full address including `0x` prefix (for EVM chains).
- Solana addresses are base58-encoded (no `0x` prefix).
- The `trending`, `new`, and `meme` commands use POST endpoints with empty JSON bodies.
- Security analysis may not be available for all tokens -- newer or very low-volume tokens may lack data.
- DEX data reflects on-chain activity and may differ from centralized exchange prices.
