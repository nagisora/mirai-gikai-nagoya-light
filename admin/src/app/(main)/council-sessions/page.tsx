import { Download } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CouncilSessionForm } from "@/features/council-sessions/client/components/council-session-form";
import { CouncilSessionList } from "@/features/council-sessions/client/components/council-session-list";
import { loadCouncilSessions } from "@/features/council-sessions/server/loaders/load-council-sessions";
import { routes } from "@/lib/routes";

export default async function CouncilSessionsPage() {
  const sessions = await loadCouncilSessions();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">定例会管理</h1>
        <Link href={routes.councilSessionImport()}>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-1" />
            公式取り込み
          </Button>
        </Link>
      </div>

      {/* 定例会追加セクション */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">定例会を追加</h2>
        <CouncilSessionForm />
      </section>

      {/* 定例会一覧セクション */}
      <section className="rounded-lg border bg-white p-6">
        <CouncilSessionList sessions={sessions} />
      </section>
    </div>
  );
}
