import "./globals.css";

import type { Metadata } from "next";
import { Toaster } from "sonner";

import AuthProvider from "@/providers/auth-provider";
import QueryProvider from "@/providers/query-provider";

export const metadata: Metadata = {
  title: "AI Meeting Assistant",
  description: "Upload meetings, get transcripts, summaries and action items.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
