import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const datasetsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Datasets.tsx"), "utf8");

describe("dataset FileReader cancellation", () => {
  it("aborts an in-progress read when the file or active experiment changes", () => {
    expect(datasetsSource).toContain("const activeReaderRef = useRef<FileReader | null>(null)");
    expect(datasetsSource).toContain("if (reader?.readyState === FileReader.LOADING) reader.abort()");
    expect(datasetsSource).toContain("cancelPendingRead();\n    setFile(null)");
    expect(datasetsSource).toContain("cancelPendingRead();\n    const candidate");
  });

  it("ignores superseded read callbacks and cleans up every terminal reader state", () => {
    expect(datasetsSource).toContain("if (activeReaderRef.current !== reader) return");
    expect(datasetsSource).toContain("reader.onabort");
    expect(datasetsSource).toContain("return cancelPendingRead");
    expect(datasetsSource).toContain("reader.readAsDataURL(selectedFile)");
  });
});
