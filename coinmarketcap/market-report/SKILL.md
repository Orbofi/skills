---
name: market-report
description: "CoinMarketCap market report — generates comprehensive daily/weekly crypto market reports with global metrics, Fear & Greed index, derivatives data, trending narratives, macro catalysts, and BTC/ETH analysis."
allowed-tools: mcp__cmc-mcp__get_global_metrics_latest, mcp__cmc-mcp__get_global_crypto_derivatives_metrics, mcp__cmc-mcp__trending_crypto_narratives, mcp__cmc-mcp__get_upcoming_macro_events, mcp__cmc-mcp__get_crypto_marketcap_technical_analysis, mcp__cmc-mcp__get_crypto_quotes_latest, mcp__cmc-mcp__search_cryptos
compatibility: Requires CoinMarketCap MCP server (cmc-mcp) configured with API key.
---

# CoinMarketCap Market Report — Daily & Weekly Crypto Intelligence

This skill generates comprehensive crypto market reports by orchestrating multiple CoinMarketCap MCP tools. Reports cover global metrics, sentiment, derivatives positioning, trending narratives, macro catalysts, and BTC/ETH analysis.

## 6-Step Report Generation Workflow

### Step 1: Fetch Global Market Metrics
Use `get_global_metrics_latest` to get the market overview.

Capture:
- Total crypto market capitalization and 24h change
- Bitcoin dominance percentage
- Ethereum dominance percentage
- Fear & Greed index value and label (Extreme Fear / Fear / Neutral / Greed / Extreme Greed)
- Total DeFi market cap
- Total stablecoin market cap
- ETF inflow/outflow data (if available)
- Total number of active cryptocurrencies
- Number of active exchanges

### Step 2: Get BTC & ETH Market Data
Use `search_cryptos` to resolve BTC and ETH IDs (or use known IDs: BTC=1, ETH=1027), then use `get_crypto_quotes_latest` for both.

Capture for each:
- Current price
- 24h, 7d, and 30d price changes
- Market cap and rank
- 24h trading volume
- Circulating supply
- Any notable supply milestones

### Step 3: Run Market Cap Technical Analysis
Use `get_crypto_marketcap_technical_analysis` for the aggregate market trend.

Capture:
- Moving average signals (SMA/EMA across timeframes)
- RSI for total market cap
- MACD signal and direction
- Support and resistance levels for total market cap
- Overall trend assessment (bullish/bearish/neutral)

### Step 4: Assess Derivatives & Leverage
Use `get_global_crypto_derivatives_metrics` for positioning data.

Capture:
- Total open interest and 24h change
- Aggregate funding rates (positive = longs paying shorts, negative = shorts paying longs)
- Recent liquidation volumes (long vs short breakdown)
- Leverage ratio trends
- Assess whether the market is overleveraged in either direction

### Step 5: Identify Trending Narratives
Use `trending_crypto_narratives` for current market themes.

Capture:
- Top trending narratives with names and descriptions
- Market cap of each narrative category
- 24h and 7d performance of each narrative
- Identify which narratives are gaining vs losing momentum

### Step 6: Check Upcoming Catalysts
Use `get_upcoming_macro_events` for forward-looking events.

Capture:
- Regulatory announcements and deadlines
- Economic events (FOMC, CPI, jobs data)
- Protocol upgrades and hard forks
- ETF decision dates
- Token unlock schedules
- Conference and event dates

## Report Template Structure

Use this template when generating market reports:

```
# Crypto Market Report — [Date]

## Market Snapshot

| Metric | Value | 24h Change |
|--------|-------|------------|
| Total Market Cap | $X.XXt | +/-X.X% |
| BTC Dominance | XX.X% | +/-X.X% |
| ETH Dominance | XX.X% | +/-X.X% |
| Fear & Greed Index | XX — [Label] | — |
| DeFi Market Cap | $XXXb | +/-X.X% |
| Stablecoin Market Cap | $XXXb | +/-X.X% |
| Active Cryptos | X,XXX | — |

## Bitcoin & Ethereum

### Bitcoin (BTC)
- **Price**: $XX,XXX | **24h**: +/-X.X% | **7d**: +/-X.X% | **30d**: +/-X.X%
- **Market Cap**: $X.XXt | **Volume (24h)**: $XXb
- **Key Levels**: Support at $XX,XXX | Resistance at $XX,XXX
- **Assessment**: [1-2 sentence summary of BTC's current position]

### Ethereum (ETH)
- **Price**: $X,XXX | **24h**: +/-X.X% | **7d**: +/-X.X% | **30d**: +/-X.X%
- **Market Cap**: $XXXb | **Volume (24h)**: $XXb
- **Key Levels**: Support at $X,XXX | Resistance at $X,XXX
- **Assessment**: [1-2 sentence summary of ETH's current position]

## Market Technicals (Aggregate)
- **Trend**: [Bullish / Bearish / Neutral]
- **RSI**: [Value] — [Overbought / Oversold / Neutral]
- **MACD**: [Bullish crossover / Bearish crossover / Flat]
- **Moving Averages**: [Above/Below key MAs]
- **Total Market Cap Support**: $X.XXt
- **Total Market Cap Resistance**: $X.XXt
- **TA Consensus**: [Strong Buy / Buy / Neutral / Sell / Strong Sell]

## Leverage & Sentiment
- **Total Open Interest**: $XXXb (+/-X.X% 24h)
- **Funding Rates**: [Positive/Negative — interpretation]
- **24h Liquidations**: $XXXm (Longs: $XXXm | Shorts: $XXXm)
- **Leverage Assessment**: [Overleveraged long / Overleveraged short / Balanced]
- **Interpretation**: [1-2 sentences on what derivatives data signals]

## Trending Narratives

| Narrative | Market Cap | 24h | 7d |
|-----------|-----------|-----|-----|
| [Narrative 1] | $XXb | +X.X% | +X.X% |
| [Narrative 2] | $XXb | +X.X% | +X.X% |
| [Narrative 3] | $XXb | +X.X% | +X.X% |
| [Narrative 4] | $XXb | +X.X% | +X.X% |
| [Narrative 5] | $XXb | +X.X% | +X.X% |

**Hot**: [Narratives gaining momentum]
**Cooling**: [Narratives losing momentum]

## Upcoming Catalysts

| Date | Event | Expected Impact |
|------|-------|-----------------|
| [Date] | [Event description] | [High/Medium/Low] |
| [Date] | [Event description] | [High/Medium/Low] |
| [Date] | [Event description] | [High/Medium/Low] |

## Summary & Outlook
[3-5 sentence summary covering:]
- Overall market direction and key support/resistance
- Sentiment (Fear & Greed + derivatives positioning)
- Key narratives to watch
- Upcoming catalysts that could move markets
- Risk factors to monitor

---
*Data sourced from CoinMarketCap. Report generated [timestamp]. This is not financial advice.*
```

## Daily vs Weekly Reports

### Daily Report
- Focus on 24h changes and intraday context
- Emphasize short-term technicals (hourly/4h moving averages)
- Highlight today's liquidation events
- Note any news from the past 24 hours
- Keep the report concise — prioritize what changed since yesterday

### Weekly Report
- Focus on 7d and 30d trends for broader perspective
- Compare this week's metrics to last week
- Analyze narrative momentum shifts over the week
- Include a "week in review" section summarizing major events
- Provide more detailed technical analysis on daily/weekly timeframes
- Add a "week ahead" section for upcoming catalysts
- Can include additional altcoin analysis beyond BTC/ETH if notable movers exist

### Key Differences in Framing

| Aspect | Daily | Weekly |
|--------|-------|--------|
| Timeframe focus | 1h, 24h | 7d, 30d |
| TA timeframe | 1h, 4h candles | Daily, weekly candles |
| Narrative coverage | What's hot today | Trend shifts over the week |
| Catalysts | Today/tomorrow | Next 7 days |
| Length | ~500 words | ~1000 words |
| Liquidation focus | Last 24h events | Weekly totals and notable events |

## Error Handling

Market reports should be resilient. If individual MCP tools fail, generate a partial report with available data.

| Tool Failure | Fallback |
|-------------|----------|
| `get_global_metrics_latest` fails | Use BTC/ETH data to estimate market direction. Note that global metrics are unavailable. |
| `get_crypto_quotes_latest` fails | Skip BTC/ETH section. Focus on global metrics and narratives. |
| `get_crypto_marketcap_technical_analysis` fails | Omit technicals section. Note it is unavailable. |
| `get_global_crypto_derivatives_metrics` fails | Omit leverage section. Note derivatives data is unavailable. |
| `trending_crypto_narratives` fails | Omit narratives section. Note it is unavailable. |
| `get_upcoming_macro_events` fails | Omit catalysts section or use general knowledge of known upcoming events. |

**Rules for partial reports:**
- Always inform the reader which sections are missing and why
- A report with 4 out of 6 sections is still valuable — do not refuse to generate it
- Mark unavailable sections with "[Data unavailable — MCP tool returned an error]"
- Never fabricate data to fill gaps

## Best Practices

1. **Consistency**: Use the same format every time so readers can quickly find what they need.
2. **Objectivity**: Present data without bias. Include both bullish and bearish signals.
3. **Actionable context**: Do not just list numbers — explain what they mean. "RSI at 78 indicates the market is approaching overbought territory" is better than "RSI: 78."
4. **Relative framing**: Compare current values to recent history. "Fear & Greed at 72, up from 58 last week" gives more context than just "72."
5. **Highlight anomalies**: If something is unusual (e.g., funding rates extremely negative, liquidations unusually high), call it out prominently.
6. **Timestamp clearly**: Always include the date and note that crypto markets move fast — data may shift within hours.
7. **No predictions**: State what the data shows, not what will happen. "Technicals suggest bullish momentum" is acceptable. "BTC will hit $100K next week" is not.
8. **ETF flows matter**: When available, ETF inflow/outflow data is a key institutional sentiment indicator. Always include it.
9. **Derivatives tell the story**: Funding rates and liquidation data often explain sudden price movements. Cross-reference with price action.
10. **Narrative rotation**: Track which narratives are gaining and losing steam week over week. This is one of the most valuable signals for identifying emerging trends.
