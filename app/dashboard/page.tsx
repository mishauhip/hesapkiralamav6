"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Stats = {
  totalAccounts: number;
  availableAccounts: number;
  myAccounts: number;
};

export default function DashboardPage() {
  const { userRole } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalAccounts: 0,
    availableAccounts: 0,
    myAccounts: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const { count: totalAccounts, error: totalErr } = await supabase
          .from("game_accounts")
          .select("*", { count: "exact", head: true });

        if (totalErr) throw totalErr;

        const { count: availableAccounts, error: availErr } = await supabase
          .from("game_accounts")
          .select("*", { count: "exact", head: true })
          .eq("is_available", true);

        if (availErr) throw availErr;

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const userId = userData?.user?.id ?? null;

        let myAccounts = 0;
        if (userId) {
          const { count, error: myErr } = await supabase
            .from("game_accounts")
            .select("*", { count: "exact", head: true })
            .eq("assigned_to", userId);

          if (myErr) throw myErr;
          myAccounts = count ?? 0;
        }

        if (cancelled) return;

        setStats({
          totalAccounts: totalAccounts ?? 0,
          availableAccounts: availableAccounts ?? 0,
          myAccounts,
        });
      } catch (e) {
        console.error(e);
        toast.error("Dashboard istatistikleri yüklenemedi.");
      }
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block mb-2">
          Hoş Geldiniz
        </h1>
        <p className="text-muted-foreground">
          {userRole === "ADMIN"
            ? "Yönetici panelinize hoş geldiniz. Buradan kullanıcıları ve oyun hesaplarını yönetebilirsiniz."
            : userRole === "VIP"
            ? "VIP kullanıcı panelinize hoş geldiniz. Tüm oyun hesaplarını kiralayabilirsiniz."
            : "Kullanıcı panelinize hoş geldiniz. Diamond 3 ligine kadar olan hesapları kiralayabilirsiniz."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="h-1 bg-primary w-full"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Toplam Hesap</CardTitle>
            <CardDescription>Sistemdeki toplam hesap sayısı</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.totalAccounts}</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <div className="h-1 bg-accent w-full"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Kullanılabilir Hesap</CardTitle>
            <CardDescription>Kiralanabilir hesap sayısı</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{stats.availableAccounts}</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <div className="h-1 bg-gradient-to-r from-primary to-accent w-full"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Hesaplarım</CardTitle>
            <CardDescription>Kiraladığınız hesap sayısı</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {stats.myAccounts}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
