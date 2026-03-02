#!/usr/bin/env node

// PancakeSwap DEX Skill — BNB Chain
// Zero dependencies — Node.js 18+ built-ins + global fetch only

import { createHash } from "node:crypto";

// === Config ===
const BSC_CHAIN_ID = 56n;
const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const WALLET = process.env.BSC_WALLET_ADDRESS;
const PRIVATE_KEY = process.env.BSC_PRIVATE_KEY;

const PANCAKE_ROUTER_V3 = "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4";
const PANCAKE_FACTORY_V3 = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BUSD = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const PANCAKE_QUOTE_API = "https://router-api.pancakeswap.com/v0/quote";

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
  const { sign } = await import("node:crypto");
  const keyDer = Buffer.concat([
    Buffer.from("30740201010420", "hex"),
    Buffer.from(PRIVATE_KEY.replace(/^0x/, ""), "hex"),
    Buffer.from("a00706052b8104000aa14403420004", "hex"),
    getPublicKeyUncompressed(PRIVATE_KEY.replace(/^0x/, "")),
  ]);

  const keyObj = createPrivateKey({ key: keyDer, format: "der", type: "sec1" });
  const sig = sign(null, Buffer.from(txHash, "hex"), { key: keyObj, dsaEncoding: "ieee-p1363" });

  const r = BigInt("0x" + sig.subarray(0, 32).toString("hex"));
  const s_raw = BigInt("0x" + sig.subarray(32, 64).toString("hex"));
  const secp256k1N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const s_val = s_raw > secp256k1N / 2n ? secp256k1N - s_raw : s_raw;

  // Recovery ID
  let recoveryId = 0n;
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

function getPublicKeyUncompressed(privKeyHex) {
  const ecdh = (await import("node:crypto")).createECDH("secp256k1");
  ecdh.setPrivateKey(Buffer.from(privKeyHex, "hex"));
  return ecdh.getPublicKey().subarray(1); // remove 0x04 prefix
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
    // Try ABI-encoded string
    const offset = parseInt(hex.slice(0, 64), 16);
    const len = parseInt(hex.slice(offset * 2, offset * 2 + 64), 16);
    if (len > 0 && len < 32) {
      return Buffer.from(hex.slice(offset * 2 + 64, offset * 2 + 64 + len * 2), "hex").toString("utf8");
    }
    // Try raw bytes32
    return Buffer.from(hex.replace(/0+$/, ""), "hex").toString("utf8");
  } catch {
    return "UNKNOWN";
  }
}

async function getBalance(token, addr) {
  const sel = functionSelector("balanceOf(address)");
  const data = sel + encodeAddress(addr);
  const result = await rpc("eth_call", [{ to: token, data: "0x" + data }, "latest"]);
  return BigInt(result);
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

// === Commands ===

async function cmdQuote(tokenIn, tokenOut, amountIn) {
  const decimalsIn = await getDecimals(tokenIn);
  const amountWei = toWei(amountIn, decimalsIn);
  const symbolIn = await getSymbol(tokenIn);
  const symbolOut = await getSymbol(tokenOut);
  const decimalsOut = await getDecimals(tokenOut);

  // Try PancakeSwap quote API
  try {
    const url = `${PANCAKE_QUOTE_API}?chainId=56&tokenIn=${tokenIn}&tokenOut=${tokenOut}&amount=${amountWei.toString()}&gasPriceWei=3000000000&slippage=50`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const amountOut = fromWei(BigInt(data.outputAmount || data.quote || "0"), decimalsOut);
      return {
        command: "quote",
        tokenIn: { address: tokenIn, symbol: symbolIn, decimals: decimalsIn },
        tokenOut: { address: tokenOut, symbol: symbolOut, decimals: decimalsOut },
        amountIn,
        amountOut,
        amountInWei: amountWei.toString(),
        route: data.route || "PancakeSwap V3",
        priceImpact: data.priceImpact || "N/A",
        source: "PancakeSwap Quote API",
      };
    }
  } catch {}

  // Fallback: on-chain quote via Factory getPool + slot0
  try {
    const factorySel = functionSelector("getPool(address,address,uint24)");
    const fees = [100, 500, 2500, 10000];
    let bestPool = null;
    let bestFee = 0;

    for (const fee of fees) {
      const callData = factorySel + encodeAddress(tokenIn) + encodeAddress(tokenOut) + encodeUint256(fee);
      const result = await rpc("eth_call", [{ to: PANCAKE_FACTORY_V3, data: "0x" + callData }, "latest"]);
      const poolAddr = "0x" + result.replace(/^0x/, "").slice(24, 64);
      if (poolAddr !== "0x" + "0".repeat(40)) {
        bestPool = poolAddr;
        bestFee = fee;
        break;
      }
    }

    if (bestPool) {
      const slot0Sel = functionSelector("slot0()");
      const slot0 = await rpc("eth_call", [{ to: bestPool, data: "0x" + slot0Sel }, "latest"]);
      const hex = slot0.replace(/^0x/, "");
      const sqrtPriceX96 = BigInt("0x" + hex.slice(0, 64));
      const price = Number(sqrtPriceX96) ** 2 / (2 ** 192);
      const adjustedPrice = price * (10 ** (decimalsIn - decimalsOut));
      const estimatedOut = parseFloat(amountIn) * adjustedPrice;

      return {
        command: "quote",
        tokenIn: { address: tokenIn, symbol: symbolIn, decimals: decimalsIn },
        tokenOut: { address: tokenOut, symbol: symbolOut, decimals: decimalsOut },
        amountIn,
        amountOut: estimatedOut.toFixed(decimalsOut > 6 ? 6 : decimalsOut),
        pool: bestPool,
        fee: bestFee / 10000 + "%",
        source: "PancakeSwap V3 on-chain (slot0)",
        note: "Estimate based on pool price, actual output may differ",
      };
    }
  } catch {}

  throw new Error("Could not get quote. Pool may not exist or API is unavailable.");
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
  const isNativeOut = tokenOut.toLowerCase() === WBNB.toLowerCase();

  // Build exactInputSingle call
  // exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))
  const sel = functionSelector("exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 min
  const fee = 2500; // Default fee tier

  const params = encodeAddress(tokenIn) +
    encodeAddress(tokenOut) +
    encodeUint256(fee) +
    encodeAddress(WALLET) +
    encodeUint256(amountWei) +
    encodeUint256(minOut) +
    encodeUint256(0); // sqrtPriceLimitX96

  const callData = sel + params;

  const result = await signAndSendTx({
    to: PANCAKE_ROUTER_V3,
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
    router: PANCAKE_ROUTER_V3,
    explorer: `https://bscscan.com/tx/${result.txHash}`,
  };
}

async function cmdPools(token) {
  // Use PancakeSwap subgraph / info API for pool data
  const baseUrl = "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc";
  let query;

  if (token) {
    const tokenLower = token.toLowerCase();
    query = `{
      pools(first: 20, orderBy: totalValueLockedUSD, orderDirection: desc,
        where: { or: [{ token0: "${tokenLower}" }, { token1: "${tokenLower}" }] }
      ) {
        id token0 { id symbol } token1 { id symbol }
        feeTier totalValueLockedUSD volumeUSD
      }
    }`;
  } else {
    query = `{
      pools(first: 20, orderBy: totalValueLockedUSD, orderDirection: desc) {
        id token0 { id symbol } token1 { id symbol }
        feeTier totalValueLockedUSD volumeUSD
      }
    }`;
  }

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();

    if (data.data && data.data.pools) {
      return {
        command: "pools",
        filter: token || "none",
        count: data.data.pools.length,
        pools: data.data.pools.map(p => ({
          address: p.id,
          pair: `${p.token0.symbol}/${p.token1.symbol}`,
          token0: { address: p.token0.id, symbol: p.token0.symbol },
          token1: { address: p.token1.id, symbol: p.token1.symbol },
          feeTier: (parseInt(p.feeTier) / 10000) + "%",
          tvlUSD: parseFloat(p.totalValueLockedUSD).toFixed(2),
          volumeUSD: parseFloat(p.volumeUSD).toFixed(2),
        })),
      };
    }
  } catch {}

  // Fallback: query well-known pools on-chain
  const knownPairs = [
    { name: "WBNB/USDT", t0: WBNB, t1: USDT },
    { name: "WBNB/BUSD", t0: WBNB, t1: BUSD },
    { name: "USDT/BUSD", t0: USDT, t1: BUSD },
  ];

  const pools = [];
  const factorySel = functionSelector("getPool(address,address,uint24)");
  for (const pair of knownPairs) {
    for (const fee of [500, 2500, 10000]) {
      const data = factorySel + encodeAddress(pair.t0) + encodeAddress(pair.t1) + encodeUint256(fee);
      try {
        const result = await rpc("eth_call", [{ to: PANCAKE_FACTORY_V3, data: "0x" + data }, "latest"]);
        const poolAddr = "0x" + result.replace(/^0x/, "").slice(24, 64);
        if (poolAddr !== "0x" + "0".repeat(40)) {
          pools.push({
            address: poolAddr,
            pair: pair.name,
            feeTier: (fee / 10000) + "%",
          });
        }
      } catch {}
    }
  }

  return {
    command: "pools",
    filter: token || "none",
    count: pools.length,
    pools,
    source: "on-chain (Factory V3)",
  };
}

async function cmdPrice(token) {
  const symbol = await getSymbol(token);
  const decimals = await getDecimals(token);

  // Strategy 1: Get price via USDT pool
  const stables = [
    { addr: USDT, symbol: "USDT", decimals: 18 },
    { addr: BUSD, symbol: "BUSD", decimals: 18 },
  ];

  for (const stable of stables) {
    if (token.toLowerCase() === stable.addr.toLowerCase()) {
      return { command: "price", token: { address: token, symbol }, priceUSD: "1.00", source: "stablecoin" };
    }

    const factorySel = functionSelector("getPool(address,address,uint24)");
    for (const fee of [100, 500, 2500, 10000]) {
      try {
        const data = factorySel + encodeAddress(token) + encodeAddress(stable.addr) + encodeUint256(fee);
        const result = await rpc("eth_call", [{ to: PANCAKE_FACTORY_V3, data: "0x" + data }, "latest"]);
        const poolAddr = "0x" + result.replace(/^0x/, "").slice(24, 64);
        if (poolAddr === "0x" + "0".repeat(40)) continue;

        const slot0Sel = functionSelector("slot0()");
        const slot0 = await rpc("eth_call", [{ to: poolAddr, data: "0x" + slot0Sel }, "latest"]);
        const hex = slot0.replace(/^0x/, "");
        const sqrtPriceX96 = BigInt("0x" + hex.slice(0, 64));

        // Determine token order in pool
        const token0Sel = functionSelector("token0()");
        const token0Result = await rpc("eth_call", [{ to: poolAddr, data: "0x" + token0Sel }, "latest"]);
        const token0 = "0x" + token0Result.replace(/^0x/, "").slice(24, 64);
        const isToken0 = token.toLowerCase() === token0.toLowerCase();

        const price = Number(sqrtPriceX96) ** 2 / (2 ** 192);
        let priceUSD;

        if (isToken0) {
          // price = token1/token0, so if our token is token0, price in stable = price * (10^(d0-d1))
          priceUSD = price * (10 ** (decimals - stable.decimals));
        } else {
          // Our token is token1, so price in stable = 1/price * (10^(d1-d0))
          priceUSD = (1 / price) * (10 ** (stable.decimals - decimals));
        }

        if (priceUSD > 0 && isFinite(priceUSD)) {
          return {
            command: "price",
            token: { address: token, symbol, decimals },
            priceUSD: priceUSD.toFixed(6),
            pool: poolAddr,
            stableRef: stable.symbol,
            fee: (fee / 10000) + "%",
            source: "PancakeSwap V3 on-chain",
          };
        }
      } catch {}
    }
  }

  // Strategy 2: Route via WBNB -> USDT
  if (token.toLowerCase() !== WBNB.toLowerCase()) {
    try {
      const bnbPrice = await cmdPrice(WBNB);
      const factorySel = functionSelector("getPool(address,address,uint24)");
      for (const fee of [500, 2500, 10000]) {
        const data = factorySel + encodeAddress(token) + encodeAddress(WBNB) + encodeUint256(fee);
        const result = await rpc("eth_call", [{ to: PANCAKE_FACTORY_V3, data: "0x" + data }, "latest"]);
        const poolAddr = "0x" + result.replace(/^0x/, "").slice(24, 64);
        if (poolAddr === "0x" + "0".repeat(40)) continue;

        const slot0Sel = functionSelector("slot0()");
        const slot0 = await rpc("eth_call", [{ to: poolAddr, data: "0x" + slot0Sel }, "latest"]);
        const hex = slot0.replace(/^0x/, "");
        const sqrtPriceX96 = BigInt("0x" + hex.slice(0, 64));

        const token0Sel = functionSelector("token0()");
        const token0Result = await rpc("eth_call", [{ to: poolAddr, data: "0x" + token0Sel }, "latest"]);
        const token0 = "0x" + token0Result.replace(/^0x/, "").slice(24, 64);
        const isToken0 = token.toLowerCase() === token0.toLowerCase();

        const price = Number(sqrtPriceX96) ** 2 / (2 ** 192);
        let priceInBNB;
        if (isToken0) {
          priceInBNB = price * (10 ** (decimals - 18));
        } else {
          priceInBNB = (1 / price) * (10 ** (18 - decimals));
        }

        if (priceInBNB > 0 && isFinite(priceInBNB)) {
          const priceUSD = priceInBNB * parseFloat(bnbPrice.priceUSD);
          return {
            command: "price",
            token: { address: token, symbol, decimals },
            priceUSD: priceUSD.toFixed(6),
            priceInBNB: priceInBNB.toFixed(8),
            route: `${symbol} -> WBNB -> USD`,
            source: "PancakeSwap V3 on-chain (via WBNB)",
          };
        }
      }
    } catch {}
  }

  throw new Error(`Could not determine price for ${symbol} (${token}). No liquid pool found.`);
}

async function cmdApprove(token, amount) {
  if (!WALLET || !PRIVATE_KEY) throw new Error("BSC_WALLET_ADDRESS and BSC_PRIVATE_KEY required");

  const decimals = await getDecimals(token);
  const symbol = await getSymbol(token);
  const sel = functionSelector("approve(address,uint256)");

  let approveAmount;
  if (amount) {
    approveAmount = toWei(amount, decimals);
  } else {
    approveAmount = (1n << 256n) - 1n; // max uint256
  }

  const data = sel + encodeAddress(PANCAKE_ROUTER_V3) + encodeUint256(approveAmount);

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
    spender: PANCAKE_ROUTER_V3,
    amount: amount || "unlimited",
    explorer: `https://bscscan.com/tx/${result.txHash}`,
  };
}

async function cmdPairs(token) {
  const symbol = await getSymbol(token);
  const wellKnownTokens = [
    { addr: WBNB, symbol: "WBNB" },
    { addr: USDT, symbol: "USDT" },
    { addr: BUSD, symbol: "BUSD" },
    { addr: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE" },
    { addr: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH" },
    { addr: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", symbol: "BTCB" },
    { addr: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", symbol: "XRP" },
    { addr: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC" },
  ];

  const factorySel = functionSelector("getPool(address,address,uint24)");
  const fees = [100, 500, 2500, 10000];
  const pairs = [];

  for (const other of wellKnownTokens) {
    if (other.addr.toLowerCase() === token.toLowerCase()) continue;

    for (const fee of fees) {
      try {
        const data = factorySel + encodeAddress(token) + encodeAddress(other.addr) + encodeUint256(fee);
        const result = await rpc("eth_call", [{ to: PANCAKE_FACTORY_V3, data: "0x" + data }, "latest"]);
        const poolAddr = "0x" + result.replace(/^0x/, "").slice(24, 64);
        if (poolAddr !== "0x" + "0".repeat(40)) {
          pairs.push({
            pair: `${symbol}/${other.symbol}`,
            poolAddress: poolAddr,
            feeTier: (fee / 10000) + "%",
            counterToken: { address: other.addr, symbol: other.symbol },
          });
        }
      } catch {}
    }
  }

  return {
    command: "pairs",
    token: { address: token, symbol },
    pairCount: pairs.length,
    pairs,
    source: "PancakeSwap V3 Factory",
  };
}

// === Main ===
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log(JSON.stringify({
      error: "Usage: pancakeswap.mjs <command> [args...]",
      commands: ["quote", "swap", "pools", "price", "approve", "pairs"],
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
        result = await cmdPools(args[1]);
        break;
      case "price":
        if (args.length < 2) throw new Error("Usage: price <token>");
        result = await cmdPrice(args[1]);
        break;
      case "approve":
        if (args.length < 2) throw new Error("Usage: approve <token> [amount]");
        result = await cmdApprove(args[1], args[2]);
        break;
      case "pairs":
        if (args.length < 2) throw new Error("Usage: pairs <token>");
        result = await cmdPairs(args[1]);
        break;
      default:
        throw new Error(`Unknown command: ${cmd}. Available: quote, swap, pools, price, approve, pairs`);
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
