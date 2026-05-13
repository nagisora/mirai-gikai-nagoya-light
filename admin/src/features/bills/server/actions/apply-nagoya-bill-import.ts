"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import { applyNagoyaBillImport as applyImport } from "../services/nagoya-bill-import";

export async function applyNagoyaBillImport(
  councilSessionId: string,
  ids: string[]
) {
  try {
    const result = await applyImport(councilSessionId, ids);
    if (result.errors.length > 0) {
      return { success: false, appliedCount: 0, errors: result.errors };
    }

    revalidatePath(routes.bills());
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
