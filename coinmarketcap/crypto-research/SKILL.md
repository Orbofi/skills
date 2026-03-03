---
name: crypto-research
description: "CoinMarketCap crypto research — comprehensive due diligence on any cryptocurrency. Analyzes fundamentals, tokenomics, holder distribution, technicals, news sentiment, and risk factors using CoinMarketCap MCP data."
allowed-tools: mcp__cmc-mcp__search_cryptos, mcp__cmc-mcp__get_crypto_quotes_latest, mcp__cmc-mcp__get_crypto_info, mcp__cmc-mcp__get_crypto_metrics, mcp__cmc-mcp__get_crypto_technical_analysis, mcp__cmc-mcp__get_crypto_latest_news, mcp__cmc-mcp__search_crypto_info
compatibility: Requires CoinMarketCap MCP server (cmc-mcp) configured with API key.
---

# CoinMarketCap Crypto Research — Due Diligence Skill

This skill orchestrates a comprehensive research workflow for any cryptocurrency using CoinMarketCap MCP data. It produces structured due diligence reports covering fundamentals, tokenomics, holder distribution, technical analysis, news sentiment, and risk assessment.

## 7-Step Research Workflow

Execute these steps in order for a thorough research report. Each step builds on the previous one.

### Step 1: Identify the Asset
Use `search_cryptos` with the coin's name or symbol.

- Confirm you have the correct asset (check symbol, name, and rank)
- Note the CMC ID for use in all subsequent calls
- If the search returns multiple results, confirm with the user or pick the highest-ranked match
- If no results found, try `search_crypto_info` with a broader query

### Step 2: Get Project Fundamentals
Use `get_crypto_info` to retrieve the project's background.

Extract and analyze:
- Project description and purpose
- Launch date and age of the project
- Website URL (is it professional and maintained?)
- Source code repository (GitHub — is it active?)
- Social media presence (Twitter followers, Telegram/Discord community size)
- Category tags (DeFi, L1, L2, NFT, GameFi, etc.)
- Contract addresses and which chains it operates on
- Team information (if available)

### Step 3: Get Market Data & Pricing
Use `get_crypto_quotes_latest` for current market positioning.

Extract and analyze:
- Current price and market cap rank
- Market capitalization (fully diluted vs circulating)
- 24h trading volume and volume/market cap ratio
- Circulating supply vs total supply vs max supply
- Price changes: 1h, 24h, 7d, 30d, 90d
- Compare FDV to market cap (large gap = future dilution risk)

### Step 4: Analyze Holder Distribution
Use `get_crypto_metrics` for on-chain holder data.

Extract and analyze:
- Total number of holders/addresses
- Distribution across tiers (whale, large, medium, retail)
- Concentration ratio (what % do top holders control?)
- Holder growth trends if available
- Compare holder count to market cap (is it proportional?)

### Step 5: Run Technical Analysis
Use `get_crypto_technical_analysis` for current TA signals.

Extract and analyze:
- Moving averages (SMA/EMA 20, 50, 100, 200) — trend direction
- RSI — overbought (>70) or oversold (<30) conditions
- MACD — momentum and crossover signals
- Fibonacci levels — key support and resistance zones
- Pivot points — intraday trading levels
- Overall signal summary (buy/sell/neutral consensus)

### Step 6: Check Latest News & Sentiment
Use `get_crypto_latest_news` for recent headlines.

Extract and analyze:
- Recent positive and negative news
- Partnership or integration announcements
- Regulatory mentions
- Security incidents or exploits
- Exchange listing/delisting news
- Developer activity or roadmap updates
- Overall sentiment direction (bullish, bearish, neutral)

### Step 7: Deep Dive with Semantic Search
Use `search_crypto_info` to explore the project's ecosystem and narrative.

- Search for the project's category (e.g., "liquid staking", "cross-chain bridge")
- Identify competitors in the same space
- Understand the narrative the project fits into
- Check if the narrative is currently trending or fading

## Analysis Framework

### Fundamentals Assessment
| Factor | What to Check | Green Flag | Red Flag |
|--------|--------------|------------|----------|
| Age | Launch date | 1+ year track record | Less than 3 months old |
| Website | Quality and updates | Professional, regularly updated | Broken links, template site |
| Code | GitHub activity | Regular commits, multiple contributors | No repo, inactive for months |
| Community | Social presence | Active engagement, growing | Bot-filled, declining |
| Team | Transparency | Known team, doxxed | Anonymous with no track record |
| Audits | Security reviews | Multiple audits by reputable firms | No audits, refused audits |

### Tokenomics Assessment
| Factor | What to Check | Green Flag | Red Flag |
|--------|--------------|------------|----------|
| Supply | Circulating vs max | >60% circulating | <20% circulating (heavy dilution ahead) |
| FDV ratio | FDV / Market cap | Ratio < 2x | Ratio > 5x (massive future selling pressure) |
| Volume | 24h volume / market cap | Ratio > 5% | Ratio < 0.5% (illiquid, hard to exit) |
| Distribution | Top holder concentration | Top 10 hold < 30% | Top 10 hold > 60% |
| Inflation | Emission schedule | Decreasing or capped | Uncapped, accelerating emissions |
| Utility | Token use cases | Governance + fees + staking | No clear utility, purely speculative |

### Market Position Assessment
| Factor | What to Check | Green Flag | Red Flag |
|--------|--------------|------------|----------|
| Rank | CMC rank | Top 200 | Below 500 with low volume |
| Trend | 30d/90d performance | Outperforming sector | Underperforming everything |
| Technicals | TA consensus | Buy signals, above key MAs | Sell signals, below all MAs |
| RSI | Momentum | 40-65 range (healthy) | >80 (overheated) or <20 (capitulation) |
| News | Sentiment | Positive catalysts ahead | Security concerns, regulatory issues |

### Risk Assessment
| Risk Level | Criteria |
|------------|----------|
| **Low** | Top 50 rank, high liquidity, known team, audited, strong community, 1+ year old |
| **Medium** | Rank 50-200, moderate liquidity, partial transparency, some audits |
| **High** | Rank 200-500, lower liquidity, anonymous team, limited audits |
| **Very High** | Rank 500+, thin liquidity, no audits, <6 months old, high FDV ratio |

## Red Flags to Highlight

Always call out these warning signs prominently in the report:

- **Extreme concentration**: Top 10 wallets hold >50% of supply
- **FDV bomb**: Fully diluted valuation is 5x+ current market cap
- **Ghost chain**: Very low holder count relative to market cap
- **Volume desert**: 24h volume < 0.5% of market cap
- **Newborn**: Project less than 3 months old with large market cap
- **No code**: No public repository or inactive GitHub
- **Bad news**: Recent exploit, hack, or regulatory action
- **RSI extreme**: RSI > 85 (likely overextended) or RSI < 15 (potential dead project)
- **Broken socials**: Dead Twitter, empty Telegram/Discord

## Green Flags to Highlight

Prominently note these positive indicators:

- **Growing holders**: Address count increasing over time
- **Healthy distribution**: No single entity controls >10% of supply
- **Active development**: Regular GitHub commits from multiple contributors
- **Revenue generating**: Protocol earns real fees/revenue
- **Institutional presence**: Listed on major exchanges, ETF mentions
- **Strong narrative fit**: Aligns with a currently trending narrative
- **Bullish technicals**: Price above 200 EMA, RSI 50-65, MACD bullish crossover
- **Positive catalysts**: Upcoming upgrade, partnership, or mainnet launch

## Report Structure Template

Use this structure when generating a research report:

```
# [Coin Name] ([SYMBOL]) — Research Report

**Date**: [Current date]
**CMC Rank**: #[Rank]
**Price**: $[Price] | **24h**: [+/-X%] | **7d**: [+/-X%] | **30d**: [+/-X%]

## Executive Summary
[2-3 sentence overview of the project and current assessment]

## Project Overview
- **Category**: [Tags/categories]
- **Launch Date**: [Date]
- **Website**: [URL]
- **GitHub**: [URL]
- **Chains**: [Networks the token exists on]
- **Description**: [Brief project description]

## Market Data
| Metric | Value |
|--------|-------|
| Price | $X |
| Market Cap | $X |
| FDV | $X |
| 24h Volume | $X |
| Vol/MCap Ratio | X% |
| Circulating Supply | X / X max |
| MCap Rank | #X |

## Tokenomics & Holder Analysis
- **Supply Distribution**: [Circulating vs total vs max]
- **FDV/MCap Ratio**: [Xn — assessment]
- **Holder Count**: [Number]
- **Top Holder Concentration**: [Assessment]
- **Distribution Health**: [Good/Concerning/Poor]

## Technical Analysis
- **Trend**: [Bullish/Bearish/Neutral]
- **RSI**: [Value — Overbought/Oversold/Neutral]
- **MACD**: [Signal]
- **Moving Averages**: [Above/Below key MAs]
- **Key Support**: $[Level]
- **Key Resistance**: $[Level]
- **TA Consensus**: [Buy/Sell/Neutral]

## News & Sentiment
- [Recent headline 1 — Source]
- [Recent headline 2 — Source]
- **Overall Sentiment**: [Bullish/Bearish/Neutral]

## Risk Assessment
**Risk Level**: [Low / Medium / High / Very High]

### Red Flags
- [List any red flags found]

### Green Flags
- [List any green flags found]

## Conclusion
[Final assessment paragraph — objective, data-driven, no financial advice]

---
*Data sourced from CoinMarketCap. This is not financial advice. Always do your own research.*
```

## Best Practices

1. **Always start with search**: Never assume a CMC ID. Resolve via `search_cryptos` first.
2. **Batch where possible**: If researching multiple coins, batch API calls.
3. **Context matters**: A coin's metrics mean different things depending on its category. A memecoin with no GitHub is expected; a DeFi protocol with no GitHub is a red flag.
4. **Compare to peers**: When possible, note how the coin compares to others in the same category.
5. **Recency bias**: Weight recent news and price action appropriately but do not let a single day's movement dominate the assessment.
6. **Be objective**: Present both bullish and bearish factors. Never recommend buying or selling.
7. **Acknowledge gaps**: If a tool returns incomplete data, note what is missing rather than ignoring it.
8. **Timestamp everything**: Include the date/time of the report so readers know the data freshness.
9. **Volume sanity check**: If 24h volume seems abnormally high or low, flag it — it could indicate wash trading or a liquidity crisis.
10. **Cross-reference news with price**: If there was a big price move, check news for the catalyst. If there is no news for a big move, note that as unusual.
