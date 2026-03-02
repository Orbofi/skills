#!/usr/bin/env node

// Venus Protocol — BNB Chain Lending/Borrowing
// Zero dependencies — Node.js 18+ built-ins only

import { createHash } from "node:crypto";

const BSC_CHAIN_ID = 56n;
const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const WALLET = process.env.BSC_WALLET_ADDRESS;
const PRIVATE_KEY = process.env.BSC_PRIVATE_KEY;

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
// Transaction Signing (secp256k1 via Node.js crypto)
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

async function signAndSend(txObj) {
  if (!PRIVATE_KEY) throw new Error("BSC_PRIVATE_KEY env var required for transactions");
  if (!WALLET) throw new Error("BSC_WALLET_ADDRESS env var required for transactions");

  const nonce = await rpc("eth_getTransactionCount", [WALLET, "latest"]);
  const gasPrice = await rpc("eth_gasPrice");

  const to = txObj.to.toLowerCase();
  const value = txObj.value || 0n;
  const data = txObj.data || "";

  // Estimate gas
  const estimateParams = { from: WALLET, to, data: "0x" + data };
  if (value > 0n) estimateParams.value = "0x" + value.toString(16);
  let gasLimit;
  try {
    const est = await rpc("eth_estimateGas", [estimateParams]);
    gasLimit = BigInt(est) * 130n / 100n; // 30% buffer
  } catch {
    gasLimit = 300000n;
  }

  // EIP-155 signing for BSC
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

  // Sign with Node.js crypto
  const { createSign, createPrivateKey } = await import("node:crypto");
  const keyDer = Buffer.concat([
    Buffer.from("30740201010420", "hex"),
    hexToBytes(PRIVATE_KEY),
    Buffer.from("a00706052b8104000aa14403420004", "hex"),
    getPublicKeyUncompressed(PRIVATE_KEY),
  ]);
  const key = createPrivateKey({ key: keyDer, format: "der", type: "sec1" });
  const signer = createSign("SHA256");
  // We need to sign the raw hash, use a trick: sign the hash directly
  // Actually for secp256k1 signing, we sign the keccak hash
  // Node.js crypto doesn't directly support signing a pre-computed hash with EC
  // Use the ECDSA sign with the raw digest
  const { sign: ecSign } = await import("node:crypto");
  const sig = ecSign(null, Buffer.from(msgHash, "hex"), { key, dsaEncoding: "ieee-p1363" });

  const r = BigInt("0x" + bytesToHex(sig.subarray(0, 32)));
  const s = BigInt("0x" + bytesToHex(sig.subarray(32, 64)));
  // Normalize s (low-s)
  const secp256k1N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const finalS = s > secp256k1N / 2n ? secp256k1N - s : s;

  // Recover v
  let v;
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

function getPublicKeyUncompressed(privKeyHex) {
  const { createECDH } = require("node:crypto");
  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(Buffer.from(privKeyHex.replace(/^0x/i, ""), "hex"));
  return ecdh.getPublicKey().subarray(1); // remove 0x04 prefix
}

// ============================================================
// Venus Contract Addresses
// ============================================================
const CONTRACTS = {
  comptroller: "0xfD36E2c2a6789Db23113685031d7F16329158384",
  vBNB:  "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
  vUSDT: "0xfD5840Cd36d94D7229439859C0112a4185BC0255",
  vBUSD: "0x95c78222B3D6e262dCeD264F5A72EE7fC5E89c0a",
  vUSDC: "0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8",
  vBTC:  "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B",
  vETH:  "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
  XVS:   "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
};

// Underlying token addresses (for approvals)
const UNDERLYING = {
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  BTC:  "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
  ETH:  "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
};

// Decimals per underlying
const DECIMALS = {
  vBNB: 18, vUSDT: 18, vBUSD: 18, vUSDC: 18, vBTC: 18, vETH: 18,
  BNB: 18, USDT: 18, BUSD: 18, USDC: 18, BTC: 18, ETH: 18,
};

const MARKET_NAMES = {
  vBNB: { symbol: "BNB", underlying: null },
  vUSDT: { symbol: "USDT", underlying: UNDERLYING.USDT },
  vBUSD: { symbol: "BUSD", underlying: UNDERLYING.BUSD },
  vUSDC: { symbol: "USDC", underlying: UNDERLYING.USDC },
  vBTC:  { symbol: "BTC",  underlying: UNDERLYING.BTC },
  vETH:  { symbol: "ETH",  underlying: UNDERLYING.ETH },
};

// ============================================================
// Function Selectors
// ============================================================
const SEL = {
  supplyRatePerBlock:    functionSelector("supplyRatePerBlock()"),
  borrowRatePerBlock:    functionSelector("borrowRatePerBlock()"),
  exchangeRateCurrent:   functionSelector("exchangeRateCurrent()"),
  balanceOf:             functionSelector("balanceOf(address)"),
  borrowBalanceCurrent:  functionSelector("borrowBalanceCurrent(address)"),
  totalSupply:           functionSelector("totalSupply()"),
  totalBorrows:          functionSelector("totalBorrows()"),
  getCash:               functionSelector("getCash()"),
  mint:                  functionSelector("mint(uint256)"),
  mintBNB:               "1249c58b", // mint() — for vBNB
  redeemUnderlying:      functionSelector("redeemUnderlying(uint256)"),
  borrow:                functionSelector("borrow(uint256)"),
  repayBorrow:           functionSelector("repayBorrow(uint256)"),
  repayBorrowBNB:        "4e4d9fea", // repayBorrow() — for vBNB
  approve:               functionSelector("approve(address,uint256)"),
  getAccountLiquidity:   functionSelector("getAccountLiquidity(address)"),
};

// BSC blocks per year (approx 3s blocks)
const BLOCKS_PER_YEAR = 10512000n;

// ============================================================
// Read Helpers
// ============================================================
async function callContract(to, data) {
  return rpc("eth_call", [{ to, data: "0x" + data }, "latest"]);
}

function decodeUint256(hex) {
  return BigInt(hex);
}

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

// ============================================================
// Commands
// ============================================================

async function cmdMarkets() {
  const results = [];

  for (const [vToken, info] of Object.entries(MARKET_NAMES)) {
    const addr = CONTRACTS[vToken];
    if (!addr) continue;

    try {
      const [supplyRateHex, borrowRateHex, totalSupplyHex, totalBorrowsHex, exchangeRateHex] = await Promise.all([
        callContract(addr, SEL.supplyRatePerBlock),
        callContract(addr, SEL.borrowRatePerBlock),
        callContract(addr, SEL.totalSupply),
        callContract(addr, SEL.totalBorrows),
        callContract(addr, SEL.exchangeRateCurrent),
      ]);

      const supplyRate = decodeUint256(supplyRateHex);
      const borrowRate = decodeUint256(borrowRateHex);
      const totalSupply = decodeUint256(totalSupplyHex);
      const totalBorrows = decodeUint256(totalBorrowsHex);
      const exchangeRate = decodeUint256(exchangeRateHex);

      // APY = ((1 + ratePerBlock / 1e18) ^ blocksPerYear - 1) * 100
      // Simplified: APY ~= ratePerBlock * blocksPerYear / 1e18 * 100
      const supplyAPY = Number(supplyRate * BLOCKS_PER_YEAR * 100n) / 1e18;
      const borrowAPY = Number(borrowRate * BLOCKS_PER_YEAR * 100n) / 1e18;

      // Total supply in underlying = vTokenSupply * exchangeRate / 1e18
      const totalSupplyUnderlying = (totalSupply * exchangeRate) / (10n ** 18n);

      results.push({
        vToken,
        underlying: info.symbol,
        address: addr,
        supplyAPY: `${supplyAPY.toFixed(2)}%`,
        borrowAPY: `${borrowAPY.toFixed(2)}%`,
        totalSupply: toEther(totalSupplyUnderlying),
        totalBorrows: toEther(totalBorrows),
      });
    } catch (e) {
      results.push({
        vToken,
        underlying: info.symbol,
        address: addr,
        error: e.message,
      });
    }
  }

  return { markets: results };
}

async function cmdAccount(address) {
  const addr = address || WALLET;
  if (!addr) throw new Error("No address provided. Set BSC_WALLET_ADDRESS or pass an address argument.");

  const positions = [];
  let totalSuppliedUSD = 0;
  let totalBorrowedUSD = 0;

  for (const [vToken, info] of Object.entries(MARKET_NAMES)) {
    const vAddr = CONTRACTS[vToken];
    if (!vAddr) continue;

    try {
      const [balHex, borrowHex, exchangeRateHex] = await Promise.all([
        callContract(vAddr, SEL.balanceOf + encodeAddress(addr)),
        callContract(vAddr, SEL.borrowBalanceCurrent + encodeAddress(addr)),
        callContract(vAddr, SEL.exchangeRateCurrent),
      ]);

      const vTokenBal = decodeUint256(balHex);
      const borrowBal = decodeUint256(borrowHex);
      const exchangeRate = decodeUint256(exchangeRateHex);

      if (vTokenBal > 0n || borrowBal > 0n) {
        const suppliedUnderlying = (vTokenBal * exchangeRate) / (10n ** 18n);
        positions.push({
          vToken,
          underlying: info.symbol,
          supplied: toEther(suppliedUnderlying),
          borrowed: toEther(borrowBal),
          vTokenBalance: toEther(vTokenBal, 8), // vTokens have 8 decimals
        });
      }
    } catch {
      // skip failed markets
    }
  }

  // Get account liquidity from comptroller
  let liquidity = "0";
  let shortfall = "0";
  try {
    const liqHex = await callContract(
      CONTRACTS.comptroller,
      SEL.getAccountLiquidity + encodeAddress(addr)
    );
    // Returns (error, liquidity, shortfall) — 3 uint256 values
    const hex = liqHex.replace(/^0x/, "");
    const errorCode = BigInt("0x" + hex.slice(0, 64));
    const liqVal = BigInt("0x" + hex.slice(64, 128));
    const shortfallVal = BigInt("0x" + hex.slice(128, 192));
    liquidity = toEther(liqVal);
    shortfall = toEther(shortfallVal);
  } catch {
    // ignore
  }

  return {
    address: addr,
    positions,
    accountLiquidity: liquidity,
    accountShortfall: shortfall,
    healthStatus: BigInt(shortfall.replace(".", "")) > 0n ? "AT RISK" : "HEALTHY",
  };
}

async function cmdSupply(vTokenName, amount) {
  if (!vTokenName || !amount) throw new Error("Usage: venus.mjs supply <vToken> <amount>");

  const vAddr = CONTRACTS[vTokenName];
  if (!vAddr) throw new Error(`Unknown vToken: ${vTokenName}. Available: ${Object.keys(CONTRACTS).filter(k => k.startsWith("v")).join(", ")}`);

  const amountWei = parseEther(amount);

  if (vTokenName === "vBNB") {
    // vBNB: call mint() with BNB value
    const txHash = await signAndSend({
      to: vAddr,
      value: amountWei,
      data: SEL.mintBNB,
    });
    return { action: "supply", vToken: vTokenName, amount, txHash };
  } else {
    // ERC-20: call mint(uint256)
    const data = SEL.mint + encodeUint256(amountWei);
    const txHash = await signAndSend({ to: vAddr, data });
    return { action: "supply", vToken: vTokenName, amount, txHash };
  }
}

async function cmdWithdraw(vTokenName, amount) {
  if (!vTokenName || !amount) throw new Error("Usage: venus.mjs withdraw <vToken> <amount>");

  const vAddr = CONTRACTS[vTokenName];
  if (!vAddr) throw new Error(`Unknown vToken: ${vTokenName}`);

  const amountWei = parseEther(amount);
  const data = SEL.redeemUnderlying + encodeUint256(amountWei);
  const txHash = await signAndSend({ to: vAddr, data });
  return { action: "withdraw", vToken: vTokenName, amount, txHash };
}

async function cmdBorrow(vTokenName, amount) {
  if (!vTokenName || !amount) throw new Error("Usage: venus.mjs borrow <vToken> <amount>");

  const vAddr = CONTRACTS[vTokenName];
  if (!vAddr) throw new Error(`Unknown vToken: ${vTokenName}`);

  const amountWei = parseEther(amount);
  const data = SEL.borrow + encodeUint256(amountWei);
  const txHash = await signAndSend({ to: vAddr, data });
  return { action: "borrow", vToken: vTokenName, amount, txHash };
}

async function cmdRepay(vTokenName, amount) {
  if (!vTokenName || !amount) throw new Error("Usage: venus.mjs repay <vToken> <amount>");

  const vAddr = CONTRACTS[vTokenName];
  if (!vAddr) throw new Error(`Unknown vToken: ${vTokenName}`);

  const amountWei = parseEther(amount);

  if (vTokenName === "vBNB") {
    const txHash = await signAndSend({
      to: vAddr,
      value: amountWei,
      data: SEL.repayBorrowBNB,
    });
    return { action: "repay", vToken: vTokenName, amount, txHash };
  } else {
    const data = SEL.repayBorrow + encodeUint256(amountWei);
    const txHash = await signAndSend({ to: vAddr, data });
    return { action: "repay", vToken: vTokenName, amount, txHash };
  }
}

async function cmdRates(vTokenName) {
  if (!vTokenName) throw new Error("Usage: venus.mjs rates <vToken>");

  const vAddr = CONTRACTS[vTokenName];
  if (!vAddr) throw new Error(`Unknown vToken: ${vTokenName}`);

  const [supplyRateHex, borrowRateHex, cashHex, totalBorrowsHex, totalSupplyHex, exchangeRateHex] = await Promise.all([
    callContract(vAddr, SEL.supplyRatePerBlock),
    callContract(vAddr, SEL.borrowRatePerBlock),
    callContract(vAddr, SEL.getCash),
    callContract(vAddr, SEL.totalBorrows),
    callContract(vAddr, SEL.totalSupply),
    callContract(vAddr, SEL.exchangeRateCurrent),
  ]);

  const supplyRate = decodeUint256(supplyRateHex);
  const borrowRate = decodeUint256(borrowRateHex);
  const cash = decodeUint256(cashHex);
  const totalBorrows = decodeUint256(totalBorrowsHex);
  const totalSupply = decodeUint256(totalSupplyHex);
  const exchangeRate = decodeUint256(exchangeRateHex);

  const supplyAPY = Number(supplyRate * BLOCKS_PER_YEAR * 100n) / 1e18;
  const borrowAPY = Number(borrowRate * BLOCKS_PER_YEAR * 100n) / 1e18;

  // Utilization = totalBorrows / (cash + totalBorrows)
  const totalLiquidity = cash + totalBorrows;
  const utilization = totalLiquidity > 0n
    ? Number(totalBorrows * 10000n / totalLiquidity) / 100
    : 0;

  const totalSupplyUnderlying = (totalSupply * exchangeRate) / (10n ** 18n);

  return {
    vToken: vTokenName,
    supplyAPY: `${supplyAPY.toFixed(4)}%`,
    borrowAPY: `${borrowAPY.toFixed(4)}%`,
    supplyRatePerBlock: toEther(supplyRate),
    borrowRatePerBlock: toEther(borrowRate),
    utilizationRate: `${utilization.toFixed(2)}%`,
    totalSupply: toEther(totalSupplyUnderlying),
    totalBorrows: toEther(totalBorrows),
    availableLiquidity: toEther(cash),
    exchangeRate: toEther(exchangeRate),
  };
}

async function cmdApprove(tokenName, vTokenName) {
  if (!tokenName || !vTokenName) throw new Error("Usage: venus.mjs approve <token> <vToken>");

  const tokenAddr = UNDERLYING[tokenName];
  if (!tokenAddr) throw new Error(`Unknown token: ${tokenName}. Available: ${Object.keys(UNDERLYING).join(", ")}`);

  const vAddr = CONTRACTS[vTokenName];
  if (!vAddr) throw new Error(`Unknown vToken: ${vTokenName}`);

  const MAX_UINT256 = (2n ** 256n) - 1n;
  const data = SEL.approve + encodeAddress(vAddr) + encodeUint256(MAX_UINT256);
  const txHash = await signAndSend({ to: tokenAddr, data });
  return { action: "approve", token: tokenName, spender: vTokenName, spenderAddress: vAddr, txHash };
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
      case "markets":
        result = await cmdMarkets();
        break;
      case "account":
        result = await cmdAccount(args[1]);
        break;
      case "supply":
        result = await cmdSupply(args[1], args[2]);
        break;
      case "withdraw":
        result = await cmdWithdraw(args[1], args[2]);
        break;
      case "borrow":
        result = await cmdBorrow(args[1], args[2]);
        break;
      case "repay":
        result = await cmdRepay(args[1], args[2]);
        break;
      case "rates":
        result = await cmdRates(args[1]);
        break;
      case "approve":
        result = await cmdApprove(args[1], args[2]);
        break;
      default:
        result = {
          error: "Unknown command",
          usage: "venus.mjs <command> [args]",
          commands: {
            markets: "List all Venus markets with supply/borrow rates",
            "account [address]": "Get account balances (supplied, borrowed, health factor)",
            "supply <vToken> <amount>": "Supply assets to Venus (mint vTokens)",
            "withdraw <vToken> <amount>": "Withdraw assets (redeem vTokens)",
            "borrow <vToken> <amount>": "Borrow assets",
            "repay <vToken> <amount>": "Repay borrowed assets",
            "rates <vToken>": "Get supply/borrow APY for a market",
            "approve <token> <vToken>": "Approve token for Venus",
          },
          vTokens: Object.keys(CONTRACTS).filter(k => k.startsWith("v")),
          tokens: Object.keys(UNDERLYING),
        };
        if (!cmd) {
          console.log(JSON.stringify(result, null, 2));
          process.exit(0);
        }
        console.log(JSON.stringify(result, null, 2));
        process.exit(1);
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }, null, 2));
    process.exit(1);
  }
}

main();
