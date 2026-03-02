---
name: bnb-chain-core
description: "Core BNB Chain (BSC) operations — wallet balances, BEP-20 token management, BNB transfers, gas estimation, transaction signing, and smart contract interaction on Binance Smart Chain."
allowed-tools: Bash(bnb-chain-core:*)
compatibility: "Requires BSC_PRIVATE_KEY and BSC_WALLET_ADDRESS env vars for write operations. BSC_RPC_URL optional (defaults to https://bsc-dataseed1.binance.org). BSCSCAN_API_KEY optional for enhanced features."
---

# BNB Chain Core Skill

## Overview

Core BNB Chain (BSC) operations including wallet balances, BEP-20 token management, BNB transfers, gas estimation, transaction signing, and smart contract interaction. All operations use raw JSON-RPC calls with pure JavaScript cryptography — zero npm dependencies.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BSC_PRIVATE_KEY` | For write ops | Private key (hex, with or without 0x prefix) |
| `BSC_WALLET_ADDRESS` | For write ops | Wallet address for signing transactions |
| `BSC_RPC_URL` | No | Custom BSC RPC endpoint (default: `https://bsc-dataseed1.binance.org`) |
| `BSCSCAN_API_KEY` | No | BscScan API key for enhanced features |

## Helper Script

All commands go through the helper script:

```bash
SCRIPT=".claude/skills/bnb-chain-core/scripts/bnb-core.mjs"
node $SCRIPT <command> [args...]
```

---

## Quick Start

### Check BNB balance
```bash
node $SCRIPT balance 0xYourAddress
```

### Check BEP-20 token balance
```bash
node $SCRIPT token-balance 0xWalletAddress 0xTokenContract
```

### Get current gas price
```bash
node $SCRIPT gas-price
```

### Get latest block number
```bash
node $SCRIPT block
```

---

## Commands Reference

### balance

Get the native BNB balance for any address.

```bash
node $SCRIPT balance <address>
```

**Example:**
```bash
node $SCRIPT balance 0x8894E0a0c962CB723c1ef8a1B748ad2bE396A3FF
```

**Output:**
```json
{
  "address": "0x8894E0a0c962CB723c1ef8a1B748ad2bE396A3FF",
  "balanceWei": "1500000000000000000",
  "balanceBNB": "1.5"
}
```

---

### token-balance

Get the BEP-20 token balance for a wallet address.

```bash
node $SCRIPT token-balance <walletAddress> <tokenContractAddress>
```

**Example (BUSD):**
```bash
node $SCRIPT token-balance 0xYourWallet 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
```

**Output:**
```json
{
  "wallet": "0xYourWallet",
  "token": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  "symbol": "BUSD",
  "decimals": 18,
  "rawBalance": "100000000000000000000",
  "formattedBalance": "100.0"
}
```

---

### transfer

Send BNB to an address. Requires `BSC_PRIVATE_KEY` and `BSC_WALLET_ADDRESS`.

```bash
node $SCRIPT transfer <toAddress> <amountInBNB>
```

**Example:**
```bash
node $SCRIPT transfer 0xRecipientAddress 0.1
```

**Output:**
```json
{
  "txHash": "0xabc123...",
  "from": "0xYourWallet",
  "to": "0xRecipientAddress",
  "valueBNB": "0.1",
  "gasPrice": "3000000000",
  "gasLimit": "21000"
}
```

---

### token-transfer

Send BEP-20 tokens to an address. Requires `BSC_PRIVATE_KEY` and `BSC_WALLET_ADDRESS`.

```bash
node $SCRIPT token-transfer <tokenContract> <toAddress> <amount>
```

**Example (send 50 BUSD):**
```bash
node $SCRIPT token-transfer 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56 0xRecipient 50
```

**Output:**
```json
{
  "txHash": "0xdef456...",
  "from": "0xYourWallet",
  "to": "0xRecipient",
  "token": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  "amount": "50",
  "gasPrice": "3000000000",
  "gasLimit": "60000"
}
```

---

### gas-price

Get the current gas price on BSC.

```bash
node $SCRIPT gas-price
```

**Output:**
```json
{
  "gasPriceWei": "3000000000",
  "gasPriceGwei": "3.0"
}
```

---

### tx-status

Check the receipt/status of a transaction.

```bash
node $SCRIPT tx-status <txHash>
```

**Example:**
```bash
node $SCRIPT tx-status 0xabc123def456...
```

**Output:**
```json
{
  "txHash": "0xabc123def456...",
  "status": "success",
  "blockNumber": 12345678,
  "gasUsed": "21000",
  "from": "0x...",
  "to": "0x..."
}
```

---

### call

Make a read-only `eth_call` to any smart contract.

```bash
node $SCRIPT call <contractAddress> <dataHex>
```

**Example (call balanceOf on a token):**
```bash
node $SCRIPT call 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56 0x70a08231000000000000000000000000YourAddressWithoutPrefix
```

**Output:**
```json
{
  "contract": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  "result": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000"
}
```

---

### nonce

Get the current transaction count (nonce) for an address.

```bash
node $SCRIPT nonce <address>
```

**Output:**
```json
{
  "address": "0xYourAddress",
  "nonce": 42
}
```

---

### block

Get the latest block number.

```bash
node $SCRIPT block
```

**Output:**
```json
{
  "blockNumber": 34567890,
  "blockNumberHex": "0x20f5a52"
}
```

---

## Common BEP-20 Token Addresses on BSC

| Token | Contract Address |
|-------|------------------|
| BUSD | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` |
| USDT | `0x55d398326f99059fF775485246999027B3197955` |
| USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| CAKE | `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82` |
| ETH (BSC) | `0x2170Ed0880ac9A755fd29B2688956BD959F933F8` |
| BTCB | `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c` |

## Workflow Examples

### Check wallet health
```bash
SCRIPT=".claude/skills/bnb-chain-core/scripts/bnb-core.mjs"

# Check BNB balance
node $SCRIPT balance 0xYourAddress

# Check USDT balance
node $SCRIPT token-balance 0xYourAddress 0x55d398326f99059fF775485246999027B3197955

# Check gas price
node $SCRIPT gas-price
```

### Send tokens workflow
```bash
SCRIPT=".claude/skills/bnb-chain-core/scripts/bnb-core.mjs"

# 1. Check balance first
node $SCRIPT balance 0xYourAddress

# 2. Check gas price
node $SCRIPT gas-price

# 3. Send BNB
node $SCRIPT transfer 0xRecipient 0.5

# 4. Verify the transaction
node $SCRIPT tx-status 0xTxHashFromStep3
```

### Monitor a transaction
```bash
SCRIPT=".claude/skills/bnb-chain-core/scripts/bnb-core.mjs"

# Check if transaction was mined and succeeded
node $SCRIPT tx-status 0xYourTxHash
```

## Error Handling

All errors are returned as JSON:

```json
{
  "error": "Description of what went wrong"
}
```

Common errors:
- `"Missing BSC_PRIVATE_KEY environment variable"` — Set the private key for write operations
- `"Missing BSC_WALLET_ADDRESS environment variable"` — Set the wallet address for write operations
- `"Insufficient balance"` — Not enough BNB or tokens for the transaction
- `"Transaction failed"` — The transaction was reverted on-chain

## Important Notes

- BSC chain ID is **56** (mainnet). All transactions are signed with EIP-155 replay protection.
- Default gas limit for BNB transfers is **21000**. Token transfers use **60000**.
- Gas price is fetched dynamically from the RPC node.
- All amounts are handled with BigInt precision to avoid floating-point errors.
- The script includes a pure JavaScript Keccak-256 and secp256k1 implementation for transaction signing — no external dependencies required.
