import { NagoyaCouncilSessionImportPanel } from "@/features/council-sessions/client/components/nagoya-council-session-import-panel";

export default function CouncilSessionImportPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">定例会公式取り込み</h1>
        <p className="text-gray-600 mt-1">
          名古屋市公式の定例会概要を取得し、既存データとの差分を確認します。
        </p>
      </div>

      <NagoyaCouncilSessionImportPanel />
    </div>
  );
}
