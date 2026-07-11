import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Numlysms — Virtual Numbers & Instant SMS Verification",
  description:
    "Rent virtual phone numbers and receive SMS verification codes instantly across 190+ countries. Transparent pricing, automatic refunds, live delivery.",
  openGraph: {
    title: "Numlysms — Virtual Numbers & Instant SMS Verification",
    description:
      "Rent virtual phone numbers and receive SMS verification codes instantly across 190+ countries.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plexMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
