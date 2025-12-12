"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type GameAccount = {
  id: string;
  nickname: string;
  server: string; // DB'de EUW/TR vs olabilir
};

type RiotMini = {
  solo?: string;
  flex?: string;
  icon?: number;
  error?: string;
};

const SERVER_TO_PLATFORM: Record<string, string> = {
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

function toPlatform(server: string) {
  const s = (server || "").trim();
  const up = s.toUpperCase();
  return SERVER_TO_PLATFORM[up] ?? s.toLowerCase(); // zaten euw1 gibi gelirse dokunmaz
}

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
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Add modal state
  const [open, setOpen] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newServer, setNewServer] = useState("EUW");
  const [saving, setSaving] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => a.nickname.localeCompare(b.nickname));
  }, [accounts]);

  async function loadAccounts() {
    setLoadingAccounts(true);
    setUiError(null);

    const { data, error } = await supabase
      .from("game_accounts")
      .select("id,nickname,server")
      .order("created_at", { ascending: false });

    if (error) {
      setUiError(error.message);
      setAccounts([]);
    } else {
      setAccounts((data as GameAccount[]) || []);
    }

    setLoadingAccounts(false);
  }

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Riot fetch
  useEffect(() => {
    if (!accounts.length) return;

    // reset riot map for new list
    setRiot({});

    runPool(accounts, 4, async (acc) => {
      const riotId = splitRiotId(acc.nickname);
      if (!riotId) {
        setRiot((p) => ({ ...p, [acc.id]: { error: "Riot ID hatalı (Name#TAG)" } }));
        return;
      }

      const plat = toPlatform(acc.server);

      try {
        const accRes = await fetch(
          `/api/riot-proxy/account-by-riotid/${plat}/${encodeURIComponent(
            riotId.gameName
          )}/${encodeURIComponent(riotId.tag)}`
        );
        if (!accRes.ok) {
          const t = await accRes.text().catch(() => "");
          throw new Error(`account ${accRes.status} ${t}`);
        }
        const accJson = await accRes.json();

        const sumRes = await fetch(`/api/riot-proxy/summoner/${plat}/${accJson.puuid}`);
        if (!sumRes.ok) {
          const t = await sumRes.text().catch(() => "");
          throw new Error(`summoner ${sumRes.status} ${t}`);
        }
        const sumJson = await sumRes.json();

        const rankRes = await fetch(`/api/riot-proxy/ranked/${plat}/${sumJson.id}`);
        if (!rankRes.ok) {
          const t = await rankRes.text().catch(() => "");
          throw new Error(`ranked ${rankRes.status} ${t}`);
        }
        const rank = await rankRes.json();

        const solo = Array.isArray(rank)
          ? rank.find((r: any) => r.queueType === "RANKED_SOLO_5x5")
          : null;
        const flex = Array.isArray(rank)
          ? rank.find((r: any) => r.queueType === "RANKED_FLEX_SR")
          : null;

        setRiot((p) => ({
          ...p,
          [acc.id]: {
            icon: sumJson.profileIconId,
            solo: solo ? `${solo.tier} ${solo.rank}` : "Unranked",
            flex: flex ? `${flex.tier} ${flex.rank}` : "Unranked",
          },
        }));
      } catch (e: any) {
        setRiot((p) => ({
          ...p,
          [acc.id]: { error: e?.message ? String(e.message).slice(0, 200) : "Riot yok" },
        }));
      }
    });
  }, [accounts]);

  async function addAccount() {
    setUiError(null);

    const nick = newNickname.trim();
    const srv = newServer.trim();

    if (!nick) {
      setUiError("Nickname boş olamaz.");
      return;
    }
    if (!srv) {
      setUiError("Server boş olamaz.");
      return;
    }

    setSaving(true);

    // En güvenlisi: sadece kesin bildiğimiz kolonları insert et.
    // (DB’de ekstra kolon zorunluysa error döner, onu ekranda göstereceğiz.)
    const { error } = await supabase.from("game_accounts").insert({
      nickname: nick,
      server: srv,
    });

    if (error) {
      setUiError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    setNewNickname("");
    setNewServer("EUW");
    await loadAccounts();
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Hesap Yönetimi</h1>
          <div className="text-sm opacity-70">
            Riot verileri hesapların yanına otomatik çekilir.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded border"
            onClick={() => loadAccounts()}
            disabled={loadingAccounts}
            type="button"
            title="Listeyi yenile"
          >
            {loadingAccounts ? "Yenileniyor..." : "Yenile"}
          </button>

          <button
            className="px-3 py-2 rounded border"
            onClick={() => {
              setUiError(null);
              setOpen(true);
            }}
            type="button"
          >
            + Hesap Ekle
          </button>
        </div>
      </div>

      {uiError && (
        <div className="border rounded p-3" style={{ color: "salmon" }}>
          {uiError}
        </div>
      )}

      {/* Add modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded border p-4 bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Yeni Hesap Ekle</h2>
              <button
                className="px-2 py-1 rounded border"
                onClick={() => !saving && setOpen(false)}
                type="button"
              >
                X
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm opacity-80">Riot ID (Name#TAG)</div>
                <input
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="need u 2 stay#OwO"
                  className="w-full px-3 py-2 rounded border bg-transparent"
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm opacity-80">Server</div>
                <select
                  value={newServer}
                  onChange={(e) => setNewServer(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-transparent"
                >
                  <option value="TR">TR</option>
                  <option value="EUW">EUW</option>
                  <option value="EUNE">EUNE</option>
                  <option value="NA">NA</option>
                  <option value="KR">KR</option>
                  <option value="JP">JP</option>
                  <option value="BR">BR</option>
                  <option value="LAN">LAN</option>
                  <option value="LAS">LAS</option>
                  <option value="OCE">OCE</option>
                  <option value="RU">RU</option>
                </select>
                <div className="text-xs opacity-60">
                  Not: DB’de EUW/TR gibi durabilir, biz proxy’de otomatik euw1/tr1’e çeviriyoruz.
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  className="px-3 py-2 rounded border"
                  onClick={() => !saving && setOpen(false)}
                  disabled={saving}
                  type="button"
                >
                  İptal
                </button>
                <button
                  className="px-3 py-2 rounded border"
                  onClick={addAccount}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loadingAccounts ? (
        <div className="opacity-70">Yükleniyor...</div>
      ) : sortedAccounts.length === 0 ? (
        <div className="opacity-70">Hiç hesap yok.</div>
      ) : (
        <div className="space-y-3">
          {sortedAccounts.map((a) => (
            <div key={a.id} className="border p-4 rounded">
              <div className="font-semibold">
                {a.nickname} <span className="opacity-60">({a.server})</span>
              </div>

              {riot[a.id]?.error ? (
                <div className="text-sm" style={{ color: "salmon" }}>
                  Riot Hata: {riot[a.id].error}
                </div>
              ) : (
                <>
                  <div className="text-sm">
                    Solo: {riot[a.id]?.solo ?? "Yükleniyor..."}
                  </div>
                  <div className="text-sm">
                    Flex: {riot[a.id]?.flex ?? "Yükleniyor..."}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
