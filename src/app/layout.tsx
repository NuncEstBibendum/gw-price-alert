import type { Metadata } from "next";
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
        <header className="topbar">
          <h1>GW Price Alerts</h1>
        </header>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
