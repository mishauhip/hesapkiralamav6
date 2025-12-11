// Lig sıralaması (en düşükten en yükseğe)
export const LEAGUE_RANKS = [
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
  "Diamond 4",
  "Diamond 3",
  "Diamond 2",
  "Diamond 1",
  "Master",
  "Grandmaster",
  "Challenger",
];

// Normal üyelerin alabileceği maksimum lig (bu ligin altındaki ve bu lig dahil hesapları alabilirler)
export const NORMAL_USER_MAX_LEAGUE = "Diamond 3";

// Lig sıralamasında bir ligin indeksini döndürür
export function getLeagueRank(league: string): number {
  return LEAGUE_RANKS.indexOf(league);
}

// Bir ligin diğer ligden daha yüksek olup olmadığını kontrol eder
export function isHigherLeague(league1: string, league2: string): boolean {
  return getLeagueRank(league1) > getLeagueRank(league2);
}

// Bir hesabın VIP üye gerektirip gerektirmediğini kontrol eder
export function requiresVIP(league: string): boolean {
  return isHigherLeague(league, NORMAL_USER_MAX_LEAGUE);
}
