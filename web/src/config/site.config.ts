/**
 * サイト設定ファイル
 * Fork して別の地方議会向けに使用する場合はこのファイルを変更してください。
 */
export const siteConfig = {
  siteName: "みらい議会＠名古屋市",
  siteDescription:
    "名古屋市議会で今どんな議案が検討されているか、わかりやすく伝えるプラットフォームです",
  cityName: "名古屋市",
  councilName: "名古屋市議会",
  keywords: [
    "みらい議会＠名古屋市",
    "みらい議会",
    "議案",
    "名古屋市",
    "市議会",
    "地方政治",
    "政策",
    "解説",
  ],
  councilBaseUrl: "https://www.city.nagoya.jp/",
  /** 議案・議決結果の一覧ページ */
  councilBillsDetailUrl:
    "https://www.city.nagoya.jp/shikai/shingi/1030858/index.html",
  twitterHashtag: "みらい議会名古屋版", // # なし
  externalLinks: {
    report: "https://forms.gle/GM4oTN94ttPRjyjp9",
    aboutNote: "",
    donation: "https://team-mir.ai/support/donation",
    teamAbout: "https://team-mir.ai/about",
    terms: "https://team-mir.ai/terms",
    privacy: "https://team-mir.ai/privacy",
    faq: "https://team-mirai.notion.site/FAQ-28cf6f56bae180bd84e7f7ae80f806a1",
  },
  /**
   * ページを管理する政党名（空文字列の場合は政党名を省略した汎用表現を使用）
   * 例: "チームみらい"
   */
  managingParty: "" as string,
  /**
   * サービス運営者情報
   * 利用規約や問い合わせ先に使用します。
   */
  operator: {
    name: "Gondow" as string,
    contactUrl: "https://x.com/GondowTakashi" as string,
    /** 利用規約の準拠法・管轄裁判所（第一審の専属的合意管轄） */
    jurisdiction: "名古屋地方裁判所" as string,
  },
  /**
   * 表示切り替えフラグ
   * Fork 先で各トグルを切り替えて利用してください。
   */
  features: {
    /**
     * サイトロゴ（ヘッダー・フッター）の表示
     * Fork 先で独自ロゴを用意した場合は true にする。
     * `web/public/img/logo.svg` を差し替えてから有効化する。
     */
    showLogo: true as boolean,
    /**
     * チームみらいセクションの表示（トップページ・フッター・デスクトップメニュー）
     * 非公式運営など、党の公式サービスとして出さない場合は false にする。
     */
    showTeamMiraiSection: false as boolean,
  },
} as const;
