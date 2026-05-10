"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyNagoyaBillImport } from "../../server/actions/apply-nagoya-bill-import";
import { previewNagoyaBillImport } from "../../server/actions/preview-nagoya-bill-import";
import type {
  NagoyaBillImportCandidate,
  NagoyaBillImportPreview,
} from "../../server/services/nagoya-bill-import";

type CouncilSessionOption = {
  id: string;
  name: string;
};

type NagoyaBillImportPanelProps = {
  councilSessions: CouncilSessionOption[];
  defaultCouncilSessionId?: string;
};

const statusLabels = {
  create: "新規",
  update: "更新",
  unchanged: "変更なし",
  local_only: "ローカルのみ",
  skipped: "スキップ",
} as const;

function canApply(candidate: NagoyaBillImportCandidate) {
  return candidate.status === "create" || candidate.status === "update";
}

function getFieldLabel(
  field: NagoyaBillImportCandidate["changes"][number]["field"]
) {
  const labels = {
    bill_number: "議案番号",
    name: "案件名",
    submitted_date: "提出日",
    status: "状態",
    status_note: "議決情報",
    pdf_url: "PDF",
  } as const;
  return labels[field];
}

function renderDiffValue(value: string | null) {
  if (!value) {
    return <span className="text-gray-400">未入力</span>;
  }
  return <span className="break-words">{value}</span>;
}

function parseStatusNote(value: string | null) {
  if (!value) return [];
  return value.split(" / ").map((part) => {
    const separator = part.indexOf(": ");
    if (separator === -1) {
      return { label: "備考", value: part };
    }
    return {
      label: part.slice(0, separator),
      value: part.slice(separator + 2),
    };
  });
}

function renderStatusNoteDiff(before: string | null, after: string | null) {
  const beforeItems = parseStatusNote(before);
  const afterItems = parseStatusNote(after);
  const labels = Array.from(
    new Set([...beforeItems, ...afterItems].map((item) => item.label))
  );
  const beforeByLabel = new Map(
    beforeItems.map((item) => [item.label, item.value])
  );
  const afterByLabel = new Map(
    afterItems.map((item) => [item.label, item.value])
  );

  if (labels.length === 0) {
    return (
      <div className="grid gap-1 sm:grid-cols-[3rem_minmax(0,1fr)]">
        <span className="text-gray-500">現在</span>
        {renderDiffValue(before)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {labels.map((label) => (
        <div
          key={label}
          className="grid gap-2 border-t pt-2 first:border-t-0 first:pt-0 sm:grid-cols-[6rem_minmax(0,1fr)_1rem_minmax(0,1fr)]"
        >
          <div className="font-medium text-gray-700">{label}</div>
          <div className="min-w-0">
            {renderDiffValue(beforeByLabel.get(label) ?? null)}
          </div>
          <div className="text-gray-400">-&gt;</div>
          <div className="min-w-0">
            {renderDiffValue(afterByLabel.get(label) ?? null)}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderChangeDetails(candidate: NagoyaBillImportCandidate) {
  if (candidate.changes.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {candidate.changes.map((change) => (
        <div
          key={change.field}
          className="grid gap-1 rounded-md border bg-gray-50 p-2 sm:grid-cols-[6rem_minmax(0,1fr)]"
        >
          <div className="font-medium text-gray-700">
            {getFieldLabel(change.field)}
          </div>
          {change.field === "status_note" ? (
            <div className="min-w-0">
              {renderStatusNoteDiff(change.before, change.after)}
            </div>
          ) : (
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)]">
              <div className="min-w-0">{renderDiffValue(change.before)}</div>
              <div className="text-gray-400">-&gt;</div>
              <div className="min-w-0">{renderDiffValue(change.after)}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getVotingResult(candidate: NagoyaBillImportCandidate) {
  return (
    candidate.next?.status_note?.split("議決結果: ")[1]?.split(" / ")[0] ?? "-"
  );
}

function renderChangeBadges(candidate: NagoyaBillImportCandidate) {
  if (candidate.status === "create") {
    return <Badge variant="outline">新規作成</Badge>;
  }
  if (candidate.status === "local_only") {
    return <Badge variant="destructive">公式一致なし</Badge>;
  }
  if (candidate.changes.length === 0) {
    return <Badge variant="outline">差分なし</Badge>;
  }

  return candidate.changes.flatMap((change) => {
    if (change.field !== "status_note") {
      return [
        <Badge key={change.field} variant="outline">
          {getFieldLabel(change.field)}
        </Badge>,
      ];
    }

    const labels = parseStatusNote(change.after)
      .map((item) => item.label)
      .filter((label) => label !== "提出区分");
    return labels.map((label) => (
      <Badge key={`${change.field}-${label}`} variant="outline">
        {label}
      </Badge>
    ));
  });
}

export function NagoyaBillImportPanel({
  councilSessions,
  defaultCouncilSessionId,
}: NagoyaBillImportPanelProps) {
  const router = useRouter();
  const [councilSessionId, setCouncilSessionId] = useState(
    defaultCouncilSessionId ?? councilSessions[0]?.id ?? ""
  );
  const [preview, setPreview] = useState<NagoyaBillImportPreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const applicableCandidates = useMemo(
    () => preview?.candidates.filter(canApply) ?? [],
    [preview]
  );
  const sortedCandidates = useMemo(() => {
    const order: Record<NagoyaBillImportCandidate["status"], number> = {
      create: 0,
      update: 1,
      local_only: 2,
      skipped: 3,
      unchanged: 4,
    };
    return [...(preview?.candidates ?? [])].sort(
      (a, b) => order[a.status] - order[b.status]
    );
  }, [preview]);

  const loadPreview = async () => {
    if (!councilSessionId) {
      toast.error("定例会を選択してください");
      return;
    }

    setIsLoading(true);
    try {
      const result = await previewNagoyaBillImport(councilSessionId);
      setPreview(result);
      setSelectedIds(result.candidates.filter(canApply).map((c) => c.id));
      if (result.errors.length > 0) {
        toast.error("取得結果にエラーがあります");
      } else {
        toast.success("公式サイトから取得しました");
      }
    } catch (error) {
      console.error("Preview Nagoya bill import error:", error);
      toast.error("公式サイトからの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id)
    );
  };

  const applySelected = async () => {
    if (selectedIds.length === 0) {
      toast.error("保存する議案を選択してください");
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyNagoyaBillImport(councilSessionId, selectedIds);
      if (!result.success) {
        toast.error(result.errors.join("\n") || "保存に失敗しました");
        return;
      }
      toast.success(`${result.appliedCount}件の議案を保存しました`);
      await loadPreview();
      router.refresh();
    } catch (error) {
      console.error("Apply Nagoya bill import error:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsApplying(false);
    }
  };

  const applyOne = async (id: string) => {
    setApplyingId(id);
    try {
      const result = await applyNagoyaBillImport(councilSessionId, [id]);
      if (!result.success) {
        toast.error(result.errors.join("\n") || "保存に失敗しました");
        return;
      }
      toast.success("議案を保存しました");
      await loadPreview();
      router.refresh();
    } catch (error) {
      console.error("Apply Nagoya bill import row error:", error);
      toast.error("保存に失敗しました");
    } finally {
      setApplyingId(null);
    }
  };

  const handleSessionChange = (value: string) => {
    setCouncilSessionId(value);
    setPreview(null);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4 rounded-md border bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-72">
          <h2 className="text-lg font-semibold">公式サイトから取得</h2>
          <p className="mt-1 text-sm text-gray-500">
            名古屋市公式の議案一覧を定例会ごとに取得し、既存データとの差分を確認します。
          </p>
          <div className="mt-3 max-w-sm">
            <Select
              value={councilSessionId}
              onValueChange={handleSessionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="定例会を選択" />
              </SelectTrigger>
              <SelectContent>
                {councilSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={loadPreview}
            disabled={isLoading || isApplying || !councilSessionId}
          >
            <RefreshCw className="size-4" />
            {isLoading ? "取得中..." : "取得"}
          </Button>
          <Button
            type="button"
            onClick={applySelected}
            disabled={
              isLoading ||
              isApplying ||
              selectedIds.length === 0 ||
              applicableCandidates.length === 0
            }
          >
            {isApplying ? "保存中..." : "選択した議案を保存"}
          </Button>
        </div>
      </div>

      {preview?.errors && preview.errors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {preview.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            取得結果 {preview.candidates.length}件
          </div>

          <div className="divide-y rounded-md border">
            {sortedCandidates.map((candidate) => {
              const bill = candidate.next ?? candidate.existing;
              const checked = selectedIds.includes(candidate.id);
              const selectable = canApply(candidate);
              return (
                <div
                  key={`${candidate.status}-${candidate.id}`}
                  className="grid gap-3 p-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(16rem,22rem)] md:items-start"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={checked}
                      disabled={!selectable || isApplying}
                      onCheckedChange={(value) =>
                        toggleSelected(candidate.id, value === true)
                      }
                      aria-label={`${candidate.id} を保存対象にする`}
                    />
                    <Badge
                      variant={
                        candidate.status === "local_only"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {statusLabels[candidate.status]}
                    </Badge>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="shrink-0 text-sm font-medium text-gray-700">
                        {bill?.bill_number ?? "-"}
                      </span>
                      <h3 className="min-w-0 break-words text-sm font-medium text-gray-900">
                        {bill?.name ?? "-"}
                      </h3>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {candidate.sourceLabel && (
                        <span>{candidate.sourceLabel}</span>
                      )}
                      <span>提出日: {bill?.submitted_date ?? "-"}</span>
                      <span>議決結果: {getVotingResult(candidate)}</span>
                    </div>
                    {candidate.changes.length > 0 && (
                      <details className="mt-2 text-xs text-gray-500">
                        <summary className="cursor-pointer text-blue-600">
                          差分詳細
                        </summary>
                        {renderChangeDetails(candidate)}
                      </details>
                    )}
                    {candidate.status === "local_only" && (
                      <p className="mt-2 text-xs text-red-600">
                        {candidate.reason}
                      </p>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col gap-2 md:items-end">
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {renderChangeBadges(candidate)}
                      {candidate.sourceUrl ? (
                        <a
                          href={candidate.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink className="size-4" />
                          公式
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">
                          公式URLなし
                        </span>
                      )}
                    </div>
                    {selectable && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyOne(candidate.id)}
                        disabled={
                          isLoading || isApplying || applyingId === candidate.id
                        }
                      >
                        {applyingId === candidate.id
                          ? "保存中..."
                          : "この議案だけ保存"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
