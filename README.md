# BNB Chain Skills for AI Agents

The most comprehensive collection of BNB Chain (BSC) AI agent skills — covering DEXes, lending, staking, yield farming, security, analytics, bridging, meme tokens, and the official BNB Chain MCP. Compatible with **Orbofi**, **Claude Code**, **OpenClaw**, and **Codex**. Give your agents useful BSC capabilities. 

## Install

```bash
# Install a single skill
npx --yes skills add https://github.com/Orbofi/bnbchain-skills --skill pancakeswap --agent claude-code -y

# Install all BNB Chain skills
npx --yes skills add https://github.com/Orbofi/bnbchain-skills --skill bnb-chain-core pancakeswap venus-protocol goplus-security dex-aggregator-bnb thena-dex lista-dao beefy-finance dexscreener-bnb four-meme stargate-bridge bnbchain-mcp --agent claude-code -y
```

## Skills Catalog

| Skill | Category | Description |
|-------|----------|-------------|
| **bnb-chain-core** | Core | BNB transfers, BEP-20 tokens, gas estimation, wallet balances, contract calls |
| **bnbchain-mcp** | MCP | Official BNB Chain MCP — 40+ tools for blocks, txns, tokens, NFTs, ERC-8004, Greenfield |
| **pancakeswap** | DEX | Swap tokens, LP, farms on PancakeSwap — #1 DEX on BNB Chain ($2B+ TVL) |
| **thena-dex** | DEX | Trade on THENA — BNB Chain's ve(3,3) DEX with gauge voting |
| **dex-aggregator-bnb** | DEX | Best-price swaps via 1inch + OpenOcean across 50+ BNB DEXes |
| **venus-protocol** | Lending | Supply, borrow, repay on Venus — #1 lending protocol on BNB ($2.5B TVL) |
| **lista-dao** | Staking | Liquid staking — stake BNB, get slisBNB, earn rewards |
| **beefy-finance** | Yield | Auto-compounding vaults — 100+ BNB Chain yield strategies |
| **goplus-security** | Security | Honeypot detection, rug scanning, contract auditing |
| **dexscreener-bnb** | Analytics | Token prices, trending pairs, new launches on BSC |
| **four-meme** | Meme | Launch and trade meme tokens on BNB Chain |
| **stargate-bridge** | Bridge | Cross-chain bridging via LayerZero to/from BNB Chain |

## Environment Variables

For **read-only skills** (goplus-security, dexscreener-bnb, bnbchain-mcp without writes): no env vars needed.

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

## Use on Orbofi

All skills are available instantly on [orbofi.com](https://orbofi.com) — no installation needed. Create an agent and select BNB Chain skills from the skill picker.

## Use with Claude Code / Codex

Copy a skill directory into your project's `.claude/skills/` folder, or install via the command above.

## License

MIT
