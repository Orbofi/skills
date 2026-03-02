---
name: thena-dex
description: "Trade and provide liquidity on THENA — BNB Chain's leading ve(3,3) DEX. Execute swaps, manage LP positions, participate in gauge voting, and earn THE token rewards through bribes."
allowed-tools: Bash(thena-dex:*)
compatibility: "Requires BSC_PRIVATE_KEY and BSC_WALLET_ADDRESS env vars for transactions. BSC_RPC_URL optional. Network access to BSC RPC and THENA API required."
---

# THENA DEX — BNB Chain ve(3,3) DEX Skill

Trade tokens, manage liquidity, and earn rewards on THENA, BNB Chain's leading ve(3,3) decentralized exchange.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BSC_WALLET_ADDRESS` | Yes (for swaps) | Your BSC wallet address |
| `BSC_PRIVATE_KEY` | Yes (for swaps) | Private key for signing transactions |
| `BSC_RPC_URL` | No | Custom BSC RPC endpoint (default: `https://bsc-dataseed1.binance.org`) |

## Key Contracts

| Contract | Address |
|---|---|
| THENA Router | `0xd4ae6eCA985340Dd434D38F470aCCce4DC78D109` |
| THE Token | `0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11` |
| veTHE | `0xfBBF371C9B0B994EebFcC977CEf603F7f31c070D` |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| BUSD | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` |
| USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` |

## API

THENA API base URL: `https://api.thena.fi/api/v1/`

## Commands

### quote — Get a swap quote

Returns a price estimate and expected output for a THENA swap.

```bash
node scripts/thena.mjs quote <tokenIn> <tokenOut> <amountIn>
```

**Examples:**
```bash
# Quote swapping 1 BNB for USDT via THENA
node scripts/thena.mjs quote 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c 0x55d398326f99059fF775485246999027B3197955 1

# Quote swapping 100 USDT for THE
node scripts/thena.mjs quote 0x55d398326f99059fF775485246999027B3197955 0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11 100
```

### swap — Execute a token swap

Executes an on-chain swap through the THENA Router. Supports both stable and volatile pairs.

```bash
node scripts/thena.mjs swap <tokenIn> <tokenOut> <amountIn> [slippage=0.5]
```

**Examples:**
```bash
# Swap 0.5 BNB for USDT with default 0.5% slippage
node scripts/thena.mjs swap 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c 0x55d398326f99059fF775485246999027B3197955 0.5

# Swap 200 USDT for THE with 1% slippage
node scripts/thena.mjs swap 0x55d398326f99059fF775485246999027B3197955 0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11 200 1
```

### pools — List top THENA pools with APRs

Fetches top THENA liquidity pools with TVL, APR, and fee information.

```bash
node scripts/thena.mjs pools
```

**Examples:**
```bash
# List top THENA pools
node scripts/thena.mjs pools
```

### price — Get token price in USD

Returns the current USD price for a BNB Chain token using THENA pool data.

```bash
node scripts/thena.mjs price <token>
```

**Examples:**
```bash
# Get THE token price
node scripts/thena.mjs price 0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11

# Get WBNB price
node scripts/thena.mjs price 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
```

### approve — Approve token for THENA Router spending

Approves the THENA Router to spend your tokens. Required before swapping non-native tokens.

```bash
node scripts/thena.mjs approve <token>
```

**Examples:**
```bash
# Approve USDT for THENA Router
node scripts/thena.mjs approve 0x55d398326f99059fF775485246999027B3197955

# Approve THE token for THENA Router
node scripts/thena.mjs approve 0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11
```

## Output Format

All commands return JSON. Successful results include relevant data fields. Errors return:

```json
{
  "error": "Description of what went wrong"
}
```

## Notes

- THENA uses a ve(3,3) model inspired by Solidly — liquidity providers earn THE token rewards
- THENA Router supports both volatile and stable swap types. The script auto-detects the best route
- Token addresses must be valid BNB Chain (BSC) addresses
- `amountIn` is in human-readable units (e.g., `1` = 1 BNB)
- For native BNB, use WBNB address: `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`
- Default slippage is 0.5%
- THENA supports both Algebra-style concentrated liquidity (FUSION) and classic AMM pools
