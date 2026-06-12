import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import type { BillWithContent } from "../../shared/types";
import { BillCard } from "../../client/components/bill-list/bill-card";

interface FeaturedBillSectionProps {
  bills: BillWithContent[];
  sessionSlug?: string | null;
}

export function FeaturedBillSection({
  bills,
  sessionSlug,
}: FeaturedBillSectionProps) {
  if (bills.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-6">
      {/* セクションヘッダー */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold text-[#1F2937] leading-[1.48]">
          注目の議案🔥
        </h2>
        <p className="text-xs font-medium text-mirai-text-secondary leading-[1.67]">
          議会に上程された注目議案
        </p>
      </div>

      {/* 注目の議案カード */}
      <div className="flex flex-col gap-4">
        {bills.map((bill) => (
          <Link key={bill.id} href={routes.billDetail(bill.id) as Route}>
            <BillCard bill={bill} />
          </Link>
        ))}
      </div>

      {sessionSlug && (
        <Link
          href={routes.sessionBills(sessionSlug) as Route}
          className="block"
        >
          <Card className="border border-black hover:bg-gray-50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between py-4 px-5">
              <span className="font-bold text-base text-black">
                今回の定例会の議案をすべて見る
              </span>
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}
    </section>
  );
}
