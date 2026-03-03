---
name: cmc-mcp
description: "CoinMarketCap MCP — real-time crypto prices, technical analysis, news, holder metrics, trending narratives, derivatives data, and global market insights. 12 MCP tools for comprehensive crypto intelligence."
allowed-tools: mcp__cmc-mcp__search_cryptos, mcp__cmc-mcp__get_crypto_quotes_latest, mcp__cmc-mcp__get_crypto_info, mcp__cmc-mcp__get_crypto_metrics, mcp__cmc-mcp__get_crypto_technical_analysis, mcp__cmc-mcp__get_crypto_latest_news, mcp__cmc-mcp__search_crypto_info, mcp__cmc-mcp__get_global_metrics_latest, mcp__cmc-mcp__get_global_crypto_derivatives_metrics, mcp__cmc-mcp__get_crypto_marketcap_technical_analysis, mcp__cmc-mcp__trending_crypto_narratives, mcp__cmc-mcp__get_upcoming_macro_events
compatibility: Requires CoinMarketCap MCP server configured with API key from pro.coinmarketcap.com.
---

# CoinMarketCap MCP — Comprehensive Crypto Intelligence

This skill provides access to CoinMarketCap's full suite of real-time cryptocurrency data through their MCP (Model Context Protocol) server. It covers pricing, technical analysis, holder metrics, news, derivatives, trending narratives, and macro events across the entire crypto market.

## MCP Server Configuration

Add the following to your MCP configuration (`.mcp.json` or equivalent):

```json
{
  "mcpServers": {
    "cmc-mcp": {
      "type": "streamable-http",
      "url": "https://mcp.coinmarketcap.com/mcp",
      "headers": {
        "X-CMC-MCP-API-KEY": "<YOUR_CMC_API_KEY>"
      }
    }
  }
}
```

Replace `<YOUR_CMC_API_KEY>` with your API key from [pro.coinmarketcap.com](https://pro.coinmarketcap.com).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CMC_API_KEY` | CoinMarketCap API key from pro.coinmarketcap.com | Yes |

The API key must be passed via the `X-CMC-MCP-API-KEY` header in the MCP server configuration. Free-tier keys work but have rate limits. Paid plans unlock higher request volumes and additional endpoints.

## Available MCP Tools (12 Total)

### Token Discovery & Identification

#### `mcp__cmc-mcp__search_cryptos`
Find cryptocurrencies by name or ticker symbol. Returns CMC IDs, names, symbols, and basic metadata. Always use this first when a user asks about a coin — you need the CMC ID for most other tools.

- **Input**: Search query (name or symbol like "BTC", "Ethereum", "SOL")
- **Output**: List of matching cryptocurrencies with IDs, names, symbols, slugs
- **Use when**: You need to identify a coin or get its CMC ID before calling other tools

#### `mcp__cmc-mcp__search_crypto_info`
Semantic search across crypto concepts, categories, and project descriptions. Goes beyond simple name matching to find coins related to a concept (e.g., "layer 2 scaling", "real world assets", "AI tokens").

- **Input**: Natural language query describing a concept or category
- **Output**: Relevant cryptocurrencies and information matching the concept
- **Use when**: User asks about a category of tokens, a DeFi concept, or wants to explore a narrative

### Pricing & Market Data

#### `mcp__cmc-mcp__get_crypto_quotes_latest`
Get current pricing, market capitalization, trading volume, circulating/total/max supply, and percentage changes across multiple timeframes (1h, 24h, 7d, 30d, 90d). Supports querying multiple coins in a single call.

- **Input**: CMC ID(s) or symbol(s)
- **Output**: Price (USD), market cap, 24h volume, supply figures, percent changes, market cap rank
- **Use when**: User asks "What's the price of X?", "How is X performing?", or you need current market data

#### `mcp__cmc-mcp__get_crypto_info`
Get detailed project information including descriptions, website URLs, social media links (Twitter, Reddit, Discord, Telegram), source code repositories, whitepapers, launch date, and category tags.

- **Input**: CMC ID(s) or symbol(s)
- **Output**: Project description, URLs, social links, tags, platform details, contract addresses
- **Use when**: User asks "What is X?", "Tell me about this project", or needs fundamental/background info

### On-Chain & Holder Metrics

#### `mcp__cmc-mcp__get_crypto_metrics`
Get holder distribution data and address count metrics broken down by tier. Shows how tokens are distributed across wallets of different sizes (whales, large holders, retail).

- **Input**: CMC ID(s) or symbol(s)
- **Output**: Holder counts by tier, address distribution, concentration metrics
- **Use when**: User asks about holder distribution, whale concentration, on-chain health, or tokenomics analysis

### Technical Analysis

#### `mcp__cmc-mcp__get_crypto_technical_analysis`
Get full technical analysis for a specific cryptocurrency including SMA (Simple Moving Average), EMA (Exponential Moving Average), MACD, RSI (Relative Strength Index), Fibonacci retracement levels, pivot points, and overall signal summaries (buy/sell/neutral).

- **Input**: CMC ID or symbol
- **Output**: TA indicators with values and signals, support/resistance levels, trend direction
- **Use when**: User asks about technicals, support/resistance, whether to buy/sell, trend analysis

#### `mcp__cmc-mcp__get_crypto_marketcap_technical_analysis`
Get technical analysis applied to aggregate market capitalization data rather than individual coins. Useful for analyzing the overall crypto market trend.

- **Input**: None required (analyzes total crypto market cap)
- **Output**: TA indicators applied to total market cap, trend signals
- **Use when**: User asks about overall market direction, macro crypto trend, total market cap analysis

### News & Sentiment

#### `mcp__cmc-mcp__get_crypto_latest_news`
Get the latest cryptocurrency news headlines, summaries, source URLs, and publication timestamps. Can be filtered by specific coins or fetched for the general market.

- **Input**: Optional coin filter (CMC ID or symbol)
- **Output**: News articles with titles, summaries, sources, timestamps, related assets
- **Use when**: User asks "What's the latest news on X?", "Why is X pumping/dumping?", or needs sentiment context

### Global Market Overview

#### `mcp__cmc-mcp__get_global_metrics_latest`
Get total crypto market capitalization, Bitcoin dominance, Ethereum dominance, Fear & Greed index, DeFi market cap, stablecoin market cap, ETF flow data, and active cryptocurrency counts.

- **Input**: None required
- **Output**: Total market cap, BTC/ETH dominance %, Fear & Greed index, DeFi cap, stablecoin cap, ETF flows
- **Use when**: User asks about overall market conditions, market sentiment, BTC dominance, or macro overview

#### `mcp__cmc-mcp__get_global_crypto_derivatives_metrics`
Get derivatives market data including total open interest, funding rates across exchanges, recent liquidation volumes (long/short), and leverage ratios.

- **Input**: None required
- **Output**: Open interest, funding rates, liquidation data (long vs short), leverage metrics
- **Use when**: User asks about leverage, funding rates, liquidations, or derivatives market health

### Trends & Events

#### `mcp__cmc-mcp__trending_crypto_narratives`
Get currently trending crypto narratives and themes with associated market caps and performance data. Examples: AI tokens, RWA, memecoins, L2s, DePIN.

- **Input**: None required
- **Output**: Trending narratives with names, descriptions, market caps, 24h/7d performance
- **Use when**: User asks "What's trending?", "What narratives are hot?", or wants to discover opportunities

#### `mcp__cmc-mcp__get_upcoming_macro_events`
Get upcoming regulatory announcements, economic events, protocol upgrades, and other macro catalysts that may affect crypto markets.

- **Input**: None required
- **Output**: Upcoming events with dates, descriptions, expected impact
- **Use when**: User asks about upcoming catalysts, regulatory events, or "What's coming up?"

## Standard Workflow

Follow this sequence when responding to crypto queries:

### Step 1: Identify the Asset(s)
Always start with `search_cryptos` to resolve coin names/symbols to CMC IDs. This ensures you have the correct asset and avoids ambiguity (e.g., "LINK" could be Chainlink or another token).

### Step 2: Batch Multiple Coins
When the user asks about multiple coins, batch them into a single `get_crypto_quotes_latest` or `get_crypto_info` call rather than making separate calls for each. Most tools accept comma-separated IDs.

### Step 3: Match Tools to Query Type
- **Price check** → `get_crypto_quotes_latest`
- **"What is X?"** → `get_crypto_info` + `get_crypto_quotes_latest`
- **"Should I buy X?"** → `get_crypto_technical_analysis` + `get_crypto_quotes_latest` + `get_crypto_latest_news`
- **"How's the market?"** → `get_global_metrics_latest` + `trending_crypto_narratives`
- **"Is X safe?"** → `get_crypto_info` + `get_crypto_metrics` + `get_crypto_latest_news`
- **"What's trending?"** → `trending_crypto_narratives` + `get_global_metrics_latest`
- **"Any upcoming events?"** → `get_upcoming_macro_events`
- **Deep research** → All relevant tools in sequence (see crypto-research skill)

### Step 4: Present Data Clearly
- Format prices with appropriate decimal places ($0.0001234 for microcaps, $45,231.50 for BTC)
- Include percentage changes with direction indicators
- Show market cap rank when relevant
- Cite news sources with URLs
- Add timestamps so users know data freshness

## Important Notes

- **Rate limits**: Free-tier API keys have monthly call limits. Be efficient by batching queries.
- **Data freshness**: Pricing data is near real-time (updates every 60 seconds). News may have slight delays.
- **No trading advice**: Present data objectively. Never guarantee outcomes or recommend specific trades.
- **CMC IDs are stable**: Once you resolve a symbol to a CMC ID, you can reuse it within the same session.
- **Error handling**: If a tool returns an error, inform the user and try alternative tools or suggest checking the API key configuration.
