/**
 * 制度的に重い議案は bill_contents から normal を落とし hard のみにする。
 * それ以外は normal のみ残し、一般ユーザー向けにシンプルにする。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const billsDir = path.join(__dirname, "..", "data", "bills");
const now = "2026-05-11T12:00:00.000Z";

function isHardOnly(name) {
  if (/令和[78]年度名古屋市.*(予算|補正)/.test(name)) {
    return true;
  }
  if (/補正予算に関する専決処分/.test(name)) {
    return true;
  }
  if (/意見書/.test(name)) {
    return true;
  }
  if (
    /土地区画整理に伴う町の区域の変更|建築基準法施行条例及び名古屋市地区計画等の区域内/.test(
      name,
    )
  ) {
    return true;
  }
  if (/包括外部監査契約の締結/.test(name)) {
    return true;
  }
  if (/土地の信託の一部変更|土地の無償貸付について/.test(name)) {
    return true;
  }
  if (/指定管理者の指定の変更/.test(name)) {
    return true;
  }
  if (/行政手続における特定の個人を識別するための番号/.test(name)) {
    return true;
  }
  if (/公立大学法人名古屋市立大学が徴収する料金の上限の変更/.test(name)) {
    return true;
  }
  if (/名古屋高速道路公社の基本財産の額の変更/.test(name)) {
    return true;
  }
  if (
    /職員定数条例の一部改正|職員の報酬、費用弁償、期末手当及び勤勉手当に関する条例|事務分掌条例の一部改正|公告式条例の一部改正/.test(
      name,
    )
  ) {
    return true;
  }
  if (/基本構想等審議会条例の制定/.test(name)) {
    return true;
  }
  if (
    /副市長選任について|教育委員会の委員選任について|民生委員・児童委員及び保護司の選任に係る地域の負担軽減/.test(
      name,
    )
  ) {
    return true;
  }
  if (
    /高齢者、障害者等が円滑に利用できる宿泊施設の客室の整備に関する条例の制定/.test(
      name,
    )
  ) {
    return true;
  }
  if (
    /宿泊税導入検討委員会条例の制定|市民会館整備運営事業者選定審議会条例の制定|鳴海工場整備運営事業者選定審議会条例の制定/.test(
      name,
    )
  ) {
    return true;
  }
  if (/私立高等学校授業料補助に関する条例の廃止/.test(name)) {
    return true;
  }
  if (/ゲノム編集技術応用食品の安全性審査/.test(name)) {
    return true;
  }
  if (/アスベスト被害者の救済/.test(name)) {
    return true;
  }
  if (/地方の福祉人材確保に向けた財政措置/.test(name)) {
    return true;
  }
  if (/教員によるわいせつ事案の多発を踏まえた/.test(name)) {
    return true;
  }
  if (/名古屋市行政手続条例の一部改正について$/.test(name)) {
    return true;
  }
  if (
    /旅館業法の施行等に関する条例の一部改正について$|名古屋市公衆浴場法施行条例の一部改正について$/.test(
      name,
    )
  ) {
    return true;
  }
  if (/名古屋市国民健康保険条例の一部改正について$/.test(name)) {
    return true;
  }
  if (
    /乗合自動車乗車料条例の一部を改正する条例の一部改正について$/.test(name)
  ) {
    return true;
  }
  if (/名古屋市児童福祉施設条例の一部改正について$/.test(name)) {
    return true;
  }
  if (/市道路線の認定及び廃止について$/.test(name)) {
    return true;
  }
  return false;
}

let hardOnlyCount = 0;
let normalOnlyCount = 0;

for (const file of fs
  .readdirSync(billsDir)
  .filter((f) => f.endsWith(".json"))) {
  const fp = path.join(billsDir, file);
  const bill = JSON.parse(fs.readFileSync(fp, "utf8"));
  const contents = bill.bill_contents ?? [];
  const hard = contents.filter((c) => c.difficulty_level === "hard");
  const normal = contents.filter((c) => c.difficulty_level === "normal");

  if (isHardOnly(bill.name)) {
    bill.bill_contents = hard.length > 0 ? hard : contents;
    hardOnlyCount++;
  } else {
    bill.bill_contents = normal.length > 0 ? normal : contents;
    normalOnlyCount++;
  }
  bill.updated_at = now;
  fs.writeFileSync(fp, `${JSON.stringify(bill, null, 2)}\n`, "utf8");
}

console.log(`hard のみ: ${hardOnlyCount} 件 / normal のみ: ${normalOnlyCount} 件`);
