import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.zerobytemode.com'), // Replace with actual domain
  title: "Free Image Compressor & Optimizer | ZeroByteMode",
  description: "Make it smaller. ZeroByteMode is a secure, local-first file and image compression studio. Reduce photo sizes by up to 80% with next-gen WASM algorithms directly in your browser. No server uploads.",
  keywords: ["image compressor", "file compression", "reduce photo size", "compress jpeg online", "optimize png", "bulk image compression", "make image smaller", "secure local image compressor", "webp compressor", "avif compressor", "zero byte mode", "ZBM"],
  alternates: {
    canonical: 'https://www.zerobytemode.com',
  },
  openGraph: {
    title: "ZeroByteMode: Secure Image Compressor",
    description: "The world's most secure, local-first image compression studio. Reduce file sizes instantly.",
    url: "https://www.zerobytemode.com",
    siteName: "ZeroByteMode",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "ZeroByteMode Compression Studio",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZeroByteMode: Secure Image Compressor",
    description: "Ultimate local image compression right in your browser.",
    images: ["/opengraph-image.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ZeroByteMode",
  },
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Structured Data (JSON-LD) for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "ZeroByteMode",
    "url": "https://www.zerobytemode.com",
    "description": "Secure, local-first image and file compression studio.",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.workers.dev https://www.google-analytics.com; worker-src 'self' blob:; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://buy.stripe.com;"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5K3SJRJBPD"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5K3SJRJBPD');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground selection:bg-white/20`}
      >
        {children}
      </body>
    </html>
  );
}
