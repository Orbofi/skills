---
name: stargate-bridge
description: "Cross-chain asset bridging to and from BNB Chain via Stargate Finance and LayerZero — bridge USDT, USDC, ETH, and other assets between BNB Chain, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, and more with fast finality."
allowed-tools: Bash(stargate-bridge:*)
compatibility: "Requires BSC_PRIVATE_KEY and BSC_WALLET_ADDRESS env vars for bridge transactions. BSC_RPC_URL optional. Network access to BSC RPC and Stargate API required."
---

# Stargate Bridge — Cross-Chain Bridging via LayerZero

Bridge assets between BNB Chain and other major EVM chains through Stargate Finance, powered by LayerZero's omnichain messaging protocol. Transfer USDT, USDC, ETH, and other supported tokens with fast finality and unified liquidity.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BSC_WALLET_ADDRESS` | Yes (for bridging) | Your BSC wallet address |
| `BSC_PRIVATE_KEY` | Yes (for bridging) | Private key for signing bridge transactions |
| `BSC_RPC_URL` | No | Custom BSC RPC endpoint (default: `https://bsc-dataseed1.binance.org`) |

## Key Contracts (BSC)

| Contract | Address |
|---|---|
| Stargate Router | `0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8` |
| USDT Pool (Pool ID: 2) | `0x9aA83081AA06AF7208Dcc7A4cB72C94d057D2cda` |
| USDC Pool (Pool ID: 1) | `0x98a5737749490856b401DB5Dc27F522fC314A4e1` |
| USDT (BSC) | `0x55d398326f99059fF775485246999027B3197955` |
| USDC (BSC) | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |

## Supported Chains

| Chain | LayerZero Chain ID |
|---|---|
| BNB Chain (BSC) | 102 |
| Ethereum | 101 |
| Arbitrum | 110 |
| Optimism | 111 |
| Polygon | 109 |
| Avalanche | 106 |

## Commands

### routes — List supported bridge routes

Returns all available bridge routes from/to BNB Chain, including supported tokens and destination chains.

```bash
node scripts/stargate.mjs routes
```

**Example output:**
```json
{
  "command": "routes",
  "routes": [
    {
      "srcChain": "BSC",
      "srcChainId": 102,
      "dstChain": "Ethereum",
      "dstChainId": 101,
      "token": "USDT",
      "poolId": 2
    }
  ]
}
```

### quote — Get a bridge quote

Returns estimated fees, output amount, and estimated transfer time for a bridge transaction.

```bash
node scripts/stargate.mjs quote <token> <destChain> <amount>
```

**Parameters:**
- `token` — Token symbol (`USDT`, `USDC`) or token address
- `destChain` — Destination chain name (`ethereum`, `arbitrum`, `optimism`, `polygon`, `avalanche`) or LayerZero chain ID
- `amount` — Amount in human-readable units (e.g., `100` = 100 USDT)

**Examples:**
```bash
# Quote bridging 100 USDT from BSC to Ethereum
node scripts/stargate.mjs quote USDT ethereum 100

# Quote bridging 500 USDC from BSC to Arbitrum
node scripts/stargate.mjs quote USDC arbitrum 500

# Quote using chain ID instead of name
node scripts/stargate.mjs quote USDT 101 1000
```

**Example output:**
```json
{
  "command": "quote",
  "token": "USDT",
  "srcChain": "BSC",
  "dstChain": "Ethereum",
  "amountIn": "100",
  "estimatedAmountOut": "99.85",
  "nativeFee": "0.002 BNB",
  "layerZeroFee": "0.0015 BNB",
  "estimatedTime": "1-3 minutes"
}
```

### bridge — Execute a bridge transfer

Sends tokens from BNB Chain to the destination chain through Stargate. Requires `BSC_PRIVATE_KEY` and `BSC_WALLET_ADDRESS`.

```bash
node scripts/stargate.mjs bridge <token> <destChain> <amount> <destAddress>
```

**Parameters:**
- `token` — Token symbol (`USDT`, `USDC`) or token address
- `destChain` — Destination chain name or LayerZero chain ID
- `amount` — Amount in human-readable units
- `destAddress` — Recipient address on the destination chain

**Examples:**
```bash
# Bridge 100 USDT from BSC to Ethereum
node scripts/stargate.mjs bridge USDT ethereum 100 0xYourEthAddress

# Bridge 500 USDC from BSC to Arbitrum
node scripts/stargate.mjs bridge USDC arbitrum 500 0xYourArbAddress

# Bridge to your same address on Optimism
node scripts/stargate.mjs bridge USDT optimism 200 0xYourAddress
```

**Example output:**
```json
{
  "command": "bridge",
  "token": "USDT",
  "srcChain": "BSC",
  "dstChain": "Ethereum",
  "amount": "100",
  "destAddress": "0x...",
  "txHash": "0x...",
  "nativeFeePaid": "0.002 BNB",
  "gasUsed": "350000",
  "status": "submitted"
}
```

### status — Check bridge transaction status

Checks the status of a previously submitted bridge transaction using the LayerZero scan API.

```bash
node scripts/stargate.mjs status <txHash>
```

**Examples:**
```bash
# Check status of a bridge transaction
node scripts/stargate.mjs status 0xabc123def456...
```

**Example output:**
```json
{
  "command": "status",
  "txHash": "0x...",
  "srcChain": "BSC",
  "dstChain": "Ethereum",
  "status": "DELIVERED",
  "srcTxHash": "0x...",
  "dstTxHash": "0x...",
  "created": "2025-01-15T12:00:00Z",
  "completed": "2025-01-15T12:02:30Z"
}
```

### fees — Get estimated bridge fees

Returns a breakdown of fees for bridging a specific token to a destination chain.

```bash
node scripts/stargate.mjs fees <token> <destChain>
```

**Examples:**
```bash
# Check fees for bridging USDT to Ethereum
node scripts/stargate.mjs fees USDT ethereum

# Check fees for bridging USDC to Arbitrum
node scripts/stargate.mjs fees USDC arbitrum
```

**Example output:**
```json
{
  "command": "fees",
  "token": "USDT",
  "srcChain": "BSC",
  "dstChain": "Ethereum",
  "nativeFee": "0.002 BNB",
  "nativeFeeUsd": "1.20",
  "protocolFee": "0.06%",
  "estimatedProtocolFee": "0.06 USDT"
}
```

### balance — Check balances of bridgeable tokens

Returns balances of all Stargate-bridgeable tokens for a given address (defaults to your wallet).

```bash
node scripts/stargate.mjs balance [address]
```

**Examples:**
```bash
# Check your own bridgeable token balances
node scripts/stargate.mjs balance

# Check another address
node scripts/stargate.mjs balance 0x1234567890abcdef1234567890abcdef12345678
```

**Example output:**
```json
{
  "command": "balance",
  "address": "0x...",
  "balances": {
    "BNB": "1.5",
    "USDT": "500.00",
    "USDC": "250.00"
  }
}
```

## Output Format

All commands return JSON. Successful results include relevant data fields. Errors return:

```json
{
  "error": "Description of what went wrong"
}
```

## Notes

- Bridge transactions require BNB for gas fees plus LayerZero messaging fees (paid in BNB on BSC)
- Token amounts are in human-readable units (e.g., `100` = 100 USDT, not wei)
- The script automatically handles token approval before bridging
- Transfer times vary by destination chain: Ethereum ~2-5 min, L2s ~1-3 min
- Minimum bridge amounts apply depending on the token and route
- Use the `quote` command before bridging to see exact fees and expected output
- The `status` command queries LayerZero scan for cross-chain message tracking
- Destination address must be a valid address on the destination chain
- Stargate uses unified liquidity pools, so slippage is typically very low for popular routes
