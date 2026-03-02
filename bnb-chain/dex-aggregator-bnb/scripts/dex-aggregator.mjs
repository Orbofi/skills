#!/usr/bin/env node

// DEX Aggregator Skill — BNB Chain
// Routes through 1inch + OpenOcean for best-price swaps
// Zero dependencies — Node.js 18+ built-ins + global fetch only

import { createHash } from "node:crypto";

// === Config ===
const BSC_CHAIN_ID = 56n;
const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const WALLET = process.env.BSC_WALLET_ADDRESS;
const PRIVATE_KEY = process.env.BSC_PRIVATE_KEY;
const ONEINCH_API_KEY = process.env.ONEINCH_API_KEY;

const ONEINCH_BASE = "https://api.1inch.dev/swap/v6.0/56";
const OPENOCEAN_BASE = "https://open-api.openocean.finance/v4/56";
const ONEINCH_ROUTER = "0x111111125421cA6dc452d289314280a0f8842A65";
const OPENOCEAN_EXCHANGE = "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64";
const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BUSD = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

const POPULAR_TOKENS = [
  { symbol: "WBNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
  { symbol: "BNB (native)", address: NATIVE_TOKEN, decimals: 18 },
  { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
  { symbol: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18 },
  { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
  { symbol: "CAKE", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18 },
  { symbol: "ETH", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18 },
  { symbol: "BTCB", address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18 },
  { symbol: "THE", address: "0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11", decimals: 18 },
  { symbol: "XRP", address: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", decimals: 18 },
  { symbol: "ADA", address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", decimals: 18 },
  { symbol: "DOT", address: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", decimals: 18 },
  { symbol: "LINK", address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", decimals: 18 },
  { symbol: "DAI", address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", decimals: 18 },
];

// === Keccak-256 (pure JS) ===
const KECCAK_ROUNDS = 24;
const RC = [0x0000000000000001n,0x0000000000008082n,0x800000000000808an,0x8000000080008000n,0x000000000000808bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,0x000000000000008an,0x0000000000000088n,0x0000000080008009n,0x000000008000000an,0x000000008000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x000000000000800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
const ROTC = [1,3,6,10,15,21,28,36,45,55,2,14,27,41,56,8,25,43,62,18,39,61,20,44];
const PI = [10,7,11,17,18,3,5,16,8,21,24,4,15,23,19,13,12,2,20,14,22,9,6,1];
const MASK64 = (1n << 64n) - 1n;
function rot64(x,n){n=BigInt(n);return((x<<n)|(x>>(64n-n)))&MASK64;}
function keccakF(s){for(let r=0;r<KECCAK_ROUNDS;r++){const C=new Array(5);for(let x=0;x<5;x++)C[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];for(let x=0;x<5;x++){const d=C[(x+4)%5]^rot64(C[(x+1)%5],1);for(let y=0;y<25;y+=5)s[y+x]=(s[y+x]^d)&MASK64;}let last=s[1];for(let i=0;i<24;i++){const j=PI[i],tmp=s[j];s[j]=rot64(last,ROTC[i]);last=tmp;}for(let y=0;y<25;y+=5){const t=[s[y],s[y+1],s[y+2],s[y+3],s[y+4]];for(let x=0;x<5;x++)s[y+x]=(t[x]^((~t[(x+1)%5]&MASK64)&t[(x+2)%5]))&MASK64;}s[0]=(s[0]^RC[r])&MASK64;}}
function keccak256(hexInput){const input=Buffer.from(hexInput,"hex");const rate=136;const q=rate-(input.length%rate);const padded=Buffer.alloc(input.length+(q===0?rate:q));input.copy(padded);padded[input.length]=0x01;padded[padded.length-1]|=0x80;const state=new Array(25).fill(0n);for(let off=0;off<padded.length;off+=rate){for(let i=0;i<rate/8;i++){const lo=padded.readUInt32LE(off+i*8);const hi=padded.readUInt32LE(off+i*8+4);state[i]^=BigInt(lo)|(BigInt(hi)<<32n);}keccakF(state);}const out=Buffer.alloc(32);for(let i=0;i<4;i++){const v=state[i];out.writeUInt32LE(Number(v&0xffffffffn),i*8);out.writeUInt32LE(Number((v>>32n)&0xffffffffn),i*8+4);}return out.toString("hex");}

// === RPC Helper ===
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

// === ABI Helpers ===
function padHex(hex, bytes) { return hex.padStart(bytes * 2, "0"); }
function encodeAddress(addr) { return padHex(addr.replace(/^0x/i, "").toLowerCase(), 32); }
function encodeUint256(val) { return padHex(BigInt(val).toString(16), 32); }
function functionSelector(sig) { return keccak256(Buffer.from(sig).toString("hex")).slice(0, 8); }

// === RLP Encoding ===
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

// === EIP-1559 Transaction Signing ===
async function signAndSendTx({ to, data, value = 0n, gasLimit }) {
  if (!WALLET || !PRIVATE_KEY) throw new Error("BSC_WALLET_ADDRESS and BSC_PRIVATE_KEY required");

  const nonce = BigInt(await rpc("eth_getTransactionCount", [WALLET, "latest"]));
  const feeData = await rpc("eth_gasPrice");
  const gasPrice = BigInt(feeData);
  const maxFee = gasPrice * 2n;
  const maxPriorityFee = 1000000000n; // 1 gwei

  if (!gasLimit) {
    const estGas = await rpc("eth_estimateGas", [{
      from: WALLET,
      to,
      data: "0x" + data,
      value: "0x" + value.toString(16),
    }]);
    gasLimit = BigInt(estGas) * 130n / 100n; // 30% buffer
  }

  const txFields = [
    bigintToBuffer(BSC_CHAIN_ID),
    bigintToBuffer(nonce),
    bigintToBuffer(maxPriorityFee),
    bigintToBuffer(maxFee),
    bigintToBuffer(gasLimit),
    Buffer.from(to.replace(/^0x/, ""), "hex"),
    bigintToBuffer(value),
    Buffer.from(data, "hex"),
    [], // accessList
  ];

  const encoded = rlpEncode(txFields);
  const txForSigning = Buffer.concat([Buffer.from([0x02]), encoded]);
  const txHash = keccak256(txForSigning.toString("hex"));

  const { sign, createPrivateKey, createECDH } = await import("node:crypto");
  const privKeyBuf = Buffer.from(PRIVATE_KEY.replace(/^0x/, ""), "hex");

  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(privKeyBuf);
  const pubKeyUncompressed = ecdh.getPublicKey().subarray(1);

  const keyDer = Buffer.concat([
    Buffer.from("30740201010420", "hex"),
    privKeyBuf,
    Buffer.from("a00706052b8104000aa14403420004", "hex"),
    pubKeyUncompressed,
  ]);

  const keyObj = createPrivateKey({ key: keyDer, format: "der", type: "sec1" });
  const sig = sign(null, Buffer.from(txHash, "hex"), { key: keyObj, dsaEncoding: "ieee-p1363" });

  const r = BigInt("0x" + sig.subarray(0, 32).toString("hex"));
  const s_raw = BigInt("0x" + sig.subarray(32, 64).toString("hex"));
  const secp256k1N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const s_val = s_raw > secp256k1N / 2n ? secp256k1N - s_raw : s_raw;

  for (let v = 0n; v <= 1n; v++) {
    const signedFields = [
      ...txFields,
      bigintToBuffer(v),
      bigintToBuffer(r),
      bigintToBuffer(s_val),
    ];
    const signedEncoded = rlpEncode(signedFields);
    const rawTx = "0x02" + signedEncoded.toString("hex");
    try {
      const hash = await rpc("eth_sendRawTransaction", [rawTx]);
      return { txHash: hash, rawTx };
    } catch (e) {
      if (v === 1n) throw e;
    }
  }
}

// === Token Helpers ===
async function getDecimals(token) {
  if (token.toLowerCase() === NATIVE_TOKEN.toLowerCase()) return 18;
  const sel = functionSelector("decimals()");
  const result = await rpc("eth_call", [{ to: token, data: "0x" + sel }, "latest"]);
  return parseInt(result, 16);
}

async function getSymbol(token) {
  if (token.toLowerCase() === NATIVE_TOKEN.toLowerCase()) return "BNB";
  const sel = functionSelector("symbol()");
  const result = await rpc("eth_call", [{ to: token, data: "0x" + sel }, "latest"]);
  try {
    const hex = result.replace(/^0x/, "");
    const offset = parseInt(hex.slice(0, 64), 16);
    const len = parseInt(hex.slice(offset * 2, offset * 2 + 64), 16);
    if (len > 0 && len < 32) {
      return Buffer.from(hex.slice(offset * 2 + 64, offset * 2 + 64 + len * 2), "hex").toString("utf8");
    }
    return Buffer.from(hex.replace(/0+$/, ""), "hex").toString("utf8");
  } catch {
    return "UNKNOWN";
  }
}

function toWei(amount, decimals) {
  const parts = amount.toString().split(".");
  const whole = parts[0];
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + frac);
}

function fromWei(wei, decimals) {
  const s = wei.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals) || "0";
  const frac = s.slice(s.length - decimals);
  return `${whole}.${frac}`.replace(/\.?0+$/, "") || "0";
}

// === 1inch API ===
async function oneInchQuote(tokenIn, tokenOut, amountWei) {
  if (!ONEINCH_API_KEY) return null;

  const headers = {
    "Authorization": `Bearer ${ONEINCH_API_KEY}`,
    "Accept": "application/json",
  };

  try {
    const params = new URLSearchParams({
      src: tokenIn,
      dst: tokenOut,
      amount: amountWei.toString(),
    });

    const res = await fetch(`${ONEINCH_BASE}/quote?${params}`, { headers });
    if (!res.ok) {
      if (res.status === 429) return { error: "1inch rate limited" };
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

async function oneInchSwap(tokenIn, tokenOut, amountWei, slippage, from) {
  if (!ONEINCH_API_KEY) throw new Error("ONEINCH_API_KEY required for 1inch swaps");

  const headers = {
    "Authorization": `Bearer ${ONEINCH_API_KEY}`,
    "Accept": "application/json",
  };

  const params = new URLSearchParams({
    src: tokenIn,
    dst: tokenOut,
    amount: amountWei.toString(),
    from,
    slippage: slippage.toString(),
    disableEstimate: "true",
  });

  const res = await fetch(`${ONEINCH_BASE}/swap?${params}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`1inch swap API error: ${res.status} — ${body}`);
  }
  return res.json();
}

// === OpenOcean API ===
async function openOceanQuote(tokenIn, tokenOut, amountIn, decimalsIn) {
  try {
    const params = new URLSearchParams({
      inTokenAddress: tokenIn,
      outTokenAddress: tokenOut,
      amount: amountIn.toString(),
      gasPrice: "3",
    });

    const res = await fetch(`${OPENOCEAN_BASE}/quote?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 200) return null;
    return data.data;
  } catch {
    return null;
  }
}

async function openOceanSwap(tokenIn, tokenOut, amountIn, decimalsIn, slippage, from) {
  const params = new URLSearchParams({
    inTokenAddress: tokenIn,
    outTokenAddress: tokenOut,
    amount: amountIn.toString(),
    gasPrice: "3",
    slippage: slippage.toString(),
    account: from,
    disabledDexIds: "",
  });

  const res = await fetch(`${OPENOCEAN_BASE}/swap?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenOcean swap API error: ${res.status} — ${body}`);
  }
  const data = await res.json();
  if (data.code !== 200) throw new Error(`OpenOcean error: ${data.message || JSON.stringify(data)}`);
  return data.data;
}

// === Commands ===

async function cmdQuote(tokenIn, tokenOut, amountIn) {
  const decimalsIn = await getDecimals(tokenIn);
  const decimalsOut = await getDecimals(tokenOut);
  const symbolIn = await getSymbol(tokenIn);
  const symbolOut = await getSymbol(tokenOut);
  const amountWei = toWei(amountIn, decimalsIn);

  const quotes = [];

  // 1inch quote
  const oneInch = await oneInchQuote(tokenIn, tokenOut, amountWei);
  if (oneInch && !oneInch.error && oneInch.dstAmount) {
    const outAmount = fromWei(BigInt(oneInch.dstAmount), decimalsOut);
    quotes.push({
      aggregator: "1inch",
      amountOut: outAmount,
      amountOutWei: oneInch.dstAmount,
      estimatedGas: oneInch.gas || "N/A",
      protocols: oneInch.protocols ? "multi-route" : "direct",
    });
  }

  // OpenOcean quote
  const openOcean = await openOceanQuote(tokenIn, tokenOut, amountIn, decimalsIn);
  if (openOcean && openOcean.outAmount) {
    const outAmount = fromWei(BigInt(openOcean.outAmount), decimalsOut);
    quotes.push({
      aggregator: "OpenOcean",
      amountOut: outAmount,
      amountOutWei: openOcean.outAmount,
      estimatedGas: openOcean.estimatedGas || "N/A",
      path: openOcean.path || [],
    });
  }

  if (quotes.length === 0) {
    throw new Error("No quotes available. Check token addresses and ensure ONEINCH_API_KEY is set for 1inch.");
  }

  // Sort by best output (highest amountOut)
  quotes.sort((a, b) => {
    const aOut = parseFloat(a.amountOut);
    const bOut = parseFloat(b.amountOut);
    return bOut - aOut;
  });

  const best = quotes[0];
  const savings = quotes.length > 1
    ? ((parseFloat(best.amountOut) - parseFloat(quotes[quotes.length - 1].amountOut)) /
       parseFloat(quotes[quotes.length - 1].amountOut) * 100).toFixed(3) + "%"
    : "N/A (single source)";

  return {
    command: "quote",
    tokenIn: { address: tokenIn, symbol: symbolIn, decimals: decimalsIn },
    tokenOut: { address: tokenOut, symbol: symbolOut, decimals: decimalsOut },
    amountIn,
    bestQuote: {
      aggregator: best.aggregator,
      amountOut: best.amountOut,
    },
    allQuotes: quotes,
    savingsVsWorst: savings,
  };
}

async function cmdSwap(tokenIn, tokenOut, amountIn, slippage = "0.5") {
  if (!WALLET || !PRIVATE_KEY) throw new Error("BSC_WALLET_ADDRESS and BSC_PRIVATE_KEY required for swaps");

  const decimalsIn = await getDecimals(tokenIn);
  const decimalsOut = await getDecimals(tokenOut);
  const symbolIn = await getSymbol(tokenIn);
  const symbolOut = await getSymbol(tokenOut);
  const amountWei = toWei(amountIn, decimalsIn);
  const slippageNum = parseFloat(slippage);

  // Get quotes from both aggregators
  const quote = await cmdQuote(tokenIn, tokenOut, amountIn);
  const bestAggregator = quote.bestQuote.aggregator;

  let txData, txTo, txValue;

  if (bestAggregator === "1inch") {
    const swapData = await oneInchSwap(tokenIn, tokenOut, amountWei, slippageNum, WALLET);
    txTo = swapData.tx.to;
    txData = swapData.tx.data.replace(/^0x/, "");
    txValue = BigInt(swapData.tx.value || "0");
  } else {
    // OpenOcean
    const swapData = await openOceanSwap(tokenIn, tokenOut, amountIn, decimalsIn, slippageNum, WALLET);
    txTo = swapData.to;
    txData = swapData.data.replace(/^0x/, "");
    txValue = BigInt(swapData.value || "0");
  }

  const result = await signAndSendTx({
    to: txTo,
    data: txData,
    value: txValue,
  });

  return {
    command: "swap",
    status: "submitted",
    txHash: result.txHash,
    aggregator: bestAggregator,
    tokenIn: { address: tokenIn, symbol: symbolIn, amount: amountIn },
    tokenOut: { address: tokenOut, symbol: symbolOut, expectedAmount: quote.bestQuote.amountOut },
    slippage: slippage + "%",
    explorer: `https://bscscan.com/tx/${result.txHash}`,
  };
}

async function cmdCompare(tokenIn, tokenOut, amountIn) {
  const decimalsIn = await getDecimals(tokenIn);
  const decimalsOut = await getDecimals(tokenOut);
  const symbolIn = await getSymbol(tokenIn);
  const symbolOut = await getSymbol(tokenOut);
  const amountWei = toWei(amountIn, decimalsIn);

  const results = {};

  // 1inch
  const oneInch = await oneInchQuote(tokenIn, tokenOut, amountWei);
  if (oneInch && !oneInch.error && oneInch.dstAmount) {
    results["1inch"] = {
      available: true,
      amountOut: fromWei(BigInt(oneInch.dstAmount), decimalsOut),
      amountOutWei: oneInch.dstAmount,
      estimatedGas: oneInch.gas || "N/A",
      router: ONEINCH_ROUTER,
    };
  } else {
    results["1inch"] = {
      available: false,
      reason: !ONEINCH_API_KEY ? "ONEINCH_API_KEY not set" : (oneInch?.error || "No quote returned"),
    };
  }

  // OpenOcean
  const openOcean = await openOceanQuote(tokenIn, tokenOut, amountIn, decimalsIn);
  if (openOcean && openOcean.outAmount) {
    results["OpenOcean"] = {
      available: true,
      amountOut: fromWei(BigInt(openOcean.outAmount), decimalsOut),
      amountOutWei: openOcean.outAmount,
      estimatedGas: openOcean.estimatedGas || "N/A",
      router: OPENOCEAN_EXCHANGE,
      subRoutes: openOcean.dexes || [],
    };
  } else {
    results["OpenOcean"] = {
      available: false,
      reason: "No quote returned or pair not supported",
    };
  }

  // Determine winner
  const available = Object.entries(results).filter(([, v]) => v.available);
  let winner = "none";
  let priceDifference = "N/A";

  if (available.length >= 2) {
    available.sort((a, b) => parseFloat(b[1].amountOut) - parseFloat(a[1].amountOut));
    winner = available[0][0];
    const best = parseFloat(available[0][1].amountOut);
    const worst = parseFloat(available[available.length - 1][1].amountOut);
    priceDifference = ((best - worst) / worst * 100).toFixed(4) + "%";
  } else if (available.length === 1) {
    winner = available[0][0] + " (only source)";
  }

  return {
    command: "compare",
    tokenIn: { address: tokenIn, symbol: symbolIn, decimals: decimalsIn },
    tokenOut: { address: tokenOut, symbol: symbolOut, decimals: decimalsOut },
    amountIn,
    winner,
    priceDifference,
    aggregators: results,
  };
}

async function cmdApprove(token, spender) {
  if (!WALLET || !PRIVATE_KEY) throw new Error("BSC_WALLET_ADDRESS and BSC_PRIVATE_KEY required");
  if (!spender) throw new Error("Usage: approve <token> <spender>. Spender address required.");

  const decimals = await getDecimals(token);
  const symbol = await getSymbol(token);
  const sel = functionSelector("approve(address,uint256)");
  const maxUint = (1n << 256n) - 1n;

  const data = sel + encodeAddress(spender) + encodeUint256(maxUint);

  const result = await signAndSendTx({
    to: token,
    data,
    value: 0n,
  });

  // Identify the spender
  let spenderName = "Unknown";
  if (spender.toLowerCase() === ONEINCH_ROUTER.toLowerCase()) spenderName = "1inch Router V6";
  else if (spender.toLowerCase() === OPENOCEAN_EXCHANGE.toLowerCase()) spenderName = "OpenOcean Exchange";

  return {
    command: "approve",
    status: "submitted",
    txHash: result.txHash,
    token: { address: token, symbol, decimals },
    spender: { address: spender, name: spenderName },
    amount: "unlimited",
    explorer: `https://bscscan.com/tx/${result.txHash}`,
  };
}

async function cmdTokens() {
  return {
    command: "tokens",
    network: "BNB Chain (BSC)",
    chainId: 56,
    count: POPULAR_TOKENS.length,
    tokens: POPULAR_TOKENS,
    aggregators: {
      "1inch": { router: ONEINCH_ROUTER, requiresApiKey: true },
      "OpenOcean": { router: OPENOCEAN_EXCHANGE, requiresApiKey: false },
    },
    note: "Use the native token address (0xEeee...EEeE) for BNB in 1inch. Use WBNB address for other protocols.",
  };
}

// === Main ===
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log(JSON.stringify({
      error: "Usage: dex-aggregator.mjs <command> [args...]",
      commands: ["quote", "swap", "compare", "approve", "tokens"],
    }, null, 2));
    process.exit(1);
  }

  try {
    let result;
    switch (cmd) {
      case "quote":
        if (args.length < 4) throw new Error("Usage: quote <tokenIn> <tokenOut> <amountIn>");
        result = await cmdQuote(args[1], args[2], args[3]);
        break;
      case "swap":
        if (args.length < 4) throw new Error("Usage: swap <tokenIn> <tokenOut> <amountIn> [slippage=0.5]");
        result = await cmdSwap(args[1], args[2], args[3], args[4] || "0.5");
        break;
      case "compare":
        if (args.length < 4) throw new Error("Usage: compare <tokenIn> <tokenOut> <amountIn>");
        result = await cmdCompare(args[1], args[2], args[3]);
        break;
      case "approve":
        if (args.length < 3) throw new Error("Usage: approve <token> <spender>");
        result = await cmdApprove(args[1], args[2]);
        break;
      case "tokens":
        result = await cmdTokens();
        break;
      default:
        throw new Error(`Unknown command: ${cmd}. Available: quote, swap, compare, approve, tokens`);
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
