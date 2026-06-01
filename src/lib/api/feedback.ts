import { apiFetch } from "./client";

export interface FeedbackInput {
  message: string;
  app_version?: string;
}

/**
 * POST /feedback — dynamic (never cached). The worker's desktop-readiness
 * change accepts platform "web"; until that ships, this may be rejected by the
 * platform CHECK (see DECISIONS.md).
 */
export async function submitFeedback(
  input: FeedbackInput,
  token?: string | null,
): Promise<void> {
  await apiFetch("/feedback", {
    method: "POST",
    body: { platform: "web", app_version: "web", ...input },
    token: token ?? undefined,
  });
}
