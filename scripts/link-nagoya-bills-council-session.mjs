/**
 * 議案の council_session_id を名古屋の定例会に紐付ける。
 *
 * 現状データは submitted_date が空のため、議案名に年度が出るものは
 * 令和8年2月定例会（当初予算・令和7年度補正等を同会で処理）に寄せ、
 * それ以外も同一データ収集元の議案として同会期に付与する。
 *
 * 再実行で上書き可能。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const billsDir = path.join(root, "data", "bills");

/** 名古屋データ現状: 令和8年2月定例会に紐づく議案群 */
const SESSION_ID = "nagoya-r8-feb-2026";
const now = "2026-05-10T16:30:00.000Z";

const sessionFile = path.join(
  root,
  "data",
  "council-sessions",
  `${SESSION_ID}.json`,
);
if (!fs.existsSync(sessionFile)) {
  console.error(`会期ファイルが見つかりません: ${sessionFile}`);
  process.exit(1);
}

let n = 0;
for (const file of fs
  .readdirSync(billsDir)
  .filter((f) => f.endsWith(".json"))) {
  const fp = path.join(billsDir, file);
  const bill = JSON.parse(fs.readFileSync(fp, "utf8"));
  bill.council_session_id = SESSION_ID;
  bill.updated_at = now;
  fs.writeFileSync(fp, `${JSON.stringify(bill, null, 2)}\n`, "utf8");
  n++;
}

console.log(`council_session_id を ${SESSION_ID} に設定した議案: ${n} 件`);
