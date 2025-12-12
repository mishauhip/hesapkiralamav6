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

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RIOT_API_KEY missing" },
      { status: 500 }
    );
  }

  const seg = params.path;
  if (!seg || seg.length === 0 || !ALLOWED.has(seg[0])) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const type = seg[0];
  const platform = (seg[1] || "").toLowerCase();
  const region = PLATFORM_TO_REGION[platform] ?? platform;
  const qs = req.nextUrl.search ?? "";

  let target = "";

  if (type === "account-by-riotid") {
    const gameName = decodeURIComponent(seg[2] || "");
    const tagLine = decodeURIComponent(seg[3] || "");
    if (!gameName || !tagLine) {
      return NextResponse.json({ error: "missing riot id" }, { status: 400 });
    }
    target = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`;
  }

  if (type === "summoner") {
    target = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(
      seg[2]
    )}`;
  }

  if (type === "ranked") {
    target = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(
      seg[2]
    )}`;
  }

  if (type === "matches") {
    target = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(
      seg[2]
    )}${qs}`;
  }

  if (type === "match") {
    target = `https://${region}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(
      seg[2]
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
