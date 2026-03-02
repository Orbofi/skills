#!/usr/bin/env node

// stargate.mjs — Stargate Finance cross-chain bridge via LayerZero on BNB Chain
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

const STARGATE_API = "https://mainnet.stargate-api.com/v1";
const LAYERZERO_SCAN_API = "https://api-mainnet.layerzero-scan.com";

const STARGATE_ROUTER = "0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8";

// Bridgeable tokens on BSC
const TOKENS = {
  USDT: {
    address: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    poolId: 2,
  },
  USDC: {
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    decimals: 18,
    poolId: 1,
  },
};

// LayerZero chain IDs
const CHAINS = {
  ethereum: { id: 101, name: "Ethereum" },
  eth: { id: 101, name: "Ethereum" },
  arbitrum: { id: 110, name: "Arbitrum" },
  arb: { id: 110, name: "Arbitrum" },
  optimism: { id: 111, name: "Optimism" },
  op: { id: 111, name: "Optimism" },
  polygon: { id: 109, name: "Polygon" },
  matic: { id: 109, name: "Polygon" },
  avalanche: { id: 106, name: "Avalanche" },
  avax: { id: 106, name: "Avalanche" },
  bsc: { id: 102, name: "BNB Chain" },
  bnb: { id: 102, name: "BNB Chain" },
};

// Reverse lookup: chainId -> name
const CHAIN_NAMES = {};
for (const [key, val] of Object.entries(CHAINS)) {
  CHAIN_NAMES[val.id] = val.name;
}

// Stargate Router function selectors
const SEL_SWAP = functionSelector("swap(uint16,uint256,address,uint256,uint256,bytes,bytes,bytes)");
const SEL_QUOTE_LAYER_ZERO_FEE = functionSelector("quoteLayerZeroFee(uint16,uint8,bytes,bytes,bytes)");
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

function resolveToken(input) {
  const upper = (input || "").toUpperCase();
  if (TOKENS[upper]) return { symbol: upper, ...TOKENS[upper] };
  // Try matching by address
  for (const [sym, info] of Object.entries(TOKENS)) {
    if (info.address.toLowerCase() === input.toLowerCase()) return { symbol: sym, ...info };
  }
  fail(`Unsupported token: ${input}. Supported: ${Object.keys(TOKENS).join(", ")}`);
}

function resolveChain(input) {
  const lower = (input || "").toLowerCase();
  if (CHAINS[lower]) return CHAINS[lower];
  // Try matching by chain ID
  const asNum = parseInt(input);
  if (!isNaN(asNum) && CHAIN_NAMES[asNum]) return { id: asNum, name: CHAIN_NAMES[asNum] };
  fail(`Unsupported chain: ${input}. Supported: ${Object.keys(CHAINS).filter(k => k.length > 3).join(", ")}`);
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

async function getTokenBalance(tokenAddress, owner) {
  const data = "0x" + SEL_BALANCE_OF + encodeAddress(owner);
  const result = await rpc("eth_call", [{ to: tokenAddress, data }, "latest"]);
  return BigInt(result);
}

async function getBnbBalance(address) {
  const result = await rpc("eth_getBalance", [address, "latest"]);
  return BigInt(result);
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

function getPublicKeyFromPrivate(privHex) {
  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(Buffer.from(privHex, "hex"));
  return ecdh.getPublicKey().subarray(1); // uncompressed minus 0x04 prefix
}

async function signAndSend(txObj) {
  const nonce = await rpc("eth_getTransactionCount", [WALLET, "latest"]);
  const gasPrice = await rpc("eth_gasPrice");

  const tx = {
    nonce: BigInt(nonce),
    gasPrice: BigInt(gasPrice),
    gasLimit: txObj.gasLimit || 500000n,
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
    const rawHex = "0x" + signedRlp.toString("hex");
    try {
      const result = await rpc("eth_sendRawTransaction", [rawHex]);
      return { txHash: result, gasLimit: tx.gasLimit.toString() };
    } catch (e) {
      if (candidate === 1n) throw e;
    }
  }

  fail("Failed to sign and send transaction");
}

// ─── ABI Encoding Helpers ────────────────────────────────────────────────────

// Encode bytes for ABI (dynamic type with offset + length + data)
function encodeDynamicBytes(hexData) {
  const data = hexData.replace(/^0x/i, "");
  const byteLen = data.length / 2;
  const paddedLen = Math.ceil(byteLen / 32) * 32;
  return encodeUint256(byteLen) + data.padEnd(paddedLen * 2, "0");
}

// Encode Stargate lzTxObj: (uint256 dstGasForCall, uint256 dstNativeAmount, bytes dstNativeAddr)
function encodeLzTxObj(dstGasForCall, dstNativeAmount, dstNativeAddr) {
  // Struct encoding: 3 x uint256 + dynamic bytes offset
  const gasForCall = encodeUint256(dstGasForCall);
  const nativeAmt = encodeUint256(dstNativeAmount);
  // Offset for the bytes field (3 * 32 bytes from start = 96)
  const bytesOffset = encodeUint256(96);
  const addrBytes = dstNativeAddr.replace(/^0x/i, "");
  const addrLen = encodeUint256(addrBytes.length / 2);
  const paddedAddr = addrBytes.padEnd(Math.ceil(addrBytes.length / 64) * 64, "0");
  return gasForCall + nativeAmt + bytesOffset + addrLen + paddedAddr;
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function cmdRoutes() {
  const routes = [];
  const destChains = [
    { id: 101, name: "Ethereum" },
    { id: 110, name: "Arbitrum" },
    { id: 111, name: "Optimism" },
    { id: 109, name: "Polygon" },
    { id: 106, name: "Avalanche" },
  ];

  for (const token of Object.keys(TOKENS)) {
    for (const dest of destChains) {
      routes.push({
        srcChain: "BSC",
        srcChainId: 102,
        dstChain: dest.name,
        dstChainId: dest.id,
        token,
        tokenAddress: TOKENS[token].address,
        poolId: TOKENS[token].poolId,
      });
      // Also add reverse routes
      routes.push({
        srcChain: dest.name,
        srcChainId: dest.id,
        dstChain: "BSC",
        dstChainId: 102,
        token,
        tokenAddress: TOKENS[token].address,
        poolId: TOKENS[token].poolId,
      });
    }
  }

  // Also try fetching from the API
  try {
    const res = await fetch(`${STARGATE_API}/routes`, {
      headers: { "Accept": "application/json", "User-Agent": "OrbofiAgent/1.0" },
    });
    if (res.ok) {
      const apiData = await res.json();
      const apiRoutes = Array.isArray(apiData) ? apiData : (apiData.data || apiData.routes || []);
      if (apiRoutes.length > 0) {
        out({
          command: "routes",
          source: "api",
          count: apiRoutes.length,
          routes: apiRoutes,
        });
        return;
      }
    }
  } catch (e) {
    // Fall back to hardcoded routes
  }

  out({
    command: "routes",
    source: "hardcoded",
    count: routes.length,
    routes,
  });
}

async function cmdQuote(token, destChain, amount) {
  if (!token || !destChain || !amount) fail("Usage: stargate.mjs quote <token> <destChain> <amount>");

  const tokenInfo = resolveToken(token);
  const chainInfo = resolveChain(destChain);
  const amountWei = toWei(amount, tokenInfo.decimals);

  // Try the Stargate API first
  try {
    const url = `${STARGATE_API}/quote?srcChainId=102&dstChainId=${chainInfo.id}&token=${tokenInfo.symbol}&amount=${amountWei.toString()}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "OrbofiAgent/1.0" },
    });
    if (res.ok) {
      const data = await res.json();
      out({
        command: "quote",
        token: tokenInfo.symbol,
        srcChain: "BSC",
        dstChain: chainInfo.name,
        amountIn: amount,
        estimatedAmountOut: data.estimatedAmountOut || data.amountOut || "N/A",
        nativeFee: data.nativeFee || data.fee || "N/A",
        layerZeroFee: data.lzFee || data.layerZeroFee || "N/A",
        estimatedTime: data.estimatedTime || "1-5 minutes",
        raw: data,
      });
      return;
    }
  } catch (e) {
    // Fall back to on-chain quote
  }

  // On-chain: call quoteLayerZeroFee on the Router
  // quoteLayerZeroFee(uint16 _dstChainId, uint8 _functionType, bytes _toAddress, bytes _transferAndCallPayload, lzTxObj _lzTxParams)
  try {
    const dstChainId = encodeUint256(chainInfo.id).slice(48); // uint16 = last 4 hex chars, but ABI uses uint16 padded to 32
    const funcType = encodeUint256(1); // TYPE_SWAP_REMOTE = 1

    // Encode destination address as bytes
    const toAddrHex = (WALLET || "0x0000000000000000000000000000000000000000").replace(/^0x/, "").toLowerCase();

    // Build the calldata for quoteLayerZeroFee
    // We need to ABI-encode: (uint16, uint8, bytes, bytes, (uint256,uint256,bytes))
    // This is complex — use a simplified encoding
    const selectorHex = SEL_QUOTE_LAYER_ZERO_FEE;

    // Simplified: encode as tuple with offsets
    const params = [
      encodeUint256(chainInfo.id),     // _dstChainId (uint16 padded to 32)
      encodeUint256(1),                 // _functionType (uint8 padded to 32)
      encodeUint256(160),               // offset for _toAddress bytes
      encodeUint256(224),               // offset for _transferAndCallPayload bytes
      encodeUint256(288),               // offset for _lzTxParams bytes
      // _toAddress (bytes)
      encodeUint256(20),                // length = 20 bytes
      toAddrHex.padEnd(64, "0"),       // the address padded
      // _transferAndCallPayload (bytes)
      encodeUint256(0),                 // empty
      // _lzTxParams (bytes) — encode lzTxObj(0, 0, "0x")
      encodeUint256(64),                // length
      encodeUint256(0),                 // dstGasForCall
      encodeUint256(0),                 // dstNativeAmount
    ].join("");

    const calldata = "0x" + selectorHex + params;

    const result = await rpc("eth_call", [{ to: STARGATE_ROUTER, data: calldata }, "latest"]);

    // Result is (uint256 nativeFee, uint256 zroFee)
    const nativeFee = BigInt("0x" + result.slice(2, 66));
    const zroFee = BigInt("0x" + result.slice(66, 130));

    // Protocol fee is typically 0.06%
    const protocolFee = amountWei * 6n / 10000n;
    const estimatedOut = amountWei - protocolFee;

    out({
      command: "quote",
      token: tokenInfo.symbol,
      srcChain: "BSC",
      dstChain: chainInfo.name,
      amountIn: amount,
      estimatedAmountOut: fromWei(estimatedOut, tokenInfo.decimals),
      nativeFee: fromWei(nativeFee, 18) + " BNB",
      layerZeroFee: fromWei(zroFee, 18) + " ZRO",
      protocolFee: "0.06%",
      estimatedProtocolFee: fromWei(protocolFee, tokenInfo.decimals) + ` ${tokenInfo.symbol}`,
      estimatedTime: "1-5 minutes",
    });
  } catch (e) {
    // If on-chain quote also fails, return an estimate
    const protocolFee = toWei(amount, tokenInfo.decimals) * 6n / 10000n;
    const estimatedOut = toWei(amount, tokenInfo.decimals) - protocolFee;

    out({
      command: "quote",
      token: tokenInfo.symbol,
      srcChain: "BSC",
      dstChain: chainInfo.name,
      amountIn: amount,
      estimatedAmountOut: fromWei(estimatedOut, tokenInfo.decimals),
      nativeFee: "~0.001-0.005 BNB (estimate)",
      protocolFee: "0.06%",
      estimatedProtocolFee: fromWei(protocolFee, tokenInfo.decimals) + ` ${tokenInfo.symbol}`,
      estimatedTime: "1-5 minutes",
      note: "Estimate only — could not fetch exact quote from API or on-chain. Actual fees may vary.",
    });
  }
}

async function cmdBridge(token, destChain, amount, destAddress) {
  if (!token || !destChain || !amount || !destAddress) {
    fail("Usage: stargate.mjs bridge <token> <destChain> <amount> <destAddress>");
  }
  requireWallet();

  const tokenInfo = resolveToken(token);
  const chainInfo = resolveChain(destChain);
  const amountWei = toWei(amount, tokenInfo.decimals);

  if (!/^0x[0-9a-fA-F]{40}$/.test(destAddress)) {
    fail("Invalid destination address format");
  }

  // Step 1: Approve token for Stargate Router if needed
  const allowanceData = "0x" + SEL_ALLOWANCE + encodeAddress(WALLET) + encodeAddress(STARGATE_ROUTER);
  try {
    const allowance = await rpc("eth_call", [{ to: tokenInfo.address, data: allowanceData }, "latest"]);
    if (BigInt(allowance) < amountWei) {
      const approveData = "0x" + SEL_APPROVE + encodeAddress(STARGATE_ROUTER) + UINT256_MAX;
      const approveResult = await signAndSend({
        to: tokenInfo.address,
        data: approveData,
        gasLimit: 100000n,
      });
      // Wait for approval to be mined
      await new Promise(r => setTimeout(r, 5000));
    }
  } catch (e) {
    fail(`Token approval failed: ${e.message}`);
  }

  // Step 2: Get LayerZero fee estimate
  let nativeFee = toWei("0.005", 18); // Default estimate
  try {
    const toAddrHex = destAddress.replace(/^0x/, "").toLowerCase();
    const selectorHex = SEL_QUOTE_LAYER_ZERO_FEE;
    const params = [
      encodeUint256(chainInfo.id),
      encodeUint256(1),
      encodeUint256(160),
      encodeUint256(224),
      encodeUint256(288),
      encodeUint256(20),
      toAddrHex.padEnd(64, "0"),
      encodeUint256(0),
      encodeUint256(64),
      encodeUint256(0),
      encodeUint256(0),
    ].join("");

    const calldata = "0x" + selectorHex + params;
    const result = await rpc("eth_call", [{ to: STARGATE_ROUTER, data: calldata }, "latest"]);
    const quotedFee = BigInt("0x" + result.slice(2, 66));
    if (quotedFee > 0n) {
      nativeFee = quotedFee * 110n / 100n; // 10% buffer
    }
  } catch (e) {
    // Use default fee estimate
  }

  // Step 3: Build swap() calldata
  // swap(uint16 _dstChainId, uint256 _srcPoolId, uint256 _dstPoolId, address payable _refundAddress,
  //      uint256 _amountLD, uint256 _minAmountLD, lzTxObj memory _lzTxParams,
  //      bytes calldata _to, bytes calldata _payload)
  const selSwap = functionSelector(
    "swap(uint16,uint256,uint256,address,uint256,uint256,(uint256,uint256,bytes),bytes,bytes)"
  );

  // Min amount = 99.5% of input (0.5% slippage tolerance)
  const minAmountLD = amountWei * 995n / 1000n;

  // Encode destination address as bytes
  const destAddrHex = destAddress.replace(/^0x/, "").toLowerCase();

  // ABI encode the swap parameters
  // Fixed params first, then offsets for dynamic types
  const fixedParams = [
    encodeUint256(chainInfo.id),          // _dstChainId
    encodeUint256(tokenInfo.poolId),       // _srcPoolId
    encodeUint256(tokenInfo.poolId),       // _dstPoolId (same pool ID on dest)
    encodeAddress(WALLET),                 // _refundAddress
    encodeUint256(amountWei),              // _amountLD
    encodeUint256(minAmountLD),            // _minAmountLD
  ].join("");

  // lzTxObj tuple: (dstGasForCall=0, dstNativeAmount=0, dstNativeAddr="0x")
  // Offset for lzTxObj from start of dynamic section = 9 * 32 = 288
  const lzTxObjOffset = encodeUint256(9 * 32);
  // Offset for _to bytes
  const toOffset = encodeUint256(12 * 32);
  // Offset for _payload bytes
  const payloadOffset = encodeUint256(14 * 32);

  // lzTxObj encoding
  const lzTxObj = [
    encodeUint256(0),    // dstGasForCall
    encodeUint256(0),    // dstNativeAmount
    encodeUint256(96),   // offset for bytes
    encodeUint256(0),    // empty bytes length
  ].join("");

  // _to bytes
  const toBytes = encodeUint256(20) + destAddrHex.padEnd(64, "0");

  // _payload bytes (empty)
  const payloadBytes = encodeUint256(0);

  const calldata = "0x" + selSwap + fixedParams + lzTxObjOffset + toOffset + payloadOffset + lzTxObj + toBytes + payloadBytes;

  // Step 4: Send the transaction
  try {
    const result = await signAndSend({
      to: STARGATE_ROUTER,
      value: nativeFee,
      data: calldata,
      gasLimit: 600000n,
    });

    out({
      command: "bridge",
      token: tokenInfo.symbol,
      srcChain: "BSC",
      dstChain: chainInfo.name,
      amount,
      destAddress,
      txHash: result.txHash,
      nativeFeePaid: fromWei(nativeFee, 18) + " BNB",
      gasUsed: result.gasLimit,
      status: "submitted",
      note: "Use 'stargate.mjs status <txHash>' to track bridge progress",
    });
  } catch (e) {
    fail(`Bridge transaction failed: ${e.message}`);
  }
}

async function cmdStatus(txHash) {
  if (!txHash) fail("Usage: stargate.mjs status <txHash>");

  // Query LayerZero Scan API
  try {
    const url = `${LAYERZERO_SCAN_API}/tx/${txHash}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "OrbofiAgent/1.0" },
    });

    if (res.ok) {
      const data = await res.json();
      const msg = data.messages?.[0] || data;
      out({
        command: "status",
        txHash,
        srcChain: CHAIN_NAMES[msg.srcChainId] || msg.srcChainId || "Unknown",
        dstChain: CHAIN_NAMES[msg.dstChainId] || msg.dstChainId || "Unknown",
        status: msg.status || data.status || "UNKNOWN",
        srcTxHash: msg.srcTxHash || txHash,
        dstTxHash: msg.dstTxHash || "pending",
        created: msg.created || data.created || "N/A",
        completed: msg.updated || data.updated || "pending",
      });
      return;
    }
  } catch (e) {
    // API failed
  }

  // Fallback: check BSC transaction receipt
  try {
    const receipt = await rpc("eth_getTransactionReceipt", [txHash]);
    if (receipt) {
      out({
        command: "status",
        txHash,
        srcChain: "BSC",
        onChainStatus: receipt.status === "0x1" ? "SUCCESS" : "FAILED",
        blockNumber: parseInt(receipt.blockNumber, 16),
        gasUsed: parseInt(receipt.gasUsed, 16),
        bridgeStatus: receipt.status === "0x1" ? "Submitted to LayerZero — destination delivery pending" : "Transaction failed on BSC",
        note: "Check https://layerzeroscan.com/tx/" + txHash + " for cross-chain status",
      });
    } else {
      out({
        command: "status",
        txHash,
        status: "PENDING",
        note: "Transaction not yet confirmed on BSC. It may still be in the mempool.",
      });
    }
  } catch (e) {
    fail(`Failed to check status: ${e.message}`);
  }
}

async function cmdFees(token, destChain) {
  if (!token || !destChain) fail("Usage: stargate.mjs fees <token> <destChain>");

  const tokenInfo = resolveToken(token);
  const chainInfo = resolveChain(destChain);

  // Try to get on-chain fee quote
  let nativeFeeStr = "~0.001-0.005 BNB (estimate)";
  let nativeFeeUsd = "N/A";

  try {
    const refAddr = (WALLET || "0x0000000000000000000000000000000000000000").replace(/^0x/, "").toLowerCase();
    const selectorHex = SEL_QUOTE_LAYER_ZERO_FEE;
    const params = [
      encodeUint256(chainInfo.id),
      encodeUint256(1),
      encodeUint256(160),
      encodeUint256(224),
      encodeUint256(288),
      encodeUint256(20),
      refAddr.padEnd(64, "0"),
      encodeUint256(0),
      encodeUint256(64),
      encodeUint256(0),
      encodeUint256(0),
    ].join("");

    const calldata = "0x" + selectorHex + params;
    const result = await rpc("eth_call", [{ to: STARGATE_ROUTER, data: calldata }, "latest"]);
    const quotedFee = BigInt("0x" + result.slice(2, 66));
    if (quotedFee > 0n) {
      nativeFeeStr = fromWei(quotedFee, 18) + " BNB";
    }
  } catch (e) {
    // Use estimate
  }

  out({
    command: "fees",
    token: tokenInfo.symbol,
    srcChain: "BSC",
    dstChain: chainInfo.name,
    nativeFee: nativeFeeStr,
    nativeFeeUsd,
    protocolFee: "0.06%",
    estimatedProtocolFee: "Varies by amount",
    note: "Native fee (BNB) covers LayerZero messaging. Protocol fee is deducted from bridged amount.",
  });
}

async function cmdBalance(address) {
  const target = address || WALLET;
  if (!target) fail("Usage: stargate.mjs balance [address] — or set BSC_WALLET_ADDRESS");

  const balances = {};

  // BNB balance
  try {
    const bnb = await getBnbBalance(target);
    balances.BNB = fromWei(bnb, 18);
  } catch (e) {
    balances.BNB = "error";
  }

  // Token balances
  for (const [symbol, info] of Object.entries(TOKENS)) {
    try {
      const bal = await getTokenBalance(info.address, target);
      balances[symbol] = fromWei(bal, info.decimals);
    } catch (e) {
      balances[symbol] = "error";
    }
  }

  out({
    command: "balance",
    address: target,
    balances,
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    out({
      error: "No command specified",
      usage: "stargate.mjs <command> [args...]",
      commands: {
        routes: "List supported bridge routes from/to BNB Chain",
        quote: "Get bridge quote — quote <token> <destChain> <amount>",
        bridge: "Execute bridge transfer — bridge <token> <destChain> <amount> <destAddress>",
        status: "Check bridge transaction status — status <txHash>",
        fees: "Get estimated bridge fees — fees <token> <destChain>",
        balance: "Check balances of bridgeable tokens — balance [address]",
      },
      supportedTokens: Object.keys(TOKENS),
      supportedChains: Object.entries(CHAINS)
        .filter(([k]) => k.length > 3)
        .map(([k, v]) => `${v.name} (${k})`),
    });
    process.exit(1);
  }

  switch (command) {
    case "routes":
      await cmdRoutes();
      break;
    case "quote":
      await cmdQuote(args[1], args[2], args[3]);
      break;
    case "bridge":
      await cmdBridge(args[1], args[2], args[3], args[4]);
      break;
    case "status":
      await cmdStatus(args[1]);
      break;
    case "fees":
      await cmdFees(args[1], args[2]);
      break;
    case "balance":
      await cmdBalance(args[1]);
      break;
    default:
      fail(`Unknown command: ${command}. Valid commands: routes, quote, bridge, status, fees, balance`);
  }
}

main().catch(e => fail(e.message));
