# Repository Guidelines

> **Note**: `CLAUDE.md` と `GEMINI.md` は `AGENTS.md` へのシンボリックリンクです。ルールの追加・編集は必ず `AGENTS.md` を直接編集してください。

本リポジトリは「みらい議会」系サービスを **別の地方議会向けに fork して立ち上げる** ための軽量ベース (`mirai-gikai-lightfork`) です。Supabase を排し、`data/` 配下の JSON ファイルをデータソースとします。Admin はローカル起動専用で、認証は行いません。

## Project Structure & Module Organization
- `web/` は公開用 Next.js アプリ。共通 UI は `src/components`、Vitest のテストは `src/**/*.test.ts` に配置します。
- `admin/` はポート 3001 で動くローカル専用 Next.js。議案・会派・議決結果などを編集・登録します。**Vercel 等には公開しない前提です**。
- `data/` は議案・会派・議決結果・会期・タグの JSON データ本体（git 管理）。
- `packages/data/` は `data/` への read/write と型定義を提供します。**`fs` で `data/` を直接触らず、必ずこのパッケージ経由で読み書きしてください。**
- `packages/shared/` は `web` と `admin` の両方で使う純粋なユーティリティ（日付処理、ラベル整形等）を提供します。
- 設計ドキュメントは `docs/` に格納し、ルートの設定ファイル（`biome.json`, `pnpm-workspace.yaml` など）は全体ポリシーとして扱います。
- **web と admin でのコード共有**: 同一ロジックを両方で使う場合は `packages/` 配下の workspace パッケージに切り出すこと。同じコードを両アプリに重複配置するのは禁止。

## Next.js アーキテクチャ指針
- Bulletproof React の feature ベース構成を採用します。
- `app/` 配下の `page.tsx` は、URL パラメータ（`params` や `searchParams`）の取得と Feature コンポーネントへの受け渡しのみを担当する薄いラッパーとし、ビューやロジックは `features/` 配下に実装します。
- export 用の `index.ts` は作成せず、必要なファイルから直接 import します。
- Server Components を標準とし、状態管理・イベント処理が必要な場合のみ `"use client"` を付与した Client Component を追加します。
- ファイル名はケバブケース、コンポーネントはパスカルケース、関数はキャメルケースで統一します。

### Feature ディレクトリ構造
複雑な feature では server/client/shared の3層構造を採用します：

```
src/features/{feature}/
├── server/
│   ├── repositories/  # データアクセス層（@mirai-gikai/data 呼び出しを集約）
│   ├── components/    # Server Components
│   ├── loaders/       # Server Components用データ取得関数
│   ├── actions/       # Server Actions ("use server")
│   ├── services/      # ビジネスロジック層
│   └── utils/         # Server専用ユーティリティ
├── client/
│   ├── components/    # Client Components
│   ├── hooks/         # カスタムフック
│   └── utils/         # Client専用ユーティリティ
└── shared/
    ├── types/         # 共通型定義
    └── utils/         # 共通ユーティリティ
```

- Server 側ファイルには `"server-only"` を、Client Components には `"use client"` を付与します。
- 型定義や Server/Client 両方で使う関数は `shared/` に配置します。
- **純粋関数の切り出し**: 新規実装時、外部依存（ファイルI/O・API等）を持たない計算・変換・判定ロジックは純粋関数として `utils/` に切り出すこと。
- シンプルな feature は従来の `components|actions|api|types` 構成でも可。

## サイト設定（Fork時の書き換えポイント）
- サイト名・自治体名・議会名・色味・外部リンクなどは `web/src/config/site.config.ts` と `admin/src/config/site.config.ts` に集約しています。
- Fork した際は **まずここを書き換える** ことを前提に UI を組んでください。ロジック側でサイト名・都市名をハードコードしないこと。
- Fork 手順は [docs/20260422_1000_Fork手順.md](docs/20260422_1000_Fork手順.md) を参照。

## Build, Test, and Development Commands
- 依存導入は `pnpm install`、全てのスクリプトは pnpm 経由で実行します。
- `pnpm dev` で `web` (3000) と `admin` (3001) を並列起動します。
- `pnpm test` でワークスペース横断の Vitest を実行。局所実行は `pnpm --filter web test` や `test:watch` を利用します。
- 品質ゲートとして `pnpm lint`（Biome format+lint）と `pnpm typecheck` を通過させてください。

## Coding Style & Naming Conventions
- Biome が 2 スペースインデント、LF、ダブルクォート、セミコロン、80 文字幅を強制します。
- React コンポーネントと公開型は PascalCase、フックやユーティリティは camelCase を維持します。
- ファイル名は `bill-contents-data.ts` のようにローワーハイフンで表記し、スタイルは Tailwind ユーティリティを先に検討します。
- **アイコン**: インライン SVG は禁止です。必ず `lucide-react` からアイコンコンポーネントをインポートして使用してください。
- **ボタン**: `<button>` タグの使用は禁止です。必ず `@/components/ui/button` の `Button` コンポーネントを使用してください。
- **色**: インラインカラーコード（`text-[#xxx]`, `bg-[#xxx]` 等の arbitrary value や style 属性での直接指定）は禁止です。必ず `globals.css` の `@theme inline` で定義済みのカラートークンを使用してください。新しい色が必要な場合は、まず `globals.css` にトークンを追加してから使用すること。

### 内部ルート定義
- web / admin の内部リンク（`Link href`, `router.push`, `redirect`, `revalidatePath`）には `@/lib/routes` の関数を使用すること。文字列リテラルでのルート直書きは禁止。
- 新しいページ（`page.tsx`）を追加したら対応する `src/lib/routes.ts` にもルート関数を追加すること。テスト（`routes.test.ts`）が `page.tsx` との同期を検証します。

## データ層（`packages/data/`）
- `data/` ディレクトリへの read/write はすべて `@mirai-gikai/data` パッケージに集約します。
- 議案（bills）・会派（factions）・賛否（faction_stances）・会期（council_sessions）・タグ（tags）・議案タグ関連（bills_tags）・議案コンテンツ（bill_contents）を JSON で管理します。
- web / admin から `fs` で `data/` を直接触るのは禁止。必ず `@mirai-gikai/data` の関数を経由すること。
- 書き込み後はファイルパス変更（例: `spoken_at` 変更）も考慮して旧パスを unlink する責務を `packages/data/` 側に持たせます。

## Testing Guidelines
- Vitest の単体テストを `*.test.ts` として実装と同階層に配置します。データ変換・ラベル生成・URL 生成などロジックが入る箇所は必ず回帰テストを追加してください。
- **純粋関数にはテスト必須**: `utils/` に切り出した純粋関数は、新規作成時に必ず `*.test.ts` を同階層に作成してテストを書いてください。
- **mock は極力使わない**: `vi.mock("server-only")` 等のモックに頼らず、テスト対象のロジックを純粋関数として `shared/` に切り出してからテストしてください。
- **ファイル I/O を伴う関数**: テスト時は一時ディレクトリを使ってリアルな I/O を走らせ、モックを挟まないこと。

## ドキュメント作成ルール
- 要件定義や実装計画をまとめる際は論点を先に洗い出し、不明点を確認してから Markdown で整理します。
- 設計文書は `docs/` 配下に `YYYYMMDD_HHMM_作業内容.md` で保存してください（例: `docs/20260220_1530_スタイルガイド.md`）。
- 既存資料に大きな変更を加える場合は新しいファイルとして残し、更新履歴をたどれるようにします。

## AI 機能の扱い
- Fork 直後は **Web 側のユーザー発の AI 機能（チャット・インタビュー等）を全て無効** にしています。軽量な fork ベースとして立ち上げやすくするためです。
- **Admin 側の AI 情報収集機能（`ai-collection`）はローカル起動前提で残しています**。議案データの初期整備に活用してください。
- 後から Web 側に AI 機能を復活させたい場合は、本家 `mirai-gikai-kawasaki` 等の実装を参考にしてください。

## Cursor Cloud specific instructions

### サービス起動
- `pnpm dev` で web (port 3000) と admin (port 3001) を並列起動する。`.env` が必要（初回は `cp .env.example .env`）。
- 外部サービス（DB・Docker等）は不要。`data/` 配下の JSON ファイルのみで動作する。

### 品質チェックコマンド
- lint: `pnpm lint`（Biome format + lint、warnings は許容、exit 0 なら OK）
- typecheck: `pnpm typecheck`
- test: `pnpm test`（Vitest、全ワークスペース横断）

### 注意点
- pnpm v10 の build script 承認警告が出るが、Next.js 15 + Turbopack の dev モードでは esbuild / sharp のネイティブビルドが無くても動作する。`pnpm rebuild` は不要。
- admin は自動的に `/bills` にリダイレクトする（HTTP 307）。
- `postinstall` で `simple-git-hooks` が設定される。コミット時に `lint-staged`（Biome fix）が自動実行される。
