#!/usr/bin/env node
/**
 * GoPlus Security API Helper — Token & address security analysis for BSC
 *
 * Usage:
 *   node goplus.mjs <command> [args...]
 *
 * Commands:
 *   token-security <contractAddress>   — Full token security check
 *   address-security <address>         — Check if address is malicious
 *   approval-security <address>        — Check token approvals for risk
 *   nft-security <contractAddress>     — NFT contract security check
 *   dapp-security <url>                — Check if dApp URL is malicious
 *
 * Environment variables:
 *   GOPLUS_API_KEY — Optional API key for higher rate limits
 *
 * Zero npm dependencies — uses only global fetch().
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = "https://api.gopluslabs.io/api/v1";
const BSC_CHAIN_ID = "56";

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function goplusFetch(path, params = {}) {
  const url = new URL(API_BASE + path);

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const headers = {};
  const apiKey = process.env.GOPLUS_API_KEY;
  if (apiKey) {
    headers["Authorization"] = apiKey;
  }

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    throw new Error(`GoPlus API error: HTTP ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.code !== 1) {
    throw new Error(`GoPlus API error: ${json.message || JSON.stringify(json)}`);
  }

  return json.result;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdTokenSecurity(args) {
  const contractAddress = args[0];
  if (!contractAddress) throw new Error("Missing argument: <contractAddress>");

  const addr = contractAddress.toLowerCase();
  const result = await goplusFetch(`/token_security/${BSC_CHAIN_ID}`, {
    contract_addresses: addr,
  });

  const tokenData = result[addr];
  if (!tokenData) {
    return {
      token: contractAddress,
      error: "No security data found for this token. It may not be indexed yet.",
    };
  }

  // Parse and format the response for clarity
  return {
    token: contractAddress,
    tokenName: tokenData.token_name || null,
    tokenSymbol: tokenData.token_symbol || null,
    isHoneypot: tokenData.is_honeypot === "1",
    buyTax: tokenData.buy_tax || "0",
    sellTax: tokenData.sell_tax || "0",
    isOpenSource: tokenData.is_open_source === "1",
    isProxy: tokenData.is_proxy === "1",
    isMintable: tokenData.is_mintable === "1",
    canTakeBackOwnership: tokenData.can_take_back_ownership === "1",
    ownerChangeBalance: tokenData.owner_change_balance === "1",
    hiddenOwner: tokenData.hidden_owner === "1",
    selfDestruct: tokenData.selfdestruct === "1",
    externalCall: tokenData.external_call === "1",
    holderCount: parseInt(tokenData.holder_count || "0", 10),
    totalSupply: tokenData.total_supply || null,
    creatorAddress: tokenData.creator_address || null,
    ownerAddress: tokenData.owner_address || null,
    lpHolderCount: parseInt(tokenData.lp_holder_count || "0", 10),
    lpTotalSupply: tokenData.lp_total_supply || null,
    isTrueToken: tokenData.is_true_token === "1",
    isAirdropScam: tokenData.is_airdrop_scam === "1",
    trustList: tokenData.trust_list === "1",
    isAntiWhale: tokenData.is_anti_whale === "1",
    antiWhaleModifiable: tokenData.anti_whale_modifiable === "1",
    tradingCooldown: tokenData.trading_cooldown === "1",
    isBlacklisted: tokenData.is_blacklisted === "1",
    isWhitelisted: tokenData.is_whitelisted === "1",
    cannotBuyToken: tokenData.cannot_buy === "1",
    cannotSellAll: tokenData.cannot_sell_all === "1",
    slippageModifiable: tokenData.slippage_modifiable === "1",
    personalSlippageModifiable: tokenData.personal_slippage_modifiable === "1",
    transferPausable: tokenData.transfer_pausable === "1",
    holders: tokenData.holders ? tokenData.holders.slice(0, 10) : [],
    lpHolders: tokenData.lp_holders ? tokenData.lp_holders.slice(0, 10) : [],
    dexInfo: tokenData.dex || [],
  };
}

async function cmdAddressSecurity(args) {
  const address = args[0];
  if (!address) throw new Error("Missing argument: <address>");

  const result = await goplusFetch(`/address_security/${address.toLowerCase()}`, {
    chain_id: BSC_CHAIN_ID,
  });

  return {
    address,
    isMaliciousAddress: result.malicious_address === "1",
    isContractAddress: result.contract_address === "1",
    dataSource: "GoPlus",
    details: {
      phishingActivities: result.phishing_activities === "1",
      stealingAttack: result.stealing_attack === "1",
      blackmailActivities: result.blackmail_activities === "1",
      cybercrime: result.cybercrime === "1",
      moneyLaundering: result.money_laundering === "1",
      financialCrime: result.financial_crime === "1",
      darkwebTransactions: result.darkweb_transactions === "1",
      reinit: result.reinit === "1",
      honeyPotRelatedAddress: result.honeypot_related_address === "1",
      numberOfMaliciousContractsCreated: result.number_of_malicious_contracts_created || "0",
      sanctioned: result.sanctioned === "1",
      mixerAddress: result.mixer_address === "1",
    },
  };
}

async function cmdApprovalSecurity(args) {
  const address = args[0];
  if (!address) throw new Error("Missing argument: <walletAddress>");

  const result = await goplusFetch(`/approval_security/${BSC_CHAIN_ID}`, {
    contract_addresses: address.toLowerCase(),
  });

  // The API returns approval data keyed by address
  if (!result || Object.keys(result).length === 0) {
    return {
      address,
      approvals: [],
      message: "No approval data found for this address.",
    };
  }

  return {
    address,
    result,
  };
}

async function cmdNftSecurity(args) {
  const contractAddress = args[0];
  if (!contractAddress) throw new Error("Missing argument: <contractAddress>");

  const addr = contractAddress.toLowerCase();
  const result = await goplusFetch(`/nft_security/${BSC_CHAIN_ID}`, {
    contract_addresses: addr,
  });

  const nftData = result[addr];
  if (!nftData) {
    return {
      contract: contractAddress,
      error: "No NFT security data found for this contract.",
    };
  }

  return {
    contract: contractAddress,
    nftName: nftData.nft_name || null,
    nftSymbol: nftData.nft_symbol || null,
    isOpenSource: nftData.is_open_source === "1",
    isProxy: nftData.nft_proxy === "1",
    isMintable: nftData.nft_mintable === "1",
    canTakeBackOwnership: nftData.can_take_back_ownership === "1",
    selfDestruct: nftData.self_destruct === "1",
    transferWithoutApproval: nftData.transfer_without_approval === "1",
    privilegedBurn: nftData.privileged_burn === "1",
    privilegedMinting: nftData.privileged_minting === "1",
    restrictedApproval: nftData.restricted_approval === "1",
    overrideCooldown: nftData.override_cooldown === "1",
    creatorAddress: nftData.creator_address || null,
    ownerAddress: nftData.owner_address || null,
    totalSupply: nftData.total_supply || null,
  };
}

async function cmdDappSecurity(args) {
  const url = args[0];
  if (!url) throw new Error("Missing argument: <url>");

  const result = await goplusFetch("/dapp_security", {
    url: url,
  });

  if (!result || Object.keys(result).length === 0) {
    return {
      url,
      isPhishing: false,
      riskLevel: "unknown",
      message: "No data found for this URL. It may not be in the GoPlus database.",
    };
  }

  return {
    url,
    isPhishing: result.is_phishing === "1",
    riskLevel: result.is_phishing === "1" ? "high" : "low",
    details: result,
  };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

const COMMANDS = {
  "token-security": cmdTokenSecurity,
  "address-security": cmdAddressSecurity,
  "approval-security": cmdApprovalSecurity,
  "nft-security": cmdNftSecurity,
  "dapp-security": cmdDappSecurity,
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || !COMMANDS[command]) {
    const available = Object.keys(COMMANDS).join(", ");
    console.log(JSON.stringify({
      error: `Unknown command: ${command || "(none)"}. Available: ${available}`,
    }, null, 2));
    process.exit(1);
  }

  const result = await COMMANDS[command](args.slice(1));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ error: e.message || String(e) }, null, 2));
  process.exit(1);
});
