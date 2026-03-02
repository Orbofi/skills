---
name: goplus-security
description: "Token security analysis for BNB Chain (BSC) — honeypot detection, rug pull scanning, contract auditing, malicious address detection, and token approval risk checks via GoPlus Security API."
allowed-tools: Bash(goplus-security:*)
compatibility: "No wallet required. Read-only security analysis. GOPLUS_API_KEY optional for higher rate limits. Network access to api.gopluslabs.io required."
---

# GoPlus Security Skill

## Overview

Token security analysis for BNB Chain (BSC) via the GoPlus Security API. Provides honeypot detection, rug pull scanning, contract auditing, malicious address detection, and token approval risk checks. This is a read-only skill that requires no wallet or private key.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOPLUS_API_KEY` | No | GoPlus API key for higher rate limits (free tier works without it) |

## Helper Script

All commands go through the helper script:

```bash
SCRIPT=".claude/skills/goplus-security/scripts/goplus.mjs"
node $SCRIPT <command> [args...]
```

---

## Quick Start

### Check if a token is a honeypot
```bash
node $SCRIPT token-security 0xTokenContractAddress
```

### Check if an address is malicious
```bash
node $SCRIPT address-security 0xSomeAddress
```

### Check token approval risks
```bash
node $SCRIPT approval-security 0xYourWalletAddress
```

---

## Commands Reference

### token-security

Full token security analysis. Checks for honeypot, hidden owner, tax manipulation, rug pull indicators, and more.

```bash
node $SCRIPT token-security <contractAddress>
```

**Example (check BUSD):**
```bash
node $SCRIPT token-security 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
```

**Output fields include:**
```json
{
  "token": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  "tokenName": "BUSD Token",
  "tokenSymbol": "BUSD",
  "isHoneypot": false,
  "buyTax": "0",
  "sellTax": "0",
  "isOpenSource": true,
  "isProxy": false,
  "isMintable": false,
  "canTakeBackOwnership": false,
  "ownerChangeBalance": false,
  "hiddenOwner": false,
  "selfDestruct": false,
  "externalCall": false,
  "holderCount": 1234567,
  "totalSupply": "...",
  "creatorAddress": "0x...",
  "ownerAddress": "0x...",
  "lpHolderCount": 100,
  "lpTotalSupply": "...",
  "isTrueToken": true,
  "isAirdropScam": false,
  "trustList": true
}
```

**Key security flags:**
| Flag | Meaning |
|------|---------|
| `isHoneypot` | Cannot sell after buying — critical red flag |
| `buyTax` / `sellTax` | High tax (>10%) is suspicious |
| `isOpenSource` | Contract source code is verified |
| `isMintable` | Owner can mint unlimited tokens |
| `canTakeBackOwnership` | Owner can reclaim ownership after renouncing |
| `ownerChangeBalance` | Owner can modify token balances |
| `hiddenOwner` | Contract has a hidden owner mechanism |
| `selfDestruct` | Contract can self-destruct |
| `isProxy` | Contract uses a proxy (can be upgraded) |

---

### address-security

Check if a wallet address is associated with malicious activity.

```bash
node $SCRIPT address-security <address>
```

**Example:**
```bash
node $SCRIPT address-security 0xSuspiciousAddress
```

**Output:**
```json
{
  "address": "0xSuspiciousAddress",
  "isMaliciousAddress": false,
  "isContractAddress": false,
  "dataSource": "GoPlus",
  "details": {
    "phishing_activities": false,
    "stealing_attack": false,
    "blackmail_activities": false,
    "cybercrime": false,
    "money_laundering": false,
    "financial_crime": false
  }
}
```

---

### approval-security

Check token approvals for a wallet address to identify risky or unlimited approvals.

```bash
node $SCRIPT approval-security <walletAddress>
```

**Example:**
```bash
node $SCRIPT approval-security 0xYourWalletAddress
```

**Output includes:**
```json
{
  "address": "0xYourWalletAddress",
  "approvals": [
    {
      "tokenAddress": "0x...",
      "tokenName": "SomeToken",
      "spender": "0x...",
      "allowance": "unlimited",
      "riskLevel": "high"
    }
  ]
}
```

---

### nft-security

Check an NFT contract for security risks.

```bash
node $SCRIPT nft-security <contractAddress>
```

**Example:**
```bash
node $SCRIPT nft-security 0xNFTContractAddress
```

**Output:**
```json
{
  "contract": "0xNFTContractAddress",
  "isOpenSource": true,
  "isProxy": false,
  "isMintable": true,
  "canTakeBackOwnership": false,
  "selfDestruct": false,
  "transferWithoutApproval": false,
  "privilegedBurn": false,
  "privilegedMinting": true
}
```

---

### dapp-security

Check if a dApp URL is known to be malicious or a phishing site.

```bash
node $SCRIPT dapp-security <url>
```

**Example:**
```bash
node $SCRIPT dapp-security "https://suspicious-dapp.com"
```

**Output:**
```json
{
  "url": "https://suspicious-dapp.com",
  "isPhishing": true,
  "riskLevel": "high",
  "details": "Known phishing site targeting DeFi users"
}
```

---

## Workflow Examples

### Due diligence on a new token
```bash
SCRIPT=".claude/skills/goplus-security/scripts/goplus.mjs"

# 1. Check token security (honeypot, tax, ownership)
node $SCRIPT token-security 0xNewTokenContract

# 2. Check the deployer address
node $SCRIPT address-security 0xDeployerAddress

# 3. Check if the token contract is also the deployer (suspicious pattern)
node $SCRIPT address-security 0xNewTokenContract
```

### Audit your wallet approvals
```bash
SCRIPT=".claude/skills/goplus-security/scripts/goplus.mjs"

# Check all token approvals for risks
node $SCRIPT approval-security 0xYourWallet
```

### Verify a dApp before connecting
```bash
SCRIPT=".claude/skills/goplus-security/scripts/goplus.mjs"

# Check if the dApp URL is safe
node $SCRIPT dapp-security "https://some-defi-app.com"
```

### Red flag checklist for a token
```bash
SCRIPT=".claude/skills/goplus-security/scripts/goplus.mjs"
RESULT=$(node $SCRIPT token-security 0xTokenAddress)

# Key things to look for in the output:
# - isHoneypot: true      → CRITICAL: Cannot sell
# - buyTax/sellTax > 10%  → HIGH: Excessive tax
# - isMintable: true      → MEDIUM: Owner can inflate supply
# - hiddenOwner: true     → HIGH: Hidden control
# - isProxy: true         → MEDIUM: Contract can be changed
# - isOpenSource: false   → MEDIUM: Unverified code
```

## Error Handling

All errors are returned as JSON:

```json
{
  "error": "Description of what went wrong"
}
```

Common errors:
- `"Invalid contract address"` — Address format is incorrect
- `"No data found"` — Token/address not indexed by GoPlus
- `"Rate limited"` — Too many requests; use GOPLUS_API_KEY for higher limits
- `"Network error"` — Cannot reach GoPlus API

## Important Notes

- This skill is **read-only** — it never sends transactions or requires a private key.
- BSC chain ID used for all queries: **56**.
- GoPlus API is free to use but has rate limits. Set `GOPLUS_API_KEY` for higher throughput.
- Security data is based on GoPlus analysis and may not cover every risk. Always do additional research before investing.
- New tokens may not be indexed yet — allow time after deployment for data to appear.
- The `token-security` command is the most comprehensive check and should be your first step when evaluating any token.
