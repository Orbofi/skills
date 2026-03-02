---
name: pancakeswap
description: "Trade tokens, provide liquidity, and farm on PancakeSwap — BNB Chain's largest DEX with $2B+ TVL. Get price quotes, execute swaps via PancakeSwap Router V3, check pool info, and manage LP positions."
allowed-tools: Bash(pancakeswap:*)
compatibility: "Requires BSC_PRIVATE_KEY and BSC_WALLET_ADDRESS env vars for swaps. BSC_RPC_URL optional. Network access to BSC RPC and PancakeSwap API required."
---

# PancakeSwap — BNB Chain DEX Skill

Trade tokens, get quotes, check prices, and manage liquidity on PancakeSwap, BNB Chain's largest decentralized exchange.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BSC_WALLET_ADDRESS` | Yes (for swaps) | Your BSC wallet address |
| `BSC_PRIVATE_KEY` | Yes (for swaps) | Private key for signing transactions |
| `BSC_RPC_URL` | No | Custom BSC RPC endpoint (default: `https://bsc-dataseed1.binance.org`) |

## Key Contracts

| Contract | Address |
|---|---|
| PancakeSwap Router V3 | `0x13f4EA83D0bd40E75C8222255bc855a974568Dd4` |
| PancakeSwap Factory V3 | `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865` |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| BUSD | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` |
| USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` |

## Commands

### quote — Get a swap quote

Returns price estimate, expected output amount, and route info for a token swap.

```bash
node scripts/pancakeswap.mjs quote <tokenIn> <tokenOut> <amountIn>
```

**Examples:**
```bash
# Quote swapping 1 BNB for USDT
node scripts/pancakeswap.mjs quote 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c 0x55d398326f99059fF775485246999027B3197955 1

# Quote swapping 100 USDT for BUSD
node scripts/pancakeswap.mjs quote 0x55d398326f99059fF775485246999027B3197955 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56 100
```

### swap — Execute a token swap

Executes an on-chain swap through the PancakeSwap Router V3. Requires `BSC_PRIVATE_KEY` and `BSC_WALLET_ADDRESS`.

```bash
node scripts/pancakeswap.mjs swap <tokenIn> <tokenOut> <amountIn> [slippage=0.5]
```

**Examples:**
```bash
# Swap 0.1 BNB for USDT with default 0.5% slippage
node scripts/pancakeswap.mjs swap 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c 0x55d398326f99059fF775485246999027B3197955 0.1

# Swap 50 USDT for BNB with 1% slippage
node scripts/pancakeswap.mjs swap 0x55d398326f99059fF775485246999027B3197955 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c 50 1
```

### pools — List top liquidity pools

Fetches top PancakeSwap liquidity pools, optionally filtered by token.

```bash
node scripts/pancakeswap.mjs pools [token]
```

**Examples:**
```bash
# List top PancakeSwap pools
node scripts/pancakeswap.mjs pools

# List pools containing USDT
node scripts/pancakeswap.mjs pools 0x55d398326f99059fF775485246999027B3197955
```

### price — Get token price in USD

Returns the current USD price for any BNB Chain token.

```bash
node scripts/pancakeswap.mjs price <token>
```

**Examples:**
```bash
# Get WBNB price
node scripts/pancakeswap.mjs price 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c

# Get CAKE price
node scripts/pancakeswap.mjs price 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82
```

### approve — Approve token for Router spending

Approves the PancakeSwap Router to spend your tokens. Must be done before swapping non-native tokens.

```bash
node scripts/pancakeswap.mjs approve <token> [amount]
```

**Examples:**
```bash
# Approve unlimited USDT for PancakeSwap Router
node scripts/pancakeswap.mjs approve 0x55d398326f99059fF775485246999027B3197955

# Approve exactly 100 USDT
node scripts/pancakeswap.mjs approve 0x55d398326f99059fF775485246999027B3197955 100
```

### pairs — Get trading pairs for a token

Returns available trading pairs for a given token on PancakeSwap.

```bash
node scripts/pancakeswap.mjs pairs <token>
```

**Examples:**
```bash
# Get pairs for CAKE
node scripts/pancakeswap.mjs pairs 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82

# Get pairs for WBNB
node scripts/pancakeswap.mjs pairs 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
```

## Output Format

All commands return JSON. Successful results include relevant data fields. Errors return:

```json
{
  "error": "Description of what went wrong"
}
```

## Notes

- Token addresses must be checksummed or lowercase BNB Chain (BSC) addresses
- `amountIn` is in human-readable units (e.g., `1` = 1 BNB, not `1000000000000000000` wei)
- The script automatically handles decimal conversion using on-chain `decimals()` calls
- For native BNB swaps, use the WBNB address: `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`
- Default slippage is 0.5%. Adjust for volatile tokens
