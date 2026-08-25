# Particleflow Reference Revalidation

**Validation date:** 2026-08-25

TrackLab independently revalidated the public `jpata/particleflow` reference used in its model-selection guidance. The Hugging Face model card describes MLPF as scalable, flexible, end-to-end high-energy physics event reconstruction and lists linked CLIC cluster, CLIC hit, and CMS model cards alongside related datasets. Its current page explicitly states that the model is **not deployed by an Inference Provider**. [1]

The associated public GitHub repository is titled “Machine-learned, GPU-accelerated particle flow reconstruction” and exposes code, configuration, testing, data, and job-related project structure. [2]

> **TrackLab implication:** This remains a validated research and reproducibility reference only. It does not provide a generic click-to-run endpoint, approved detector schema, hosted container, or execution command for TrackLab. An owner-authorized `HF_TOKEN`, a genuine researcher dataset, and a detector-specific `_huggingFaceJob` image and command remain required before any real remote run can be submitted.

No repository code, model artifact, dataset, metric, track, or provider job was downloaded, executed, or imported during this validation.

## References

[1] [Hugging Face — jpata/particleflow](https://huggingface.co/jpata/particleflow)

[2] [GitHub — jpata/particleflow](https://github.com/jpata/particleflow)
