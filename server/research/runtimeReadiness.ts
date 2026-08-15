export type OperationalReadiness = {
  hostedExecution: {
    state: "ready" | "not_configured";
    title: string;
    detail: string;
  };
  terminalEmail: {
    state: "ready" | "fallback_only";
    title: string;
    detail: string;
  };
};

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

/**
 * Returns configuration state only. Credential values and provider headers are
 * never included in this response or its diagnostic strings.
 */
export function getOperationalReadiness(): OperationalReadiness {
  const hostedExecutionReady = configured(process.env.HF_TOKEN);
  const terminalEmailReady = configured(process.env.RESEND_API_KEY)
    && configured(process.env.RESEND_FROM_EMAIL)
    && configured(process.env.TRACKLAB_OWNER_EMAIL);

  return {
    hostedExecution: {
      state: hostedExecutionReady ? "ready" : "not_configured",
      title: hostedExecutionReady ? "Hosted execution ready" : "Hosted execution safely pending",
      detail: hostedExecutionReady
        ? "Authorized Hugging Face Jobs can be submitted when a run includes a valid hosted-job specification."
        : "Runs remain queued until the platform owner configures an authorized Hugging Face token; no remote work is submitted without it.",
    },
    terminalEmail: {
      state: terminalEmailReady ? "ready" : "fallback_only",
      title: terminalEmailReady ? "Verified terminal email ready" : "Built-in owner alert remains active",
      detail: terminalEmailReady
        ? "Completed and failed run summaries can use the configured verified sender."
        : "The built-in owner notification remains available. Verified external email requires a provider key, sender, and owner address.",
    },
  };
}
