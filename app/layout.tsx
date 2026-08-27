import type { Metadata } from "next";
import { Geist_Mono, Inter, Syne } from "next/font/google";
import "./globals.css";
import { AiConfigProvider } from "../features/marketplace/hooks/use-ai-config";
import { AppShell } from "@/components/beautiful-ui/app-shell";
import { ThemeProvider } from "@/components/beautiful-ui/theme-provider";
import { MarketplaceProfileHydrator } from "@/features/marketplace/components/marketplace-profile-hydrator";
import { localAiConfigurationEnabled } from "@/lib/remote-endpoint";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-brand",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://marketplace.openship.org"),
  title: "the / marketplace",
  description: "AI-powered decentralized marketplace",
  openGraph: {
    title: "the / marketplace",
    description: "AI-powered decentralized marketplace",
    url: "https://marketplace.openship.org",
    siteName: "the / marketplace",
    images: [
      {
        url: "/og/marketplace.png",
        width: 1200,
        height: 630,
        alt: "the / marketplace",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "the / marketplace",
    description: "AI-powered decentralized marketplace",
    images: ["/og/marketplace.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
};

function checkEnvVarsAvailable() {
  return !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL);
}

function getSharedKeysData() {
  const hasKeys = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL);
  if (!hasKeys) return null;

  return {
    apiKey: "",
    model: process.env.OPENROUTER_MODEL!,
    maxTokens: process.env.OPENROUTER_MAX_TOKENS
      ? parseInt(process.env.OPENROUTER_MAX_TOKENS)
      : 4000,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const envVarsAvailable = checkEnvVarsAvailable();
  const sharedKeysData = getSharedKeysData();
  const localAiEnabled = localAiConfigurationEnabled();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="/favicon.svg" rel="icon" />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} ${syne.variable} antialiased`}>
        <ThemeProvider>
          <MarketplaceProfileHydrator />
          <AiConfigProvider
            defaultConfig={{ enabled: true, onboarded: true, keyMode: envVarsAvailable || !localAiEnabled ? "env" : "local" }}
            sharedKeys={sharedKeysData}
            localAiEnabled={localAiEnabled}
          >
            <AppShell>{children}</AppShell>
          </AiConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
