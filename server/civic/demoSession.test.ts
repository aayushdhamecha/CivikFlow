import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminDemo, CitizenDemo } from "../../client/src/pages/DemoWorkspace";
import { advanceDemoComplaint, createDemoComplaint, defaultDemoComplaint, demoCredentials, demoFlow, getDemoRoleForCredentials } from "../../client/src/lib/demoSession";

describe("isolated CIVICFLOW demo credentials", () => {
  it("accepts the public test citizen and administrator identities", () => {
    expect(getDemoRoleForCredentials(demoCredentials.citizen.email, demoCredentials.citizen.password)).toBe("citizen");
    expect(getDemoRoleForCredentials(demoCredentials.admin.email.toUpperCase(), demoCredentials.admin.password)).toBe("admin");
  });

  it("rejects invalid credentials without falling through to a production role", () => {
    expect(getDemoRoleForCredentials(demoCredentials.admin.email, "wrong-password")).toBeNull();
    expect(getDemoRoleForCredentials("admin@example.com", demoCredentials.admin.password)).toBeNull();
  });

  it("moves an isolated sample report from citizen submission through administrator resolution", () => {
    const submitted = createDemoComplaint(defaultDemoComplaint, "Unsafe pothole near a crossing", "A deep pothole near the busy crossing creates an immediate road safety risk.", 1710000123456);
    expect(submitted).not.toBeNull();
    expect(submitted?.publicId).toBe("CF-DEMO-23456");
    expect(submitted?.status).toBe("SUBMITTED");

    let progressed = submitted!;
    for (const expected of demoFlow.slice(1)) {
      progressed = advanceDemoComplaint(progressed)!;
      expect(progressed.status).toBe(expected.status);
    }
    expect(progressed.history).toHaveLength(demoFlow.length);
    expect(advanceDemoComplaint(progressed)).toBeNull();
  });

  it("renders distinct citizen-reporting and administrator-operations demo interfaces", () => {
    const citizenMarkup = renderToStaticMarkup(createElement(CitizenDemo, { complaint: defaultDemoComplaint, draftTitle: defaultDemoComplaint.title, draftDescription: defaultDemoComplaint.description, onTitle: () => undefined, onDescription: () => undefined, onSubmit: () => undefined, currentIndex: 0 }));
    const administratorMarkup = renderToStaticMarkup(createElement(AdminDemo, { complaint: defaultDemoComplaint, currentIndex: 0, onAdvance: () => undefined }));
    expect(citizenMarkup).toContain("Create a test report");
    expect(citizenMarkup).toContain("Live demo timeline");
    expect(administratorMarkup).toContain("Operational action");
    expect(administratorMarkup).toContain("AI assistance");
    expect(administratorMarkup).not.toContain("Create a test report");
  });
});
