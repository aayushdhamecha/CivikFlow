import { describe, expect, it } from "vitest";
import { assertAuthorityCanAccessComplaint, assertCitizenOwnsComplaint } from "./permissions";

describe("CIVICFLOW record authorization", () => {
  const complaint = { citizenId: 14, assignedDepartmentId: 8 } as Parameters<typeof assertCitizenOwnsComplaint>[1];

  it("blocks citizens from accessing another citizen's report", () => {
    expect(() => assertCitizenOwnsComplaint({ id: 15, role: "citizen" } as Parameters<typeof assertCitizenOwnsComplaint>[0], complaint)).toThrow("only access your own reports");
    expect(() => assertCitizenOwnsComplaint({ id: 14, role: "citizen" } as Parameters<typeof assertCitizenOwnsComplaint>[0], complaint)).not.toThrow();
  });

  it("scopes authority users to their department while preserving admin access", () => {
    expect(() => assertAuthorityCanAccessComplaint({ role: "authority", departmentId: 9 } as Parameters<typeof assertAuthorityCanAccessComplaint>[0], complaint)).toThrow("outside your department");
    expect(() => assertAuthorityCanAccessComplaint({ role: "authority", departmentId: 8 } as Parameters<typeof assertAuthorityCanAccessComplaint>[0], complaint)).not.toThrow();
    expect(() => assertAuthorityCanAccessComplaint({ role: "admin", departmentId: null } as Parameters<typeof assertAuthorityCanAccessComplaint>[0], complaint)).not.toThrow();
  });
});
