"use server";

import { previewNagoyaBillImport as previewImport } from "../services/nagoya-bill-import";

export async function previewNagoyaBillImport(councilSessionId: string) {
  try {
    return await previewImport(councilSessionId);
  } catch (error) {
    return {
      councilSession: null,
      candidates: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
