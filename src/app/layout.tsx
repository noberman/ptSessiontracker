import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
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
  title: "FitSync - Personal Training Session Tracker",
  description: "Track, manage, and optimize your personal training business with FitSync",
  keywords: "personal training, fitness, session tracking, client management, FitSync",
  authors: [{ name: "FitSync" }],
  creator: "FitSync",
  publisher: "FitSync",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://fitsync.io"),
  openGraph: {
    title: "FitSync - Personal Training Session Tracker",
    description: "Track, manage, and optimize your personal training business",
    url: "https://fitsync.io",
    siteName: "FitSync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitSync - Personal Training Session Tracker",
    description: "Track, manage, and optimize your personal training business",
    creator: "@fitsync",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/Icon.svg", type: "image/svg+xml" },
      { url: "/favicon-logo.png", type: "image/png", sizes: "32x32" }
    ],
    apple: "/favicon-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
