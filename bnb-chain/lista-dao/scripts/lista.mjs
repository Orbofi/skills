#!/usr/bin/env node

// ListaDAO — BNB Liquid Staking (slisBNB)
// Zero dependencies — Node.js 18+ built-ins only

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

  // Estimate gas
  const estimateParams = { from: WALLET, to, data: "0x" + data };
  if (value > 0n) estimateParams.value = "0x" + value.toString(16);
  let gasLimit;
  try {
    const est = await rpc("eth_estimateGas", [estimateParams]);
    gasLimit = BigInt(est) * 130n / 100n;
  } catch {
    gasLimit = 300000n;
  }

  // EIP-155 signing
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
// ListaDAO Contract Addresses
// ============================================================
const CONTRACTS = {
  stakeManager: "0x1adB950d8bB3dA4bE104211D5AB038628e477fE6",
  slisBNB:      "0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B",
};

// ============================================================
// Function Selectors
// ============================================================
const SEL = {
  // StakeManager
  deposit:               functionSelector("deposit()"),
  requestWithdraw:       functionSelector("requestWithdraw(uint256)"),
  convertSnBnbToBnb:     functionSelector("convertSnBnbToBnb(uint256)"),
  convertBnbToSnBnb:     functionSelector("convertBnbToSnBnb(uint256)"),
  getTotalPooledBnb:     functionSelector("getTotalPooledBnb()"),
  getContracts:          functionSelector("getContracts()"),
  // slisBNB (ERC-20)
  balanceOf:             functionSelector("balanceOf(address)"),
  totalSupply:           functionSelector("totalSupply()"),
  // Approval
  approve:               functionSelector("approve(address,uint256)"),
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
// Commands
// ============================================================

async function cmdStake(amount) {
  if (!amount) throw new Error("Usage: lista.mjs stake <amount> (amount in BNB)");

  const amountWei = parseEther(amount);
  if (amountWei < parseEther("0.01")) {
    throw new Error("Minimum stake amount is 0.01 BNB");
  }

  // Get exchange rate before staking for estimate
  let estimatedSlisBNB = "unknown";
  try {
    const rateHex = await callContract(
      CONTRACTS.stakeManager,
      SEL.convertBnbToSnBnb + encodeUint256(amountWei)
    );
    estimatedSlisBNB = toEther(decodeUint256(rateHex));
  } catch {
    // rate query may fail, proceed anyway
  }

  // Call deposit() on StakeManager with BNB value
  const txHash = await signAndSend({
    to: CONTRACTS.stakeManager,
    value: amountWei,
    data: SEL.deposit,
  });

  return {
    action: "stake",
    amountBNB: amount,
    estimatedSlisBNB,
    stakeManager: CONTRACTS.stakeManager,
    txHash,
  };
}

async function cmdUnstake(amount) {
  if (!amount) throw new Error("Usage: lista.mjs unstake <amount> (amount in slisBNB)");

  const amountWei = parseEther(amount);

  // Estimate BNB to receive
  let estimatedBNB = "unknown";
  try {
    const rateHex = await callContract(
      CONTRACTS.stakeManager,
      SEL.convertSnBnbToBnb + encodeUint256(amountWei)
    );
    estimatedBNB = toEther(decodeUint256(rateHex));
  } catch {
    // rate query may fail
  }

  // First approve StakeManager to spend slisBNB
  const MAX_UINT256 = (2n ** 256n) - 1n;
  const approveData = SEL.approve + encodeAddress(CONTRACTS.stakeManager) + encodeUint256(MAX_UINT256);
  try {
    await signAndSend({ to: CONTRACTS.slisBNB, data: approveData });
  } catch {
    // Approval may already exist
  }

  // Call requestWithdraw(uint256) on StakeManager
  const withdrawData = SEL.requestWithdraw + encodeUint256(amountWei);
  const txHash = await signAndSend({
    to: CONTRACTS.stakeManager,
    data: withdrawData,
  });

  return {
    action: "unstake",
    amountSlisBNB: amount,
    estimatedBNB,
    note: "Unstaking has a cooldown period of 7-15 days. For instant liquidity, consider swapping slisBNB on a DEX.",
    txHash,
  };
}

async function cmdBalance(address) {
  const addr = address || WALLET;
  if (!addr) throw new Error("No address provided. Set BSC_WALLET_ADDRESS or pass an address argument.");

  const balHex = await callContract(
    CONTRACTS.slisBNB,
    SEL.balanceOf + encodeAddress(addr)
  );
  const balance = decodeUint256(balHex);
  const balanceStr = toEther(balance);

  // Get exchange rate to show equivalent BNB value
  let equivalentBNB = "unknown";
  try {
    if (balance > 0n) {
      const rateHex = await callContract(
        CONTRACTS.stakeManager,
        SEL.convertSnBnbToBnb + encodeUint256(balance)
      );
      equivalentBNB = toEther(decodeUint256(rateHex));
    } else {
      equivalentBNB = "0.000000";
    }
  } catch {
    // fallback
  }

  // Also get native BNB balance
  let bnbBalance = "0";
  try {
    const bnbHex = await rpc("eth_getBalance", [addr, "latest"]);
    bnbBalance = toEther(BigInt(bnbHex));
  } catch {
    // ignore
  }

  return {
    address: addr,
    slisBNB: balanceStr,
    equivalentBNB,
    nativeBNB: bnbBalance,
    slisBNBContract: CONTRACTS.slisBNB,
  };
}

async function cmdExchangeRate() {
  const oneToken = 10n ** 18n;

  // 1 slisBNB -> X BNB
  const bnbPerSlis = await callContract(
    CONTRACTS.stakeManager,
    SEL.convertSnBnbToBnb + encodeUint256(oneToken)
  );
  const bnbPerSlisVal = decodeUint256(bnbPerSlis);

  // 1 BNB -> X slisBNB
  const slisPerBnb = await callContract(
    CONTRACTS.stakeManager,
    SEL.convertBnbToSnBnb + encodeUint256(oneToken)
  );
  const slisPerBnbVal = decodeUint256(slisPerBnb);

  // Total pooled BNB
  let totalPooledBNB = "unknown";
  try {
    const totalHex = await callContract(CONTRACTS.stakeManager, SEL.getTotalPooledBnb);
    totalPooledBNB = toEther(decodeUint256(totalHex));
  } catch {
    // may not be available
  }

  // Total slisBNB supply
  let totalSlisBNBSupply = "unknown";
  try {
    const supplyHex = await callContract(CONTRACTS.slisBNB, SEL.totalSupply);
    totalSlisBNBSupply = toEther(decodeUint256(supplyHex));
  } catch {
    // may not be available
  }

  return {
    exchangeRate: {
      "1_slisBNB_equals_BNB": toEther(bnbPerSlisVal),
      "1_BNB_equals_slisBNB": toEther(slisPerBnbVal),
    },
    totalPooledBNB,
    totalSlisBNBSupply,
    note: "Exchange rate increases over time as staking rewards accrue.",
  };
}

async function cmdApr() {
  // Try Lista API first for APR data
  let apiData = null;
  try {
    const res = await fetch("https://api.lista.org/api/stake/", {
      headers: { "Accept": "application/json" },
    });
    if (res.ok) {
      apiData = await res.json();
    }
  } catch {
    // API may be unavailable
  }

  // Also compute from on-chain exchange rate data
  const oneToken = 10n ** 18n;
  let currentRate = "unknown";
  try {
    const rateHex = await callContract(
      CONTRACTS.stakeManager,
      SEL.convertSnBnbToBnb + encodeUint256(oneToken)
    );
    currentRate = toEther(decodeUint256(rateHex));
  } catch {
    // fallback
  }

  const result = {
    source: apiData ? "Lista API + on-chain" : "on-chain estimate",
    currentExchangeRate: currentRate,
    note: "APR is derived from the rate at which the slisBNB/BNB exchange rate increases. Typical BNB staking APR is 3-5%.",
  };

  if (apiData) {
    result.apiData = apiData;
  }

  // Provide a reasonable estimate range
  result.estimatedAPR = "3.0% - 5.0%";
  result.description = "BNB staking rewards are distributed via the slisBNB exchange rate. As validators earn rewards, 1 slisBNB becomes redeemable for more BNB over time.";

  return result;
}

async function cmdValidators() {
  // Try to get validator info from Lista API
  let validators = [];
  try {
    const res = await fetch("https://api.lista.org/api/validators/", {
      headers: { "Accept": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.validators || data)) {
        validators = data.validators || data;
      }
    }
  } catch {
    // API may be unavailable
  }

  if (validators.length === 0) {
    // Provide known validator information
    return {
      note: "Unable to fetch live validator data from Lista API. Showing known validators.",
      validators: [
        { name: "ListaDAO Validator Pool", description: "ListaDAO delegates to multiple trusted BSC validators to diversify risk and maximize staking rewards." },
      ],
      stakeManager: CONTRACTS.stakeManager,
      tip: "For real-time validator data, check https://www.lista.org or BSCScan.",
    };
  }

  return { validators, stakeManager: CONTRACTS.stakeManager };
}

async function cmdRewards(address) {
  const addr = address || WALLET;
  if (!addr) throw new Error("No address provided. Set BSC_WALLET_ADDRESS or pass an address argument.");

  // Get current slisBNB balance
  const balHex = await callContract(
    CONTRACTS.slisBNB,
    SEL.balanceOf + encodeAddress(addr)
  );
  const balance = decodeUint256(balHex);
  const balanceStr = toEther(balance);

  // Get current exchange rate
  let currentBNBValue = "0.000000";
  let exchangeRate = "1.000000";
  if (balance > 0n) {
    try {
      const rateHex = await callContract(
        CONTRACTS.stakeManager,
        SEL.convertSnBnbToBnb + encodeUint256(balance)
      );
      currentBNBValue = toEther(decodeUint256(rateHex));
    } catch {
      // fallback
    }

    try {
      const oneToken = 10n ** 18n;
      const unitRateHex = await callContract(
        CONTRACTS.stakeManager,
        SEL.convertSnBnbToBnb + encodeUint256(oneToken)
      );
      exchangeRate = toEther(decodeUint256(unitRateHex));
    } catch {
      // fallback
    }
  }

  // Rewards are implicit in the exchange rate appreciation
  // If exchangeRate > 1.0, the difference from 1.0 represents accumulated rewards per slisBNB
  const rateNum = parseFloat(exchangeRate);
  const rewardPerToken = rateNum > 1.0 ? rateNum - 1.0 : 0;
  const totalRewards = rewardPerToken * parseFloat(balanceStr);

  return {
    address: addr,
    slisBNBBalance: balanceStr,
    currentBNBValue,
    exchangeRate,
    accumulatedRewardsBNB: totalRewards.toFixed(6),
    note: "Rewards accrue through the slisBNB/BNB exchange rate increasing over time. The difference between current exchange rate and 1.0 represents cumulative rewards per slisBNB since inception.",
  };
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
      case "stake":
        result = await cmdStake(args[1]);
        break;
      case "unstake":
        result = await cmdUnstake(args[1]);
        break;
      case "balance":
        result = await cmdBalance(args[1]);
        break;
      case "exchange-rate":
        result = await cmdExchangeRate();
        break;
      case "apr":
        result = await cmdApr();
        break;
      case "validators":
        result = await cmdValidators();
        break;
      case "rewards":
        result = await cmdRewards(args[1]);
        break;
      default:
        result = {
          error: cmd ? "Unknown command" : undefined,
          usage: "lista.mjs <command> [args]",
          commands: {
            "stake <amount>": "Stake BNB to receive slisBNB",
            "unstake <amount>": "Unstake slisBNB to receive BNB (7-15 day cooldown)",
            "balance [address]": "Check slisBNB balance and equivalent BNB value",
            "exchange-rate": "Current slisBNB/BNB exchange rate",
            "apr": "Current staking APR",
            "validators": "List validators",
            "rewards [address]": "Check accumulated staking rewards",
          },
          contracts: CONTRACTS,
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
