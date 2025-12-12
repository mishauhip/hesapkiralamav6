import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORM_TO_REGION: Record<string, string> = {
  tr1: "europe",
  euw1: "europe",
  eun1: "europe",
  ru: "europe",

  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",

  kr: "asia",
  jp1: "asia",

  oc1: "sea",
  ph2: "sea",
  sg2: "sea",
  th2: "sea",
  tw2: "sea",
  vn2: "sea",
};

const ALLOWED = new Set([
  "account-by-riotid",
  "summoner",
  "ranked",
  "matches",
  "match",
]);

export async function GET(req: NextRequest, ctx: any) {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RIOT_API_KEY missing" }, { status: 500 });
  }

  const seg: string[] = Array.isArray(ctx?.params?.path)
    ? ctx.params.path.map(String)
    : [];

  if (seg.length === 0 || !ALLOWED.has(seg[0])) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const type = seg[0];
  const platform = (seg[1] || "").toLowerCase();
  const region = PLATFORM_TO_REGION[platform] ?? platform;
  const qs = req.nextUrl.search ?? "";

  let target = "";

  if (type === "account-by-riotid") {
    const gameName = seg[2] ? decodeURIComponent(seg[2]) : "";
    const tagLine = seg[3] ? decodeURIComponent(seg[3]) : "";
    if (!gameName || !tagLine) {
      return NextResponse.json({ error: "missing riot id" }, { status: 400 });
    }
    target = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`;
  } else if (type === "summoner") {
    const puuid = seg[2];
    if (!puuid) return NextResponse.json({ error: "missing puuid" }, { status: 400 });
    target = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(
      puuid
    )}`;
  } else if (type === "ranked") {
    const summonerId = seg[2];
    if (!summonerId) return NextResponse.json({ error: "missing summonerId" }, { status: 400 });
    target = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(
      summonerId
    )}`;
  } else if (type === "matches") {
    const puuid = seg[2];
    if (!puuid) return NextResponse.json({ error: "missing puuid" }, { status: 400 });
    target = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(
      puuid
    )}${qs}`;
  } else if (type === "match") {
    const matchId = seg[2];
    if (!matchId) return NextResponse.json({ error: "missing matchId" }, { status: 400 });
    target = `https://${region}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(
      matchId
    )}`;
  }

  const res = await fetch(target, {
    headers: { "X-Riot-Token": apiKey },
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
