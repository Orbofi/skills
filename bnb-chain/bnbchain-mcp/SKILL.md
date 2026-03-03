---
name: bnbchain-mcp
description: "Official BNB Chain MCP — blockchain queries, token/NFT transfers, smart contract interaction, wallet management, ERC-8004 agent registration, and Greenfield decentralized storage. 40+ MCP tools for BNB Chain, opBNB, and EVM networks."
allowed-tools: Bash(bnbchain-mcp:*)
compatibility: Requires BNB Chain MCP server (npx @bnb-chain/mcp@latest). Optional PRIVATE_KEY for write operations.
---

# BNB Chain MCP Skill

## Overview

The official BNB Chain MCP server provides 40+ tools for interacting with BNB Smart Chain (BSC), opBNB, and other EVM-compatible networks. It covers blockchain queries, token/NFT operations, smart contract interaction, wallet management, ERC-8004 agent registration, and BNB Greenfield decentralized storage.

This is a pure MCP skill -- all operations are performed through MCP tool calls after configuring the MCP server.

---

## MCP Server Setup

### Stdio Mode (Recommended for Claude Desktop / Claude Code)

Add to your MCP configuration (`.claude.json`, `claude_desktop_config.json`, or `.mcp.json`):

```json
{
  "mcpServers": {
    "bnbchain-mcp": {
      "command": "npx",
      "args": ["-y", "@bnb-chain/mcp@latest"],
      "env": {
        "PRIVATE_KEY": ""
      }
    }
  }
}
```

### SSE Mode (Remote / HTTP)

For SSE-based MCP connections:

```json
{
  "mcpServers": {
    "bnbchain-mcp": {
      "url": "http://localhost:3001/sse",
      "transport": "sse"
    }
  }
}
```

Start the server manually for SSE mode:

```bash
PRIVATE_KEY=0x... npx -y @bnb-chain/mcp@latest --transport sse --port 3001
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | No (read-only) / Yes (write ops) | Wallet private key (hex, with 0x prefix). Required for transfers, contract writes, Greenfield mutations. |
| `BNB_API_KEY` | No | BscScan API key for enhanced rate limits (optional) |

**Read-only mode:** If `PRIVATE_KEY` is not set, all read tools work normally. Write tools (transfers, contract writes, Greenfield uploads) will fail with an error.

**Write mode:** Set `PRIVATE_KEY` to enable all tools. Use a dedicated wallet, never your main holdings wallet.

---

## Tool Categories

### Blocks (Read-Only)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_latest_block` | Get the latest block number and info | `network` (optional) |
| `get_block_by_number` | Get block details by block number | `blockNumber`, `network` (optional) |
| `get_block_by_hash` | Get block details by block hash | `blockHash`, `network` (optional) |

**Example:**
```
Use get_latest_block on BSC to check the current block height.
```

---

### Transactions (Read-Only)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_transaction` | Get transaction details by hash | `txHash`, `network` (optional) |
| `get_transaction_receipt` | Get transaction receipt (status, logs, gas used) | `txHash`, `network` (optional) |
| `estimate_gas` | Estimate gas for a transaction | `to`, `value`, `data`, `network` (optional) |

**Example:**
```
Use get_transaction with txHash "0xabc123..." on BSC to check if my transfer succeeded.
```

---

### Network (Read-Only)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_chain_info` | Get chain info (chain ID, name, native currency) | `network` (optional) |
| `get_supported_networks` | List all supported networks | None |

**Example:**
```
Use get_supported_networks to see all available chains.
```

---

### Wallet & Balance (Read-Only)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_address_from_private_key` | Derive wallet address from private key | None (uses configured PRIVATE_KEY) |
| `get_native_balance` | Get native token balance (BNB, ETH, etc.) | `address`, `network` (optional) |
| `get_erc20_balance` | Get ERC-20 token balance | `address`, `tokenAddress`, `network` (optional) |

**Example:**
```
Use get_native_balance for address 0x742d... on BSC to check my BNB balance.
```

---

### Transfers (Write -- Requires PRIVATE_KEY)

| Tool | Description | Parameters |
|------|-------------|------------|
| `transfer_native_token` | Send native tokens (BNB, ETH) | `to`, `amount`, `network` (optional) |
| `transfer_erc20` | Send ERC-20 tokens | `to`, `tokenAddress`, `amount`, `network` (optional) |
| `approve_token_spending` | Approve a spender for ERC-20 tokens | `tokenAddress`, `spender`, `amount`, `network` (optional) |
| `transfer_nft` | Transfer an ERC-721 NFT | `to`, `tokenAddress`, `tokenId`, `network` (optional) |
| `transfer_erc1155` | Transfer ERC-1155 tokens | `to`, `tokenAddress`, `tokenId`, `amount`, `network` (optional) |

**Example:**
```
Use transfer_native_token to send 0.1 BNB to 0xRecipient... on BSC.
```

**IMPORTANT:** All transfer tools require `PRIVATE_KEY` to be set. Always confirm with the user before executing any transfer.

---

### Smart Contracts (Read + Write)

| Tool | Description | Parameters | Requires Key |
|------|-------------|------------|--------------|
| `is_contract` | Check if an address is a smart contract | `address`, `network` (optional) | No |
| `read_contract` | Call a read-only contract function | `contractAddress`, `abi`, `functionName`, `args`, `network` (optional) | No |
| `write_contract` | Execute a state-changing contract function | `contractAddress`, `abi`, `functionName`, `args`, `value`, `network` (optional) | Yes |

**Example (read):**
```
Use read_contract to call "balanceOf" on USDT contract 0x55d398326f99059fF775485246999027B3197955 with args ["0xMyAddress"] on BSC.
```

**Example (write):**
```
Use write_contract to call "stake" on contract 0xStaking... with value 1 BNB on BSC.
```

---

### Tokens & NFTs (Read-Only)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_erc20_token_info` | Get token name, symbol, decimals, total supply | `tokenAddress`, `network` (optional) |
| `get_nft_info` | Get ERC-721 NFT metadata (name, symbol, tokenURI) | `tokenAddress`, `tokenId`, `network` (optional) |
| `get_erc1155_token_metadata` | Get ERC-1155 token metadata | `tokenAddress`, `tokenId`, `network` (optional) |
| `check_nft_ownership` | Check if an address owns a specific NFT | `ownerAddress`, `tokenAddress`, `tokenId`, `network` (optional) |
| `get_nft_balance` | Get total NFT count for an address (ERC-721) | `ownerAddress`, `tokenAddress`, `network` (optional) |
| `get_erc1155_balance` | Get ERC-1155 token balance | `address`, `tokenAddress`, `tokenId`, `network` (optional) |

**Example:**
```
Use get_erc20_token_info for token 0x55d398... on BSC to get USDT details.
```

---

### ENS (Read-Only)

| Tool | Description | Parameters |
|------|-------------|------------|
| `resolve_ens` | Resolve an ENS name to an address | `ensName`, `network` (optional, defaults to ethereum) |

**Example:**
```
Use resolve_ens to resolve "vitalik.eth" to an Ethereum address.
```

---

### ERC-8004 Agent Registration (Write -- Requires PRIVATE_KEY)

ERC-8004 is a standard for registering autonomous AI agents on-chain. These tools manage agent identity and metadata on BNB Chain.

| Tool | Description | Parameters | Requires Key |
|------|-------------|------------|--------------|
| `register_erc8004_agent` | Register an AI agent on-chain | `name`, `metadataUri`, `network` (optional) | Yes |
| `set_erc8004_agent_uri` | Update an agent's metadata URI | `agentId`, `metadataUri`, `network` (optional) | Yes |
| `get_erc8004_agent` | Get agent details by ID | `agentId`, `network` (optional) | No |
| `get_erc8004_agent_wallet` | Get the wallet associated with an agent | `agentId`, `network` (optional) | No |

**Example:**
```
Use register_erc8004_agent to register agent "MyTradingBot" with metadataUri "ipfs://Qm..." on BSC.
```

---

### Greenfield Decentralized Storage -- Buckets (Read + Write)

BNB Greenfield is a decentralized storage network. These tools manage storage buckets.

| Tool | Description | Parameters | Requires Key |
|------|-------------|------------|--------------|
| `gnfd_list_buckets` | List all buckets owned by an address | `address` | No |
| `gnfd_get_bucket_info` | Get bucket metadata | `bucketName` | No |
| `gnfd_get_bucket_full_info` | Get full bucket info including payment and quota | `bucketName` | No |
| `gnfd_create_bucket` | Create a new storage bucket | `bucketName`, `visibility` | Yes |
| `gnfd_delete_bucket` | Delete a storage bucket | `bucketName` | Yes |

**Example:**
```
Use gnfd_create_bucket to create bucket "my-agent-data" with visibility "public-read".
```

---

### Greenfield Decentralized Storage -- Objects (Read + Write)

| Tool | Description | Parameters | Requires Key |
|------|-------------|------------|--------------|
| `gnfd_list_objects` | List objects in a bucket | `bucketName` | No |
| `gnfd_get_object_info` | Get object metadata | `bucketName`, `objectName` | No |
| `gnfd_upload_object` | Upload a file to a bucket | `bucketName`, `objectName`, `filePath`, `visibility` | Yes |
| `gnfd_download_object` | Download an object from a bucket | `bucketName`, `objectName`, `destPath` | No |
| `gnfd_delete_object` | Delete an object from a bucket | `bucketName`, `objectName` | Yes |
| `gnfd_create_folder` | Create a folder in a bucket | `bucketName`, `folderName` | Yes |

**Example:**
```
Use gnfd_upload_object to upload "report.json" to bucket "my-agent-data" with visibility "private".
```

---

### Greenfield Decentralized Storage -- Payment (Read + Write)

| Tool | Description | Parameters | Requires Key |
|------|-------------|------------|--------------|
| `gnfd_get_account_balance` | Get Greenfield account balance | `address` | No |
| `gnfd_get_payment_accounts` | List payment accounts for an address | `address` | No |
| `gnfd_create_payment` | Create a payment account | None | Yes |
| `gnfd_deposit_to_payment` | Deposit BNB to a payment account | `paymentAddress`, `amount` | Yes |
| `gnfd_withdraw_from_payment` | Withdraw BNB from a payment account | `paymentAddress`, `amount` | Yes |

**Example:**
```
Use gnfd_deposit_to_payment to deposit 0.5 BNB to payment account 0xPayment....
```

---

## MCP Prompts

The BNB Chain MCP server provides 8 built-in prompts for guided interactions:

| Prompt | Description |
|--------|-------------|
| `analyze_block` | Analyze a specific block (transactions, gas usage, miner info) |
| `analyze_transaction` | Deep-dive into a transaction (status, events, gas, value transfers) |
| `analyze_address` | Analyze an address (balance, token holdings, contract detection) |
| `interact_with_contract` | Guide through reading/writing a smart contract |
| `explain_evm_concept` | Explain an EVM concept (gas, nonce, ABI encoding, etc.) |
| `compare_networks` | Compare two EVM networks (BSC vs Ethereum, BSC vs opBNB, etc.) |
| `analyze_token` | Analyze an ERC-20 token (supply, holders, contract details) |
| `how_to_register_mcp_as_erc8004_agent` | Step-by-step guide to register an MCP server as an ERC-8004 agent |

---

## Network Parameter

Most tools accept an optional `network` parameter. If omitted, defaults to `bsc`.

| Network Value | Chain | Chain ID |
|---------------|-------|----------|
| `bsc` | BNB Smart Chain | 56 |
| `opbnb` | opBNB (L2) | 204 |
| `ethereum` | Ethereum Mainnet | 1 |
| `base` | Base (Coinbase L2) | 8453 |
| `bsc-testnet` | BSC Testnet | 97 |
| `opbnb-testnet` | opBNB Testnet | 5611 |

**Example:** To query Ethereum instead of BSC, pass `network: "ethereum"` to any tool.

---

## Read-Only vs Write Operations

### Read-Only Tools (No PRIVATE_KEY needed)

All query tools work without a private key:
- Block queries (`get_latest_block`, `get_block_by_number`, `get_block_by_hash`)
- Transaction queries (`get_transaction`, `get_transaction_receipt`, `estimate_gas`)
- Network info (`get_chain_info`, `get_supported_networks`)
- Balance queries (`get_native_balance`, `get_erc20_balance`)
- Token/NFT info (`get_erc20_token_info`, `get_nft_info`, `get_erc1155_token_metadata`, `check_nft_ownership`, `get_nft_balance`, `get_erc1155_balance`)
- Contract reads (`is_contract`, `read_contract`)
- ENS resolution (`resolve_ens`)
- ERC-8004 reads (`get_erc8004_agent`, `get_erc8004_agent_wallet`)
- Greenfield reads (`gnfd_list_buckets`, `gnfd_get_bucket_info`, `gnfd_get_bucket_full_info`, `gnfd_list_objects`, `gnfd_get_object_info`, `gnfd_download_object`, `gnfd_get_account_balance`, `gnfd_get_payment_accounts`)

### Write Tools (PRIVATE_KEY required)

These tools send transactions and modify on-chain state:
- Transfers (`transfer_native_token`, `transfer_erc20`, `approve_token_spending`, `transfer_nft`, `transfer_erc1155`)
- Contract writes (`write_contract`)
- ERC-8004 registration (`register_erc8004_agent`, `set_erc8004_agent_uri`)
- Greenfield mutations (`gnfd_create_bucket`, `gnfd_delete_bucket`, `gnfd_upload_object`, `gnfd_delete_object`, `gnfd_create_folder`, `gnfd_create_payment`, `gnfd_deposit_to_payment`, `gnfd_withdraw_from_payment`)

---

## Safety Practices

1. **Always confirm before transactions** -- Never execute transfers, contract writes, or Greenfield mutations without explicit user confirmation. Show the user the exact parameters (recipient, amount, network) before proceeding.

2. **Prefer testnet for development** -- Use `bsc-testnet` or `opbnb-testnet` when testing write operations. Testnet BNB is free from faucets.

3. **Never log private keys** -- Do not echo, print, or include `PRIVATE_KEY` in any output, logs, or error messages.

4. **Use dedicated wallets** -- Set up a separate wallet for agent operations. Never use a wallet containing significant holdings.

5. **Double-check addresses** -- Verify recipient addresses carefully before transfers. Blockchain transactions are irreversible.

6. **Monitor gas costs** -- Use `estimate_gas` before write operations to preview transaction costs.

7. **Verify contract ABIs** -- When using `read_contract` or `write_contract`, ensure the ABI is correct for the target contract. Incorrect ABIs can lead to failed or unintended transactions.

8. **Rate limiting** -- The MCP server respects RPC rate limits. If you encounter rate limit errors, space out your requests.

---

## Common Workflows

### Check a Wallet's Token Holdings

```
1. get_native_balance(address, network="bsc")          -- BNB balance
2. get_erc20_balance(address, tokenAddress, network)   -- Per-token balance
3. get_erc20_token_info(tokenAddress, network)         -- Token metadata
```

### Investigate a Transaction

```
1. get_transaction(txHash, network)           -- Basic tx details
2. get_transaction_receipt(txHash, network)    -- Status, logs, gas used
3. get_block_by_number(blockNumber, network)   -- Block context
```

### Transfer Tokens Safely

```
1. get_native_balance(myAddress, network)        -- Check balance first
2. estimate_gas(to, value, data, network)        -- Preview gas cost
3. [CONFIRM WITH USER]                           -- Show amount, recipient, gas
4. transfer_native_token(to, amount, network)    -- Execute transfer
5. get_transaction_receipt(txHash, network)       -- Verify success
```

### Store Data on Greenfield

```
1. gnfd_list_buckets(address)                              -- Check existing buckets
2. gnfd_create_bucket(bucketName, visibility)               -- Create if needed
3. gnfd_upload_object(bucketName, objectName, filePath)     -- Upload file
4. gnfd_get_object_info(bucketName, objectName)             -- Verify upload
```

### Register an AI Agent (ERC-8004)

```
1. register_erc8004_agent(name, metadataUri, network)   -- Register on-chain
2. get_erc8004_agent(agentId, network)                  -- Verify registration
3. set_erc8004_agent_uri(agentId, newUri, network)      -- Update metadata later
```

---

## Troubleshooting

### "PRIVATE_KEY not configured"
Set the `PRIVATE_KEY` environment variable in your MCP server configuration. This is required for all write operations.

### "Insufficient funds"
The wallet does not have enough native tokens (BNB) for the transaction + gas. Fund the wallet before retrying.

### "Nonce too low"
A transaction with this nonce was already confirmed. This usually resolves by retrying, as the MCP server auto-increments nonces.

### "Contract execution reverted"
The smart contract rejected the transaction. Common causes: insufficient allowance (call `approve_token_spending` first), invalid function arguments, or contract-specific restrictions.

### "Network not supported"
Use `get_supported_networks` to see all available networks. Ensure you are passing a valid `network` value.

### Greenfield errors
Greenfield operations require the wallet to have BNB on the Greenfield chain (not BSC). Use the Greenfield bridge to transfer BNB from BSC to Greenfield.

---

## References

- [BNB Chain MCP GitHub](https://github.com/bnb-chain/bnb-chain-mcp) -- Source code and documentation
- [@bnb-chain/mcp npm](https://www.npmjs.com/package/@bnb-chain/mcp) -- npm package
- [BNB Chain Docs](https://docs.bnbchain.org/) -- Official BNB Chain documentation
- [BNB Greenfield Docs](https://docs.bnbchain.org/greenfield/) -- Greenfield storage documentation
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004) -- Agent registration standard
- [BscScan](https://bscscan.com/) -- BSC block explorer
- [opBNB Explorer](https://opbnbscan.com/) -- opBNB block explorer
