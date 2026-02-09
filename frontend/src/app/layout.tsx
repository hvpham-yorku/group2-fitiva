import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitiva - Personalized Workout Training",
  description: "Your personal fitness journey starts here",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
