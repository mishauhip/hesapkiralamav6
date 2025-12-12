"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

import { Input } from "@/components/ui/input";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { toast } from "sonner";

import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

/** ----------------------------------------------------------------
 *  Riot proxy helpers — /api/riot-proxy üzerinden istek atar
 *  IMPORTANT: Next.js 15'te page.tsx içinde default export dışında
 *  kendi fonksiyonlarını "export" edemezsin. O yüzden bunlar EXPORTSÜZ.
 *  ---------------------------------------------------------------- */
const BASE = process.env.NEXT_PUBLIC_RIOT_API_URL ?? "/api/riot-proxy";

const fetchJson = async (u: string) => {
  const r = await fetch(u, { cache: "no-store" });
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`);
  return r.json();
};

const enc = (s: string) => encodeURIComponent(s);

type PlatformRoute =
  | "tr1"
  | "euw1"
  | "eun1"
  | "na1"
  | "br1"
  | "la1"
  | "la2"
  | "oc1"
  | "jp1"
  | "kr"
  | "ru";

type RegionalRoute = "americas" | "europe" | "asia" | "sea";

const SERVER_TO_PLATFORM: Record<string, PlatformRoute> = {
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

const PLATFORM_TO_REGIONAL: Record<PlatformRoute, RegionalRoute> = {
  tr1: "europe",
  euw1: "europe",
  eun1: "europe",
  ru: "europe",
  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",
  oc1: "sea",
  jp1: "asia",
  kr: "asia",
};

async function getAccountByRiotID(
  regional: RegionalRoute,
  gameName: string,
  tagLine: string
) {
  return fetchJson(
    `${BASE}/account-by-riotid/${regional}/${enc(gameName)}/${enc(tagLine)}`
  );
}

async function getSummonerByPUUID(platform: PlatformRoute, puuid: string) {
  return fetchJson(`${BASE}/summoner/${platform}/${enc(puuid)}`);
}

async function getRankedInfo(platform: PlatformRoute, summonerId: string) {
  return fetchJson(`${BASE}/ranked/${platform}/${enc(summonerId)}`);
}

async function getMatchList(
  regional: RegionalRoute,
  puuid: string,
  start = 0,
  count = 10
) {
  return fetchJson(
    `${BASE}/matches/${regional}/${enc(puuid)}?start=${start}&count=${count}`
  );
}

async function getMatchDetails(regional: RegionalRoute, matchId: string) {
  return fetchJson(`${BASE}/match/${regional}/${enc(matchId)}`);
}

/** ----------------------------------------------------------------
 *  Minimal tipler (tek dosya olsun diye burada)
 *  ---------------------------------------------------------------- */
type Summoner = {
  id: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
};

type MatchParticipant = {
  puuid: string;
  win: boolean;
  championName: string;

  riotIdGameName?: string | null;
  summonerName?: string | null;

  kills: number;
  deaths: number;
  assists: number;

  totalMinionsKilled: number;

  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
};

type Match = {
  metadata: { matchId: string };
  info: {
    participants: MatchParticipant[];
    gameCreation: number;
    gameDuration: number;
    queueId: number;
  };
};

/** ----------------------------------------------------------------
 *  İade formu schema
 *  ---------------------------------------------------------------- */
const returnFormSchema = z.object({
  league: z.string({ required_error: "Lütfen bir lig seçiniz." }),
  flex_league: z.string({ required_error: "Lütfen bir flex ligi seçiniz." }),
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

type ReturnInputs = z.input<typeof returnFormSchema>;
type ReturnValues = z.infer<typeof returnFormSchema>;

/** ----------------------------------------------------------------
 *  Ligler + rank image helper
 *  ---------------------------------------------------------------- */
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

const getRankImage = (league: string): string => {
  const lowerLeague = (league ?? "").toLowerCase();

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

  return "unranked.png";
};

/** ----------------------------------------------------------------
 *  DB tipleri
 *  ---------------------------------------------------------------- */
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

  // runtime enrichment:
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

  // enriched
  user_email?: string;
  initial_league?: string;
  initial_flex_league?: string;
  initial_solo_lp?: number;
  initial_flex_lp?: number;
};

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userRole } = useAuth();

  const accountId = useMemo(() => {
    const raw = (params as any)?.id as string | string[] | undefined;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const isAdmin = userRole === "ADMIN";
  const isUserAccount = (acc: GameAccount | null) =>
    !!acc && acc.assigned_to === user?.id;

  const [account, setAccount] = useState<GameAccount | null>(null);
  const [assignments, setAssignments] = useState<AccountAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [returnLoading, setReturnLoading] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const returnForm = useForm<ReturnInputs, any, ReturnValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      league: "",
      flex_league: "Unranked",
      solo_lp: 0,
      flex_lp: 0,
    },
  });

  // auth guard (client-side)
  useEffect(() => {
    if (user === null) return; // auth henüz yükleniyor olabilir
    if (!user) router.replace("/dashboard");
  }, [user, router]);

  const openReturnDialog = () => {
    if (!account) return;
    returnForm.setValue("league", account.league);
    returnForm.setValue("flex_league", account.flex_league || "Unranked");
    returnForm.setValue("solo_lp", account.solo_lp || 0);
    returnForm.setValue("flex_lp", account.flex_lp || 0);
    setShowReturnDialog(true);
  };

  const handleReturnAccount = async (values: ReturnValues) => {
    try {
      if (!account || !user) return;

      setReturnLoading(true);

      const response = await fetch("/api/accounts/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          userId: user.id,
          returnLeague: values.league,
          returnFlexLeague: values.flex_league,
          returnSoloLp: values.solo_lp,
          returnFlexLp: values.flex_lp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Hesap iade edilirken bir hata oluştu.");
        return;
      }

      toast.success("Hesap başarıyla iade edildi.");
      setShowReturnDialog(false);
      returnForm.reset();

      router.push("/dashboard/my-accounts");
    } catch (error) {
      console.error("Hesap iade hatası:", error);
      toast.error("Hesap iade edilirken bir hata oluştu.");
    } finally {
      setReturnLoading(false);
    }
  };

  const handleReleaseAccount = async () => {
    try {
      if (!account) return;

      setReleaseLoading(true);

      const response = await fetch("/api/admin/accounts/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Hesap serbest bırakılırken bir hata oluştu.");
        return;
      }

      toast.success("Hesap başarıyla serbest bırakıldı.");
      setShowReleaseDialog(false);

      window.location.reload();
    } catch (error) {
      console.error("Hesap serbest bırakma hatası:", error);
      toast.error("Hesap serbest bırakılırken bir hata oluştu.");
    } finally {
      setReleaseLoading(false);
    }
  };

  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (!accountId) return;

      setLoading(true);
      try {
        const { data: accountData, error: accountError } = await supabase
          .from("game_accounts")
          .select("*")
          .eq("id", accountId)
          .single();

        if (accountError) {
          toast.error("Hesap bilgileri yüklenirken bir hata oluştu.");
          console.error(accountError);
          return;
        }

        let acc = accountData as GameAccount;

        // Riot API bilgileri (nickname + server varsa)
        if (acc.nickname && acc.server) {
          try {
            const platform = SERVER_TO_PLATFORM[acc.server];
            if (!platform) throw new Error(`Invalid server: ${acc.server}`);

            const regional = PLATFORM_TO_REGIONAL[platform];
            if (!regional) throw new Error(`No regional route for: ${platform}`);

            const [gameName, tagLine] = acc.nickname.split("#");
            if (!gameName || !tagLine)
              throw new Error(`Invalid nickname (RiotID): ${acc.nickname}`);

            const riotAccount = await getAccountByRiotID(regional, gameName, tagLine);

            const summoner = await getSummonerByPUUID(platform, riotAccount.puuid);
            acc = { ...acc, summoner };

            const rankedInfo = await getRankedInfo(platform, summoner.id);
            if (Array.isArray(rankedInfo) && rankedInfo.length > 0) {
              const soloQueue = rankedInfo.find(
                (q: any) => q.queueType === "RANKED_SOLO_5x5"
              );
              const flexQueue = rankedInfo.find(
                (q: any) => q.queueType === "RANKED_FLEX_SR"
              );

              if (soloQueue) {
                acc = {
                  ...acc,
                  league: `${soloQueue.tier} ${soloQueue.rank}`,
                  solo_lp: soloQueue.leaguePoints,
                };
              }
              if (flexQueue) {
                acc = {
                  ...acc,
                  flex_league: `${flexQueue.tier} ${flexQueue.rank}`,
                  flex_lp: flexQueue.leaguePoints,
                };
              }
            }

            // Son 5 maç
            if (riotAccount?.puuid) {
              const matchIds = await getMatchList(regional, riotAccount.puuid, 0, 5);

              if (Array.isArray(matchIds) && matchIds.length > 0) {
                const matchDetails = await Promise.all(
                  matchIds.map(async (matchId: string) => {
                    return await getMatchDetails(regional, matchId);
                  })
                );
                acc = { ...acc, matches: matchDetails as Match[] };
              }
            }
          } catch (error) {
            console.error(`Riot API bilgileri alınamadı: ${acc.nickname}`, error);
          }
        }

        setAccount(acc);

        // Admin için kiralama geçmişi
        if (isAdmin) {
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from("account_assignments")
            .select("*")
            .eq("account_id", accountId)
            .order("assigned_at", { ascending: false });

          if (assignmentsError) {
            toast.error("Kiralama geçmişi yüklenirken bir hata oluştu.");
            console.error(assignmentsError);
            return;
          }

          const enriched = await Promise.all(
            (assignmentsData as AccountAssignment[]).map(async (assignment) => {
              const { data: userData } = await supabase
                .from("users")
                .select("email")
                .eq("id", assignment.user_id)
                .single();

              return {
                ...assignment,
                user_email: userData?.email ?? "Bilinmeyen Kullanıcı",
                initial_league: (assignment as any).initial_league || "Bilinmiyor",
                initial_flex_league: (assignment as any).initial_flex_league || "Unranked",
                initial_solo_lp: (assignment as any).initial_solo_lp ?? 0,
                initial_flex_lp: (assignment as any).initial_flex_lp ?? 0,
              };
            })
          );

          setAssignments(enriched);
        } else {
          setAssignments([]);
        }
      } catch (error) {
        toast.error("Bir hata oluştu.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountDetails();
  }, [accountId, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Hesap Bulunamadı</h1>
        <p>İstediğiniz hesap bulunamadı veya erişim izniniz yok.</p>
      </div>
    );
  }

  const queueMap: Record<number, string> = {
    400: "Draft Pick",
    420: "Ranked Solo/Duo",
    430: "Blind Pick",
    440: "Ranked Flex",
    450: "ARAM",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block mb-2">
        Hesap Detayları
      </h1>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-accent w-full" />
        <CardHeader>
          <CardTitle className="text-xl font-medium">Hesap Bilgileri</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {account.summoner ? (
              <div className="col-span-1 md:col-span-3 flex justify-center mb-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20">
                    <Image
                      src={`https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/${account.summoner.profileIconId}.png`}
                      alt="Profile Icon"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-secondary rounded-full px-2 py-1 text-xs font-semibold border border-border">
                    Level {account.summoner.summonerLevel}
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-span-1 md:col-span-3 flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20">
                  <Image
                    src="https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/0.png"
                    alt="Profile Icon"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Kullanıcı Adı</p>
              <p className="text-lg font-medium">{account.username}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Şifre</p>
              <p className="text-lg font-medium">{account.password}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Sunucu</p>
              <p className="text-lg font-medium">{account.server}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Oyun İçi İsim</p>
              <p className="text-lg font-medium">{account.nickname || "-"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Solo/Duo Lig</p>
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img
                    src={`/images/ranks/${getRankImage(account.league)}`}
                    alt={account.league}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-lg font-medium">
                  {account.league} {account.solo_lp ? `${account.solo_lp} LP` : ""}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Flex Lig</p>
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img
                    src={`/images/ranks/${getRankImage(account.flex_league || "Unranked")}`}
                    alt={account.flex_league || "Unranked"}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-lg font-medium">
                  {account.flex_league || "Unranked"}{" "}
                  {account.flex_lp ? `${account.flex_lp} LP` : ""}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Durum</p>
              <p className="text-lg">
                {account.is_available ? (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Müsait
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Kiralandı
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Oluşturulma Tarihi</p>
              <p className="text-lg font-medium">
                {new Date(account.created_at).toLocaleDateString("tr-TR")}
              </p>
            </div>

            {account.notes && (
              <div className="col-span-1 md:col-span-3 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Notlar</p>
                <div className="p-3 bg-secondary/30 rounded-md text-foreground">
                  {account.notes}
                </div>
              </div>
            )}

            {/* Admin için Hesabı Serbest Bırak butonu (hesap kiralanmışsa) */}
            {isAdmin && !account.is_available && (
              <div className="col-span-1 md:col-span-3 mt-4">
                <AlertDialog
                  open={showReleaseDialog}
                  onOpenChange={setShowReleaseDialog}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Hesabı Serbest Bırak
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hesabı Serbest Bırak</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bu hesabı serbest bırakmak istediğinizden emin misiniz?
                        Bu işlem, hesabı mevcut kullanıcıdan alacak ve tekrar
                        kiralanabilir hale getirecektir.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReleaseAccount}
                        disabled={releaseLoading}
                      >
                        {releaseLoading ? "İşleniyor..." : "Serbest Bırak"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* Hesabı kiralayan kişi için İade Et butonu */}
            {isUserAccount(account) && (
              <div className="col-span-1 md:col-span-3 mt-4">
                <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="default"
                      className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                      onClick={openReturnDialog}
                    >
                      Hesabı İade Et
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Hesap İade</DialogTitle>
                      <DialogDescription>
                        Lütfen hesabın mevcut lig bilgilerini giriniz.
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
                              <FormLabel>Solo/Duo Lig</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Lig seçiniz" />
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
                          name="solo_lp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Solo/Duo LP</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={returnForm.control}
                          name="flex_league"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Flex Lig</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Lig seçiniz" />
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
                          name="flex_lp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Flex LP</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <DialogFooter className="mt-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowReturnDialog(false)}
                          >
                            İptal
                          </Button>
                          <Button
                            type="submit"
                            disabled={returnLoading}
                            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                          >
                            {returnLoading ? "Hesap İade Ediliyor..." : "Hesabı İade Et"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Maç Geçmişi */}
      {account.matches && account.matches.length > 0 && (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-accent w-full" />
          <CardHeader>
            <CardTitle className="text-xl font-medium">Maç Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {account.matches.map((match) => {
                const participant =
                  match.info.participants.find(
                    (p) => p.puuid === account.summoner?.puuid
                  ) ??
                  (() => {
                    if (!account.nickname) return undefined;
                    const gameName = account.nickname.split("#")[0];
                    return match.info.participants.find((p) => {
                      return (
                        (p.riotIdGameName &&
                          p.riotIdGameName.toLowerCase() === gameName.toLowerCase()) ||
                        (p.summonerName &&
                          p.summonerName.toLowerCase().includes(gameName.toLowerCase()))
                      );
                    });
                  })();

                if (!participant) return null;

                const gameDate = new Date(match.info.gameCreation);
                const gameDurationMin = Math.max(
                  1,
                  Math.floor(match.info.gameDuration / 60)
                );
                const isWin = participant.win;

                return (
                  <div
                    key={match.metadata.matchId}
                    className={`p-4 rounded-lg border ${
                      isWin
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden">
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/15.8.1/img/champion/${participant.championName}.png`}
                            alt={participant.championName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium">{participant.championName}</div>
                          <div className="text-xs text-muted-foreground">
                            {queueMap[match.info.queueId] || "Bilinmeyen Oyun Modu"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <div className="font-semibold">
                            {participant.kills} / {participant.deaths} / {participant.assists}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(
                              (participant.kills + participant.assists) /
                              Math.max(1, participant.deaths)
                            ).toFixed(2)}{" "}
                            KDA
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <div className="font-semibold">{participant.totalMinionsKilled} CS</div>
                          <div className="text-xs text-muted-foreground">
                            {(participant.totalMinionsKilled / gameDurationMin).toFixed(1)} CS/min
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {[
                          participant.item0,
                          participant.item1,
                          participant.item2,
                          participant.item3,
                          participant.item4,
                          participant.item5,
                          participant.item6,
                        ]
                          .filter((item) => item > 0)
                          .map((item, i) => (
                            <div key={i} className="w-8 h-8 rounded overflow-hidden">
                              <img
                                src={`https://ddragon.leagueoflegends.com/cdn/15.8.1/img/item/${item}.png`}
                                alt={`Item ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-semibold ${
                            isWin
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isWin ? "Galibiyet" : "Mağlubiyet"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(gameDate, { addSuffix: true, locale: tr })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kiralama geçmişi (admin) */}
      {isAdmin && (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-accent w-full" />
          <CardHeader>
            <CardTitle className="text-xl font-medium">Kiralama Geçmişi</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="rounded-lg overflow-hidden border">
              <Table>
                <TableHeader className="bg-secondary">
                  <TableRow>
                    <TableHead className="font-medium">Kullanıcı</TableHead>
                    <TableHead className="font-medium">Kiralama Tarihi</TableHead>
                    <TableHead className="font-medium">İade Tarihi</TableHead>
                    <TableHead className="font-medium">Alındığı Solo/Duo Lig</TableHead>
                    <TableHead className="font-medium">Bırakıldığı Solo/Duo Lig</TableHead>
                    <TableHead className="font-medium">Alındığı Flex Lig</TableHead>
                    <TableHead className="font-medium">Bırakıldığı Flex Lig</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id} className="hover:bg-secondary/50">
                      <TableCell className="font-medium">{assignment.user_email}</TableCell>

                      <TableCell>
                        {new Date(assignment.assigned_at).toLocaleDateString("tr-TR")}
                      </TableCell>

                      <TableCell>
                        {assignment.returned_at
                          ? new Date(assignment.returned_at).toLocaleDateString("tr-TR")
                          : "Henüz İade Edilmedi"}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 flex items-center justify-center">
                            <img
                              src={`/images/ranks/${getRankImage(assignment.initial_league || "Bilinmiyor")}`}
                              alt={assignment.initial_league || "Bilinmiyor"}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span>
                            {assignment.initial_league || "Bilinmiyor"}{" "}
                            {assignment.initial_solo_lp ? `${assignment.initial_solo_lp} LP` : ""}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {assignment.league_at_return ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 flex items-center justify-center">
                              <img
                                src={`/images/ranks/${getRankImage(assignment.league_at_return)}`}
                                alt={assignment.league_at_return}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span>
                              {assignment.league_at_return}{" "}
                              {assignment.solo_lp_at_return !== null
                                ? `${assignment.solo_lp_at_return} LP`
                                : ""}
                            </span>
                          </div>
                        ) : (
                          "Henüz İade Edilmedi"
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 flex items-center justify-center">
                            <img
                              src={`/images/ranks/${getRankImage(
                                assignment.initial_flex_league || "Unranked"
                              )}`}
                              alt={assignment.initial_flex_league || "Unranked"}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span>
                            {assignment.initial_flex_league || "Unranked"}{" "}
                            {assignment.initial_flex_lp ? `${assignment.initial_flex_lp} LP` : ""}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {assignment.flex_league_at_return ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 flex items-center justify-center">
                              <img
                                src={`/images/ranks/${getRankImage(
                                  assignment.flex_league_at_return
                                )}`}
                                alt={assignment.flex_league_at_return}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span>
                              {assignment.flex_league_at_return}{" "}
                              {assignment.flex_lp_at_return !== null
                                ? `${assignment.flex_lp_at_return} LP`
                                : ""}
                            </span>
                          </div>
                        ) : (
                          "Henüz İade Edilmedi"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {assignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Bu hesap henüz kiralanmamış.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
