# Hugging Face Execution Runbook

## Purpose

TrackLab keeps the researcher interface, dataset records, model configurations, runs, metrics, reconstructed points, findings, and report artifacts inside the platform. A Hugging Face Job is optional and is activated only after the platform owner securely configures one `HF_TOKEN`. The platform does not create a Hugging Face account, token, compute budget, training command, or scientific result on the researcher's behalf.

## One-token activation

The owner supplies one Hugging Face token as the `HF_TOKEN` project secret. The token must be authorized to resolve the account namespace and create, inspect, and manage Hugging Face Jobs. The same token is used for submission and status synchronization; no client browser ever receives it.

> A model configuration without `_huggingFaceJob` remains valid for reproducibility, but its runs remain **queued** because TrackLab has no generic way to invent a detector-specific training container or command.

## Model configuration contract

The **Hugging Face model ID** field names the selected model. The hyperparameters JSON may additionally include `_huggingFaceJob` after the training or inference container is known.

```json
{
  "learning_rate": 0.001,
  "batch_size": 64,
  "_huggingFaceJob": {
    "image": "registry.example.org/particle-tracker:latest",
    "command": ["python", "train.py", "--config", "/workspace/config.json"],
    "flavor": "cpu-basic",
    "timeout": "2h",
    "namespace": "your-hugging-face-namespace",
    "environment": {
      "TRACKLAB_MODE": "training"
    }
  }
}
```

The image and command must be supplied by the model repository or the research team. Valid `timeout` values use a numeric value with `s`, `m`, `h`, or `d`, such as `30m` or `2h`. If `namespace` is omitted, TrackLab resolves it from the token owner.

## Run lifecycle

| Hugging Face stage | TrackLab status | Interpretation |
| --- | --- | --- |
| Scheduling or an unknown pre-start stage | `queued` | The job has not entered execution. |
| `RUNNING` | `running` | The job is executing remotely. |
| `COMPLETED` | `completed` | The remote job finished successfully. |
| `ERROR`, `CANCELED`, or `DELETED` | `failed` | The remote job stopped without a successful completion. |

TrackLab stores the returned Hugging Face Job identifier and refreshes a submitted run's status when its run history is opened. The UI only uses the four approved labels: `queued`, `running`, `completed`, and `failed`.

## Scientific output handoff

Remote execution status alone is not scientific evidence. To populate the platform's results and track views, the approved job contract must return actual artifacts and structured results. The required fields are listed below.

| Output | Required structure | Destination |
| --- | --- | --- |
| Evaluation metrics | Accuracy, efficiency, and fake rate in the inclusive range 0–1; optional serialized metric payload | Per-run evaluation record |
| Reconstructed tracks | An ordered list of `{trackId, pointOrder, x, y, z}` with finite numeric coordinates | 2D and 3D track viewer |
| Model artifact | Model or checkpoint bytes, a filename, and MIME type | Managed model-artifact storage |
| Failure context | Human-readable error message | Failed run history entry and owner alert |

TrackLab accepts a result manifest from the Hugging Face Job log using the sentinel `TRACKLAB_RESULT=` followed by Base64-encoded JSON. This keeps the handoff inside the same single-token Hugging Face connection. The job should print one final line such as the following after actual evaluation and reconstruction:

```text
TRACKLAB_RESULT=eyJhY2N1cmFjeSI6MC45MSwiZWZmaWNpZW5jeSI6MC44OCwiZmFrZVJhdGUiOjAuMDN9
```

The decoded JSON can contain `accuracy`, `efficiency`, `fakeRate`, optional `metricPayload`, and `trackPoints`. TrackLab validates coordinates before persistence and never synthesizes missing points or metrics. A completed Job with no returned result manifest will therefore show its completed status but an empty results and track view.

## Owner alerts

The backend is wired to send the platform owner an operational alert when a run reaches `completed` or `failed`, including any returned key-metric summary. The app's built-in owner notification channel is used until a dedicated verified email sender is explicitly configured.

## Credential-independent resilience review

The credential-independent review verifies all dataset format gates, researcher authorization checks, run status mapping, configured-job payload validation, delayed log-result retries, empty-result rejection, coordinate validation, report generation, owner-alert hooks, responsive rendering, type checking, automated tests, and production builds. Status synchronization failures are logged server-side with the run identifier and a redacted diagnostic message; raw `HF_TOKEN` values and authorization headers are not emitted. The remaining assumptions are that the owner supplies a valid token, the selected model container can run the declared command, and the job prints a valid result manifest after actual evaluation.

## References

[1] [Hugging Face Jobs guide](https://huggingface.co/docs/huggingface_hub/en/guides/jobs)

[2] [Hugging Face Jobs API reference](https://huggingface.co/docs/hub/en/jobs-reference)
