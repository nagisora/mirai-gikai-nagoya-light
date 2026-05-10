/**
 * data/tags に10カテゴリを用意し、全議案に最低1タグを付与する。
 * 再実行可能（tag_ids を上書き）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const tagsDir = path.join(root, "data", "tags");
const billsDir = path.join(root, "data", "bills");

const now = "2026-05-10T15:00:00.000Z";

const TAG_IDS = {
  finance: "nagoya-tag-finance",
  childEducation: "nagoya-tag-child-education",
  welfare: "nagoya-tag-welfare",
  safety: "nagoya-tag-safety",
  environment: "nagoya-tag-environment",
  urban: "nagoya-tag-urban",
  infrastructure: "nagoya-tag-infrastructure",
  culture: "nagoya-tag-culture",
  governance: "nagoya-tag-governance",
  misc: "nagoya-tag-misc",
};

const TAGS = [
  {
    id: "nagoya-tag-finance",
    label: "予算・財政",
    description: "予算・補正・基金・公営企業会計・手数料・料金など",
    featured_priority: 1,
  },
  {
    id: "nagoya-tag-child-education",
    label: "子ども・教育",
    description: "子育て・学校教育・保育・大学等",
    featured_priority: 2,
  },
  {
    id: "nagoya-tag-welfare",
    label: "福祉・医療",
    description: "福祉・高齢・障害・医療・保健など",
    featured_priority: 3,
  },
  {
    id: "nagoya-tag-safety",
    label: "消防・防災",
    description: "消防・火災予防・防災に関する条例・制度",
    featured_priority: 4,
  },
  {
    id: "nagoya-tag-environment",
    label: "環境・廃棄物",
    description: "廃棄物処理・汚染対策・リサイクルなど",
    featured_priority: 5,
  },
  {
    id: "nagoya-tag-urban",
    label: "都市・住宅・土地",
    description: "都市計画・建築・土地区画・住宅・広告物など",
    featured_priority: 6,
  },
  {
    id: "nagoya-tag-infrastructure",
    label: "インフラ・交通",
    description: "上下水道・道路・駐車場・鉄道・バスなど",
    featured_priority: 7,
  },
  {
    id: "nagoya-tag-culture",
    label: "文化・スポーツ・施設",
    description: "文化施設・公園・スポーツ・市場・城関連など",
    featured_priority: 8,
  },
  {
    id: "nagoya-tag-governance",
    label: "行政・契約・監査",
    description: "行政手続・人事・契約・監査・意見書・選任など",
    featured_priority: 9,
  },
  {
    id: "nagoya-tag-misc",
    label: "その他",
    description: "上記に当てはまりにくい議案",
    featured_priority: 10,
  },
];

/** @type {Array<{ id: string, re: RegExp }>} 先頭ほど優先 */
const RULES = [
  { id: TAG_IDS.finance, re: /補正予算|会計予算|度名古屋市一般会計|専決処分|料金の上限|基本財産の額|手数料条例|計量検査手数料/ },
  { id: TAG_IDS.governance, re: /選任について|契約の|指定管理者の指定|包括外部監査契約/ },
  {
    id: TAG_IDS.childEducation,
    re: /子ども|子育て|学校設置|教育センター|保育|児童|乳児|高等学校|大学|私立高等学校|青少年|野外教育|教員による/,
  },
  {
    id: TAG_IDS.welfare,
    re: /福祉|高齢者|障害者|障害児|リハビリ|国民健康保険|介護保険|保健衛生|社会福祉|総合社会福祉|福祉事務所|地方の福祉人材|母子父子寡婦/,
  },
  { id: TAG_IDS.safety, re: /消防団条例|火災予防条例/ },
  { id: TAG_IDS.environment, re: /廃棄物|汚染土壌|太陽光発電設備のリサイクル/ },
  {
    id: TAG_IDS.urban,
    re: /土地区画整理|建築基準法施行条例|地区計画等の区域内|都市公園条例|開発行為の許可|営住宅条例|市街地再開発|土地の信託|土地の無償貸付|市道路線の認定及び廃止|屋外広告物条例/,
  },
  {
    id: TAG_IDS.infrastructure,
    re: /下水道事業会計|水道事業会計|高速道路公社|駐車場条例|金城ふ頭駐車場|乗合自動車乗車料|高速度鉄道事業会計|自動車運送事業会計|工業用水道事業会計|名古屋市使用済自動車解体業許可等申請手数料/,
  },
  {
    id: TAG_IDS.culture,
    re: /文化|博物館|図書館|美術館|音楽プラザ|科学館|芸術創造|演劇練習|短歌会館|市民ギャラリー|スポーツトレーニング|プール条例|体育館条例|総合体育館|生涯学習|名城庭球場|瑞穂公園|東谷山フルーツ|志段味スポーツ|志段味古墳|揚輝荘|旧川上|港サッカー場|金城ふ頭アリーナ|国際展示場条例|国際会議場|中央卸売市場業務条例|男女平等参画推進センター|女性会館条例|地区会館条例|南陽交流プラザ|市民会館整備運営|青少年交流プラザ|青少年文化センター|文化みち橦木館|文化小劇場|市政資料館|名古屋城本丸御殿積立|墓地公園整備|市場及びと畜場|鳴海工場整備運営|高齢者、障害者等が円滑に利用できる宿泊施設/,
  },
  {
    id: TAG_IDS.governance,
    re: /行政手続における特定の個人を識別するための番号|行政手続条例|マイナンバー|職員定数条例|職員の報酬|事務分掌条例|公告式条例|印鑑条例|旅館業法の施行|旅館業法施行|公衆浴場法の施行|公衆浴場法施行|基本構想等審議会条例|宿泊税導入検討委員会条例|意見書の提出について|意見書$/,
  },
  { id: TAG_IDS.finance, re: /市債|基金条例|墓地公園整備事業特別会計|用地先行取得|天守閣特別会計|土地区画整理組合貸付金/ },
  { id: TAG_IDS.safety, re: /消防関係事務手数料/ },
];

function classify(name) {
  for (const { id, re } of RULES) {
    if (re.test(name)) {
      return id;
    }
  }
  return TAG_IDS.misc;
}

fs.mkdirSync(tagsDir, { recursive: true });
for (const t of TAGS) {
  const file = path.join(tagsDir, `${t.id}.json`);
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        id: t.id,
        label: t.label,
        description: t.description,
        featured_priority: t.featured_priority,
        created_at: now,
        updated_at: now,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

const billFiles = fs.readdirSync(billsDir).filter((f) => f.endsWith(".json"));
const counts = Object.fromEntries(TAGS.map((t) => [t.id, 0]));

for (const file of billFiles) {
  const fp = path.join(billsDir, file);
  const bill = JSON.parse(fs.readFileSync(fp, "utf8"));
  const tagId = classify(bill.name);
  counts[tagId]++;
  bill.tag_ids = [tagId];
  bill.updated_at = now;
  fs.writeFileSync(fp, `${JSON.stringify(bill, null, 2)}\n`, "utf8");
}

console.log("Tagged bills:", billFiles.length);
for (const t of TAGS) {
  console.log(`  ${t.label}: ${counts[t.id]}`);
}
