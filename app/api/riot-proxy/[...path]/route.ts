import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// platform -> continent
const PLAT_TO_CONT: Record<string, "americas" | "europe" | "asia" | "sea"> = {
  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",

  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",

  kr: "asia",
  jp1: "asia",

  oc1: "sea",
  ph2: "sea",
  sg2: "sea",
  th2: "sea",
  tw2: "sea",
  vn2: "sea",
};

const ALLOWED = new Set(["account-by-riotid", "summoner", "ranked", "matches", "match"]);

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const apiKey = process.env.RIOT_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json({ error: "RIOT_API_KEY missing" }, { status: 500 });
  }

  const { path } = await ctx.params; // ✅ Next 15 uyumlu
  const seg = (path ?? []).map(String);

  if (seg.length === 0 || !ALLOWED.has(seg[0])) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const kind = seg[0].toLowerCase();
  const platform = (seg[1] || "euw1").toLowerCase();
  const continent = PLAT_TO_CONT[platform] ?? (platform as any);
  const qs = req.nextUrl.search ?? "";

  let target = "";

  if (kind === "account-by-riotid") {
    const gameName = seg[2] ? decodeURIComponent(seg[2]) : "";
    const tagLine = seg[3] ? decodeURIComponent(seg[3]) : "";
    if (!gameName || !tagLine) {
      return NextResponse.json({ error: "missing riot id" }, { status: 400 });
    }
    target = `https://${continent}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`;
  } else if (kind === "summoner") {
    const puuid = seg[2];
    if (!puuid) return NextResponse.json({ error: "missing puuid" }, { status: 400 });
    target = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  } else if (kind === "ranked") {
    const summonerId = seg[2];
    if (!summonerId) return NextResponse.json({ error: "missing summonerId" }, { status: 400 });
    target = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`;
  } else if (kind === "matches") {
    const puuid = seg[2];
    if (!puuid) return NextResponse.json({ error: "missing puuid" }, { status: 400 });
    target = `https://${continent}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}${qs}`;
  } else if (kind === "match") {
    const matchId = seg[2];
    if (!matchId) return NextResponse.json({ error: "missing matchId" }, { status: 400 });
    target = `https://${continent}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  }

  const upstream = await fetch(target, {
    headers: { "X-Riot-Token": apiKey },
    cache: "no-store",
  });

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
