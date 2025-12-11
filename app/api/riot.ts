import { Platform, RegionId } from "@/lib/regions";

const BASE = process.env.NEXT_PUBLIC_RIOT_API_URL ?? "/api/riot-proxy";

async function fetchJson(u: string) {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`API Error: ${r.status}`);
    return r.json();
}

// ✅ Doğru: platform (euw1, tr1, na1...) kullan
export function getAccountByRiotID(platform: string, gameName: string, tagLine: string) {
    const name = encodeURIComponent(gameName.trim());
    const tag = encodeURIComponent(tagLine.replace(/^#/, "").trim());
    return fetchJson(`${BASE}/account-by-riotid/${platform}/${name}/${tag}`);
}

export function getSummonerByPUUID(platform: string, puuid: string) {
    return fetchJson(`${BASE}/summoner/${platform}/${encodeURIComponent(puuid)}`);
}

export function getRankedInfo(platform: string, summonerId: string) {
    return fetchJson(`${BASE}/ranked/${platform}/${encodeURIComponent(summonerId)}`);
}

