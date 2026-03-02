---
name: four-meme
description: "Launch and trade meme tokens on BNB Chain via Four.Meme — create new tokens with bonding curves, buy and sell early-stage tokens, track new launches and graduations, and discover trending meme coins on BSC."
allowed-tools: Bash(four-meme:*)
compatibility: "Requires BSC_PRIVATE_KEY and BSC_WALLET_ADDRESS env vars for trading. BSC_RPC_URL optional. Network access to BSC RPC and Four.Meme API required."
---

# Four.Meme — BNB Chain Meme Token Launchpad Skill

Discover, buy, and sell meme tokens on Four.Meme, BNB Chain's bonding-curve launchpad. Track trending launches, monitor graduations to PancakeSwap, and trade early-stage tokens directly on-chain.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BSC_WALLET_ADDRESS` | Yes (for buy/sell) | Your BSC wallet address |
| `BSC_PRIVATE_KEY` | Yes (for buy/sell) | Private key for signing transactions |
| `BSC_RPC_URL` | No | Custom BSC RPC endpoint (default: `https://bsc-dataseed1.binance.org`) |

## Key Contracts

| Contract | Address |
|---|---|
| Four.Meme Bonding Curve Router | `0x5c952063c7FC8610FFDB798152D69F0B9550762b` |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |

## Commands

### trending — List trending meme tokens

Returns the current trending meme tokens on Four.Meme ranked by volume and activity.

```bash
node scripts/four-meme.mjs trending
```

**Example output:**
```json
{
  "command": "trending",
  "tokens": [
    {
      "address": "0x...",
      "name": "SomeMemeCoin",
      "symbol": "SMC",
      "price": "0.000042",
      "marketCap": "42000",
      "volume24h": "15000",
      "bondingCurveProgress": "67.5%",
      "createdAt": "2025-01-15T12:00:00Z"
    }
  ]
}
```

### new — List newly launched tokens

Returns the most recently created meme tokens on Four.Meme.

```bash
node scripts/four-meme.mjs new
```

**Example:**
```bash
# List the newest meme tokens on Four.Meme
node scripts/four-meme.mjs new
```

### token — Get token details

Returns detailed information about a specific token including price, market cap, holder count, bonding curve progress, and liquidity.

```bash
node scripts/four-meme.mjs token <address>
```

**Examples:**
```bash
# Get full details for a specific meme token
node scripts/four-meme.mjs token 0x1234567890abcdef1234567890abcdef12345678
```

**Example output:**
```json
{
  "command": "token",
  "address": "0x...",
  "name": "SomeMemeCoin",
  "symbol": "SMC",
  "price": "0.000042",
  "marketCap": "42000",
  "totalSupply": "1000000000",
  "holders": 234,
  "bondingCurveProgress": "67.5%",
  "bondingCurveReserve": "12.5 BNB",
  "graduated": false,
  "createdAt": "2025-01-15T12:00:00Z"
}
```

### buy — Buy tokens with BNB

Buys meme tokens by sending BNB to the Four.Meme bonding curve contract. Requires `BSC_PRIVATE_KEY` and `BSC_WALLET_ADDRESS`.

```bash
node scripts/four-meme.mjs buy <tokenAddress> <bnbAmount>
```

**Examples:**
```bash
# Buy tokens with 0.1 BNB
node scripts/four-meme.mjs buy 0x1234567890abcdef1234567890abcdef12345678 0.1

# Buy tokens with 0.5 BNB
node scripts/four-meme.mjs buy 0x1234567890abcdef1234567890abcdef12345678 0.5
```

**Example output:**
```json
{
  "command": "buy",
  "token": "0x...",
  "bnbSpent": "0.1",
  "tokensReceived": "42000.0",
  "txHash": "0x...",
  "gasUsed": "185000"
}
```

### sell — Sell tokens for BNB

Sells meme tokens back to the bonding curve for BNB. Requires `BSC_PRIVATE_KEY` and `BSC_WALLET_ADDRESS`.

```bash
node scripts/four-meme.mjs sell <tokenAddress> <tokenAmount>
```

**Examples:**
```bash
# Sell 10000 tokens
node scripts/four-meme.mjs sell 0x1234567890abcdef1234567890abcdef12345678 10000

# Sell 500.5 tokens
node scripts/four-meme.mjs sell 0x1234567890abcdef1234567890abcdef12345678 500.5
```

**Example output:**
```json
{
  "command": "sell",
  "token": "0x...",
  "tokensSold": "10000.0",
  "bnbReceived": "0.085",
  "txHash": "0x...",
  "gasUsed": "195000"
}
```

### graduated — List graduated tokens

Returns tokens that have completed their bonding curve and graduated to PancakeSwap with full liquidity.

```bash
node scripts/four-meme.mjs graduated
```

**Example:**
```bash
# See which meme tokens have graduated to PancakeSwap
node scripts/four-meme.mjs graduated
```

### search — Search for meme tokens by name

Searches Four.Meme tokens by name or symbol.

```bash
node scripts/four-meme.mjs search <query>
```

**Examples:**
```bash
# Search for tokens with "pepe" in the name
node scripts/four-meme.mjs search pepe

# Search for tokens with "doge" in the name
node scripts/four-meme.mjs search doge
```

## Output Format

All commands return JSON. Successful results include relevant data fields. Errors return:

```json
{
  "error": "Description of what went wrong"
}
```

## Notes

- Token addresses must be BNB Chain (BSC) addresses (checksummed or lowercase)
- `bnbAmount` for buy is in human-readable units (e.g., `0.1` = 0.1 BNB, not wei)
- `tokenAmount` for sell is in human-readable token units (decimals handled automatically)
- Bonding curve progress shows how close a token is to graduating to PancakeSwap
- Once a token graduates (100% bonding curve), trading moves to PancakeSwap — use the PancakeSwap skill instead
- Four.Meme applies a small fee on buys and sells through the bonding curve
- Always check token details and bonding curve progress before trading
- Default slippage tolerance for buy/sell is 5% (meme tokens are volatile)
