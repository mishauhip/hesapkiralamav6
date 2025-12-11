"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import {
  getAccountByRiotID,
  getRankedInfo,
  getSummonerByPUUID,
} from "@/app/api/riot";
import { RegionId, regions } from "@/lib/regions";
import { Summoner, Match } from "@/lib/summoner";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const returnFormSchema = z.object({
  league: z.string({
    required_error: "Lütfen bir lig seçiniz.",
  }),
  flex_league: z.string({
    required_error: "Lütfen bir flex ligi seçiniz.",
  }),
  solo_lp: z.coerce
    .number()
    .min(0, { message: "Solo LP 0'dan küçük olamaz" })
    .max(100, { message: "Solo LP 100'den büyük olamaz" })
    .default(0),
  flex_lp: z.coerce
    .number()
    .min(0, { message: "Flex LP 0'dan küçük olamaz" })
    .max(100, { message: "Flex LP 100'den büyük olamaz" })
    .default(0),
});

const leagues = [
  "Iron 4",
  "Iron 3",
  "Iron 2",
  "Iron 1",
  "Bronze 4",
  "Bronze 3",
  "Bronze 2",
  "Bronze 1",
  "Silver 4",
  "Silver 3",
  "Silver 2",
  "Silver 1",
  "Gold 4",
  "Gold 3",
  "Gold 2",
  "Gold 1",
  "Platinum 4",
  "Platinum 3",
  "Platinum 2",
  "Platinum 1",
  "Emerald 4",
  "Emerald 3",
  "Emerald 2",
  "Emerald 1",
  "Diamond 4",
  "Diamond 3",
  "Diamond 2",
  "Diamond 1",
  "Master",
  "Grandmaster",
  "Challenger",
];

// Lig adına göre doğru resim dosyasını döndüren yardımcı fonksiyon
const getRankImage = (league: string): string => {
  const lowerLeague = league.toLowerCase();

  if (lowerLeague.includes("unranked")) return "unranked.png";
  if (lowerLeague.includes("demir") || lowerLeague.includes("iron"))
    return "demir.png";
  if (lowerLeague.includes("bronz") || lowerLeague.includes("bronze"))
    return "bronz.png";
  if (lowerLeague.includes("gümüş") || lowerLeague.includes("silver"))
    return "gümüş.png";
  if (lowerLeague.includes("altın") || lowerLeague.includes("gold"))
    return "altın.png";
  if (lowerLeague.includes("platin") || lowerLeague.includes("platinum"))
    return "platin.png";
  if (lowerLeague.includes("zümrüt") || lowerLeague.includes("emerald"))
    return "zümrüt.png";
  if (lowerLeague.includes("elmas") || lowerLeague.includes("diamond"))
    return "elmas.png";
  if (lowerLeague.includes("ustalık") || lowerLeague.includes("master"))
    return "ustalık.png";
  if (lowerLeague.includes("grandmaster")) return "grandmaster.png";
  if (lowerLeague.includes("challenger")) return "challenger.png";

  // Varsayılan olarak unranked döndür
  return "unranked.png";
};

type GameAccount = {
  id: string;
  username: string;
  password: string;
  server: string;
  nickname?: string;
  league: string;
  flex_league?: string;
  solo_lp?: number;
  flex_lp?: number;
  is_available: boolean;
  assigned_to: string | null;
  created_at: string;
  notes?: string;
  summoner?: Summoner | null;
  matches?: Match[];
};

type AccountAssignment = {
  id: string;
  user_id: string;
  account_id: string;
  assigned_at: string;
  returned_at: string | null;
  league_at_return: string | null;
  flex_league_at_return: string | null;
  solo_lp_at_return: number | null;
  flex_lp_at_return: number | null;
  created_at: string;
  account?: GameAccount;
  initial_league?: string;
  initial_flex_league?: string;
  initial_solo_lp?: number;
  initial_flex_lp?: number;
};

type ReturnInputs = z.input<typeof returnFormSchema>; // ham (undefined olabilir)
type ReturnValues = z.infer<typeof returnFormSchema>; // doğrulanmış (number)

export default function MyAccountsPage() {
  const { userRole, user } = useAuth();
  const [myAccounts, setMyAccounts] = useState<GameAccount[]>([]);
  const [accountHistory, setAccountHistory] = useState<AccountAssignment[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GameAccount | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  const returnForm = useForm<ReturnInputs, any, ReturnValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      league: "",
      flex_league: "Unranked",
      solo_lp: 0,
      flex_lp: 0,
    },
  });

  const fetchMyAccounts = async () => {
    try {
      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from("game_accounts")
        .select("*")
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Hesaplarınız yüklenirken bir hata oluştu.");
        console.error("Hesapları getirme hatası:", error);
        return;
      }

      const accountsWithSummoners = await Promise.all(
        (data as GameAccount[]).map(async (account) => {
          if (account.nickname && account.server) {
            try {
              // Server'ı RegionId'ye dönüştür
              const regionMap: { [key: string]: RegionId } = {
                TR: "tr1",
                EUW: "euw1",
                EUNE: "eun1",
                NA: "na1",
                KR: "kr",
                JP: "jp1",
                BR: "br1",
                LAN: "la1",
                LAS: "la2",
                OCE: "oc1",
                RU: "ru",
              };

              const regionConfig = regions.find(
                (r) => r.id === regionMap[account.server]
              );
              if (!regionConfig) {
                throw new Error(`Invalid region: ${account.server}`);
              }

              const gameName = account.nickname.split("#")[0];
              const tagLine = account.nickname.split("#")[1];
              const riotAccount = await getAccountByRiotID(
                regionConfig.platform,
                gameName,
                tagLine
              );

              const summoner = await getSummonerByPUUID(
                regionMap[account.server],
                riotAccount.puuid
              );

              const rankedInfo = await getRankedInfo(
                regionMap[account.server],
                summoner.id
              );
              if (rankedInfo && rankedInfo.length > 0) {
                const soloQueue = rankedInfo.find(
                  (queue: any) => queue.queueType === "RANKED_SOLO_5x5"
                );
                const flexQueue = rankedInfo.find(
                  (queue: any) => queue.queueType === "RANKED_FLEX_SR"
                );

                if (soloQueue) {
                  account = {
                    ...account,
                    league: `${soloQueue.tier} ${soloQueue.rank}`,
                    solo_lp: soloQueue.leaguePoints,
                  };
                }
                if (flexQueue) {
                  account = {
                    ...account,
                    flex_league: `${flexQueue.tier} ${flexQueue.rank}`,
                    flex_lp: flexQueue.leaguePoints,
                  };
                }
              }

              return { ...account, summoner };
            } catch (error) {
              console.error(
                `Summoner bilgisi alınamadı: ${account.nickname}`,
                error
              );
              return account;
            }
          }
          return account;
        })
      );

      setMyAccounts(accountsWithSummoners);
    } catch (error) {
      toast.error("Bir hata oluştu.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Hesap geçmişini getiren fonksiyon
  const fetchAccountHistory = async () => {
    try {
      if (!user) {
        return;
      }

      // Kullanıcının tüm kiralama geçmişini getir
      const { data, error } = await supabase
        .from("account_assignments")
        .select("*")
        .eq("user_id", user.id)
        .order("assigned_at", { ascending: false });

      if (error) {
        toast.error("Kiralama geçmişi yüklenirken bir hata oluştu.");
        console.error(error);
        return;
      }

      // Hesap bilgilerini getir
      const assignmentsWithAccounts = await Promise.all(
        (data as AccountAssignment[]).map(async (assignment) => {
          const { data: accountData, error: accountError } = await supabase
            .from("game_accounts")
            .select("*")
            .eq("id", assignment.account_id)
            .single();

          // Hesabın alındığı lig bilgisini doğrudan kullan
          // Eğer initial_league alanı doluysa, onu kullan
          // Boşsa ve hesap bilgisi varsa, hesabın mevcut ligini kullan
          const initialLeague =
            assignment.initial_league ||
            (accountData ? accountData.league : "Bilinmiyor");

          const initialFlexLeague =
            assignment.initial_flex_league ||
            (accountData ? accountData.flex_league : "Unranked");

          const initialSoloLp =
            assignment.initial_solo_lp !== undefined
              ? assignment.initial_solo_lp
              : accountData && accountData.solo_lp !== undefined
              ? accountData.solo_lp
              : 0;

          const initialFlexLp =
            assignment.initial_flex_lp !== undefined
              ? assignment.initial_flex_lp
              : accountData && accountData.flex_lp !== undefined
              ? accountData.flex_lp
              : 0;

          return {
            ...assignment,
            account: accountData as GameAccount,
            initial_league: initialLeague,
            initial_flex_league: initialFlexLeague,
            initial_solo_lp: initialSoloLp,
            initial_flex_lp: initialFlexLp,
          };
        })
      );

      setAccountHistory(assignmentsWithAccounts);
    } catch (err) {
      console.error("fetchAccountHistory hatası:", err);
      toast.error("Kiralama geçmişi yüklenirken bir hata oluştu.");
    }
  };

  // Tek bir useEffect ile tüm veri yüklemelerini yönet
  useEffect(() => {
    // Kullanıcı ve rol bilgisi hazır olduğunda verileri yükle
    if (user && userRole !== null) {
      // İstekleri tek seferde yap
      const loadData = async () => {
        await Promise.all([fetchMyAccounts(), fetchAccountHistory()]);
      };

      loadData();
    }
  }, [user, userRole]); // Sadece user veya userRole değiştiğinde çalış

  const handleReturnAccount = async (
    values: z.infer<typeof returnFormSchema>
  ) => {
    if (!user || !selectedAccount) return;

    setIsLoading(true);
    try {
      // API endpoint'i kullanarak hesabı iade et
      const requestBody = {
        accountId: selectedAccount.id,
        userId: user.id,
        returnLeague: values.league,
        returnFlexLeague: values.flex_league,
        returnSoloLp: values.solo_lp,
        returnFlexLp: values.flex_lp,
      };

      const response = await fetch("/api/accounts/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Hesap iade edilirken bir hata oluştu.");
        console.error("API yanıt hatası:", result);
        return;
      }

      toast.success("Hesap başarıyla iade edildi.");
      returnForm.reset();
      setIsReturnDialogOpen(false);
      setSelectedAccount(null);
      fetchMyAccounts();
      fetchAccountHistory();
    } catch (error) {
      toast.error("Bir hata oluştu.");
      console.error("Hesap iade işlemi genel hatası:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openReturnDialog = (account: GameAccount) => {
    setSelectedAccount(account);
    returnForm.setValue("league", account.league); // Mevcut ligi varsayılan olarak ayarla
    returnForm.setValue("flex_league", account.flex_league || "Unranked"); // Mevcut flex ligi varsayılan olarak ayarla
    returnForm.setValue("solo_lp", account.solo_lp || 0); // Mevcut Solo LP'yi varsayılan olarak ayarla
    returnForm.setValue("flex_lp", account.flex_lp || 0); // Mevcut Flex LP'yi varsayılan olarak ayarla
    setIsReturnDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block mb-2">
        Hesaplarım
      </h1>

      <Tabs defaultValue="my-accounts">
        <TabsList>
          <TabsTrigger value="my-accounts">Hesaplarım</TabsTrigger>
          <TabsTrigger value="history">Kiralama Geçmişim</TabsTrigger>
        </TabsList>

        <TabsContent value="my-accounts" className="mt-4">
          <div className="flex flex-row items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Kiraladığım Hesaplar</h2>
            <Button
              variant="default"
              size="sm"
              onClick={() => fetchMyAccounts()}
              className="h-8 px-3 text-xs bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
              </svg>
              Hesapları Yenile
            </Button>
          </div>

          {/* Kart Görünümü */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myAccounts.map((account) => (
              <div
                key={account.id}
                className="bg-card rounded-lg shadow-md overflow-hidden border border-border hover:shadow-lg transition-all flex flex-col h-[400px]"
              >
                <div className="p-5 space-y-4 flex-1 flex flex-col">
                  <div className="flex flex-col justify-center items-center text-center mb-2 relative">
                    {account.summoner ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-primary/20">
                        <Image
                          src={
                            `https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/${account.summoner.profileIconId}.png` ||
                            "https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/0.png"
                          }
                          alt="Profile Icon"
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-primary/20">
                        <Image
                          src={
                            "https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/0.png"
                          }
                          alt="Profile Icon"
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-semibold">
                      {account.nickname || account.username}
                    </h3>
                    <div className="text-xs text-muted-foreground mt-1">
                      {account.server}
                    </div>
                  </div>

                  <div className="mb-3">
                    {account.notes ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs flex items-center justify-center"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 mr-1"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            Hesap Notlarını Görüntüle
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Hesap Notu</DialogTitle>
                          </DialogHeader>
                          <div className="p-4 bg-secondary/30 rounded-md text-foreground">
                            {account.notes}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="w-full h-8"></div>
                    )}
                  </div>

                  <div
                    className={
                      "grid gap-2 flex-1" +
                      (account.flex_league === "Unranked"
                        ? " grid-cols-1"
                        : " grid-cols-2")
                    }
                  >
                    <div className="bg-secondary/50 p-2 rounded-md">
                      <div className="text-xs text-muted-foreground mb-1">
                        Tek/Çift
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <img
                            src={`/images/ranks/${getRankImage(
                              account.league
                            )}`}
                            alt={account.league}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {account.league}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {account.solo_lp} LP
                          </div>
                        </div>
                      </div>
                    </div>

                    {account.flex_league !== "Unranked" && (
                      <div className="bg-secondary/50 p-2 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">
                          Esnek
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 flex items-center justify-center">
                            <img
                              src={`/images/ranks/${getRankImage(
                                account.flex_league || "Unranked"
                              )}`}
                              alt={account.flex_league || "Unranked"}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {account.flex_league || "Unranked"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {account.flex_lp} LP
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openReturnDialog(account)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      İade Et
                    </Button>

                    <Link href={`/dashboard/accounts/${account.id}`} passHref>
                      <Button
                        variant="default"
                        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                      >
                        Detaylar
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900"></div>
              </div>
            ) : (
              myAccounts.length === 0 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 bg-secondary/20 rounded-lg border border-border">
                  <p className="text-muted-foreground">
                    Henüz kiraladığınız hesap bulunmamaktadır.
                  </p>
                </div>
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kiralama Geçmişim</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAccountHistory()}
                className="h-8 px-3 text-xs"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                </svg>
                Geçmişi Yenile
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hesap</TableHead>
                    <TableHead>Kiralama Tarihi</TableHead>
                    <TableHead>İade Tarihi</TableHead>
                    <TableHead>Alındığı Solo/Duo Lig</TableHead>
                    <TableHead>Bırakıldığı Solo/Duo Lig</TableHead>
                    <TableHead>Alındığı Flex Lig</TableHead>
                    <TableHead>Bırakıldığı Flex Lig</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountHistory.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        {assignment.account?.nickname ||
                          assignment.account?.username}
                      </TableCell>
                      <TableCell>
                        {new Date(assignment.assigned_at).toLocaleDateString(
                          "tr-TR"
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment.returned_at
                          ? new Date(assignment.returned_at).toLocaleDateString(
                              "tr-TR"
                            )
                          : "Henüz İade Edilmedi"}
                      </TableCell>
                      <TableCell>
                        {assignment.initial_league || "Bilinmiyor"}{" "}
                        {assignment.initial_solo_lp
                          ? `${assignment.initial_solo_lp} LP`
                          : ""}
                      </TableCell>
                      <TableCell>
                        {assignment.league_at_return
                          ? `${assignment.league_at_return} ${
                              assignment.solo_lp_at_return !== null
                                ? `${assignment.solo_lp_at_return} LP`
                                : ""
                            }`
                          : "Henüz İade Edilmedi"}
                      </TableCell>
                      <TableCell>
                        {assignment.initial_flex_league || "Unranked"}{" "}
                        {assignment.initial_flex_lp
                          ? `${assignment.initial_flex_lp} LP`
                          : ""}
                      </TableCell>
                      <TableCell>
                        {assignment.flex_league_at_return
                          ? `${assignment.flex_league_at_return} ${
                              assignment.flex_lp_at_return !== null
                                ? `${assignment.flex_lp_at_return} LP`
                                : ""
                            }`
                          : "Henüz İade Edilmedi"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {accountHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        Henüz kiralama geçmişiniz bulunmamaktadır.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hesabı İade Et</DialogTitle>
            <DialogDescription>
              Hesabı iade etmeden önce, hesabın şu anki lig bilgisini
              güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <Form {...returnForm}>
            <form
              onSubmit={returnForm.handleSubmit(handleReturnAccount)}
              className="space-y-4"
            >
              <FormField
                control={returnForm.control}
                name="league"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Güncel Solo/Duo Lig</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Lig seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leagues.map((league) => (
                          <SelectItem key={league} value={league}>
                            {league}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={returnForm.control}
                name="flex_league"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Güncel Flex Lig</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Flex lig seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Unranked">Unranked</SelectItem>
                        {leagues.map((league) => (
                          <SelectItem key={league} value={league}>
                            {league}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={returnForm.control}
                name="solo_lp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Güncel Solo/Duo LP</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={returnForm.control}
                name="flex_lp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Güncel Flex LP</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "İade Ediliyor..." : "İade Et"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
