---
name: dex-aggregator-bnb
description: "Best-price token swaps on BNB Chain via DEX aggregation — routes through PancakeSwap, THENA, BiSwap, and 50+ DEXes using 1inch and OpenOcean for optimal execution, slippage protection, and gas efficiency."
allowed-tools: Bash(dex-aggregator-bnb:*)
compatibility: "Requires BSC_PRIVATE_KEY and BSC_WALLET_ADDRESS for swaps. ONEINCH_API_KEY recommended for 1inch. BSC_RPC_URL optional."
---

# DEX Aggregator — BNB Chain Skill

Get best-price token swaps on BNB Chain by aggregating quotes from 1inch, OpenOcean, and 50+ DEXes including PancakeSwap, THENA, and BiSwap.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BSC_WALLET_ADDRESS` | Yes (for swaps) | Your BSC wallet address |
| `BSC_PRIVATE_KEY` | Yes (for swaps) | Private key for signing transactions |
| `ONEINCH_API_KEY` | Recommended | API key for 1inch (get from https://portal.1inch.dev) |
| `BSC_RPC_URL` | No | Custom BSC RPC endpoint (default: `https://bsc-dataseed1.binance.org`) |

## Aggregator APIs

| Aggregator | API Base | Auth |
|---|---|---|
| 1inch | `https://api.1inch.dev/swap/v6.0/56/` | API key in `Authorization` header |
| OpenOcean | `https://open-api.openocean.finance/v4/56/` | No auth required |

## Common BNB Chain Tokens

| Token | Address |
|---|---|
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| BUSD | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` |
| USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` |
| USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |
| CAKE | `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82` |
| ETH (BSC) | `0x2170Ed0880ac9A755fd29B2688956BD959F933F8` |
| BTCB | `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c` |
| THE | `0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11` |
| XRP (BSC) | `0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE` |

## Commands

### quote — Get best price across aggregators

Returns the best available price from all aggregators.

```bash
node scripts/dex-aggregator.mjs quote <tokenIn> <tokenOut> <amountIn>
```

**Examples:**
```bash
# Best quote for 1 BNB -> USDT
node scripts/dex-aggregator.mjs quote 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c 0x55d398326f99059fF775485246999027B3197955 1

# Best quote for 500 USDT -> CAKE
node scripts/dex-aggregator.mjs quote 0x55d398326f99059fF775485246999027B3197955 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82 500
```

### swap — Execute swap at best price

Executes a swap using the aggregator offering the best price.

```bash
node scripts/dex-aggregator.mjs swap <tokenIn> <tokenOut> <amountIn> [slippage=0.5]
```

**Examples:**
```bash
# Swap 0.5 BNB for USDT at best aggregated price
node scripts/dex-aggregator.mjs swap 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c 0x55d398326f99059fF775485246999027B3197955 0.5

# Swap 100 USDT for CAKE with 1% slippage
node scripts/dex-aggregator.mjs swap 0x55d398326f99059fF775485246999027B3197955 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82 100 1
```

### compare — Compare prices across aggregators

Shows quotes from each aggregator side by side for comparison.

```bash
node scripts/dex-aggregator.mjs compare <tokenIn> <tokenOut> <amountIn>
```

**Examples:**
```bash
# Compare 1inch vs OpenOcean for 10 BNB -> USDT
node scripts/dex-aggregator.mjs compare 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c 0x55d398326f99059fF775485246999027B3197955 10

# Compare aggregators for 1000 USDT -> ETH
node scripts/dex-aggregator.mjs compare 0x55d398326f99059fF775485246999027B3197955 0x2170Ed0880ac9A755fd29B2688956BD959F933F8 1000
```

### approve — Approve token spending for an aggregator

Approves a specific aggregator's contract to spend your tokens.

```bash
node scripts/dex-aggregator.mjs approve <token> <spender>
```

**Examples:**
```bash
# Approve USDT for 1inch router
node scripts/dex-aggregator.mjs approve 0x55d398326f99059fF775485246999027B3197955 0x111111125421cA6dc452d289314280a0f8842A65

# Approve CAKE for OpenOcean exchange
node scripts/dex-aggregator.mjs approve 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82 0x6352a56caadC4F1E25CD6c75970Fa768A3304e64
```

### tokens — List popular BNB Chain tokens

Displays popular BNB Chain tokens with their addresses and symbols.

```bash
node scripts/dex-aggregator.mjs tokens
```

## Output Format

All commands return JSON. Successful results include relevant data fields. Errors return:

```json
{
  "error": "Description of what went wrong"
}
```

## Notes

- 1inch requires an API key (set `ONEINCH_API_KEY`). OpenOcean works without authentication
- The `compare` command is ideal for finding the best execution price before committing to a swap
- For native BNB, use the WBNB address or the 1inch native token placeholder `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`
- Default slippage is 0.5%. Higher slippage may be needed for low-liquidity tokens
- The `swap` command automatically selects the aggregator with the best quote
- Token approvals are per-spender; approve separately for 1inch and OpenOcean
- 1inch Router V6: `0x111111125421cA6dc452d289314280a0f8842A65`
- OpenOcean Exchange: `0x6352a56caadC4F1E25CD6c75970Fa768A3304e64`
