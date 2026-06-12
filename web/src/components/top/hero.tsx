import Image from "next/image";
import { Container } from "@/components/layouts/container";
import { siteConfig } from "@/config/site.config";

export function Hero() {
  return (
    <div className="relative w-full h-[32vh] min-h-[180px] md:h-[28vh] md:min-h-[200px]">
      <Image
        src="/img/hero_background.png"
        alt={siteConfig.councilName}
        fill
        priority
        className="object-cover"
        sizes="100vw"
        quality={85}
      />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 py-2">
        <Container>
          <p className="font-bold text-xl md:text-2xl leading-relaxed text-outline-white">
            いま{siteConfig.councilName}で議論されていること <br />
            やさしい言葉で説明します
          </p>
          <p className="mt-2 font-lexend text-xs">
            {/* 表示したい場合は `powered by ${siteConfig.operator.name}` とかで*/}
            {siteConfig.features.showTeamMiraiSection
              ? "powered by Team Mirai & AI"
              : ""}
          </p>
        </Container>
      </div>

      {/* スクロールインジケーター */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-gentle">
        <div className="w-[1px] h-5 bg-black"></div>
        <p className="mt-1 font-lexend text-[10px] leading-none text-black">
          Scroll
        </p>
      </div>
    </div>
  );
}
