import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const KEY_PREFIX = "sbase:reg:";
const BASE_RPC = "https://mainnet.base.org";

const TIERS = [
  { key: "builder", min: 100, max: 249, allocation: 5000 },
  { key: "voyager", min: 250, max: 499, allocation: 15000 },
  { key: "pioneer", min: 500, max: 999, allocation: 35000 },
  { key: "legend", min: 1000, max: Infinity, allocation: 75000 },
];

function tierFor(txCount: number) {
  if (txCount < 100) return null;
  return TIERS.find((t) => txCount >= t.min && txCount <= t.max) ?? TIERS[TIERS.length - 1];
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address is required" }, { status: 400 });

  const entry = await redis.get(`${KEY_PREFIX}${address.toLowerCase()}`);
  return NextResponse.json({ registered: !!entry, entry: entry || null });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, signature, message, txHash } = body;

    if (!address || !txHash || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const key = `${KEY_PREFIX}${address.toLowerCase()}`;
    const existing = await redis.get(key);
    if (existing) {
      return NextResponse.json({ error: "Already registered", entry: existing }, { status: 409 });
    }

    // Verify tx count server-side (don't trust client)
    const rpcRes = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionCount",
        params: [address, "latest"],
      }),
    });
    const rpcData = await rpcRes.json();
    const txCount = rpcData?.result ? parseInt(rpcData.result, 16) : 0;

    const tier = tierFor(txCount);
    if (!tier) {
      return NextResponse.json({ error: "Not eligible — fewer than 100 Base transactions" }, { status: 403 });
    }

    const entry = {
      address,
      txCount,
      tier: tier.key,
      allocation: tier.allocation,
      signature,
      message,
      txHash,
      registeredAt: new Date().toISOString(),
    };

    await redis.set(key, entry);
    await redis.sadd("sbase:reg:all", address.toLowerCase());

    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save registration" }, { status: 500 });
  }
}
