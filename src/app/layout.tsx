import type { Metadata, Viewport } from "next";
import { Anton, Caveat, DM_Sans, Homemade_Apple, Special_Elite } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm", subsets: ["latin"] });
const special = Special_Elite({ variable: "--font-special", subsets: ["latin"], weight: "400" });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const apple = Homemade_Apple({ variable: "--font-apple", subsets: ["latin"], weight: "400" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wishlist · Cris y Melck",
  description: "Tablero de deseos, compras y regalos de Cris y Melck",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${dmSans.variable} ${special.variable} ${anton.variable} ${caveat.variable} ${apple.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
