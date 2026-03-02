#!/usr/bin/env node

// Beefy Finance — Auto-compounding Yield Vaults (BNB Chain)
// Zero dependencies — Node.js 18+ built-ins only

const BSC_CHAIN_ID = 56n;
const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const WALLET = process.env.BSC_WALLET_ADDRESS;
const PRIVATE_KEY = process.env.BSC_PRIVATE_KEY;

const BEEFY_API = "https://api.beefy.finance";

// ============================================================
// Keccak-256 (pure JS)
// ============================================================
const KECCAK_ROUNDS = 24;
const RC = [0x0000000000000001n,0x0000000000008082n,0x800000000000808an,0x8000000080008000n,0x000000000000808bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,0x000000000000008an,0x0000000000000088n,0x0000000080008009n,0x000000008000000an,0x000000008000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x000000000000800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
const ROTC = [1,3,6,10,15,21,28,36,45,55,2,14,27,41,56,8,25,43,62,18,39,61,20,44];
const PI = [10,7,11,17,18,3,5,16,8,21,24,4,15,23,19,13,12,2,20,14,22,9,6,1];
const MASK64 = (1n << 64n) - 1n;
function rot64(x,n){n=BigInt(n);return((x<<n)|(x>>(64n-n)))&MASK64;}
function keccakF(s){for(let r=0;r<KECCAK_ROUNDS;r++){const C=new Array(5);for(let x=0;x<5;x++)C[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];for(let x=0;x<5;x++){const d=C[(x+4)%5]^rot64(C[(x+1)%5],1);for(let y=0;y<25;y+=5)s[y+x]=(s[y+x]^d)&MASK64;}let last=s[1];for(let i=0;i<24;i++){const j=PI[i],tmp=s[j];s[j]=rot64(last,ROTC[i]);last=tmp;}for(let y=0;y<25;y+=5){const t=[s[y],s[y+1],s[y+2],s[y+3],s[y+4]];for(let x=0;x<5;x++)s[y+x]=(t[x]^((~t[(x+1)%5]&MASK64)&t[(x+2)%5]))&MASK64;}s[0]=(s[0]^RC[r])&MASK64;}}
function keccak256(hexInput){const input=Buffer.from(hexInput,"hex");const rate=136;const q=rate-(input.length%rate);const padded=Buffer.alloc(input.length+(q===0?rate:q));input.copy(padded);padded[input.length]=0x01;padded[padded.length-1]|=0x80;const state=new Array(25).fill(0n);for(let off=0;off<padded.length;off+=rate){for(let i=0;i<rate/8;i++){const lo=padded.readUInt32LE(off+i*8);const hi=padded.readUInt32LE(off+i*8+4);state[i]^=BigInt(lo)|(BigInt(hi)<<32n);}keccakF(state);}const out=Buffer.alloc(32);for(let i=0;i<4;i++){const v=state[i];out.writeUInt32LE(Number(v&0xffffffffn),i*8);out.writeUInt32LE(Number((v>>32n)&0xffffffffn),i*8+4);}return out.toString("hex");}

// ============================================================
// RPC Helper
// ============================================================
async function rpc(method, params = []) {
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// ============================================================
// ABI Helpers
// ============================================================
function padHex(hex, bytes) { return hex.padStart(bytes * 2, "0"); }
function encodeAddress(addr) { return padHex(addr.replace(/^0x/i, "").toLowerCase(), 32); }
function encodeUint256(val) { return padHex(BigInt(val).toString(16), 32); }
function functionSelector(sig) { return keccak256(Buffer.from(sig).toString("hex")).slice(0, 8); }

// ============================================================
// Transaction Signing
// ============================================================
function hexToBytes(hex) { return Buffer.from(hex.replace(/^0x/i, ""), "hex"); }
function bytesToHex(buf) { return buf.toString("hex"); }

function rlpEncode(items) {
  if (Array.isArray(items)) {
    const encoded = Buffer.concat(items.map(rlpEncode));
    return Buffer.concat([rlpEncodeLength(encoded.length, 0xc0), encoded]);
  }
  const buf = typeof items === "string" ? hexToBytes(items) : items;
  if (buf.length === 1 && buf[0] < 0x80) return buf;
  return Buffer.concat([rlpEncodeLength(buf.length, 0x80), buf]);
}

function rlpEncodeLength(len, offset) {
  if (len < 56) return Buffer.from([offset + len]);
  const hexLen = len.toString(16);
  const lenBytes = Buffer.from(hexLen.length % 2 ? "0" + hexLen : hexLen, "hex");
  return Buffer.concat([Buffer.from([offset + 55 + lenBytes.length]), lenBytes]);
}

function bigintToBuffer(val) {
  if (val === 0n) return Buffer.alloc(0);
  let hex = val.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return Buffer.from(hex, "hex");
}

function getPublicKeyUncompressed(privKeyHex) {
  const { createECDH } = require("node:crypto");
  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(Buffer.from(privKeyHex.replace(/^0x/i, ""), "hex"));
  return ecdh.getPublicKey().subarray(1);
}

async function signAndSend(txObj) {
  if (!PRIVATE_KEY) throw new Error("BSC_PRIVATE_KEY env var required for transactions");
  if (!WALLET) throw new Error("BSC_WALLET_ADDRESS env var required for transactions");

  const nonce = await rpc("eth_getTransactionCount", [WALLET, "latest"]);
  const gasPrice = await rpc("eth_gasPrice");

  const to = txObj.to.toLowerCase();
  const value = txObj.value || 0n;
  const data = txObj.data || "";

  const estimateParams = { from: WALLET, to, data: "0x" + data };
  if (value > 0n) estimateParams.value = "0x" + value.toString(16);
  let gasLimit;
  try {
    const est = await rpc("eth_estimateGas", [estimateParams]);
    gasLimit = BigInt(est) * 130n / 100n;
  } catch {
    gasLimit = 300000n;
  }

  const txFields = [
    bigintToBuffer(BigInt(nonce)),
    bigintToBuffer(BigInt(gasPrice)),
    bigintToBuffer(gasLimit),
    hexToBytes(to),
    bigintToBuffer(value),
    data ? hexToBytes(data) : Buffer.alloc(0),
    bigintToBuffer(BSC_CHAIN_ID),
    Buffer.alloc(0),
    Buffer.alloc(0),
  ];

  const encoded = rlpEncode(txFields);
  const msgHash = keccak256(bytesToHex(encoded));

  const { sign: ecSign, createPrivateKey } = await import("node:crypto");
  const keyDer = Buffer.concat([
    Buffer.from("30740201010420", "hex"),
    hexToBytes(PRIVATE_KEY),
    Buffer.from("a00706052b8104000aa14403420004", "hex"),
    getPublicKeyUncompressed(PRIVATE_KEY),
  ]);
  const key = createPrivateKey({ key: keyDer, format: "der", type: "sec1" });
  const sig = ecSign(null, Buffer.from(msgHash, "hex"), { key, dsaEncoding: "ieee-p1363" });

  const r = BigInt("0x" + bytesToHex(sig.subarray(0, 32)));
  const s = BigInt("0x" + bytesToHex(sig.subarray(32, 64)));
  const secp256k1N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const finalS = s > secp256k1N / 2n ? secp256k1N - s : s;

  for (const tryV of [0n, 1n]) {
    const testV = tryV + 35n + BSC_CHAIN_ID * 2n;
    const signedFields = [
      bigintToBuffer(BigInt(nonce)),
      bigintToBuffer(BigInt(gasPrice)),
      bigintToBuffer(gasLimit),
      hexToBytes(to),
      bigintToBuffer(value),
      data ? hexToBytes(data) : Buffer.alloc(0),
      bigintToBuffer(testV),
      bigintToBuffer(r),
      bigintToBuffer(finalS),
    ];
    const rawTx = "0x" + bytesToHex(rlpEncode(signedFields));
    try {
      const txHash = await rpc("eth_sendRawTransaction", [rawTx]);
      return txHash;
    } catch (e) {
      if (tryV === 1n) throw e;
      continue;
    }
  }
}

// ============================================================
// Vault Contract Function Selectors
// ============================================================
const SEL = {
  deposit:              functionSelector("deposit(uint256)"),
  depositAll:           "de5f6268", // depositAll()
  withdraw:             functionSelector("withdraw(uint256)"),
  withdrawAll:          "853828b6", // withdrawAll()
  balanceOf:            functionSelector("balanceOf(address)"),
  getPricePerFullShare: functionSelector("getPricePerFullShare()"),
  totalSupply:          functionSelector("totalSupply()"),
  approve:              functionSelector("approve(address,uint256)"),
};

// ============================================================
// Utility
// ============================================================
function toEther(wei, decimals = 18) {
  const w = BigInt(wei);
  const d = BigInt(decimals);
  const divisor = 10n ** d;
  const whole = w / divisor;
  const frac = w % divisor;
  const fracStr = frac.toString().padStart(Number(d), "0").slice(0, 6);
  return `${whole}.${fracStr}`;
}

function parseEther(amount, decimals = 18) {
  const parts = amount.toString().split(".");
  const whole = parts[0];
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + frac);
}

async function callContract(to, data) {
  return rpc("eth_call", [{ to, data: "0x" + data }, "latest"]);
}

function decodeUint256(hex) {
  return BigInt(hex);
}

// ============================================================
// Beefy API Helpers
// ============================================================
async function fetchBeefyVaults() {
  const res = await fetch(`${BEEFY_API}/vaults`);
  if (!res.ok) throw new Error(`Beefy API error: ${res.status}`);
  const all = await res.json();
  // Filter to BSC (chain = "bsc") and active vaults
  return all.filter(v => v.chain === "bsc" && v.status === "active");
}

async function fetchBeefyApy() {
  const res = await fetch(`${BEEFY_API}/apy`);
  if (!res.ok) throw new Error(`Beefy APY API error: ${res.status}`);
  return res.json();
}

async function fetchBeefyTvl() {
  const res = await fetch(`${BEEFY_API}/tvl`);
  if (!res.ok) throw new Error(`Beefy TVL API error: ${res.status}`);
  return res.json();
}

async function fetchBeefyApyBreakdown() {
  const res = await fetch(`${BEEFY_API}/apy/breakdown`);
  if (!res.ok) throw new Error(`Beefy APY breakdown API error: ${res.status}`);
  return res.json();
}

// ============================================================
// Commands
// ============================================================

async function cmdVaults(filter) {
  const [vaults, apyData] = await Promise.all([
    fetchBeefyVaults(),
    fetchBeefyApy(),
  ]);

  let filtered = vaults;
  if (filter) {
    const f = filter.toLowerCase();
    filtered = vaults.filter(v =>
      v.id.toLowerCase().includes(f) ||
      v.name.toLowerCase().includes(f) ||
      (v.token && v.token.toLowerCase().includes(f)) ||
      (v.platform && v.platform.toLowerCase().includes(f))
    );
  }

  // Sort by APY descending
  const withApy = filtered.map(v => ({
    id: v.id,
    name: v.name,
    token: v.token,
    platform: v.platformId || v.platform,
    earnedToken: v.earnedToken,
    earnedTokenAddress: v.earnedTokenAddress,
    vaultAddress: v.earnContractAddress,
    apy: apyData[v.id] !== undefined ? `${(apyData[v.id] * 100).toFixed(2)}%` : "N/A",
    apyRaw: apyData[v.id] || 0,
  }));

  withApy.sort((a, b) => b.apyRaw - a.apyRaw);

  // Limit to top 50 for readability
  const top = withApy.slice(0, 50);

  return {
    chain: "bsc",
    filter: filter || "none",
    totalMatchingVaults: filtered.length,
    showing: top.length,
    vaults: top.map(({ apyRaw, ...rest }) => rest),
  };
}

async function cmdVaultDetail(vaultId) {
  if (!vaultId) throw new Error("Usage: beefy.mjs vault <vaultId>");

  const [vaults, apyData, breakdownData] = await Promise.all([
    fetchBeefyVaults(),
    fetchBeefyApy(),
    fetchBeefyApyBreakdown(),
  ]);

  const vault = vaults.find(v => v.id === vaultId);
  if (!vault) {
    // Try partial match
    const matches = vaults.filter(v => v.id.includes(vaultId));
    if (matches.length > 0) {
      return {
        error: `Vault "${vaultId}" not found. Did you mean one of these?`,
        suggestions: matches.slice(0, 10).map(v => v.id),
      };
    }
    throw new Error(`Vault "${vaultId}" not found on BSC.`);
  }

  const apy = apyData[vaultId];
  const breakdown = breakdownData[vaultId];

  // Try to get on-chain pricePerFullShare
  let pricePerShare = "unknown";
  if (vault.earnContractAddress) {
    try {
      const ppfsHex = await callContract(
        vault.earnContractAddress,
        SEL.getPricePerFullShare
      );
      pricePerShare = toEther(decodeUint256(ppfsHex));
    } catch {
      // may fail for some vault types
    }
  }

  return {
    id: vault.id,
    name: vault.name,
    token: vault.token,
    platform: vault.platformId || vault.platform,
    chain: vault.chain,
    vaultAddress: vault.earnContractAddress,
    tokenAddress: vault.tokenAddress,
    earnedToken: vault.earnedToken,
    status: vault.status,
    totalAPY: apy !== undefined ? `${(apy * 100).toFixed(2)}%` : "N/A",
    apyBreakdown: breakdown ? {
      vaultApr: breakdown.vaultApr !== undefined ? `${(breakdown.vaultApr * 100).toFixed(2)}%` : "N/A",
      tradingApr: breakdown.tradingApr !== undefined ? `${(breakdown.tradingApr * 100).toFixed(2)}%` : "N/A",
      totalApy: breakdown.totalApy !== undefined ? `${(breakdown.totalApy * 100).toFixed(2)}%` : "N/A",
      compoundingsPerYear: breakdown.compoundingsPerYear || "N/A",
    } : "No breakdown available",
    pricePerFullShare: pricePerShare,
    assets: vault.assets || [],
    risks: vault.risks || [],
    createdAt: vault.createdAt,
  };
}

async function cmdDeposit(vaultAddress, amount) {
  if (!vaultAddress || !amount) throw new Error("Usage: beefy.mjs deposit <vaultAddress> <amount>");

  const amountWei = parseEther(amount);

  // Deposit into Beefy vault
  const data = SEL.deposit + encodeUint256(amountWei);
  const txHash = await signAndSend({ to: vaultAddress, data });

  return {
    action: "deposit",
    vaultAddress,
    amount,
    note: "Ensure you have approved the vault to spend your tokens before depositing. Vault shares (mooTokens) will be minted to your address.",
    txHash,
  };
}

async function cmdWithdraw(vaultAddress, amount) {
  if (!vaultAddress || !amount) throw new Error("Usage: beefy.mjs withdraw <vaultAddress> <amount|max>");

  if (amount.toLowerCase() === "max") {
    // withdrawAll()
    const txHash = await signAndSend({ to: vaultAddress, data: SEL.withdrawAll });
    return {
      action: "withdrawAll",
      vaultAddress,
      note: "All vault shares have been redeemed for underlying tokens.",
      txHash,
    };
  }

  const amountWei = parseEther(amount);
  const data = SEL.withdraw + encodeUint256(amountWei);
  const txHash = await signAndSend({ to: vaultAddress, data });

  return {
    action: "withdraw",
    vaultAddress,
    shares: amount,
    note: "Vault shares redeemed for underlying tokens at current pricePerFullShare.",
    txHash,
  };
}

async function cmdBalance(vaultAddress, address) {
  if (!vaultAddress) throw new Error("Usage: beefy.mjs balance <vaultAddress> [address]");

  const addr = address || WALLET;
  if (!addr) throw new Error("No address provided. Set BSC_WALLET_ADDRESS or pass an address argument.");

  // Get mooToken balance
  const balHex = await callContract(
    vaultAddress,
    SEL.balanceOf + encodeAddress(addr)
  );
  const balance = decodeUint256(balHex);
  const balanceStr = toEther(balance);

  // Get pricePerFullShare
  let pricePerShare = "unknown";
  let underlyingValue = "unknown";
  try {
    const ppfsHex = await callContract(vaultAddress, SEL.getPricePerFullShare);
    const ppfs = decodeUint256(ppfsHex);
    pricePerShare = toEther(ppfs);
    // Underlying value = balance * ppfs / 1e18
    const underlying = (balance * ppfs) / (10n ** 18n);
    underlyingValue = toEther(underlying);
  } catch {
    // some vaults may not support this
  }

  return {
    address: addr,
    vaultAddress,
    mooTokenBalance: balanceStr,
    pricePerFullShare: pricePerShare,
    estimatedUnderlyingValue: underlyingValue,
  };
}

async function cmdTvl() {
  const [tvlData, vaults] = await Promise.all([
    fetchBeefyTvl(),
    fetchBeefyVaults(),
  ]);

  // tvlData is keyed by vault address or chain-based
  // Sum up BSC TVL
  let totalBscTvl = 0;
  const vaultTvls = [];

  // tvlData may be structured as { chainId: { vaultAddress: tvl } } or flat
  // Handle both formats
  if (typeof tvlData === "object") {
    // If it's an object of objects (chain-based)
    for (const [key, val] of Object.entries(tvlData)) {
      if (typeof val === "object" && val !== null) {
        // Nested: { "56": { "0x...": 12345 } }
        if (key === "56") { // BSC chain ID
          for (const [vAddr, tvl] of Object.entries(val)) {
            const num = Number(tvl) || 0;
            totalBscTvl += num;
            vaultTvls.push({ address: vAddr, tvl: num });
          }
        }
      }
    }
  }

  // Sort by TVL descending
  vaultTvls.sort((a, b) => b.tvl - a.tvl);
  const topVaults = vaultTvls.slice(0, 20);

  // Map vault addresses to names
  const addressToVault = {};
  for (const v of vaults) {
    if (v.earnContractAddress) {
      addressToVault[v.earnContractAddress.toLowerCase()] = v;
    }
  }

  const topWithNames = topVaults.map(tv => {
    const vault = addressToVault[tv.address.toLowerCase()];
    return {
      vaultId: vault ? vault.id : "unknown",
      name: vault ? vault.name : tv.address,
      address: tv.address,
      tvl: `$${tv.tvl.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    };
  });

  return {
    chain: "bsc",
    totalTVL: `$${totalBscTvl.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    activeVaults: vaults.length,
    topVaultsByTVL: topWithNames,
  };
}

async function cmdApy(vaultId) {
  if (!vaultId) throw new Error("Usage: beefy.mjs apy <vaultId>");

  const [apyData, breakdownData] = await Promise.all([
    fetchBeefyApy(),
    fetchBeefyApyBreakdown(),
  ]);

  const apy = apyData[vaultId];
  const breakdown = breakdownData[vaultId];

  if (apy === undefined && !breakdown) {
    // Try to suggest similar vault IDs
    const allIds = Object.keys(apyData);
    const suggestions = allIds.filter(id => id.includes(vaultId)).slice(0, 10);
    if (suggestions.length > 0) {
      return {
        error: `No APY data for vault "${vaultId}". Did you mean one of these?`,
        suggestions,
      };
    }
    throw new Error(`No APY data found for vault "${vaultId}".`);
  }

  const result = {
    vaultId,
    totalAPY: apy !== undefined ? `${(apy * 100).toFixed(4)}%` : "N/A",
    totalAPYRaw: apy,
  };

  if (breakdown) {
    result.breakdown = {
      vaultApr: breakdown.vaultApr !== undefined ? `${(breakdown.vaultApr * 100).toFixed(4)}%` : "N/A",
      vaultApy: breakdown.vaultApy !== undefined ? `${(breakdown.vaultApy * 100).toFixed(4)}%` : "N/A",
      tradingApr: breakdown.tradingApr !== undefined ? `${(breakdown.tradingApr * 100).toFixed(4)}%` : "N/A",
      totalApy: breakdown.totalApy !== undefined ? `${(breakdown.totalApy * 100).toFixed(4)}%` : "N/A",
      compoundingsPerYear: breakdown.compoundingsPerYear || "N/A",
      beefyPerformanceFee: breakdown.beefyPerformanceFee !== undefined ? `${(breakdown.beefyPerformanceFee * 100).toFixed(2)}%` : "N/A",
    };

    // Show boost info if present
    if (breakdown.boostedTotalApy) {
      result.boostedAPY = `${(breakdown.boostedTotalApy * 100).toFixed(4)}%`;
    }
  }

  result.note = "APY includes auto-compounding benefits. vaultApr is the base farm yield, tradingApr comes from LP trading fees. Beefy takes a performance fee on harvested rewards only (not principal).";

  return result;
}

// ============================================================
// CLI Router
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  try {
    let result;
    switch (cmd) {
      case "vaults":
        result = await cmdVaults(args[1]);
        break;
      case "vault":
        result = await cmdVaultDetail(args[1]);
        break;
      case "deposit":
        result = await cmdDeposit(args[1], args[2]);
        break;
      case "withdraw":
        result = await cmdWithdraw(args[1], args[2]);
        break;
      case "balance":
        result = await cmdBalance(args[1], args[2]);
        break;
      case "tvl":
        result = await cmdTvl();
        break;
      case "apy":
        result = await cmdApy(args[1]);
        break;
      default:
        result = {
          error: cmd ? "Unknown command" : undefined,
          usage: "beefy.mjs <command> [args]",
          commands: {
            "vaults [filter]": "List BNB Chain vaults with APY (filter by token name)",
            "vault <vaultId>": "Detailed vault info (APY, TVL, strategy, platform)",
            "deposit <vaultAddress> <amount>": "Deposit into a vault",
            "withdraw <vaultAddress> <amount|max>": "Withdraw from a vault (use 'max' for all)",
            "balance <vaultAddress> [address]": "Check vault share balance",
            "tvl": "Total TVL across all BNB Chain vaults",
            "apy <vaultId>": "Detailed APY breakdown (base, reward, total)",
          },
          apiBase: BEEFY_API,
        };
        if (cmd) {
          console.log(JSON.stringify(result, null, 2));
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
        return;
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }, null, 2));
    process.exit(1);
  }
}

main();
