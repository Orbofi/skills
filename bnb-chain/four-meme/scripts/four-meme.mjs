#!/usr/bin/env node

// four-meme.mjs — Four.Meme BNB Chain meme token launchpad
// Zero dependencies — Node.js 18+ built-ins + global fetch() only

import { createECDH, createPrivateKey, sign as cryptoSign } from "node:crypto";
const BSC_CHAIN_ID = 56n;
const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const WALLET = process.env.BSC_WALLET_ADDRESS;
const PRIVATE_KEY = process.env.BSC_PRIVATE_KEY;

// Keccak-256 (pure JS)
const KECCAK_ROUNDS=24;const RC=[0x0000000000000001n,0x0000000000008082n,0x800000000000808an,0x8000000080008000n,0x000000000000808bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,0x000000000000008an,0x0000000000000088n,0x0000000080008009n,0x000000008000000an,0x000000008000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x000000000000800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];const ROTC=[1,3,6,10,15,21,28,36,45,55,2,14,27,41,56,8,25,43,62,18,39,61,20,44];const PI=[10,7,11,17,18,3,5,16,8,21,24,4,15,23,19,13,12,2,20,14,22,9,6,1];const MASK64=(1n<<64n)-1n;
function rot64(x,n){n=BigInt(n);return((x<<n)|(x>>(64n-n)))&MASK64;}
function keccakF(s){for(let r=0;r<KECCAK_ROUNDS;r++){const C=new Array(5);for(let x=0;x<5;x++)C[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];for(let x=0;x<5;x++){const d=C[(x+4)%5]^rot64(C[(x+1)%5],1);for(let y=0;y<25;y+=5)s[y+x]=(s[y+x]^d)&MASK64;}let last=s[1];for(let i=0;i<24;i++){const j=PI[i],tmp=s[j];s[j]=rot64(last,ROTC[i]);last=tmp;}for(let y=0;y<25;y+=5){const t=[s[y],s[y+1],s[y+2],s[y+3],s[y+4]];for(let x=0;x<5;x++)s[y+x]=(t[x]^((~t[(x+1)%5]&MASK64)&t[(x+2)%5]))&MASK64;}s[0]=(s[0]^RC[r])&MASK64;}}
function keccak256(hexInput){const input=Buffer.from(hexInput,"hex");const rate=136;const q=rate-(input.length%rate);const padded=Buffer.alloc(input.length+(q===0?rate:q));input.copy(padded);padded[input.length]=0x01;padded[padded.length-1]|=0x80;const state=new Array(25).fill(0n);for(let off=0;off<padded.length;off+=rate){for(let i=0;i<rate/8;i++){const lo=padded.readUInt32LE(off+i*8);const hi=padded.readUInt32LE(off+i*8+4);state[i]^=BigInt(lo)|(BigInt(hi)<<32n);}keccakF(state);}const out=Buffer.alloc(32);for(let i=0;i<4;i++){const v=state[i];out.writeUInt32LE(Number(v&0xffffffffn),i*8);out.writeUInt32LE(Number((v>>32n)&0xffffffffn),i*8+4);}return out.toString("hex");}

async function rpc(method, params = []) {
  const res = await fetch(BSC_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}
function padHex(hex, bytes) { return hex.padStart(bytes * 2, "0"); }
function encodeAddress(addr) { return padHex(addr.replace(/^0x/i, "").toLowerCase(), 32); }
function encodeUint256(val) { return padHex(BigInt(val).toString(16), 32); }
function functionSelector(sig) { return keccak256(Buffer.from(sig).toString("hex")).slice(0, 8); }

// ─── Constants ───────────────────────────────────────────────────────────────

const FOUR_MEME_API = "https://four.meme/api/v1";
const FOUR_MEME_ROUTER = "0x5c952063c7FC8610FFDB798152D69F0B9550762b";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

// Common function selectors for bonding curve interactions
const SEL_BUY = functionSelector("buyToken(address,uint256)");
const SEL_SELL = functionSelector("sellToken(address,uint256)");
const SEL_APPROVE = functionSelector("approve(address,uint256)");
const SEL_BALANCE_OF = functionSelector("balanceOf(address)");
const SEL_DECIMALS = functionSelector("decimals()");
const SEL_ALLOWANCE = functionSelector("allowance(address,address)");
const UINT256_MAX = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function out(data) { console.log(JSON.stringify(data, null, 2)); }
function fail(msg) { out({ error: msg }); process.exit(1); }

function requireWallet() {
  if (!WALLET) fail("BSC_WALLET_ADDRESS env var is required for this command");
  if (!PRIVATE_KEY) fail("BSC_PRIVATE_KEY env var is required for this command");
}

async function getTokenDecimals(tokenAddress) {
  const data = "0x" + SEL_DECIMALS;
  const result = await rpc("eth_call", [{ to: tokenAddress, data }, "latest"]);
  return parseInt(result, 16);
}

async function getTokenBalance(tokenAddress, owner) {
  const data = "0x" + SEL_BALANCE_OF + encodeAddress(owner);
  const result = await rpc("eth_call", [{ to: tokenAddress, data }, "latest"]);
  return BigInt(result);
}

function toWei(amount, decimals = 18) {
  const parts = amount.toString().split(".");
  const whole = parts[0];
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + frac);
}

function fromWei(wei, decimals = 18) {
  const s = wei.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals) || "0";
  const frac = s.slice(s.length - decimals);
  const trimmed = frac.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

async function apiGet(endpoint) {
  const url = `${FOUR_MEME_API}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "OrbofiAgent/1.0"
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Four.Meme API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// ─── Transaction Signing & Sending ───────────────────────────────────────────

function rlpEncodeLength(len, offset) {
  if (len < 56) return Buffer.from([len + offset]);
  const hexLen = len.toString(16);
  const lenBytes = Buffer.from(hexLen.length % 2 ? "0" + hexLen : hexLen, "hex");
  return Buffer.concat([Buffer.from([offset + 55 + lenBytes.length]), lenBytes]);
}

function rlpEncode(input) {
  if (Buffer.isBuffer(input)) {
    if (input.length === 1 && input[0] < 0x80) return input;
    return Buffer.concat([rlpEncodeLength(input.length, 0x80), input]);
  }
  if (Array.isArray(input)) {
    const encoded = Buffer.concat(input.map(rlpEncode));
    return Buffer.concat([rlpEncodeLength(encoded.length, 0xc0), encoded]);
  }
  return rlpEncode(Buffer.alloc(0));
}

function bigintToBuffer(val) {
  if (val === 0n) return Buffer.alloc(0);
  let hex = val.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const buf = Buffer.from(hex, "hex");
  return buf[0] >= 0x80 ? Buffer.concat([Buffer.from([0]), buf]) : buf;
}

function hexToBuffer(hex) {
  if (!hex || hex === "0x" || hex === "0x0") return Buffer.alloc(0);
  hex = hex.replace(/^0x/, "");
  if (hex.length % 2) hex = "0" + hex;
  return Buffer.from(hex, "hex");
}

async function signAndSend(txObj) {
  const nonce = await rpc("eth_getTransactionCount", [WALLET, "latest"]);
  const gasPrice = await rpc("eth_gasPrice");

  const tx = {
    nonce: BigInt(nonce),
    gasPrice: BigInt(gasPrice),
    gasLimit: txObj.gasLimit || 300000n,
    to: txObj.to,
    value: txObj.value || 0n,
    data: txObj.data || "0x",
  };

  // Estimate gas
  try {
    const estimate = await rpc("eth_estimateGas", [{
      from: WALLET,
      to: tx.to,
      value: "0x" + tx.value.toString(16),
      data: tx.data,
    }]);
    tx.gasLimit = BigInt(estimate) * 130n / 100n; // 30% buffer
  } catch (e) {
    // Fall back to default gasLimit
  }

  // EIP-155 signing for BSC (chainId=56)
  const rawForSig = [
    bigintToBuffer(tx.nonce),
    bigintToBuffer(tx.gasPrice),
    bigintToBuffer(tx.gasLimit),
    hexToBuffer(tx.to),
    bigintToBuffer(tx.value),
    hexToBuffer(tx.data),
    bigintToBuffer(BSC_CHAIN_ID),
    Buffer.alloc(0),
    Buffer.alloc(0),
  ];

  const encoded = rlpEncode(rawForSig);
  const msgHash = keccak256(encoded.toString("hex"));

  // Sign with secp256k1
  const keyHex = PRIVATE_KEY.replace(/^0x/, "");
  const privKeyDer = Buffer.concat([
    Buffer.from("30740201010420", "hex"),
    Buffer.from(keyHex, "hex"),
    Buffer.from("a00706052b8104000aa14403420004", "hex"),
    getPublicKeyFromPrivate(keyHex),
  ]);

  const keyObj = createPrivateKey({ key: privKeyDer, format: "der", type: "sec1" });
  const sigDer = cryptoSign(null, Buffer.from(msgHash, "hex"), { key: keyObj, dsaEncoding: "ieee-p1363" });

  const r = BigInt("0x" + sigDer.subarray(0, 32).toString("hex"));
  const s = BigInt("0x" + sigDer.subarray(32, 64).toString("hex"));
  const secp256k1N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const sNormalized = s > secp256k1N / 2n ? secp256k1N - s : s;

  // Recover v
  let v;
  for (const candidate of [0n, 1n]) {
    const vCandidate = candidate + BSC_CHAIN_ID * 2n + 35n;
    const rawTx = [
      bigintToBuffer(tx.nonce),
      bigintToBuffer(tx.gasPrice),
      bigintToBuffer(tx.gasLimit),
      hexToBuffer(tx.to),
      bigintToBuffer(tx.value),
      hexToBuffer(tx.data),
      bigintToBuffer(vCandidate),
      bigintToBuffer(r),
      bigintToBuffer(sNormalized),
    ];
    const signedRlp = rlpEncode(rawTx);
    const txHash = keccak256(signedRlp.toString("hex"));

    // Try sending and see if it works (or verify recovery)
    v = vCandidate;

    const rawHex = "0x" + signedRlp.toString("hex");
    try {
      const result = await rpc("eth_sendRawTransaction", [rawHex]);
      return { txHash: result, gasLimit: tx.gasLimit.toString() };
    } catch (e) {
      if (candidate === 1n) throw e;
      // Try next v value
    }
  }

  fail("Failed to sign and send transaction");
}

function getPublicKeyFromPrivate(privHex) {
  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(Buffer.from(privHex, "hex"));
  return ecdh.getPublicKey().subarray(1); // uncompressed minus prefix
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function cmdTrending() {
  try {
    const data = await apiGet("/tokens/trending");
    const tokens = Array.isArray(data) ? data : (data.data || data.tokens || data.items || []);
    out({
      command: "trending",
      count: tokens.length,
      tokens: tokens.slice(0, 20).map(t => ({
        address: t.address || t.tokenAddress || t.token,
        name: t.name || t.tokenName || "Unknown",
        symbol: t.symbol || t.tokenSymbol || "???",
        price: t.price || t.currentPrice || "N/A",
        marketCap: t.marketCap || t.market_cap || "N/A",
        volume24h: t.volume24h || t.volume || t.dailyVolume || "N/A",
        bondingCurveProgress: t.bondingCurveProgress || t.progress || t.curveProgress || "N/A",
        holders: t.holders || t.holderCount || "N/A",
        createdAt: t.createdAt || t.created_at || t.launchTime || "N/A",
      })),
    });
  } catch (e) {
    fail(`Failed to fetch trending tokens: ${e.message}`);
  }
}

async function cmdNew() {
  try {
    const data = await apiGet("/tokens/new");
    const tokens = Array.isArray(data) ? data : (data.data || data.tokens || data.items || []);
    out({
      command: "new",
      count: tokens.length,
      tokens: tokens.slice(0, 20).map(t => ({
        address: t.address || t.tokenAddress || t.token,
        name: t.name || t.tokenName || "Unknown",
        symbol: t.symbol || t.tokenSymbol || "???",
        price: t.price || t.currentPrice || "N/A",
        marketCap: t.marketCap || t.market_cap || "N/A",
        bondingCurveProgress: t.bondingCurveProgress || t.progress || t.curveProgress || "N/A",
        createdAt: t.createdAt || t.created_at || t.launchTime || "N/A",
      })),
    });
  } catch (e) {
    fail(`Failed to fetch new tokens: ${e.message}`);
  }
}

async function cmdToken(address) {
  if (!address) fail("Usage: four-meme.mjs token <address>");
  try {
    const data = await apiGet(`/tokens/${address}`);
    const t = data.data || data.token || data;
    out({
      command: "token",
      address: t.address || t.tokenAddress || address,
      name: t.name || t.tokenName || "Unknown",
      symbol: t.symbol || t.tokenSymbol || "???",
      price: t.price || t.currentPrice || "N/A",
      marketCap: t.marketCap || t.market_cap || "N/A",
      totalSupply: t.totalSupply || t.total_supply || "N/A",
      holders: t.holders || t.holderCount || "N/A",
      bondingCurveProgress: t.bondingCurveProgress || t.progress || t.curveProgress || "N/A",
      bondingCurveReserve: t.bondingCurveReserve || t.reserve || t.curveReserve || "N/A",
      graduated: t.graduated ?? t.isGraduated ?? "N/A",
      volume24h: t.volume24h || t.volume || t.dailyVolume || "N/A",
      description: t.description || "N/A",
      createdAt: t.createdAt || t.created_at || t.launchTime || "N/A",
    });
  } catch (e) {
    fail(`Failed to fetch token details: ${e.message}`);
  }
}

async function cmdBuy(tokenAddress, bnbAmount) {
  if (!tokenAddress || !bnbAmount) fail("Usage: four-meme.mjs buy <tokenAddress> <bnbAmount>");
  requireWallet();

  const amount = parseFloat(bnbAmount);
  if (isNaN(amount) || amount <= 0) fail("Invalid BNB amount");

  const valueWei = toWei(bnbAmount, 18);
  const minTokens = 0n; // 0 = accept any amount (slippage handled by contract's internal logic)

  // Encode: buyToken(address token, uint256 minTokensOut)
  const calldata = "0x" + SEL_BUY + encodeAddress(tokenAddress) + encodeUint256(minTokens);

  try {
    const result = await signAndSend({
      to: FOUR_MEME_ROUTER,
      value: valueWei,
      data: calldata,
      gasLimit: 350000n,
    });

    out({
      command: "buy",
      token: tokenAddress,
      bnbSpent: bnbAmount,
      txHash: result.txHash,
      gasUsed: result.gasLimit,
      note: "Check transaction receipt for exact tokens received",
    });
  } catch (e) {
    fail(`Buy transaction failed: ${e.message}`);
  }
}

async function cmdSell(tokenAddress, tokenAmount) {
  if (!tokenAddress || !tokenAmount) fail("Usage: four-meme.mjs sell <tokenAddress> <tokenAmount>");
  requireWallet();

  const amount = parseFloat(tokenAmount);
  if (isNaN(amount) || amount <= 0) fail("Invalid token amount");

  // Get token decimals
  let decimals = 18;
  try {
    decimals = await getTokenDecimals(tokenAddress);
  } catch (e) {
    // Default to 18 decimals
  }

  const amountWei = toWei(tokenAmount, decimals);

  // Check and approve if needed
  const allowanceData = "0x" + SEL_ALLOWANCE + encodeAddress(WALLET) + encodeAddress(FOUR_MEME_ROUTER);
  try {
    const allowance = await rpc("eth_call", [{ to: tokenAddress, data: allowanceData }, "latest"]);
    if (BigInt(allowance) < amountWei) {
      // Approve max
      const approveData = "0x" + SEL_APPROVE + encodeAddress(FOUR_MEME_ROUTER) + UINT256_MAX;
      const approveResult = await signAndSend({
        to: tokenAddress,
        data: approveData,
        gasLimit: 100000n,
      });
      // Wait a moment for approval to be mined
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (e) {
    // Proceed anyway — approval might not be needed
  }

  // Encode: sellToken(address token, uint256 amount)
  const calldata = "0x" + SEL_SELL + encodeAddress(tokenAddress) + encodeUint256(amountWei);

  try {
    const result = await signAndSend({
      to: FOUR_MEME_ROUTER,
      data: calldata,
      gasLimit: 350000n,
    });

    out({
      command: "sell",
      token: tokenAddress,
      tokensSold: tokenAmount,
      decimals,
      txHash: result.txHash,
      gasUsed: result.gasLimit,
      note: "Check transaction receipt for exact BNB received",
    });
  } catch (e) {
    fail(`Sell transaction failed: ${e.message}`);
  }
}

async function cmdGraduated() {
  try {
    const data = await apiGet("/tokens/graduated");
    const tokens = Array.isArray(data) ? data : (data.data || data.tokens || data.items || []);
    out({
      command: "graduated",
      count: tokens.length,
      tokens: tokens.slice(0, 20).map(t => ({
        address: t.address || t.tokenAddress || t.token,
        name: t.name || t.tokenName || "Unknown",
        symbol: t.symbol || t.tokenSymbol || "???",
        price: t.price || t.currentPrice || "N/A",
        marketCap: t.marketCap || t.market_cap || "N/A",
        graduatedAt: t.graduatedAt || t.graduated_at || t.graduationTime || "N/A",
        pancakeswapPair: t.pancakeswapPair || t.pair || t.pairAddress || "N/A",
      })),
    });
  } catch (e) {
    fail(`Failed to fetch graduated tokens: ${e.message}`);
  }
}

async function cmdSearch(query) {
  if (!query) fail("Usage: four-meme.mjs search <query>");
  try {
    const data = await apiGet(`/tokens/search?q=${encodeURIComponent(query)}`);
    const tokens = Array.isArray(data) ? data : (data.data || data.tokens || data.items || data.results || []);
    out({
      command: "search",
      query,
      count: tokens.length,
      tokens: tokens.slice(0, 20).map(t => ({
        address: t.address || t.tokenAddress || t.token,
        name: t.name || t.tokenName || "Unknown",
        symbol: t.symbol || t.tokenSymbol || "???",
        price: t.price || t.currentPrice || "N/A",
        marketCap: t.marketCap || t.market_cap || "N/A",
        bondingCurveProgress: t.bondingCurveProgress || t.progress || t.curveProgress || "N/A",
        graduated: t.graduated ?? t.isGraduated ?? "N/A",
      })),
    });
  } catch (e) {
    fail(`Failed to search tokens: ${e.message}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    out({
      error: "No command specified",
      usage: "four-meme.mjs <command> [args...]",
      commands: {
        trending: "List trending meme tokens on Four.Meme",
        new: "List newly launched tokens",
        token: "Get token details — token <address>",
        buy: "Buy tokens with BNB — buy <tokenAddress> <bnbAmount>",
        sell: "Sell tokens for BNB — sell <tokenAddress> <tokenAmount>",
        graduated: "List tokens that graduated to PancakeSwap",
        search: "Search for meme tokens — search <query>",
      },
    });
    process.exit(1);
  }

  switch (command) {
    case "trending":
      await cmdTrending();
      break;
    case "new":
      await cmdNew();
      break;
    case "token":
      await cmdToken(args[1]);
      break;
    case "buy":
      await cmdBuy(args[1], args[2]);
      break;
    case "sell":
      await cmdSell(args[1], args[2]);
      break;
    case "graduated":
      await cmdGraduated();
      break;
    case "search":
      await cmdSearch(args.slice(1).join(" "));
      break;
    default:
      fail(`Unknown command: ${command}. Valid commands: trending, new, token, buy, sell, graduated, search`);
  }
}

main().catch(e => fail(e.message));
