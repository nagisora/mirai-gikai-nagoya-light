/**
 * 令和8年2月定例会の注目4議案を、精査済み情報に基づき更新する。
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const billsDir = path.join(__dirname, "..", "data", "bills");
const now = "2026-06-14T12:00:00.000Z";

const FOOTER_NORMAL = `---

本文は議案の趣旨をわかりやすく整理したものです。**正確な内容は市議会・市公式の議案資料でご確認ください。**`;

const FOOTER_HARD = `---

本文は予算・政策資料の整理です。**正本は議案書および公式資料です。**`;

const URL = {
  gaiyou:
    "https://www.city.nagoya.jp/_res/projects/default_project/_page_/001/046/336/gaiyousyuusei.pdf",
  yosanYoukyuu:
    "https://www.city.nagoya.jp/_res/projects/default_project/_page_/001/042/725/r8yosannyoukyuunaiyounokoukai.pdf",
  gikaiDayori:
    "https://www.city.nagoya.jp/_res/projects/default_project/_page_/001/049/358/r805.pdf",
  shisakuIchiran:
    "https://www.city.nagoya.jp/shisei/zaisei/1002655/1042582/1042583/1046227/1046229/1046231.html",
  kankouKoryuSai:
    "https://www.city.nagoya.jp/_res/projects/default_project/_page_/001/046/334/r8tokkaimeisai.pdf",
  nagoyajoNyuujouryou:
    "https://www.nagoyajo.city.nagoya.jp/topics/2026/06/20260601_4849.html",
  chunichiKyushoku:
    "https://www.chunichi.co.jp/article/1219053",
  chunichiElevator:
    "https://www.chunichi.co.jp/article/1253814",
  chunichiRyokin:
    "https://www.chunichi.co.jp/article/1217289",
  shukuhakuzaiJourei:
    "https://www.city.nagoya.jp/shikouhou/_res/projects/project_kouhou/_page_/002/001/541/2001420_1.pdf",
  nikkeiShukuhakuzai:
    "https://www.nikkei.com/article/DGXZQOFD137KA0T11C25A1000000/",
  shiseiShiryoukan:
    "https://www.city.nagoya.jp/kankou/rekishi/1004614/1004615/1048442.html",
  poolJourei:
    "https://www.city.nagoya.jp/shikouhou/_res/projects/project_kouhou/_page_/002/001/541/2001513_1.pdf",
  chuushakuan:
    "https://www.city.nagoya.jp/shisei/zaisei/1002655/1042582/1042583/1048723.html",
};

const FACTIONS = {
  jimin: "liberal-democratic-party",
  minshu: "nagoya-democratic",
  komei: "komeito",
  genzei: "kengen-nagoya",
  hinata: "nagoya-hinata-no-kai",
  sousei: "nagoya-sousei-kai",
  ishin: "nippon-ishin",
  kyosan: "japan-communist-party",
  shinsei: "shinsei-kai",
};

function makeStance(billId, factionId, type, comment = null) {
  return {
    id: randomUUID(),
    bill_id: billId,
    faction_id: factionId,
    type,
    comment,
    created_at: now,
    updated_at: now,
  };
}

function makeForStances(billId, factionIds, comments = {}) {
  return factionIds.map((fid) =>
    makeStance(billId, fid, "for", comments[fid] ?? null),
  );
}

function makeAgainstStances(billId, factionIds, comments = {}) {
  return factionIds.map((fid) =>
    makeStance(billId, fid, "against", comments[fid] ?? null),
  );
}

const FOR_MAJORITY = [
  FACTIONS.jimin,
  FACTIONS.minshu,
  FACTIONS.komei,
  FACTIONS.genzei,
  FACTIONS.hinata,
  FACTIONS.sousei,
  FACTIONS.ishin,
];

const UPDATES = [
  {
    id: "c8e4a1f2-6b3d-4e9a-8f7c-2d1e0b9a7c45",
    pdf_url: URL.gaiyou,
    faction_stances: [
      ...makeForStances("c8e4a1f2-6b3d-4e9a-8f7c-2d1e0b9a7c45", FOR_MAJORITY),
      ...makeAgainstStances(
        "c8e4a1f2-6b3d-4e9a-8f7c-2d1e0b9a7c45",
        [FACTIONS.kyosan, FACTIONS.shinsei],
        {
          [FACTIONS.kyosan]:
            "予算案全体に反対。公の施設使用料改定、上下水道料金の生活保護世帯等の減免廃止、富裕層優遇の市民税減税、不要不急の大型事業の推進、弥富相生山線の工事再開などを理由に指摘。",
          [FACTIONS.shinsei]:
            "予算案全体に反対。アジア・アジアパラ競技大会予算の増大、使用料・利用料の値上げ、千種区図書館整備、弥富相生山線整備について市民理解が不十分であることなどを理由に指摘。",
        },
      ),
    ],
    normal: {
      title: "学校給食費の無償化",
      summary:
        "令和8年度一般会計予算に、国の制度を活用した小学校等の給食費負担軽減と、物価高騰下でも給食の質を維持する支援が盛り込まれています。",
      content: `## この議案のねらい

**学校給食**は子どもの健康と学びを支える重要なサービスです。令和8年度の一般会計予算では、国の**学校給食費の抜本的な負担軽減制度**を活用し、**小学校・特別支援学校小学部**の給食費負担を軽くするほか、物価高騰の中でも保護者負担を増やさず**給食の水準を維持**する支援が計画されています。

## 予算の主な内容

- **小学校等給食費の抜本的負担軽減**（国制度の活用）
- **物価高騰対応支援**（食材料費の増加分を市が支援し、保護者負担の増額を抑える）
- 給食設備の整備（**調理場環境改善**、**スチームコンベクションオーブン**導入等）

## 知っておきたいポイント

「無償化」は国・市・保護者の**負担分担の見直し**として段階的に進むことが多く、対象学年・所得要件・国の制度変更の影響をセットで見る必要があります。

予算委員会の議事録は公開に時間がかかるため、給食費負担軽減の詳細は市公式サイトでは限定的ですが、令和8年度予算の概要には「**小学校給食費の抜本的な負担軽減**」と明記されています。

## 議会での賛否

令和8年度**一般会計予算**として可決。賛成7会派、反対2会派。

**反対会派の注意点**：共産・新政の両会派とも、予算案全体への反対であり、給食費負担軽減そのものへの反対ではありません。

## 参照

- [令和8年度予算の概要](${URL.gaiyou})
- [令和8年度予算要求内容の公開](${URL.yosanYoukyuu})
- [名古屋市会だより（令和8年度一般会計予算）](${URL.gikaiDayori})
- [中日新聞：給食費負担軽減の報道](${URL.chunichiKyushoku})

${FOOTER_NORMAL}`,
    },
    hard: {
      title: "学校給食費の無償化",
      summary:
        "R8一般会計予算の臨時・政策経費における給食費負担軽減（国制度活用）と物価高騰対応支援。予算案全体に対する会派別賛否の整理付き。",
      content: `## 政策の位置づけ

令和8年度予算では、教育委員会・子ども青少年局関連の**臨時・政策経費**として、学校給食に関する次の措置が示されています。

1. **小学校等給食費の抜本的負担軽減**（国制度の活用）
2. **学校給食費に係る物価高騰対応支援**（保護者負担の増額を抑えつつ食材料費を確保）

## 関連する設備・事業投資

- 給食調理場の**環境改善**、**スチームコンベクションオーブン**等の導入（予算要求内容に記載）
- 「プレミアム小学校給食」など**食育**施策
- 中学校スクールランチ事業のあり方検討

## 情報源の整理

| 内容 | 確認できる情報源 |
| --- | --- |
| 給食費負担軽減 | 予算概要（市公式）、中日新聞 |
| 物価高騰対応支援 | 予算概要（市公式） |
| 調理場・オーブン導入 | 予算要求内容の公開（市公式） |
| 会派別賛否 | 名古屋市会だより r805（一般会計予算） |

## 会派別賛否（一般会計予算）

- **賛成**：自民、名古屋民主、公明、減税日本、陽向、創政、維新
- **反対**：共産、新政

共産・新政は予算案全体に反対。共産は使用料改定・減免廃止・市民税減税・大型事業等、新政はアジア・アジアパラ予算・使用料値上げ・図書館整備・弥富相生山線等を理由に指摘しています。

## 参照

- [令和8年度予算の概要](${URL.gaiyou})
- [令和8年度予算要求内容の公開](${URL.yosanYoukyuu})
- [名古屋市会だより](${URL.gikaiDayori})

${FOOTER_HARD}`,
    },
  },
  {
    id: "031c39fe-be0b-43cc-90b9-dca51a38be46",
    pdf_url: URL.kankouKoryuSai,
    faction_stances: [
      ...makeForStances("031c39fe-be0b-43cc-90b9-dca51a38be46", [
        ...FOR_MAJORITY,
        FACTIONS.shinsei,
      ]),
      ...makeAgainstStances(
        "031c39fe-be0b-43cc-90b9-dca51a38be46",
        [FACTIONS.kyosan],
      ),
    ],
    normal: {
      title: "名古屋城天守閣の木造復元とバリアフリー問題",
      summary:
        "名古屋城天守閣特別会計の令和8年度予算。木造復元に向けた財源計画と、天守閣へのエレベーター整備などバリアフリー問題が議論の焦点です。",
      content: `## この議案のねらい

**名古屋城天守閣特別会計**の令和8年度予算（第7号）は、現天守閣の運営に加え、将来の**木造天守の復元**に向けた積立や関連事業の財源を示します。あわせて、来場者の**バリアフリー**（段差・エレベーター・情報提供など）も重要な議論テーマです。

## 予算・政策のポイント

- **木造復元**に向けた積立基金・寄附の機運醸成
- 天守閣の**維持整備**（設備老朽化対応等）
- **観光文化交流債**などによる財源確保
- **入場料の値上げ**（令和8年10月1日から）
- **天守閣へのエレベーター整備**（議会で議論の中心）

## 知っておきたいポイント

木造復元は**長期・大規模**な事業です。バリアフリーについては、地下鉄駅のエレベーター整備ではなく、**天守閣自体へのアクセス**（エレベーター設置の是非・設計）が議会の論点になっています。

## 議会での賛否

令和8年度**名古屋城天守閣特別会計予算**として可決。賛成8会派、反対1会派（共産）。

## 参照

- [令和8年度主な施策等一覧](${URL.shisakuIchiran})
- [令和8年度各特別会計予算説明書（観光文化交流債）](${URL.kankouKoryuSai})
- [名古屋城入場料の値上げ](${URL.nagoyajoNyuujouryou})
- [中日新聞：天守閣エレベーター整備](${URL.chunichiElevator})
- [名古屋市会だより（天守閣特別会計予算）](${URL.gikaiDayori})

${FOOTER_NORMAL}`,
    },
    hard: {
      title: "名古屋城天守閣の木造復元とバリアフリー問題",
      summary:
        "天守閣特別会計R8予算を通じた木造復元財源と、天守閣エレベーター整備を中心とするアクセシビリティ論点。会派別賛否付き。",
      content: `## 会計・政策の枠組み

**名古屋城天守閣特別会計**は観光収入・繰入・市債等で運営し、**木造天守復元**に向けた積立を管理中長期課題とします。一般会計の重点化 **(5)① 名古屋城天守閣木造復元** と連動します。

## 木造復元関連

- 積立基金への積立・寄附金募集の機運醸成
- 設計・木工事等の段階的整備
- **観光文化交流債**による財源（特別会計予算説明書に記載）

## バリアフリー・アクセシビリティ

- 現天守閣・本丸周辺の**段差・案内**
- **天守閣へのエレベーター整備**（議会・報道の主要論点）
- 将来木造天守の**垂直移動設備**計画
- **入場料値上げ**（収入確保とアクセス政策の両面で注目）

## 会派別賛否（天守閣特別会計予算）

- **賛成**：自民、名古屋民主、公明、減税日本、陽向、創政、維新、新政
- **反対**：共産

共産党の反対理由は、公開資料からは特定できていません。

## 参照

- [令和8年度主な施策等一覧](${URL.shisakuIchiran})
- [観光文化交流債（特別会計説明書）](${URL.kankouKoryuSai})
- [名古屋城入場料の値上げ](${URL.nagoyajoNyuujouryou})
- [中日新聞：エレベーター整備](${URL.chunichiElevator})
- [名古屋市会だより](${URL.gikaiDayori})

${FOOTER_HARD}`,
    },
  },
  {
    id: "4efd8fa3-3ae0-4601-aa84-d87af39d2f7c",
    pdf_url: URL.shukuhakuzaiJourei,
    faction_stances: [],
    normal: {
      title: "宿泊税の導入",
      summary:
        "宿泊税の導入可否を検討するため、「宿泊税導入検討委員会」を設置する条例（第57号）の制定議案です。課税そのものは後続の条例に委ねられます。",
      content: `## この議案のねらい

**宿泊税**は、宿泊施設の利用者から徴収し、観光振興やまちづくりに充てる仕組みで、京都・東京などでも導入されています。名古屋市では、導入の可否や税率・使途を検討するための**委員会**を条例で設置します（第57号）。

## どんな内容か

- **宿泊税導入検討委員会**の設置
- 委員会の**任務**（調査・審議・意見の表明等）
- 運営に必要な**基本的なルール**

## 知っておきたいポイント

この議案は「宿泊税をすぐに課税する」ものではなく、**導入に向けた検討体制**をつくる段階です。税率・課税対象・収入使途などは、委員会の議論と今後の条例制定を見てください。

なお、条例本文から「専門家・市民等で構成される」ことを直接裏付ける記述は、現時点の公開資料では確認できていません。

## 議会での賛否

会派別の賛否については、名古屋市会だより等の公開資料からは確認できていません（可決済み）。

## 参照

- [名古屋市宿泊税導入検討委員会条例（案）](${URL.shukuhakuzaiJourei})
- [日本経済新聞：宿泊税の概要](${URL.nikkeiShukuhakuzai})

${FOOTER_NORMAL}`,
    },
    hard: {
      title: "宿泊税の導入",
      summary:
        "宿泊税導入検討委員会条例（第57号）の制定。課税設計は後続立法に委ねる組織条例。会派別賛否は公開資料未確認。",
      content: `## 位置づけ

**宿泊税**（宿泊施設に宿泊した者に課する市税）は、観光都市における**受益者負担**の財源として注目されています。本議案（第57号）は課税規定そのものではなく、**宿泊税導入検討委員会条例**の制定です。

## 委員会の役割

- 宿泊税導入の**必要性・課税方式**の調査研究
- 関係事業者等の意見聴取
- 市長・議会への**勧告・意見具申**

## 確認上の注意

- 条例案PDFは確認できるが、「専門家・市民等で構成される」旨の明記は、現時点では未確認
- 会派別賛否は名古屋市会だより等からは特定できていない（議案は可決済み）

## 参照

- [宿泊税導入検討委員会条例](${URL.shukuhakuzaiJourei})
- [日本経済新聞：宿泊税](${URL.nikkeiShukuhakuzai})

${FOOTER_HARD}`,
    },
  },
  {
    id: "6338a3e1-6d72-4116-9020-f2ff8a8564fd",
    pdf_url: URL.chuushakuan,
    faction_stances: [
      ...makeForStances("6338a3e1-6d72-4116-9020-f2ff8a8564fd", FOR_MAJORITY),
      ...makeAgainstStances(
        "6338a3e1-6d72-4116-9020-f2ff8a8564fd",
        [FACTIONS.kyosan, FACTIONS.shinsei],
      ),
    ],
    normal: {
      title: "利用料・駐車料金の一斉値上げ",
      summary:
        "令和8年度予算に伴う施設利用料・駐車料金の改定。テニスコート・プール・資料館等は当初案のまま可決、公園駐車場は議会修正案が可決されました。",
      content: `## この議案のねらい

令和8年度の予算編成では、**受益者負担の原則**に基づき、市の施設・サービスの**利用料・駐車料金**を見直す方針です。テニスコート・野球場、プール、市政資料館、公園駐車場など複数の条例・規程改正がセットで進められました。

## 主な改定内容

- **有料公園施設**（テニスコート・野球場）：使用料引き上げ → **修正なく可決**
- **プール利用料**：条例改正 → **修正なく可決**
- **市政資料館**：入場料等の改定 → **修正なく可決**
- **公園駐車場**（名城公園ほか）：当初案から**議会修正案**が提出・可決

市ウェブサイトは可決後に修正内容へ差し替えられているため、**当初の提案内容**は中日新聞等の報道で確認する必要があります。

## 駐車場の修正案

予算案付議後、自民・名古屋民主・公明が**駐車料金の修正案**を提出し可決。修正案の概要は市公式ページで公開されています。

## 議会での賛否（駐車場修正案）

- **賛成**：自民、名古屋民主、公明、減税日本、陽向、創政、維新
- **反対**：共産、新政

## 参照

- [中日新聞：当初の値上げ提案](${URL.chunichiRyokin})
- [駐車場修正案の概要（市公式）](${URL.chuushakuan})
- [市政資料館の利用料改定](${URL.shiseiShiryoukan})
- [名古屋市プール条例改正](${URL.poolJourei})
- [名古屋市会だより](${URL.gikaiDayori})

${FOOTER_NORMAL}`,
    },
    hard: {
      title: "利用料・駐車料金の一斉値上げ",
      summary:
        "R8予算の使用料・手数料改定パッケージ。駐車場条例改正（第99号）の修正案賛否と、テニス・プール・資料館の当初案可決を整理。",
      content: `## 制度背景

令和8年度予算編成過程では、**受益者負担の適正化**として施設使用料・手数料の改定が体系化されています。駐車関連は**名古屋市駐車場条例**（第99号）が法的枠組みです。

## 改定パッケージの経過

| 対象 | 経過 |
| --- | --- |
| テニスコート・野球場 | 当初案のまま可決 |
| プール利用料 | プール条例改正、当初案のまま可決 |
| 市政資料館 | 当初案のまま可決 |
| 公園駐車場 | 自民・民主・公明の**修正案**を可決 |

## 駐車場修正案の会派別賛否

- **賛成**：自民、名古屋民主、公明、減税日本、陽向、創政、維新
- **反対**：共産、新政

## 情報整理上の注意

市公式サイトは可決後の内容に更新されているため、**当初提案との差分**を追う際は報道資料（中日新聞等）と修正案概要ページを併読する必要があります。

## 参照

- [中日新聞：当初提案](${URL.chunichiRyokin})
- [駐車場修正案概要](${URL.chuushakuan})
- [市政資料館](${URL.shiseiShiryoukan})
- [プール条例改正](${URL.poolJourei})
- [名古屋市会だより](${URL.gikaiDayori})

${FOOTER_HARD}`,
    },
  },
];

function upsertContent(bill, level, patch) {
  const idx = bill.bill_contents.findIndex(
    (c) => c.difficulty_level === level,
  );
  if (idx >= 0) {
    bill.bill_contents[idx] = {
      ...bill.bill_contents[idx],
      title: patch.title,
      summary: patch.summary,
      content: patch.content,
      updated_at: now,
    };
  } else {
    bill.bill_contents.push({
      id: randomUUID(),
      bill_id: bill.id,
      difficulty_level: level,
      title: patch.title,
      summary: patch.summary,
      content: patch.content,
      created_at: now,
      updated_at: now,
    });
  }
}

for (const item of UPDATES) {
  const fp = path.join(billsDir, `${item.id}.json`);
  const bill = JSON.parse(fs.readFileSync(fp, "utf8"));

  upsertContent(bill, "normal", item.normal);
  upsertContent(bill, "hard", item.hard);

  if (item.pdf_url !== undefined) {
    bill.pdf_url = item.pdf_url;
  }
  if (item.faction_stances !== undefined) {
    bill.faction_stances = item.faction_stances;
  }
  bill.updated_at = now;

  fs.writeFileSync(fp, `${JSON.stringify(bill, null, 2)}\n`, "utf8");
  console.log(`Updated ${item.id}`);
}

console.log(`Updated ${UPDATES.length} featured bills with verified information.`);
