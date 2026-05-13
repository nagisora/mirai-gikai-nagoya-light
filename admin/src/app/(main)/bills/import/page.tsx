import { getAllCouncilSessions } from "@mirai-gikai/data";
import { NagoyaBillImportPanel } from "@/features/bills/client/components/nagoya-bill-import-panel";

interface BillImportPageProps {
  searchParams: Promise<{
    session?: string;
  }>;
}

export default async function BillImportPage({
  searchParams,
}: BillImportPageProps) {
  const { session } = await searchParams;
  const councilSessions = (await getAllCouncilSessions()).sort((a, b) =>
    b.start_date.localeCompare(a.start_date)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">議案公式取り込み</h1>
        <p className="text-gray-600 mt-1">
          名古屋市公式の議案一覧を定例会ごとに取得し、既存データとの差分を確認します。
        </p>
      </div>

      <NagoyaBillImportPanel
        councilSessions={councilSessions.map((councilSession) => ({
          id: councilSession.id,
          name: councilSession.name,
        }))}
        defaultCouncilSessionId={session}
      />
    </div>
  );
}
