"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import {
  applyNagoyaCouncilSessionImport as applyImport,
  type ManualNagoyaCouncilSessionImportInput,
} from "../services/nagoya-council-session-import";

export async function applyNagoyaCouncilSessionImport(
  ids: string[],
  manualInputs: ManualNagoyaCouncilSessionImportInput[] = []
) {
  try {
    const result = await applyImport(ids, manualInputs);
    if (result.errors.length > 0) {
      return { success: false, appliedCount: 0, errors: result.errors };
    }

    revalidatePath(routes.councilSessions());
    await invalidateWebCache();

    return { success: true, appliedCount: result.appliedCount, errors: [] };
  } catch (error) {
    return {
      success: false,
      appliedCount: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
