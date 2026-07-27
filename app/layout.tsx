import type { Metadata } from "next";
import { AppShell } from "@/app/components/app-shell";
import { currentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ordo Caroli",
  description: "Rechnungswesen-Workflow",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  return (
    <html lang="de">
      <body>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
