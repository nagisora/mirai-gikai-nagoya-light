/**
 * 名古屋市公式取り込みでサーバー側 fetch する URL を限定し、
 * HTML 由来の href などが想定外のホストを指した場合にフェッチしない。
 */
const ALLOWED_HOSTNAME = "www.city.nagoya.jp";

export function assertNagoyaOfficialFetchUrl(urlString: string): void {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(
      `許可されていない URL です（解析できません）: ${urlString}`
    );
  }

  if (url.protocol !== "https:") {
    throw new Error(
      `許可されていない URL です（HTTPS のみ許可）: ${urlString}`
    );
  }

  if (url.hostname !== ALLOWED_HOSTNAME) {
    throw new Error(
      `許可されていない URL です（${ALLOWED_HOSTNAME} のみ許可）: ${urlString}`
    );
  }
}
