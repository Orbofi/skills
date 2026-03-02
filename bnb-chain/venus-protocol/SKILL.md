---
name: venus-protocol
description: "Supply, borrow, and manage lending positions on Venus Protocol — BNB Chain's #1 lending platform with $2.5B TVL. Monitor health factor, claim XVS rewards, check interest rates, and manage collateral."
allowed-tools: Bash(venus-protocol:*)
compatibility: "Requires BSC_PRIVATE_KEY and BSC_WALLET_ADDRESS env vars for transactions. BSC_RPC_URL optional. Network access to BSC RPC required."
---

# Venus Protocol Skill

Interact with Venus Protocol on BNB Chain — the leading lending/borrowing platform with $2.5B+ TVL.

## Overview

Venus Protocol is a decentralized money market on BNB Chain that allows users to:
- **Supply** assets to earn interest (receive vTokens as receipts)
- **Borrow** assets against supplied collateral
- **Monitor** health factor to avoid liquidation
- **Earn** XVS governance token rewards

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BSC_WALLET_ADDRESS` | Yes (for tx) | Your BSC wallet address |
| `BSC_PRIVATE_KEY` | Yes (for tx) | Private key for signing transactions |
| `BSC_RPC_URL` | No | Custom BSC RPC endpoint (default: bsc-dataseed1.binance.org) |

## Commands

### `markets` — List All Venus Markets

Shows all major Venus markets with current supply/borrow APY and total supply/borrow amounts.

```bash
node scripts/venus.mjs markets
```

**Output:** Array of market objects with symbol, supplyAPY, borrowAPY, totalSupply, totalBorrow.

### `account [address]` — Get Account Summary

Retrieves a comprehensive account overview including all supplied and borrowed positions, plus health factor.

```bash
# Check your own account (uses BSC_WALLET_ADDRESS)
node scripts/venus.mjs account

# Check any address
node scripts/venus.mjs account 0x1234...abcd
```

**Output:** Object with supplied positions, borrowed positions, total collateral value, total borrow value, and health factor.

### `supply <vToken> <amount>` — Supply Assets

Supply assets to Venus to earn interest. You receive vTokens representing your deposit.

```bash
# Supply 1 BNB to Venus
node scripts/venus.mjs supply vBNB 1

# Supply 100 USDT to Venus
node scripts/venus.mjs supply vUSDT 100

# Supply 0.01 BTC
node scripts/venus.mjs supply vBTC 0.01
```

**Note:** For ERC-20 tokens (not BNB), you must first approve the vToken contract to spend your tokens using the `approve` command.

### `withdraw <vToken> <amount>` — Withdraw Assets

Withdraw previously supplied assets by redeeming your vTokens.

```bash
# Withdraw 1 BNB worth of supply
node scripts/venus.mjs withdraw vBNB 1

# Withdraw 50 USDT
node scripts/venus.mjs withdraw vUSDT 50
```

**Warning:** Withdrawing collateral reduces your health factor. Check health factor first to avoid liquidation risk.

### `borrow <vToken> <amount>` — Borrow Assets

Borrow assets against your supplied collateral.

```bash
# Borrow 100 USDT
node scripts/venus.mjs borrow vUSDT 100

# Borrow 0.5 BNB
node scripts/venus.mjs borrow vBNB 0.5
```

**Warning:** Maintain a health factor above 1.0 to avoid liquidation. Recommended minimum: 1.5.

### `repay <vToken> <amount>` — Repay Borrowed Assets

Repay outstanding borrows to increase your health factor.

```bash
# Repay 50 USDT of borrow
node scripts/venus.mjs repay vUSDT 50

# Repay 0.1 BNB of borrow
node scripts/venus.mjs repay vBNB 0.1
```

### `rates <vToken>` — Get Market Interest Rates

Get detailed supply and borrow APY for a specific Venus market.

```bash
node scripts/venus.mjs rates vUSDT
node scripts/venus.mjs rates vBNB
```

**Output:** Object with supplyAPY, borrowAPY, supplyRatePerBlock, borrowRatePerBlock, utilizationRate.

### `approve <token> <vToken>` — Approve Token Spending

Approve a vToken contract to spend your underlying tokens. Required before supplying ERC-20 tokens.

```bash
# Approve vUSDT to spend your USDT
node scripts/venus.mjs approve USDT vUSDT

# Approve vBUSD to spend your BUSD
node scripts/venus.mjs approve BUSD vBUSD
```

## Key Contracts

| Contract | Address |
|---|---|
| Comptroller | `0xfD36E2c2a6789Db23113685031d7F16329158384` |
| vBNB | `0xA07c5b74C9B40447a954e1466938b865b6BBea36` |
| vUSDT | `0xfD5840Cd36d94D7229439859C0112a4185BC0255` |
| vBUSD | `0x95c78222B3D6e262dCeD264F5A72EE7fC5E89c0a` |
| vUSDC | `0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8` |
| vBTC | `0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B` |
| vETH | `0xf508fCD89b8bd15579dc79A6827cB4686A3592c8` |
| XVS | `0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63` |

## Typical Workflows

### Earn Interest on Stablecoins
1. `approve USDT vUSDT` — Approve USDT spending
2. `supply vUSDT 1000` — Supply 1000 USDT
3. `rates vUSDT` — Check your APY
4. `account` — Monitor your position

### Leverage Borrow
1. `supply vBNB 10` — Supply 10 BNB as collateral
2. `account` — Check available borrow capacity
3. `borrow vUSDT 500` — Borrow 500 USDT
4. `account` — Monitor health factor regularly

### Repay and Exit
1. `repay vUSDT 500` — Repay all borrowed USDT
2. `account` — Confirm zero borrows
3. `withdraw vBNB 10` — Withdraw all BNB collateral

## Risk Considerations

- **Liquidation Risk:** If health factor drops below 1.0, your collateral can be liquidated. Keep it above 1.5 for safety.
- **Interest Rate Risk:** Borrow rates are variable and can increase during high utilization.
- **Smart Contract Risk:** Venus has been audited but DeFi always carries smart contract risk.
- **Oracle Risk:** Price feeds could malfunction, affecting collateral valuations.
