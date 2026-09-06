import { NextRequest, NextResponse } from "next/server";

const BASE_RPC = "https://mainnet.base.org";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const res = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionCount",
        params: [address, "latest"],
      }),
      cache: "no-store",
    });

    const data = await res.json();
    const txCount = data?.result ? parseInt(data.result, 16) : 0;

    return NextResponse.json({ txCount, address });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch tx count" }, { status: 500 });
  }
}
