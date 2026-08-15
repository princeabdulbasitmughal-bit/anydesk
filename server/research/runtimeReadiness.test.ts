import { afterEach, describe, expect, it } from "vitest";
import { getOperationalReadiness } from "./runtimeReadiness";

const originalEnvironment = {
  hf: process.env.HF_TOKEN,
  resend: process.env.RESEND_API_KEY,
  sender: process.env.RESEND_FROM_EMAIL,
  owner: process.env.TRACKLAB_OWNER_EMAIL,
};

function restoreEnvironment() {
  if (originalEnvironment.hf === undefined) delete process.env.HF_TOKEN; else process.env.HF_TOKEN = originalEnvironment.hf;
  if (originalEnvironment.resend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalEnvironment.resend;
  if (originalEnvironment.sender === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = originalEnvironment.sender;
  if (originalEnvironment.owner === undefined) delete process.env.TRACKLAB_OWNER_EMAIL; else process.env.TRACKLAB_OWNER_EMAIL = originalEnvironment.owner;
}

afterEach(restoreEnvironment);

describe("operational readiness", () => {
  it("reports safe pending activation when external credentials are absent", () => {
    delete process.env.HF_TOKEN;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.TRACKLAB_OWNER_EMAIL;

    expect(getOperationalReadiness()).toMatchObject({
      hostedExecution: { state: "not_configured", title: "Hosted execution safely pending" },
      terminalEmail: { state: "fallback_only", title: "Built-in owner alert remains active" },
    });
  });

  it("reports readiness without exposing configured credential values", () => {
    process.env.HF_TOKEN = "hf_private_test_value";
    process.env.RESEND_API_KEY = "re_private_test_value";
    process.env.RESEND_FROM_EMAIL = "TrackLab <alerts@verified.example>";
    process.env.TRACKLAB_OWNER_EMAIL = "owner@example.com";

    const result = getOperationalReadiness();
    expect(result).toMatchObject({ hostedExecution: { state: "ready" }, terminalEmail: { state: "ready" } });
    expect(JSON.stringify(result)).not.toContain("private_test_value");
  });
});
