"use server";

import { previewNagoyaCouncilSessionImport as previewImport } from "../services/nagoya-council-session-import";

export async function previewNagoyaCouncilSessionImport() {
  try {
    return await previewImport();
  } catch (error) {
    return {
      candidates: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
