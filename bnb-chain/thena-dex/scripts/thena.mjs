#!/usr/bin/env node

// THENA DEX Skill — BNB Chain ve(3,3) DEX
// Zero dependencies — Node.js 18+ built-ins + global fetch only

import { createHash } from "node:crypto";

// === Config ===
const BSC_CHAIN_ID = 56n;
const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const WALLET = process.env.BSC_WALLET_ADDRESS;
const PRIVATE_KEY = process.env.BSC_PRIVATE_KEY;

const THENA_ROUTER = "0xd4ae6eCA985340Dd434D38F470aCCce4DC78D109";
const THENA_API = "https://api.thena.fi/api/v1";
const THE_TOKEN = "0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BUSD = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

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

  // EIP-1559 transaction fields
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

  // Sign with secp256k1
  const { sign, createPrivateKey, createECDH } = await import("node:crypto");
  const privKeyBuf = Buffer.from(PRIVATE_KEY.replace(/^0x/, ""), "hex");

  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(privKeyBuf);
  const pubKeyUncompressed = ecdh.getPublicKey().subarray(1); // remove 0x04 prefix

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

  // Try both recovery IDs
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
  const sel = functionSelector("decimals()");
  const result = await rpc("eth_call", [{ to: token, data: "0x" + sel }, "latest"]);
  return parseInt(result, 16);
}

async function getSymbol(token) {
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

// === THENA API Helpers ===
async function thenaFetch(endpoint) {
  const res = await fetch(`${THENA_API}${endpoint}`, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`THENA API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// === Commands ===

async function cmdQuote(tokenIn, tokenOut, amountIn) {
  const decimalsIn = await getDecimals(tokenIn);
  const decimalsOut = await getDecimals(tokenOut);
  const symbolIn = await getSymbol(tokenIn);
  const symbolOut = await getSymbol(tokenOut);
  const amountWei = toWei(amountIn, decimalsIn);

  // Try THENA Router on-chain getAmountsOut
  // THENA uses Solidly-style routes: (from, to, stable)
  // Try both stable and volatile
  const getAmountsOutSel = functionSelector("getAmountsOut(uint256,(address,address,bool)[])");

  for (const stable of [false, true]) {
    try {
      // Encode route tuple array
      // Struct route { address from; address to; bool stable; }
      const routeEncoded =
        encodeAddress(tokenIn) +
        encodeAddress(tokenOut) +
        encodeUint256(stable ? 1 : 0);

      // ABI: getAmountsOut(uint256, route[])
      // uint256 amountIn + offset to dynamic array + array length + route data
      const callData = getAmountsOutSel +
        encodeUint256(amountWei) +          // amountIn
        encodeUint256(64) +                  // offset to routes array
        encodeUint256(1) +                   // routes array length = 1
        routeEncoded;                        // route data

      const result = await rpc("eth_call", [{ to: THENA_ROUTER, data: "0x" + callData }, "latest"]);
      const hex = result.replace(/^0x/, "");

      // Result is uint256[] - offset + length + amounts
      const arrOffset = parseInt(hex.slice(0, 64), 16) * 2;
      const arrLen = parseInt(hex.slice(arrOffset, arrOffset + 64), 16);
      const amountOutHex = hex.slice(arrOffset + 64 * arrLen, arrOffset + 64 * (arrLen + 1));
      const amountOutWei = BigInt("0x" + (amountOutHex || "0"));

      if (amountOutWei > 0n) {
        const amountOut = fromWei(amountOutWei, decimalsOut);
        return {
          command: "quote",
          tokenIn: { address: tokenIn, symbol: symbolIn, decimals: decimalsIn },
          tokenOut: { address: tokenOut, symbol: symbolOut, decimals: decimalsOut },
          amountIn,
          amountOut,
          amountInWei: amountWei.toString(),
          amountOutWei: amountOutWei.toString(),
          poolType: stable ? "stable" : "volatile",
          dex: "THENA",
          source: "THENA Router on-chain",
        };
      }
    } catch {}
  }

  // Fallback: try multi-hop via WBNB
  if (tokenIn.toLowerCase() !== WBNB.toLowerCase() && tokenOut.toLowerCase() !== WBNB.toLowerCase()) {
    for (const stable1 of [false, true]) {
      for (const stable2 of [false, true]) {
        try {
          const routesEncoded =
            encodeAddress(tokenIn) + encodeAddress(WBNB) + encodeUint256(stable1 ? 1 : 0) +
            encodeAddress(WBNB) + encodeAddress(tokenOut) + encodeUint256(stable2 ? 1 : 0);

          const callData = getAmountsOutSel +
            encodeUint256(amountWei) +
            encodeUint256(64) +
            encodeUint256(2) +
            routesEncoded;

          const result = await rpc("eth_call", [{ to: THENA_ROUTER, data: "0x" + callData }, "latest"]);
          const hex = result.replace(/^0x/, "");
          const arrOffset = parseInt(hex.slice(0, 64), 16) * 2;
          const arrLen = parseInt(hex.slice(arrOffset, arrOffset + 64), 16);
          const amountOutHex = hex.slice(arrOffset + 64 * arrLen, arrOffset + 64 * (arrLen + 1));
          const amountOutWei = BigInt("0x" + (amountOutHex || "0"));

          if (amountOutWei > 0n) {
            return {
              command: "quote",
              tokenIn: { address: tokenIn, symbol: symbolIn, decimals: decimalsIn },
              tokenOut: { address: tokenOut, symbol: symbolOut, decimals: decimalsOut },
              amountIn,
              amountOut: fromWei(amountOutWei, decimalsOut),
              route: `${symbolIn} -> WBNB -> ${symbolOut}`,
              poolTypes: [stable1 ? "stable" : "volatile", stable2 ? "stable" : "volatile"],
              dex: "THENA",
              source: "THENA Router on-chain (multi-hop)",
            };
          }
        } catch {}
      }
    }
  }

  throw new Error(`Could not get THENA quote for ${symbolIn} -> ${symbolOut}. Pool may not exist.`);
}

async function cmdSwap(tokenIn, tokenOut, amountIn, slippage = "0.5") {
  if (!WALLET || !PRIVATE_KEY) throw new Error("BSC_WALLET_ADDRESS and BSC_PRIVATE_KEY required for swaps");

  const decimalsIn = await getDecimals(tokenIn);
  const decimalsOut = await getDecimals(tokenOut);
  const symbolIn = await getSymbol(tokenIn);
  const symbolOut = await getSymbol(tokenOut);
  const amountWei = toWei(amountIn, decimalsIn);
  const slippageBps = Math.floor(parseFloat(slippage) * 100);

  // Get quote first
  const quote = await cmdQuote(tokenIn, tokenOut, amountIn);
  const expectedOut = toWei(quote.amountOut, decimalsOut);
  const minOut = expectedOut * BigInt(10000 - slippageBps) / 10000n;

  const isNativeIn = tokenIn.toLowerCase() === WBNB.toLowerCase();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 min

  // Determine if direct route or multi-hop
  const isMultiHop = quote.route && quote.route.includes("WBNB");
  const poolStable = quote.poolType === "stable";

  let callData;

  if (isNativeIn) {
    // swapExactETHForTokens(uint256 amountOutMin, route[] routes, address to, uint256 deadline)
    const sel = functionSelector("swapExactETHForTokens(uint256,(address,address,bool)[],address,uint256)");
    const routeData = encodeAddress(WBNB) + encodeAddress(tokenOut) + encodeUint256(poolStable ? 1 : 0);
    callData = sel +
      encodeUint256(minOut) +
      encodeUint256(128) +           // offset to routes
      encodeAddress(WALLET) +
      encodeUint256(deadline) +
      encodeUint256(1) +             // routes length
      routeData;
  } else {
    // swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, route[] routes, address to, uint256 deadline)
    const sel = functionSelector("swapExactTokensForTokens(uint256,uint256,(address,address,bool)[],address,uint256)");
    let routeData;
    let routeCount;

    if (isMultiHop) {
      routeData =
        encodeAddress(tokenIn) + encodeAddress(WBNB) + encodeUint256(0) +
        encodeAddress(WBNB) + encodeAddress(tokenOut) + encodeUint256(0);
      routeCount = 2;
    } else {
      routeData = encodeAddress(tokenIn) + encodeAddress(tokenOut) + encodeUint256(poolStable ? 1 : 0);
      routeCount = 1;
    }

    callData = sel +
      encodeUint256(amountWei) +
      encodeUint256(minOut) +
      encodeUint256(160) +           // offset to routes
      encodeAddress(WALLET) +
      encodeUint256(deadline) +
      encodeUint256(routeCount) +
      routeData;
  }

  const result = await signAndSendTx({
    to: THENA_ROUTER,
    data: callData,
    value: isNativeIn ? amountWei : 0n,
  });

  return {
    command: "swap",
    status: "submitted",
    txHash: result.txHash,
    tokenIn: { address: tokenIn, symbol: symbolIn, amount: amountIn },
    tokenOut: { address: tokenOut, symbol: symbolOut, expectedAmount: quote.amountOut },
    slippage: slippage + "%",
    minAmountOut: fromWei(minOut, decimalsOut),
    poolType: quote.poolType || "volatile",
    router: THENA_ROUTER,
    dex: "THENA",
    explorer: `https://bscscan.com/tx/${result.txHash}`,
  };
}

async function cmdPools() {
  // Try THENA API first
  try {
    const data = await thenaFetch("/fusions");
    if (data && Array.isArray(data)) {
      const pools = data
        .sort((a, b) => parseFloat(b.tvl || 0) - parseFloat(a.tvl || 0))
        .slice(0, 25)
        .map(p => ({
          address: p.address,
          pair: `${p.token0?.symbol || "?"}/${p.token1?.symbol || "?"}`,
          token0: { address: p.token0?.address, symbol: p.token0?.symbol },
          token1: { address: p.token1?.address, symbol: p.token1?.symbol },
          type: p.type || p.isStable ? "stable" : "volatile",
          tvlUSD: parseFloat(p.tvl || 0).toFixed(2),
          apr: p.apr ? parseFloat(p.apr).toFixed(2) + "%" : "N/A",
          volume24h: p.volume24h ? parseFloat(p.volume24h).toFixed(2) : "N/A",
        }));

      return {
        command: "pools",
        count: pools.length,
        pools,
        dex: "THENA",
        source: "THENA API (fusions)",
      };
    }
  } catch {}

  // Try classic pools endpoint
  try {
    const data = await thenaFetch("/pools");
    if (data && Array.isArray(data)) {
      const pools = data
        .sort((a, b) => parseFloat(b.tvl || 0) - parseFloat(a.tvl || 0))
        .slice(0, 25)
        .map(p => ({
          address: p.address,
          pair: `${p.token0?.symbol || p.symbol || "?"}`,
          type: p.isStable ? "stable" : "volatile",
          tvlUSD: parseFloat(p.tvl || 0).toFixed(2),
          apr: p.gauge?.apr ? parseFloat(p.gauge.apr).toFixed(2) + "%" : "N/A",
        }));

      return {
        command: "pools",
        count: pools.length,
        pools,
        dex: "THENA",
        source: "THENA API (pools)",
      };
    }
  } catch {}

  // Fallback: return known pools from on-chain
  const knownPools = [
    { name: "WBNB/USDT", t0: WBNB, t1: USDT },
    { name: "WBNB/BUSD", t0: WBNB, t1: BUSD },
    { name: "THE/WBNB", t0: THE_TOKEN, t1: WBNB },
    { name: "USDT/USDC", t0: USDT, t1: USDC },
    { name: "USDT/BUSD", t0: USDT, t1: BUSD },
  ];

  // Use pairFor to get pool addresses
  const pairForSel = functionSelector("pairFor(address,address,bool)");
  const pools = [];

  for (const pair of knownPools) {
    for (const stable of [false, true]) {
      try {
        const data = pairForSel + encodeAddress(pair.t0) + encodeAddress(pair.t1) + encodeUint256(stable ? 1 : 0);
        const result = await rpc("eth_call", [{ to: THENA_ROUTER, data: "0x" + data }, "latest"]);
        const poolAddr = "0x" + result.replace(/^0x/, "").slice(24, 64);
        if (poolAddr !== "0x" + "0".repeat(40)) {
          pools.push({
            address: poolAddr,
            pair: pair.name,
            type: stable ? "stable" : "volatile",
          });
        }
      } catch {}
    }
  }

  return {
    command: "pools",
    count: pools.length,
    pools,
    dex: "THENA",
    source: "on-chain (Router pairFor)",
  };
}

async function cmdPrice(token) {
  const symbol = await getSymbol(token);
  const decimals = await getDecimals(token);

  // Check if stablecoin
  const stables = [USDT, BUSD, USDC];
  if (stables.some(s => s.toLowerCase() === token.toLowerCase())) {
    return { command: "price", token: { address: token, symbol, decimals }, priceUSD: "1.00", dex: "THENA", source: "stablecoin" };
  }

  // Try THENA API
  try {
    const data = await thenaFetch("/tokens");
    if (data && Array.isArray(data)) {
      const found = data.find(t => t.address && t.address.toLowerCase() === token.toLowerCase());
      if (found && found.price) {
        return {
          command: "price",
          token: { address: token, symbol, decimals },
          priceUSD: parseFloat(found.price).toFixed(6),
          dex: "THENA",
          source: "THENA API",
        };
      }
    }
  } catch {}

  // On-chain: quote 1 token -> USDT via THENA Router
  const oneToken = toWei("1", decimals);
  const getAmountsOutSel = functionSelector("getAmountsOut(uint256,(address,address,bool)[])");

  for (const stableAddr of stables) {
    for (const poolStable of [false, true]) {
      try {
        const routeEncoded = encodeAddress(token) + encodeAddress(stableAddr) + encodeUint256(poolStable ? 1 : 0);
        const callData = getAmountsOutSel +
          encodeUint256(oneToken) +
          encodeUint256(64) +
          encodeUint256(1) +
          routeEncoded;

        const result = await rpc("eth_call", [{ to: THENA_ROUTER, data: "0x" + callData }, "latest"]);
        const hex = result.replace(/^0x/, "");
        const arrOffset = parseInt(hex.slice(0, 64), 16) * 2;
        const arrLen = parseInt(hex.slice(arrOffset, arrOffset + 64), 16);
        const amountOutHex = hex.slice(arrOffset + 64 * arrLen, arrOffset + 64 * (arrLen + 1));
        const amountOutWei = BigInt("0x" + (amountOutHex || "0"));

        if (amountOutWei > 0n) {
          const stableDec = await getDecimals(stableAddr);
          const priceUSD = fromWei(amountOutWei, stableDec);
          return {
            command: "price",
            token: { address: token, symbol, decimals },
            priceUSD,
            poolType: poolStable ? "stable" : "volatile",
            dex: "THENA",
            source: "THENA Router on-chain",
          };
        }
      } catch {}
    }
  }

  // Multi-hop via WBNB
  if (token.toLowerCase() !== WBNB.toLowerCase()) {
    try {
      const bnbPrice = await cmdPrice(WBNB);
      for (const poolStable of [false, true]) {
        try {
          const routeEncoded = encodeAddress(token) + encodeAddress(WBNB) + encodeUint256(poolStable ? 1 : 0);
          const callData = getAmountsOutSel +
            encodeUint256(oneToken) +
            encodeUint256(64) +
            encodeUint256(1) +
            routeEncoded;

          const result = await rpc("eth_call", [{ to: THENA_ROUTER, data: "0x" + callData }, "latest"]);
          const hex = result.replace(/^0x/, "");
          const arrOffset = parseInt(hex.slice(0, 64), 16) * 2;
          const arrLen = parseInt(hex.slice(arrOffset, arrOffset + 64), 16);
          const amountOutHex = hex.slice(arrOffset + 64 * arrLen, arrOffset + 64 * (arrLen + 1));
          const amountOutWei = BigInt("0x" + (amountOutHex || "0"));

          if (amountOutWei > 0n) {
            const priceInBNB = fromWei(amountOutWei, 18);
            const priceUSD = (parseFloat(priceInBNB) * parseFloat(bnbPrice.priceUSD)).toFixed(6);
            return {
              command: "price",
              token: { address: token, symbol, decimals },
              priceUSD,
              priceInBNB,
              route: `${symbol} -> WBNB -> USD`,
              dex: "THENA",
              source: "THENA Router on-chain (via WBNB)",
            };
          }
        } catch {}
      }
    } catch {}
  }

  throw new Error(`Could not determine price for ${symbol} (${token}) on THENA. No liquid pool found.`);
}

async function cmdApprove(token) {
  if (!WALLET || !PRIVATE_KEY) throw new Error("BSC_WALLET_ADDRESS and BSC_PRIVATE_KEY required");

  const decimals = await getDecimals(token);
  const symbol = await getSymbol(token);
  const sel = functionSelector("approve(address,uint256)");
  const maxUint = (1n << 256n) - 1n;

  const data = sel + encodeAddress(THENA_ROUTER) + encodeUint256(maxUint);

  const result = await signAndSendTx({
    to: token,
    data,
    value: 0n,
  });

  return {
    command: "approve",
    status: "submitted",
    txHash: result.txHash,
    token: { address: token, symbol, decimals },
    spender: THENA_ROUTER,
    amount: "unlimited",
    dex: "THENA",
    explorer: `https://bscscan.com/tx/${result.txHash}`,
  };
}

// === Main ===
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log(JSON.stringify({
      error: "Usage: thena.mjs <command> [args...]",
      commands: ["quote", "swap", "pools", "price", "approve"],
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
      case "pools":
        result = await cmdPools();
        break;
      case "price":
        if (args.length < 2) throw new Error("Usage: price <token>");
        result = await cmdPrice(args[1]);
        break;
      case "approve":
        if (args.length < 2) throw new Error("Usage: approve <token>");
        result = await cmdApprove(args[1]);
        break;
      default:
        throw new Error(`Unknown command: ${cmd}. Available: quote, swap, pools, price, approve`);
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
