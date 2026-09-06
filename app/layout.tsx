import type { Metadata } from "next";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://spiralbase.vercel.app";

export const metadata: Metadata = {
  title: "Spiral Base | $SBASE Airdrop Registration",
  description:
    "More Base activity, more $SBASE. Connect your wallet, verify your Base transaction history, and register for the airdrop.",
  openGraph: {
    title: "Spiral Base | $SBASE Airdrop Registration",
    description: "More Base txns = more tokens. Connect wallet to check eligibility.",
    images: [APP_URL + "/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body grid-bg min-h-screen">{children}</body>
    </html>
  );
}
