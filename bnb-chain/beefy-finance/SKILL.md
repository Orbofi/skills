---
name: beefy-finance
description: "Auto-compounding yield vaults on BNB Chain via Beefy Finance — browse 100+ yield strategies, deposit into vaults, track APY, and manage vault positions. Maximizes DeFi yields through automated compounding."
allowed-tools: Bash(beefy-finance:*)
compatibility: "Requires BSC_PRIVATE_KEY and BSC_WALLET_ADDRESS env vars for deposits/withdrawals. BSC_RPC_URL optional. Network access to BSC RPC and api.beefy.finance required."
---

# Beefy Finance Skill

Auto-compounding yield vaults on BNB Chain via Beefy Finance — the multi-chain yield optimizer with 100+ strategies on BSC.

## Overview

Beefy Finance is a decentralized yield optimizer that allows users to:
- **Deposit** assets into auto-compounding vaults
- **Earn** optimized yield through automated harvest and compound cycles
- **Browse** 100+ yield strategies across multiple DEXes and protocols on BSC
- **Track** APY, TVL, and vault performance across the entire Beefy ecosystem

Beefy vaults automatically harvest farm rewards and compound them back into the deposited position, saving gas fees and maximizing returns through the power of compounding.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BSC_WALLET_ADDRESS` | Yes (for tx) | Your BSC wallet address |
| `BSC_PRIVATE_KEY` | Yes (for tx) | Private key for signing transactions |
| `BSC_RPC_URL` | No | Custom BSC RPC endpoint (default: bsc-dataseed1.binance.org) |

## Commands

### `vaults [filter]` — List BNB Chain Vaults

List all active Beefy vaults on BNB Chain. Optionally filter by token name or platform.

```bash
# List all BSC vaults (top 50 by TVL)
node scripts/beefy.mjs vaults

# Filter vaults containing "USDT"
node scripts/beefy.mjs vaults USDT

# Filter vaults containing "CAKE"
node scripts/beefy.mjs vaults CAKE

# Filter vaults for "BNB"
node scripts/beefy.mjs vaults BNB
```

**Output:** Array of vault objects with id, name, token, platform, APY, TVL, status.

### `vault <vaultId>` — Detailed Vault Info

Get comprehensive details about a specific vault including APY breakdown, strategy address, TVL, and underlying tokens.

```bash
node scripts/beefy.mjs vault cake-cakev2-pool
node scripts/beefy.mjs vault pancake-bnb-usdt
```

**Output:** Detailed vault object with APY breakdown (base, reward, trading fees), strategy details, TVL, token addresses.

### `deposit <vaultAddress> <amount>` — Deposit into Vault

Deposit tokens into a Beefy vault. You receive mooTokens (vault shares) representing your deposit.

```bash
# Deposit 100 USDT into a vault
node scripts/beefy.mjs deposit 0x1234...abcd 100

# Deposit 1 BNB into a vault
node scripts/beefy.mjs deposit 0x1234...abcd 1
```

**Note:** You must first approve the vault contract to spend your tokens (use standard ERC-20 approve). The vault address is the Beefy vault contract, not the underlying token.

### `withdraw <vaultAddress> <amount>` — Withdraw from Vault

Withdraw your position from a Beefy vault. Converts your mooTokens back to the underlying asset.

```bash
# Withdraw specific amount of vault shares
node scripts/beefy.mjs withdraw 0x1234...abcd 50

# Withdraw entire position
node scripts/beefy.mjs withdraw 0x1234...abcd max
```

**Output:** Transaction hash, amount of underlying tokens received.

### `balance <vaultAddress> [address]` — Check Vault Balance

Check your mooToken balance in a specific vault and the equivalent underlying asset value.

```bash
# Check your balance in a vault
node scripts/beefy.mjs balance 0x1234...abcd

# Check any address
node scripts/beefy.mjs balance 0x1234...abcd 0x5678...efgh
```

**Output:** mooToken balance, underlying asset value based on pricePerFullShare.

### `tvl` — Total TVL Across BNB Chain

Get the total value locked across all Beefy vaults on BNB Chain.

```bash
node scripts/beefy.mjs tvl
```

**Output:** Total BSC TVL in USD, number of active vaults, top vaults by TVL.

### `apy <vaultId>` — Detailed APY Breakdown

Get a detailed APY breakdown for a specific vault, including base APY, reward APY, and trading fee APY.

```bash
node scripts/beefy.mjs apy cake-cakev2-pool
node scripts/beefy.mjs apy pancake-bnb-usdt
```

**Output:** APY breakdown object with totalApy, vaultApr, tradingApr, compoundingsPerYear, details on yield sources.

## How Beefy Vaults Work

1. **Deposit:** You deposit tokens (single asset or LP tokens) into a Beefy vault
2. **Strategy:** The vault's strategy contract farms rewards on the underlying protocol (PancakeSwap, Venus, etc.)
3. **Harvest:** Beefy bots regularly harvest earned rewards (CAKE, XVS, etc.)
4. **Compound:** Harvested rewards are sold and reinvested back into the vault position
5. **Growth:** Your mooToken shares represent a growing share of the vault's total assets

The `pricePerFullShare` value continuously increases as compounding occurs, meaning each mooToken is worth more underlying tokens over time.

## Typical Workflows

### Find and Enter a Vault
1. `vaults USDT` — Browse USDT-related vaults
2. `vault pancake-usdt-busd` — Get details on a specific vault
3. `apy pancake-usdt-busd` — Check detailed APY breakdown
4. `deposit 0xVaultAddress 1000` — Deposit 1000 tokens
5. `balance 0xVaultAddress` — Confirm deposit

### Monitor Position
1. `balance 0xVaultAddress` — Check current value
2. `apy vaultId` — Check if APY has changed
3. `tvl` — See overall Beefy BSC health

### Exit a Vault
1. `balance 0xVaultAddress` — Check how much you have
2. `withdraw 0xVaultAddress max` — Withdraw everything
3. `balance 0xVaultAddress` — Confirm zero balance

### Compare Yield Strategies
1. `vaults BNB` — List all BNB-related vaults
2. `apy vault-a` — Check APY for option A
3. `apy vault-b` — Check APY for option B
4. Choose the vault with better risk-adjusted yield

## Beefy API Endpoints

| Endpoint | Description |
|---|---|
| `GET /vaults` | All vaults across all chains |
| `GET /apy` | APY data for all vaults |
| `GET /tvl` | TVL data for all vaults |
| `GET /lps` | LP token prices |

Base URL: `https://api.beefy.finance`

## Risk Considerations

- **Smart Contract Risk:** Multiple layers of smart contracts (Beefy vault, strategy, underlying protocol). Each layer adds risk.
- **Strategy Risk:** Auto-compounding strategies could suffer from bugs or exploits in the harvest/compound logic.
- **Underlying Protocol Risk:** If the underlying farm (e.g., PancakeSwap) is exploited, vault deposits are affected.
- **Impermanent Loss:** LP vaults are subject to impermanent loss on the underlying LP position.
- **Reward Token Risk:** If reward tokens (CAKE, etc.) drop in price, APY decreases.
- **Gas Costs:** Small deposits may not be cost-effective relative to compounding benefits.
