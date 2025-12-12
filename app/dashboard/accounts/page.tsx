"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GameAccount = {
  id: string;
  nickname: string;
  server: string;
};

type RiotMini = {
  solo?: string;
  flex?: string;
  icon?: number;
  error?: string;
};

function splitRiotId(nick: string) {
  const i = nick.lastIndexOf("#");
  if (i === -1) return null;
  return {
    gameName: nick.slice(0, i).trim(),
    tag: nick.slice(i + 1).trim(),
  };
}

async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  let i = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      await worker(items[i++]);
    }
  });
  await Promise.all(runners);
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<GameAccount[]>([]);
  const [riot, setRiot] = useState<Record<string, RiotMini>>({});

  useEffect(() => {
    supabase
      .from("game_accounts")
      .select("id,nickname,server")
      .then(({ data }) => setAccounts(data || []));
  }, []);

  useEffect(() => {
    if (!accounts.length) return;

    runPool(accounts, 4, async (acc) => {
      const riotId = splitRiotId(acc.nickname);
      if (!riotId) {
        setRiot((p) => ({ ...p, [acc.id]: { error: "Riot ID hatalı" } }));
        return;
      }

      try {
        const accRes = await fetch(
          `/api/riot-proxy/account-by-riotid/${acc.server}/${encodeURIComponent(
            riotId.gameName
          )}/${encodeURIComponent(riotId.tag)}`
        );
        if (!accRes.ok) throw new Error("account");

        const accJson = await accRes.json();

        const sumRes = await fetch(
          `/api/riot-proxy/summoner/${acc.server}/${accJson.puuid}`
        );
        const sumJson = await sumRes.json();

        const rankRes = await fetch(
          `/api/riot-proxy/ranked/${acc.server}/${sumJson.id}`
        );
        const rank = await rankRes.json();

        const solo = rank.find(
          (r: any) => r.queueType === "RANKED_SOLO_5x5"
        );
        const flex = rank.find(
          (r: any) => r.queueType === "RANKED_FLEX_SR"
        );

        setRiot((p) => ({
          ...p,
          [acc.id]: {
            icon: sumJson.profileIconId,
            solo: solo ? `${solo.tier} ${solo.rank}` : "Unranked",
            flex: flex ? `${flex.tier} ${flex.rank}` : "Unranked",
          },
        }));
      } catch {
        setRiot((p) => ({ ...p, [acc.id]: { error: "Riot yok" } }));
      }
    });
  }, [accounts]);

  return (
    <div className="space-y-4">
      {accounts.map((a) => (
        <div key={a.id} className="border p-4 rounded">
          <b>{a.nickname}</b> ({a.server})
          <div>
            Solo: {riot[a.id]?.solo ?? "Yükleniyor..."}
          </div>
          <div>
            Flex: {riot[a.id]?.flex ?? "Yükleniyor..."}
          </div>
        </div>
      ))}
    </div>
  );
}
