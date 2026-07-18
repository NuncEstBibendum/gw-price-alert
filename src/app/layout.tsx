import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GW Price Alerts",
  description: "Alertes de prix Guild Wars (achat/revente de matériaux)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <nav className="topnav">
          <strong>GW Price Alerts</strong>
          <Link href="/">Dashboard</Link>
          <Link href="/rules">Règles d&apos;alerte</Link>
        </nav>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
