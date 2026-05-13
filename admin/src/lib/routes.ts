/**
 * admin アプリの内部ルート定義
 *
 * app/ ディレクトリの page.tsx と 1:1 対応する。
 * Link href や router.push には必ずこのファイルの関数を使うこと。
 * 新しいページを追加したらここにもルートを追加し、テストを通すこと。
 */

// ── 静的ルート ──────────────────────────────────────
export const routes = {
  bills: () => "/bills" as const,
  billImport: () => "/bills/import" as const,
  billNew: () => "/bills/new" as const,
  tags: () => "/tags" as const,
  councilSessions: () => "/council-sessions" as const,
  councilSessionImport: () => "/council-sessions/import" as const,
  factions: () => "/factions" as const,
  aiCollection: () => "/ai-collection" as const,

  // ── 議案配下 ──────────────────────────────────────
  billEdit: (billId: string) => `/bills/${billId}/edit` as const,
  billContentsEdit: (billId: string) =>
    `/bills/${billId}/contents/edit` as const,
} as const;
