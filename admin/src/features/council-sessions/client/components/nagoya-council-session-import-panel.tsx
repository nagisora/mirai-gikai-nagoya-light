"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyNagoyaCouncilSessionImport } from "../../server/actions/apply-nagoya-council-session-import";
import { previewNagoyaCouncilSessionImport } from "../../server/actions/preview-nagoya-council-session-import";
import type {
  NagoyaCouncilSessionImportCandidate,
  NagoyaCouncilSessionImportPreview,
} from "../../server/services/nagoya-council-session-import";

const statusLabels = {
  create: "新規",
  update: "更新",
  unchanged: "変更なし",
  skipped: "スキップ",
  needs_review: "要確認",
} as const;

function canApply(candidate: NagoyaCouncilSessionImportCandidate) {
  return candidate.status === "create" || candidate.status === "update";
}

function canApplyWithManualDate(
  candidate: NagoyaCouncilSessionImportCandidate
) {
  return candidate.status === "skipped" || candidate.status === "needs_review";
}

function formatValue(value: string | null) {
  return value || "-";
}

function renderDateNote(candidate: NagoyaCouncilSessionImportCandidate) {
  if (candidate.dateSource.confidence === "actual") {
    return null;
  }

  const label = {
    planned: "予定日付",
    existing: "既存値",
    missing: "日付未取得",
  }[candidate.dateSource.confidence];

  return <p className="mt-1 text-xs text-gray-500">{label}</p>;
}

function renderChanges(candidate: NagoyaCouncilSessionImportCandidate) {
  if (candidate.status === "create") {
    return "新規作成";
  }
  if (candidate.changes.length === 0) {
    return candidate.reason || "差分なし";
  }
  return candidate.changes
    .map(
      (change) =>
        `${change.field}: ${formatValue(change.before)} -> ${formatValue(change.after)}`
    )
    .join(" / ");
}

export function NagoyaCouncilSessionImportPanel() {
  const router = useRouter();
  const [preview, setPreview] =
    useState<NagoyaCouncilSessionImportPreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualDates, setManualDates] = useState<
    Record<string, { start_date: string; end_date: string }>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const canApplySelected = useMemo(() => {
    if (!preview) return false;
    return preview.candidates.some((candidate) => {
      if (!selectedIds.includes(candidate.id)) return false;
      if (canApply(candidate)) return true;
      return (
        canApplyWithManualDate(candidate) &&
        Boolean(manualDates[candidate.id]?.start_date)
      );
    });
  }, [manualDates, preview, selectedIds]);

  const loadPreview = async () => {
    setIsLoading(true);
    try {
      const result = await previewNagoyaCouncilSessionImport();
      setPreview(result);
      const defaultIds = result.candidates.filter(canApply).map((c) => c.id);
      setSelectedIds(defaultIds);
      setManualDates({});
      if (result.errors.length > 0) {
        toast.error("取得結果にエラーがあります");
      } else {
        toast.success("公式サイトから取得しました");
      }
    } catch (error) {
      console.error("Preview Nagoya council session import error:", error);
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
      toast.error("保存する定例会を選択してください");
      return;
    }

    setIsApplying(true);
    try {
      const manualInputs = selectedIds
        .map((id) => ({ id, dates: manualDates[id] }))
        .filter((item) => item.dates?.start_date)
        .map((item) => ({
          id: item.id,
          start_date: item.dates.start_date,
          end_date: item.dates.end_date || null,
        }));
      const result = await applyNagoyaCouncilSessionImport(
        selectedIds,
        manualInputs
      );
      if (!result.success) {
        toast.error(result.errors.join("\n") || "保存に失敗しました");
        return;
      }
      toast.success(`${result.appliedCount}件の定例会を保存しました`);
      await loadPreview();
      router.refresh();
    } catch (error) {
      console.error("Apply Nagoya council session import error:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsApplying(false);
    }
  };

  const updateManualDate = (
    id: string,
    field: "start_date" | "end_date",
    value: string
  ) => {
    setManualDates((current) => ({
      ...current,
      [id]: {
        start_date: current[id]?.start_date ?? "",
        end_date: current[id]?.end_date ?? "",
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">公式サイトから取得</h2>
          <p className="mt-1 text-sm text-gray-500">
            名古屋市公式の定例会概要を取得し、既存データとの差分を確認します。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={loadPreview}
            disabled={isLoading || isApplying}
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
              !canApplySelected
            }
          >
            {isApplying ? "保存中..." : "選択した定例会を保存"}
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
          <div className="text-sm font-medium text-gray-700">
            取得結果 {preview.candidates.length}件
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>状態</TableHead>
                <TableHead>定例会</TableHead>
                <TableHead>期間</TableHead>
                <TableHead>差分</TableHead>
                <TableHead>公式URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.candidates.map((candidate) => {
                const next = candidate.next;
                const checked = selectedIds.includes(candidate.id);
                const manualDate = manualDates[candidate.id];
                const canSelect =
                  canApply(candidate) ||
                  (canApplyWithManualDate(candidate) &&
                    Boolean(manualDate?.start_date));
                return (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <Checkbox
                        checked={checked}
                        disabled={!canSelect || isApplying}
                        onCheckedChange={(value) =>
                          toggleSelected(candidate.id, value === true)
                        }
                        aria-label={`${candidate.id} を保存対象にする`}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          candidate.status === "needs_review"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {statusLabels[candidate.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {next?.name ?? candidate.existing?.name ?? candidate.name}
                    </TableCell>
                    <TableCell>
                      {next ? (
                        <div>
                          <p>
                            {next.start_date} - {next.end_date ?? "未定"}
                          </p>
                          {renderDateNote(candidate)}
                        </div>
                      ) : canApplyWithManualDate(candidate) ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={manualDate?.start_date ?? ""}
                              onChange={(event) =>
                                updateManualDate(
                                  candidate.id,
                                  "start_date",
                                  event.target.value
                                )
                              }
                              className="w-36"
                            />
                            <span className="text-gray-400">-</span>
                            <Input
                              type="date"
                              value={manualDate?.end_date ?? ""}
                              onChange={(event) =>
                                updateManualDate(
                                  candidate.id,
                                  "end_date",
                                  event.target.value
                                )
                              }
                              className="w-36"
                            />
                          </div>
                          {renderDateNote(candidate)}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-xl whitespace-normal text-gray-600">
                      {renderChanges(candidate)}
                    </TableCell>
                    <TableCell>
                      {candidate.councilUrl ? (
                        <a
                          href={candidate.councilUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
