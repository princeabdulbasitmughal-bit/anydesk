import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendTerminalRunEmail } from "./email";

const originalEnvironment = {
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.RESEND_FROM_EMAIL,
  recipient: process.env.TRACKLAB_OWNER_EMAIL,
};

function restoreEnvironment() {
  process.env.RESEND_API_KEY = originalEnvironment.apiKey;
  process.env.RESEND_FROM_EMAIL = originalEnvironment.from;
  process.env.TRACKLAB_OWNER_EMAIL = originalEnvironment.recipient;
}

describe("terminal run email delivery", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.TRACKLAB_OWNER_EMAIL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreEnvironment();
  });

  it("skips safely until a verified provider, sender, and recipient are configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendTerminalRunEmail({ runId: 12, status: "completed", metricSummary: "accuracy 0.91" }))
      .resolves.toEqual({ delivery: "skipped", reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { status: "completed" as const, metricSummary: "accuracy 0.91, efficiency 0.88, fake rate 0.02" },
    { status: "failed" as const, metricSummary: "no key metrics returned" },
  ])("sends a verified transactional email for a $status terminal outcome", async ({ status, metricSummary }) => {
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.RESEND_FROM_EMAIL = "TrackLab <alerts@verified.example>";
    process.env.TRACKLAB_OWNER_EMAIL = "owner@example.com";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email-123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendTerminalRunEmail({ runId: 12, status, metricSummary, errorMessage: status === "failed" ? "Remote job was cancelled." : undefined }))
      .resolves.toEqual({ delivery: "sent", providerMessageId: "email-123" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({
      from: "TrackLab <alerts@verified.example>",
      to: ["owner@example.com"],
      subject: `TrackLab · Experiment run ${status}`,
    });
    expect(payload.text).toContain(`Run 12 is ${status}`);
    expect(payload.text).toContain(metricSummary);
  });

  it("keeps the fallback path safe when the provider rejects a delivery", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.RESEND_FROM_EMAIL = "TrackLab <alerts@verified.example>";
    process.env.TRACKLAB_OWNER_EMAIL = "owner@example.com";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid sender", { status: 403 })));

    await expect(sendTerminalRunEmail({ runId: 12, status: "failed", metricSummary: "no key metrics returned" }))
      .resolves.toEqual({ delivery: "failed", reason: "provider_http_403" });
  });
});
