---
name: lista-dao
description: "Liquid staking for BNB via ListaDAO — stake BNB to receive slisBNB, earn staking rewards while maintaining DeFi liquidity. Manage staking positions, check rewards, and monitor validator performance on BNB Chain."
allowed-tools: Bash(lista-dao:*)
compatibility: "Requires BSC_PRIVATE_KEY and BSC_WALLET_ADDRESS env vars for staking transactions. BSC_RPC_URL optional. Network access to BSC RPC and Lista API required."
---

# ListaDAO Skill

Liquid staking for BNB via ListaDAO — stake BNB and receive slisBNB, a liquid staking derivative that earns staking rewards while remaining usable in DeFi.

## Overview

ListaDAO provides liquid staking for BNB Chain, allowing users to:
- **Stake** BNB and receive slisBNB (liquid staking token)
- **Earn** native BNB staking rewards (~3-5% APR)
- **Use** slisBNB in DeFi (lending, LP, collateral) while still earning staking yield
- **Unstake** slisBNB back to BNB (with unbonding period)

The slisBNB token appreciates in value relative to BNB over time as staking rewards accrue, meaning the slisBNB/BNB exchange rate continuously increases.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BSC_WALLET_ADDRESS` | Yes (for tx) | Your BSC wallet address |
| `BSC_PRIVATE_KEY` | Yes (for tx) | Private key for signing transactions |
| `BSC_RPC_URL` | No | Custom BSC RPC endpoint (default: bsc-dataseed1.binance.org) |

## Commands

### `stake <amount>` — Stake BNB for slisBNB

Stake BNB via the ListaDAO StakeManager contract. You receive slisBNB tokens proportional to the current exchange rate.

```bash
# Stake 1 BNB
node scripts/lista.mjs stake 1

# Stake 10 BNB
node scripts/lista.mjs stake 10

# Stake 0.5 BNB
node scripts/lista.mjs stake 0.5
```

**Output:** Transaction hash, amount of slisBNB received (estimated), exchange rate used.

**Note:** Minimum stake amount is 0.01 BNB.

### `unstake <amount>` — Unstake slisBNB to BNB

Request unstaking of slisBNB back to BNB. This initiates an unbonding period (typically 7-15 days).

```bash
# Unstake 1 slisBNB
node scripts/lista.mjs unstake 1

# Unstake 5 slisBNB
node scripts/lista.mjs unstake 5
```

**Output:** Transaction hash, estimated BNB to receive, unbonding period details.

**Note:** Unstaking has a cooldown period. For instant liquidity, consider swapping slisBNB on a DEX instead.

### `balance [address]` — Check slisBNB Balance

Check the slisBNB balance for a wallet address. Uses BSC_WALLET_ADDRESS if no address is provided.

```bash
# Check your own balance
node scripts/lista.mjs balance

# Check any address
node scripts/lista.mjs balance 0x1234...abcd
```

**Output:** slisBNB balance, equivalent BNB value based on current exchange rate.

### `exchange-rate` — Current slisBNB/BNB Exchange Rate

Get the current exchange rate between slisBNB and BNB. This rate increases over time as staking rewards accrue.

```bash
node scripts/lista.mjs exchange-rate
```

**Output:** Current exchange rate (1 slisBNB = X BNB), rate change over 24h/7d/30d (when available).

### `apr` — Current Staking APR

Get the current annualized staking reward rate for BNB liquid staking through ListaDAO.

```bash
node scripts/lista.mjs apr
```

**Output:** Current APR percentage, historical APR data if available.

### `validators` — List Validators

List the validators that ListaDAO delegates staked BNB to.

```bash
node scripts/lista.mjs validators
```

**Output:** Array of validator objects with name, address, delegation amount, commission rate, status.

### `rewards [address]` — Check Pending Rewards

Check accumulated staking rewards for a given address. Rewards are automatically reflected in the slisBNB exchange rate.

```bash
# Check your rewards
node scripts/lista.mjs rewards

# Check any address
node scripts/lista.mjs rewards 0x1234...abcd
```

**Output:** Accumulated rewards in BNB terms, current slisBNB value vs initial deposit value.

## Key Contracts

| Contract | Address |
|---|---|
| ListaStakeManager | `0x1adB950d8bB3dA4bE104211D5AB038628e477fE6` |
| slisBNB | `0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B` |

## Typical Workflows

### Basic Staking
1. `apr` — Check current staking APR
2. `exchange-rate` — See current slisBNB/BNB rate
3. `stake 10` — Stake 10 BNB
4. `balance` — Confirm slisBNB received

### Monitor Position
1. `balance` — Check slisBNB holdings
2. `exchange-rate` — See current conversion rate
3. `rewards` — Check accumulated rewards

### Exit Staking
1. `balance` — Check how much slisBNB you hold
2. `unstake 5` — Unstake 5 slisBNB
3. Wait for unbonding period (7-15 days)

### DeFi Composability

After staking BNB for slisBNB, you can use slisBNB in other DeFi protocols:
- Supply slisBNB as collateral on Venus Protocol for borrowing
- Provide slisBNB liquidity on PancakeSwap
- Use slisBNB in yield farming strategies on Beefy Finance

## How Liquid Staking Works

1. **Deposit:** You send BNB to the ListaDAO StakeManager contract
2. **Mint:** You receive slisBNB tokens at the current exchange rate
3. **Delegation:** ListaDAO delegates the BNB to trusted validators
4. **Rewards:** Validator rewards accrue, increasing the slisBNB/BNB exchange rate
5. **Withdraw:** When you unstake, you receive more BNB than you originally deposited

The key advantage over native staking is that slisBNB remains liquid and composable in DeFi, so you earn staking rewards while still being able to use your capital.

## Risk Considerations

- **Smart Contract Risk:** ListaDAO contracts have been audited but DeFi always carries risk.
- **Validator Risk:** If validators are slashed, slisBNB value could decrease.
- **Liquidity Risk:** During high unstaking demand, there may be delays.
- **Depeg Risk:** slisBNB could trade below its fair value on secondary markets during stress events.
- **Unbonding Period:** Direct unstaking takes 7-15 days; for instant liquidity, use DEX swaps (may incur slippage).
