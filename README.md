# Orbofi Skills Hub

AI agent skills for BNB Chain, DeFi, and Web3. Compatible with **Orbofi**, **Claude Code**, **OpenClaw**, and **Codex**.

## BNB Chain Skills

The most comprehensive collection of BNB Chain (BSC) AI agent skills — covering DEXes, lending, staking, yield farming, security, analytics, bridging, and meme tokens.

### Install

```bash
# Install a single skill
npx --yes skills add https://github.com/Orbofi/skills --skill pancakeswap --agent claude-code -y

# Install all BNB Chain skills
npx --yes skills add https://github.com/Orbofi/skills --skill bnb-chain-core pancakeswap venus-protocol goplus-security dex-aggregator-bnb thena-dex lista-dao beefy-finance dexscreener-bnb four-meme stargate-bridge --agent claude-code -y
```

### Skills Catalog

| Skill | Category | Description |
|-------|----------|-------------|
| **bnb-chain-core** | Core | BNB transfers, BEP-20 tokens, gas estimation, wallet balances, contract calls |
| **pancakeswap** | DEX | Swap tokens, LP, farms on PancakeSwap — #1 DEX on BNB Chain |
| **thena-dex** | DEX | Trade on THENA — BNB Chain's ve(3,3) DEX with gauge voting |
| **dex-aggregator-bnb** | DEX | Best-price swaps via 1inch + OpenOcean across 50+ BNB DEXes |
| **venus-protocol** | Lending | Supply, borrow, repay on Venus — #1 lending protocol on BNB |
| **lista-dao** | Staking | Liquid staking — stake BNB, get slisBNB, earn rewards |
| **beefy-finance** | Yield | Auto-compounding vaults — 100+ BNB Chain yield strategies |
| **goplus-security** | Security | Honeypot detection, rug scanning, contract auditing |
| **dexscreener-bnb** | Analytics | Token prices, trending pairs, new launches on BSC |
| **four-meme** | Meme | Launch and trade meme tokens on BNB Chain |
| **stargate-bridge** | Bridge | Cross-chain bridging via LayerZero to/from BNB Chain |

### Environment Variables

For **read-only skills** (goplus-security, dexscreener-bnb): no env vars needed.

For **on-chain operations** (swaps, staking, lending, bridging):

```bash
export BSC_WALLET_ADDRESS="0xYourWalletAddress"
export BSC_PRIVATE_KEY="0xYourPrivateKey"
export BSC_RPC_URL="https://bsc-dataseed1.binance.org"  # optional, has default
```

Optional API keys for enhanced features:
```bash
export BSCSCAN_API_KEY="..."      # BscScan API (for bnb-chain-core)
export ONEINCH_API_KEY="..."      # 1inch API (for dex-aggregator-bnb)
export GOPLUS_API_KEY="..."       # GoPlus (for goplus-security, higher rate limits)
```

### Use on Orbofi

All skills are available instantly on [orbofi.com](https://orbofi.com) — no installation needed. Create an agent and select BNB Chain skills from the skill picker.

### Use with Claude Code / Codex

Copy a skill directory into your project's `.claude/skills/` folder, or install via the command above.

## License

MIT
