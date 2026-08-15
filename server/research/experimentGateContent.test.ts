import { experimentGateContent, getExperimentGateContent } from "../../shared/experimentGateContent";
import { describe, expect, it } from "vitest";

describe("experiment gate content", () => {
  it("provides route-specific, research-native setup guidance for every protected workspace", () => {
    const routes = ["/", "/datasets", "/models", "/runs", "/results", "/tracks", "/findings", "/assistant"];

    expect(Object.keys(experimentGateContent)).toEqual(routes);
    expect(new Set(routes.map(route => getExperimentGateContent(route).title)).size).toBe(routes.length);
    expect(routes.map(route => getExperimentGateContent(route).description)).not.toContain("Experiments keep datasets, model configurations, runs, findings, and exported reports organized in a single research record.");
  });

  it("keeps result and track empty states explicit about the no-fabrication boundary", () => {
    expect(getExperimentGateContent("/results").markers).toContain("No fabricated values");
    expect(getExperimentGateContent("/tracks").artifactDescription).toContain("does not draw illustrative particle tracks");
  });

  it("falls back to the command-center research record guidance for unknown routes", () => {
    expect(getExperimentGateContent("/not-a-research-route")).toEqual(getExperimentGateContent("/"));
  });
});
