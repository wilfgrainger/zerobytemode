import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.zerobytemode.com"),
  title: "ZeroByteMode | Open-source local image compressor",
  description:
    "Batch-compress JPEG, PNG, WebP and AVIF locally in your browser with open WebAssembly codecs. No uploads, accounts, analytics or paid tier.",
  keywords: [
    "open source image compressor",
    "local image compression",
    "browser image optimizer",
    "compress jpeg",
    "optimize png",
    "webp compressor",
    "avif compressor",
    "batch image compression",
  ],
  alternates: { canonical: "https://www.zerobytemode.com" },
  openGraph: {
    title: "ZeroByteMode | No uploads. No paywall.",
    description:
      "Open-source batch image compression that runs entirely in your browser.",
    url: "https://www.zerobytemode.com",
    siteName: "ZeroByteMode",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "ZeroByteMode local image compressor",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZeroByteMode | Open-source local image compressor",
    description: "Compress full image batches locally. No accounts or paid tier.",
    images: ["/opengraph-image.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZeroByteMode",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ZeroByteMode",
  url: "https://www.zerobytemode.com",
  description:
    "Open-source, local-only image compression using browser Web Workers and WebAssembly codecs.",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any modern browser",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
  },
  codeRepository: "https://github.com/wilfgrainger/zerobytemode",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; worker-src 'self' blob:; manifest-src 'self'"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
