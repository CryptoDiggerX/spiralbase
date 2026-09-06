"use client";

import { useState } from "react";
import { BrowserProvider, parseEther, toBeHex } from "ethers";

const FEE_RECEIVER = "0x580Aab97021D7D379c8d26444eAae332C3014ba7";
const FEE_ETH = "0.00006666";
const BASE_CHAIN_HEX = "0x2105";
const TOKEN_NAME = "Spiral Base";
const TOKEN_TICKER = "SBASE";
const TOTAL_SUPPLY = "1,000,000,000";

type Tier = {
  key: string;
  label: string;
  min: number;
  max: number;
  allocation: number;
  color: string;
};

const TIERS: Tier[] = [
  { key: "builder", label: "Builder", min: 100, max: 249, allocation: 5000, color: "#3B82F6" },
  { key: "voyager", label: "Voyager", min: 250, max: 499, allocation: 15000, color: "#2563EB" },
  { key: "pioneer", label: "Pioneer", min: 500, max: 999, allocation: 35000, color: "#0052FF" },
  { key: "legend", label: "Legend", min: 1000, max: Infinity, allocation: 75000, color: "#003FCC" },
];

type TokenomicsItem = { label: string; pct: number; color: string };

const TOKENOMICS: TokenomicsItem[] = [
  { label: "Airdrop", pct: 40, color: "#0052FF" },
  { label: "Liquidity", pct: 30, color: "#3B82F6" },
  { label: "Team", pct: 20, color: "#2563EB" },
  { label: "Treasury", pct: 10, color: "#1D4ED8" },
];

function tierFor(txCount: number): Tier | null {
  if (txCount < 100) return null;
  return TIERS.find((t) => txCount >= t.min && txCount <= t.max) ?? TIERS[TIERS.length - 1];
}

type Step = "idle" | "connecting" | "connected" | "registering" | "done";

export default function Page() {
  const [step, setStep] = useState<Step>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [txCount, setTxCount] = useState<number | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTxCount = async (addr: string) => {
    setTxLoading(true);
    try {
      const res = await fetch(`/api/tx-count?address=${addr}`);
      const data = await res.json();
      setTxCount(typeof data.txCount === "number" ? data.txCount : 0);
    } catch (e) {
      console.error(e);
      setTxCount(0);
    } finally {
      setTxLoading(false);
    }
  };

  const checkRegistered = async (addr: string) => {
    try {
      const res = await fetch(`/api/register?address=${addr}`);
      const data = await res.json();
      setAlreadyRegistered(!!data.registered);
    } catch (e) {
      console.error(e);
    }
  };

  const connectWallet = async () => {
    setStep("connecting");
    setErrorMsg(null);
    try {
      const provider = (window as any).ethereum;
      if (!provider) {
        throw new Error("No wallet found. Please install MetaMask or Coinbase Wallet.");
      }

      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts?.[0]) throw new Error("No account returned");

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_CHAIN_HEX }],
        });
      } catch (switchError: any) {
        if (switchError?.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BASE_CHAIN_HEX,
                chainName: "Base",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://mainnet.base.org"],
                blockExplorerUrls: ["https://basescan.org"],
              },
            ],
          });
        }
      }

      setAddress(accounts[0]);
      (window as any).__ethProvider = provider;
      setStep("connected");

      fetchTxCount(accounts[0]);
      checkRegistered(accounts[0]);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Wallet connection failed");
      setStep("idle");
    }
  };

  const register = async () => {
    if (!address || txCount === null) return;
    const tier = tierFor(txCount);
    if (!tier) return;

    setStep("registering");
    setErrorMsg(null);
    try {
      const provider = (window as any).__ethProvider;
      const browserProvider = new BrowserProvider(provider);
      const signer = await browserProvider.getSigner();

      const message = `Register for ${TOKEN_NAME} ($${TOKEN_TICKER}) Airdrop\nWallet: ${address}\nBase Tx Count: ${txCount}`;
      const signature = await signer.signMessage(message);

      const valueHex = toBeHex(parseEther(FEE_ETH));
      const txHashResult: string = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: FEE_RECEIVER,
            value: valueHex,
            gas: toBeHex(30000),
          },
        ],
      });

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          signature,
          message,
          txHash: txHashResult,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save registration");
      }

      setAlreadyRegistered(true);
      setStep("done");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Registration failed");
      setStep("connected");
    }
  };

  const tier = txCount !== null ? tierFor(txCount) : null;
  const eligible = txCount !== null && txCount >= 100;

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-md flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-base-blue flex items-center justify-center mb-4 glow-blue">
          <span className="font-display text-white text-2xl font-bold">S</span>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-white">
          Spiral Base
        </h1>
        <p className="font-mono text-xs tracking-[0.2em] text-base-blue mt-1 uppercase">
          ${TOKEN_TICKER} · Airdrop Registration
        </p>
        <p className="font-body text-sm text-gray-400 mt-3 leading-relaxed">
          More Base activity, more <span className="text-white font-semibold">$SBASE</span>.
          Connect your wallet — your on-chain transaction count on Base determines your tier.
        </p>
      </div>

      <div className="w-full max-w-md bg-base-card border border-base-border rounded-2xl shadow-xl p-6">
        {!address && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="font-body text-sm text-gray-400 text-center">
              Connect a wallet on Base Mainnet to check your transaction count and reveal your tier.
            </p>
            <button
              onClick={connectWallet}
              disabled={step === "connecting"}
              className="w-full py-3.5 rounded-xl bg-base-blue text-white font-body font-semibold text-sm tracking-wide hover:bg-blue-600 transition disabled:opacity-60"
            >
              {step === "connecting" ? "Connecting…" : "Connect Wallet"}
            </button>
            {errorMsg && <p className="text-xs text-red-400 text-center">{errorMsg}</p>}
          </div>
        )}

        {address && (
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-base-border pb-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-gray-500">
                Wallet
              </span>
              <span className="font-mono text-xs text-white">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-base-border pb-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-gray-500">
                Base Tx Count
              </span>
              <span className="font-display text-lg font-bold text-white">
                {txLoading ? "…" : txCount !== null ? txCount.toLocaleString() : "—"}
              </span>
            </div>

            {!txLoading && !eligible && txCount !== null && (
              <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/5 text-center">
                <p className="text-sm text-red-400 font-body">
                  Not eligible yet — need at least 100 Base transactions.
                </p>
              </div>
            )}

            {tier && !txLoading && (
              <div
                className="tier-card rounded-xl p-4 border"
                style={{ borderColor: tier.color, backgroundColor: `${tier.color}15` }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-display text-lg font-bold" style={{ color: tier.color }}>
                    {tier.label}
                  </span>
                  <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">
                    Tier
                  </span>
                </div>
                <div className="mt-2 font-body text-2xl font-bold text-white">
                  {tier.allocation.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-gray-500">${TOKEN_TICKER}</span>
                </div>
                <p className="text-[11px] font-mono text-gray-500 mt-1">
                  {tier.max === Infinity ? `${tier.min}+ txns` : `${tier.min}–${tier.max} txns`}
                </p>
              </div>
            )}

            {alreadyRegistered ? (
              <div className="text-center py-3">
                <p className="font-display text-xl font-bold text-base-blue">You're on the list</p>
              </div>
            ) : (
              eligible && (
                <button
                  onClick={register}
                  disabled={step === "registering" || txLoading}
                  className="w-full py-3.5 rounded-xl bg-base-blue text-white font-body font-semibold text-sm tracking-wide hover:bg-blue-600 transition disabled:opacity-60"
                >
                  {step === "registering" ? "Confirming in wallet…" : "Sign & Register"}
                </button>
              )
            )}
            {errorMsg && <p className="text-xs text-red-400 text-center">{errorMsg}</p>}
          </div>
        )}
      </div>

      <div className="w-full max-w-md mt-6 bg-base-card border border-base-border rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-xl font-bold text-white">Tokenomics</h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-gray-500">
            {TOTAL_SUPPLY} {TOKEN_TICKER}
          </span>
        </div>
        <p className="font-body text-xs text-gray-500 mb-4">Total supply distribution</p>

        <div className="w-full h-3 rounded-full overflow-hidden flex mb-4 border border-base-border">
          {TOKENOMICS.map((item) => (
            <div key={item.label} style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {TOKENOMICS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="font-body text-sm text-gray-400">{item.label}</span>
              <span className="font-mono text-sm font-semibold text-white ml-auto">{item.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md mt-6 bg-base-card border border-base-blue/30 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold text-white">Listing Update</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest bg-base-blue/15 text-base-blue border border-base-blue/40 px-2 py-1 rounded-full">
            Upcoming
          </span>
        </div>
        <p className="font-body text-sm text-gray-400 leading-relaxed">
          <span className="text-white font-semibold">${TOKEN_TICKER}</span> launches on Base-native DEXs —
          Aerodrome and Uniswap — with liquidity seeded from the treasury allocation.
        </p>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-base-border">
          <span className="font-mono text-[11px] uppercase tracking-widest text-gray-500">
            Target Window
          </span>
          <span className="font-mono text-sm font-semibold text-white">Q4 2026</span>
        </div>
      </div>

      <p className="font-mono text-[10px] text-gray-600 mt-8 tracking-widest uppercase">
        Base Mainnet
      </p>
    </main>
  );
                        }
