"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/ui/theme-toggle";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { signOut, userRole, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">hesapkirala</h1>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <ModeToggle />
            </div>
            <div className="text-primary-foreground mr-4">
              <span className="font-medium">Puan:</span> 0
            </div>
            <Button
              variant="ghost"
              onClick={() => signOut()}
              className="text-primary-foreground hover:text-primary-foreground/90 hover:bg-primary-foreground/10"
            >
              Çıkış Yap
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 bg-card border-r border-border p-4">
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Menü</h2>
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-accent rounded-full"></div>
          </div>
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className={`flex items-center p-2.5 rounded-lg transition-colors ${
                pathname === "/dashboard"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Ana Sayfa
            </Link>

            {userRole === "ADMIN" && (
              <>
                <Link
                  href="/dashboard/users"
                  className={`flex items-center p-2.5 rounded-lg transition-colors ${
                    pathname === "/dashboard/users"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Kullanıcı Yönetimi
                </Link>
                <Link
                  href="/dashboard/accounts"
                  className={`flex items-center p-2.5 rounded-lg transition-colors ${
                    pathname === "/dashboard/accounts"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" x2="22" y1="10" y2="10" />
                  </svg>
                  Hesap Yönetimi
                </Link>
              </>
            )}

            <Link
              href="/dashboard/available-accounts"
              className={`flex items-center p-2.5 rounded-lg transition-colors ${
                pathname === "/dashboard/available-accounts"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
                <path d="M1 21h22" />
                <path d="M8 10h8" />
                <path d="M8 14h8" />
                <path d="M8 18h8" />
              </svg>
              Kiralanabilir Hesaplar
            </Link>

            <Link
              href="/dashboard/my-accounts"
              className={`flex items-center p-2.5 rounded-lg transition-colors ${
                pathname === "/dashboard/my-accounts"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <path d="M16 2v4" />
                <path d="M8 2v4" />
                <path d="M3 10h18" />
              </svg>
              Hesaplarım
            </Link>
          </nav>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
