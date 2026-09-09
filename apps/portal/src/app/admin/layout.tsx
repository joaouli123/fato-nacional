import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticatePayload } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { GeistSans } from "geist/font/sans";
import "@/app/globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "Painel Editorial | Fato Nacional",
  description: "Painel administrativo e operacional de automação de notícias.",
};

export default async function RootAdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await authenticatePayload(await headers());
  
  // If the user is not authenticated, redirect to Payload CMS login screen
  if (!user) {
    redirect("/cms/login?redirect=/admin");
  }

  // Cast the user object to the required type
  const typedUser = user ? {
    id: String(user.id),
    email: user.email || "",
    name: user.name || undefined,
    collection: user.collection
  } : undefined;

  return (
    <html lang="pt-BR" className={GeistSans.variable}>
      <body className="admin-body">
        <AdminShell user={typedUser}>
          {children}
        </AdminShell>
      </body>
    </html>
  );
}
