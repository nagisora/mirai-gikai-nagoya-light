import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";

import { Hero } from "@/components/top/hero";
import { TeamMirai } from "@/components/top/team-mirai";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { FeaturedBillSection } from "@/features/bills/server/components/featured-bill-section";
import { PreviousSessionSection } from "@/features/bills/server/components/previous-session-section";
import { loadHomeData } from "@/features/bills/server/loaders/load-home-data";
import { getCurrentCouncilSession } from "@/features/council-sessions/server/loaders/get-current-council-session";
import { CurrentCouncilSession } from "@/features/council-sessions/client/components/current-council-session";
import { getJapanTime } from "@/lib/utils/date";

export default async function Home() {
  const { featuredBills, previousSessionData, activeSessionSlug } =
    await loadHomeData();

  const currentSession = await getCurrentCouncilSession(getJapanTime());

  return (
    <>
      <Hero />

      <CurrentCouncilSession session={currentSession} />

      <Container className="">
        <div className="py-10">
          <main className="flex flex-col gap-16">
            <FeaturedBillSection
              bills={featuredBills}
              sessionSlug={activeSessionSlug}
            />
          </main>
        </div>
      </Container>
      {previousSessionData && (
        <div className="bg-mirai-surface-muted py-10">
          <Container>
            <PreviousSessionSection
              session={previousSessionData.session}
              bills={previousSessionData.bills}
              totalBillCount={previousSessionData.totalBillCount}
            />
          </Container>
        </div>
      )}

      <Container>
        <About />

        <TeamMirai />

        <BillDisclaimer />
      </Container>
    </>
  );
}
