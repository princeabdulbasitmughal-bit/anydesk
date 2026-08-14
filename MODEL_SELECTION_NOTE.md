# Model-Selection Note: High-Energy Particle Reconstruction

## Purpose and boundary

This note identifies **research references** suitable for configuring TrackLab. It does not assert that any cited model has been trained, reproduced, or validated on the platform's eventual detector data. A model choice must remain contingent on the experiment's detector geometry, hit schema, reconstruction target, available compute, and independently measured metrics.

## Evidence-based references

| Reference | Documented approach | Evidence relevant to TrackLab | Configuration implication |
| --- | --- | --- |
| `jpata/particleflow` | The repository describes scalable, end-to-end machine-learning methods for high-energy physics event reconstruction and publishes model cards for CLIC clusters, CLIC hits, and CMS settings. [1] | The public repository lists HEP reconstruction artifacts and associated dataset links, but its page says it is not deployed through an Inference Provider. [1] | Treat it as a reproducibility/model-card reference. Do not assume it is a drop-in live endpoint; a repository-compatible image and command are required in `_huggingFaceJob`. |
| Transformer + MaskFormer charged-track reconstruction | The cited work combines a Transformer hit-filtering network with MaskFormer reconstruction, jointly addressing hit assignment and charged-particle property estimation. [2] | The paper reports evaluation on TrackML and describes 97% efficiency at a 0.6% fake rate with 100 ms inference for its best-performing model. These are source-specific study outcomes, not expected TrackLab outcomes. [2] | TrackLab should preserve accuracy, efficiency, fake rate, latency context, model version, dataset provenance, and reconstructed points for every real run. |

The public `jpata/particleflow` page was rechecked on 14 August 2026. It explicitly lists CLIC-cluster, CLIC-hit, and CMS model-card paths, while also stating that the repository is not deployed through an Inference Provider. This confirms the platform's existing decision to present the repository as a research reference rather than fabricate a hosted inference setup. [1]

## Recommended platform workflow

The platform should begin with a **saved configuration record**, not a claim that a general particle-tracking model is ready to run. The researcher enters a model ID, versioned hyperparameters, and—only when supplied by the research team—a container image plus command in `_huggingFaceJob`. The run becomes a legitimate remote execution only when an authorized Hugging Face Job is created with the owner token.

For a real experiment, the result manifest should include actual `accuracy`, `efficiency`, `fakeRate`, and reconstructed `{trackId, pointOrder, x, y, z}` coordinates. TrackLab validates these fields, persists them as per-run evidence, and does not create substitute values when the remote job omits a metric or track point.

> The performance values in a published paper are **benchmark context**, not a preset for an unrelated detector, simulation, selection, or reconstruction pipeline.

## Decision criteria before activation

| Criterion | Question to resolve | TrackLab record |
| --- | --- | --- |
| Input compatibility | Does the model expect raw hits, graph edges, tracks, clusters, or event-level objects, and do the uploaded CSV/JSON/HDF5 files encode that schema? | Dataset preview and model configuration |
| Target definition | Is the objective track finding, hit assignment, track-parameter regression, or end-to-end event reconstruction? | Experiment description and model hyperparameters |
| Evaluation protocol | Are efficiency and fake-rate definitions, matching criteria, and detector acceptance identical to the intended comparison? | Findings and per-run metric payload |
| Compute environment | Is there a maintained image and command compatible with Hugging Face Jobs, including all dependencies and checkpoint locations? | `_huggingFaceJob` configuration |
| Reproducibility | Is the model revision, random seed, training data version, and command line recorded? | Saved configuration, run record, and exported report |

## Activation conclusion

TrackLab is prepared to capture the evidence required for a serious model comparison. The next legitimate step is not automatic training; it is to provide the experiment-specific model command and one authorized Hugging Face token, then run a controlled job whose stored outputs can be independently reviewed.

## References

[1] [jpata/particleflow model repository](https://huggingface.co/jpata/particleflow)

[2] [Van Stroud et al., “Transformers for Charged Particle Track Reconstruction in High Energy Physics,” arXiv:2411.07149](https://arxiv.org/abs/2411.07149)
