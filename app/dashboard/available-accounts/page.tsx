"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import Image from "next/image";
// ⛔️ Şunları kaldırdık: getAccountByRiotID, getSummonerByPUUID, getRankedInfo
import { RegionId } from "@/lib/regions";
import { Summoner } from "@/lib/summoner";

/* ----------------------- Riot proxy yardımcıları ----------------------- */
const BASE = process.env.NEXT_PUBLIC_RIOT_API_URL ?? "/api/riot-proxy";
const fetchJson = async (u: string) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`API Error ${r.status}: ${await r.text()}`);
    return r.json();
};

/* ----------------------- Görsel helper ----------------------- */
const getRankImage = (league: string): string => {
    const lowerLeague = (league || "").toLowerCase();
    if (lowerLeague.includes("unranked")) return "unranked.png";
    if (lowerLeague.includes("demir") || lowerLeague.includes("iron")) return "demir.png";
    if (lowerLeague.includes("bronz") || lowerLeague.includes("bronze")) return "bronz.png";
    if (lowerLeague.includes("gümüş") || lowerLeague.includes("silver")) return "gümüş.png";
    if (lowerLeague.includes("altın") || lowerLeague.includes("gold")) return "altın.png";
    if (lowerLeague.includes("platin") || lowerLeague.includes("platinum")) return "platin.png";
    if (lowerLeague.includes("zümrüt") || lowerLeague.includes("emerald")) return "zümrüt.png";
    if (lowerLeague.includes("elmas") || lowerLeague.includes("diamond")) return "elmas.png";
    if (lowerLeague.includes("ustalık") || lowerLeague.includes("master")) return "ustalık.png";
    if (lowerLeague.includes("grandmaster")) return "grandmaster.png";
    if (lowerLeague.includes("challenger")) return "challenger.png";
    return "unranked.png";
};

type GameAccount = {
    id: string;
    username: string;
    password: string;
    league: string;
    flex_league?: string;
    solo_lp?: number;
    flex_lp?: number;
    is_available: boolean;
    assigned_to: string | null;
    created_at: string;
    notes?: string;
    server: string;
    nickname?: string;
    summoner?: Summoner | null;
    is_vip_only?: boolean;
};

export default function AvailableAccountsPage() {
    const { user, userRole } = useAuth();
    const [accounts, setAccounts] = useState<GameAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [rentLoading, setRentLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchAvailableAccounts();
    }, []);

    const fetchAvailableAccounts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("game_accounts")
                .select("*")
                .eq("is_available", true)
                .order("created_at", { ascending: false });

            if (error) {
                toast.error("Hesaplar yüklenirken bir hata oluştu.");
                console.error(error);
                return;
            }

            const accountsWithSummoners = await Promise.all(
                (data as GameAccount[]).map(async (account) => {
                    if (account.nickname && account.server) {
                        try {
                            // Server -> platform (Riot "platform routing": tr1, euw1, na1, ...)
                            const regionMap: Record<string, RegionId> = {
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
                            const platform = regionMap[account.server];
                            if (!platform) throw new Error(`Invalid region: ${account.server}`);

                            // nick#tag
                            const [rawName = "", rawTag = ""] = (account.nickname || "").split("#");
                            const gameName = rawName.trim();
                            const tagLine = rawTag.replace(/^#/, "").trim();
                            if (!gameName || !tagLine) throw new Error("Nick veya tag eksik");

                            // 1) Riot ID -> PUUID (server tarafı platformu kıtaya map'liyor)
                            const riotAccount: any = await fetchJson(
                                `${BASE}/account-by-riotid/${platform}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
                            );
                            const puuid = riotAccount?.puuid;
                            if (!puuid) throw new Error("PUUID alınamadı");

                            // 2) PUUID -> Summoner (id)
                            const summoner: any = await fetchJson(
                                `${BASE}/summoner/${platform}/${encodeURIComponent(puuid)}`
                            );

                            // 3) id -> ranked
                            const rankedInfo: any[] = await fetchJson(
                                `${BASE}/ranked/${platform}/${encodeURIComponent(summoner.id)}`
                            );

                            if (Array.isArray(rankedInfo) && rankedInfo.length > 0) {
                                const soloQueue = rankedInfo.find((q) => q.queueType === "RANKED_SOLO_5x5");
                                const flexQueue = rankedInfo.find((q) => q.queueType === "RANKED_FLEX_SR");

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
                        } catch (err) {
                            console.error(`Summoner bilgisi alınamadı: ${account.nickname}`, err);
                            return account;
                        }
                    }
                    return account;
                })
            );

            setAccounts(accountsWithSummoners);
        } catch (error) {
            toast.error("Bir hata oluştu.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const rentAccount = async (account: GameAccount) => {
        if (!user) {
            toast.error("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
            console.error("Kullanıcı bilgisi yok:", user);
            return;
        }

        try {
            setRentLoading(account.id);
            const response = await fetch("/api/accounts/rent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId: account.id, userId: user.id }),
            });
            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || "Hesap kiralanırken bir hata oluştu.");
                console.error("API yanıt hatası:", result);
                return;
            }

            toast.success("Hesap başarıyla kiralandı!", {
                description:
                    "Hesaplarım sayfasında yenileme düğmesine tıklayarak kiralanmış hesaplarınızı görebilirsiniz.",
                duration: 5000,
            });

            setAccounts((prev) => prev.filter((a) => a.id !== account.id));
        } catch (error) {
            toast.error("Bir hata oluştu.");
            console.error("Kiralama işlemi genel hatası:", error);
        } finally {
            setRentLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block mb-2">
                Kiralanabilir Hesaplar
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {accounts.map((account) => (
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
                                {account.is_vip_only && (
                                    <div className="absolute -right-2 text-yellow-500" title="VIP Üyelere Özel">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path
                                                fillRule="evenodd"
                                                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <div className="mb-3">
                                {account.notes ? (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full text-xs flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

                            <div className={"grid gap-2 flex-1" + (account.flex_league === "Unranked" ? " grid-cols-1" : " grid-cols-2")}>
                                <div className="bg-secondary/50 p-2 rounded-md">
                                    <div className="text-xs text-muted-foreground mb-1">Tek/Çift</div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-10 h-10 flex items-center justify-center">
                                            <img src={`/images/ranks/${getRankImage(account.league)}`} alt={account.league} className="w-full h-full object-contain" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{account.league}</div>
                                            <div className="text-xs text-muted-foreground">{account.solo_lp} LP</div>
                                        </div>
                                    </div>
                                </div>

                                {account.flex_league !== "Unranked" && (
                                    <div className="bg-secondary/50 p-2 rounded-md">
                                        <div className="text-xs text-muted-foreground mb-1">Esnek</div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-10 h-10 flex items-center justify-center">
                                                <img src={`/images/ranks/${getRankImage(account.flex_league || "Unranked")}`} alt={account.flex_league || "Unranked"} className="w-full h-full object-contain" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{account.flex_league || "Unranked"}</div>
                                                <div className="text-xs text-muted-foreground">{account.flex_lp} LP</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto pt-4">
                                {account.is_vip_only && userRole !== "VIP" ? (
                                    <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" disabled={true} title="Bu hesabı kiralamak için VIP üye olmanız gerekiyor">
                                        VIP Üyelere Özel
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                                        onClick={() => rentAccount(account)}
                                        disabled={rentLoading === account.id}
                                    >
                                        {rentLoading === account.id ? "Kiralanıyor..." : "Kirala"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {accounts.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-secondary/30 rounded-lg">
                        <h3 className="text-lg font-medium text-muted-foreground">Şu anda kiralanabilir hesap bulunmamaktadır.</h3>
                        <p className="text-muted-foreground mt-2">Lütfen daha sonra tekrar kontrol edin.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
