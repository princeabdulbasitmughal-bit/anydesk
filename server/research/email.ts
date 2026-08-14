export type TerminalRunStatus = "completed" | "failed";

export type TerminalRunEmail = {
  runId: number;
  status: TerminalRunStatus;
  metricSummary: string;
  errorMessage?: string;
};

export type TerminalRunEmailResult =
  | { delivery: "skipped"; reason: "not_configured" }
  | { delivery: "sent"; providerMessageId?: string }
  | { delivery: "failed"; reason: string };

function emailSettings() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const recipient = process.env.TRACKLAB_OWNER_EMAIL?.trim();
  return { apiKey, from, recipient };
}

function emailText(input: TerminalRunEmail) {
  const failureDetail = input.status === "failed" && input.errorMessage
    ? `\nFailure detail: ${input.errorMessage}`
    : "";
  return `TrackLab experiment run update\n\nRun ${input.runId} is ${input.status}.\nKey metrics: ${input.metricSummary}.${failureDetail}\n\nThis is an operational notification from the protected TrackLab research platform.`;
}

/**
 * Sends a terminal run email only when a verified Resend sender and recipient
 * are configured. It never throws so the built-in owner alert remains a
 * reliable fallback when an external mail provider is unavailable.
 */
export async function sendTerminalRunEmail(input: TerminalRunEmail): Promise<TerminalRunEmailResult> {
  const { apiKey, from, recipient } = emailSettings();
  if (!apiKey || !from || !recipient) return { delivery: "skipped", reason: "not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `TrackLab · Experiment run ${input.status}`,
        text: emailText(input),
        tags: [
          { name: "source", value: "tracklab" },
          { name: "run-status", value: input.status },
        ],
      }),
    });
    if (!response.ok) return { delivery: "failed", reason: `provider_http_${response.status}` };
    const body = await response.json().catch(() => ({})) as { id?: unknown };
    return { delivery: "sent", providerMessageId: typeof body.id === "string" ? body.id : undefined };
  } catch {
    return { delivery: "failed", reason: "provider_network_error" };
  }
}
