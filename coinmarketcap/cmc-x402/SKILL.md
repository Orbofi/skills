---
name: cmc-x402
description: "CoinMarketCap x402 — pay-per-request crypto data using USDC micropayments on Base network. No API key needed. $0.01 per request for price quotes, market listings, DEX search, and pair data. Powered by Coinbase x402 protocol."
allowed-tools: Bash(cmc-x402:*)
compatibility: Requires Base network wallet with USDC ($0.01/request) and ETH for gas. Node.js 18+.
---

# CoinMarketCap x402 Skill

## Overview

Access CoinMarketCap's professional crypto data API without an API key. Instead of traditional API key authentication, x402 uses the Coinbase x402 open payment protocol to pay $0.01 USDC per request on the Base network. Failed requests are free -- you only pay for successful data.

## What is x402?

x402 is an open payment protocol developed by Coinbase that enables HTTP-native micropayments. It uses the HTTP 402 "Payment Required" status code to facilitate machine-to-machine payments. When a request is made to an x402-enabled endpoint:

1. The client sends a request
2. The server responds with 402 and payment requirements
3. The x402 SDK automatically handles the USDC payment on Base
4. The server returns the requested data
5. If the request fails, no payment is charged

This eliminates the need for API keys, subscription plans, or billing accounts. Pay only for what you use.

## Prerequisites

- **Base network wallet** with a private key (EOA)
- **USDC on Base** ($0.01 per successful request)
- **ETH on Base** for gas fees (minimal, ~$0.001 per tx)
- **Node.js 18+**

## Installation

```bash
npm install @x402/axios @x402/evm viem
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BASE_PRIVATE_KEY` | Yes | Wallet private key on Base network (hex, with or without 0x prefix) |
| `BASE_RPC_URL` | No | Custom Base RPC URL (defaults to public Base RPC) |

## Base URL

All x402 endpoints are on CoinMarketCap's pro API:

```
https://pro-api.coinmarketcap.com
```

---

## Endpoints & Code Examples

### 1. Crypto Price Quotes

Get latest price quotes for one or more cryptocurrencies.

**Endpoint:** `GET /x402/v3/cryptocurrency/quotes/latest`

```javascript
import { wrapAxios } from "@x402/axios";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import axios from "axios";

const account = privateKeyToAccount(process.env.BASE_PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});

const client = wrapAxios(axios, walletClient);

// Get Bitcoin price
const response = await client.get(
  "https://pro-api.coinmarketcap.com/x402/v3/cryptocurrency/quotes/latest",
  { params: { symbol: "BTC" } }
);
console.log(response.data);

// Get multiple quotes
const multi = await client.get(
  "https://pro-api.coinmarketcap.com/x402/v3/cryptocurrency/quotes/latest",
  { params: { symbol: "BTC,ETH,SOL" } }
);
console.log(multi.data);
```

**Parameters:**
- `symbol` — Comma-separated cryptocurrency symbols (e.g., `BTC`, `BTC,ETH,SOL`)
- `slug` — Comma-separated cryptocurrency slugs (e.g., `bitcoin`, `ethereum`)
- `id` — Comma-separated CoinMarketCap IDs
- `convert` — Target currency for conversion (e.g., `USD`, `EUR`, `BTC`)

---

### 2. Market Listings

Get the latest market listings sorted by market cap.

**Endpoint:** `GET /x402/v3/cryptocurrency/listing/latest`

```javascript
const response = await client.get(
  "https://pro-api.coinmarketcap.com/x402/v3/cryptocurrency/listing/latest",
  {
    params: {
      start: 1,
      limit: 20,
      convert: "USD",
    },
  }
);
console.log(response.data);
```

**Parameters:**
- `start` — Offset (1-based, default: 1)
- `limit` — Number of results (default: 100, max: 5000)
- `convert` — Target currency
- `sort` — Sort field (`market_cap`, `volume_24h`, `percent_change_24h`, etc.)
- `sort_dir` — Sort direction (`asc` or `desc`)

---

### 3. DEX Token Search

Search for tokens on decentralized exchanges.

**Endpoint:** `GET /x402/v1/dex/search`

```javascript
const response = await client.get(
  "https://pro-api.coinmarketcap.com/x402/v1/dex/search",
  { params: { query: "PEPE" } }
);
console.log(response.data);
```

**Parameters:**
- `query` — Search query (token name, symbol, or contract address)

---

### 4. DEX Pair Quotes

Get latest quotes for a specific DEX trading pair.

**Endpoint:** `GET /x402/v4/dex/pairs/quotes/latest`

```javascript
const response = await client.get(
  "https://pro-api.coinmarketcap.com/x402/v4/dex/pairs/quotes/latest",
  {
    params: {
      network_slug: "ethereum",
      contract_address: "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852", // ETH/USDT on Uniswap V2
    },
  }
);
console.log(response.data);
```

**Parameters:**
- `network_slug` — Blockchain network (e.g., `ethereum`, `base`, `solana`, `bsc`)
- `contract_address` — DEX pair contract address

---

## Complete Standalone Script

Below is a self-contained Node.js script that handles all four commands:

```javascript
// cmc-x402-client.mjs
// Usage: node cmc-x402-client.mjs <command> [args...]
//   quote <symbol>              - Get price quote (e.g., quote BTC,ETH)
//   listings [limit]            - Get market listings (default: 20)
//   dex-search <query>          - Search DEX tokens
//   dex-pairs <network> <addr>  - Get DEX pair data

import { wrapAxios } from "@x402/axios";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import axios from "axios";

const BASE_URL = "https://pro-api.coinmarketcap.com";

const account = privateKeyToAccount(process.env.BASE_PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});
const client = wrapAxios(axios, walletClient);

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "quote": {
    const symbol = args[0];
    if (!symbol) { console.error("Usage: quote <SYMBOL>"); process.exit(1); }
    const res = await client.get(`${BASE_URL}/x402/v3/cryptocurrency/quotes/latest`, {
      params: { symbol },
    });
    console.log(JSON.stringify(res.data, null, 2));
    break;
  }
  case "listings": {
    const limit = args[0] || 20;
    const res = await client.get(`${BASE_URL}/x402/v3/cryptocurrency/listing/latest`, {
      params: { start: 1, limit, convert: "USD" },
    });
    console.log(JSON.stringify(res.data, null, 2));
    break;
  }
  case "dex-search": {
    const query = args[0];
    if (!query) { console.error("Usage: dex-search <QUERY>"); process.exit(1); }
    const res = await client.get(`${BASE_URL}/x402/v1/dex/search`, {
      params: { query },
    });
    console.log(JSON.stringify(res.data, null, 2));
    break;
  }
  case "dex-pairs": {
    const [network, address] = args;
    if (!network || !address) { console.error("Usage: dex-pairs <NETWORK> <ADDRESS>"); process.exit(1); }
    const res = await client.get(`${BASE_URL}/x402/v4/dex/pairs/quotes/latest`, {
      params: { network_slug: network, contract_address: address },
    });
    console.log(JSON.stringify(res.data, null, 2));
    break;
  }
  default:
    console.error("Commands: quote, listings, dex-search, dex-pairs");
    process.exit(1);
}
```

---

## MCP Setup (x402 MCP Server)

CoinMarketCap also offers an x402-enabled MCP server for direct integration with Claude and other MCP clients.

**MCP Endpoint:** `https://mcp.coinmarketcap.com/x402/mcp`

### Claude Desktop / MCP Client Configuration

```json
{
  "mcpServers": {
    "cmc-x402-mcp": {
      "url": "https://mcp.coinmarketcap.com/x402/mcp",
      "transport": "sse",
      "note": "x402 MCP endpoint — requires Base wallet for payment"
    }
  }
}
```

The MCP server exposes the same endpoints as above but through the MCP tool protocol, allowing Claude to call them as tools directly. Payment is handled the same way -- $0.01 USDC per request on Base.

---

## Pricing

| Item | Cost |
|------|------|
| Successful API request | $0.01 USDC |
| Failed/errored request | Free |
| Gas per transaction | ~$0.001 ETH (Base L2) |

**Cost example:** 100 price checks per day = $1.00/day = $30/month. This is significantly cheaper than CoinMarketCap's Basic plan ($29/month for 10,000 calls/month) for low-volume usage, and you pay nothing for months you don't use it.

---

## Supported Networks for DEX Data

The `network_slug` parameter for DEX endpoints supports:

- `ethereum` — Ethereum mainnet
- `base` — Base (Coinbase L2)
- `solana` — Solana
- `bsc` — BNB Smart Chain
- `arbitrum` — Arbitrum One
- `polygon` — Polygon PoS
- `avalanche` — Avalanche C-Chain
- `optimism` — Optimism
- And many more (check CMC documentation for full list)

---

## Error Handling

### Common Errors

**402 Payment Required (SDK not configured):**
If you see raw 402 responses, the x402 SDK wrapper is not properly initialized. Ensure `wrapAxios` is called before making requests.

**Insufficient USDC Balance:**
The x402 payment will fail if your wallet lacks USDC on Base. Fund your wallet with at least $1 USDC for testing.

**Invalid Symbol:**
```json
{
  "status": {
    "error_code": 400,
    "error_message": "Invalid value for \"symbol\""
  }
}
```

**Rate Limits:**
x402 endpoints still have rate limits. If you hit them, wait and retry. The payment is not charged for rate-limited requests.

---

## Security Best Practices

1. **Use a dedicated wallet** -- Do not use your main wallet's private key. Create a separate wallet funded with small amounts.
2. **Store keys in environment variables** -- Never hardcode `BASE_PRIVATE_KEY` in source code.
3. **Monitor spending** -- Track USDC outflows from your wallet on BaseScan.
4. **Set spending limits** -- Keep only small amounts of USDC in the x402 wallet.
5. **Use a .env file locally** and add it to `.gitignore`.

---

## Comparison: x402 vs Traditional API Key

| Feature | x402 (This Skill) | Traditional CMC API |
|---------|-------------------|---------------------|
| Authentication | USDC micropayment | API key |
| Signup required | No | Yes |
| Monthly subscription | No | $29-$349/month |
| Pay per use | Yes ($0.01/req) | No (quota-based) |
| Rate limits | Yes (per-wallet) | Yes (per-key) |
| DEX data | Yes | Paid plans only |
| Ideal for | Low-volume, agents, pay-as-you-go | High-volume, predictable usage |

---

## References

- [x402 Protocol](https://www.x402.org/) -- Coinbase open payment protocol specification
- [CoinMarketCap x402 Docs](https://developers.coinmarketcap.com/) -- Official CMC developer documentation
- [@x402/axios npm](https://www.npmjs.com/package/@x402/axios) -- x402 Axios wrapper SDK
- [Base Network](https://base.org/) -- Coinbase L2 network
