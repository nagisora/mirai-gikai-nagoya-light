import { getActiveCouncilSession } from "@/features/council-sessions/server/loaders/get-active-council-session";
import { getFeaturedBills } from "./get-featured-bills";
import { getPreviousSessionBills } from "./get-previous-session-bills";

/**
 * トップページ用のデータを並列取得する
 * BFF (Backend For Frontend) パターン
 */
export async function loadHomeData() {
  const [featuredBills, previousSessionData, activeSession] = await Promise.all(
    [getFeaturedBills(), getPreviousSessionBills(), getActiveCouncilSession()]
  );

  return {
    featuredBills,
    previousSessionData,
    activeSessionSlug: activeSession?.slug ?? null,
  };
}
