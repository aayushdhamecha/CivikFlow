export type DemoRole = "citizen" | "admin";
export type DemoStatus = "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED";

export type DemoComplaint = {
  publicId: string;
  title: string;
  description: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  status: DemoStatus;
  priority: "MEDIUM" | "HIGH";
  history: Array<{ status: DemoStatus; at: string; note: string }>;
};

const roleKey = "civicflow-demo-role";
const complaintKey = "civicflow-demo-complaint";

export const demoCredentials = {
  citizen: { email: "demo.citizen@civicflow.test", password: "CivicDemo2026!", name: "Demo Citizen" },
  admin: { email: "demo.admin@civicflow.test", password: "CivicDemo2026!", name: "Demo Administrator" },
} as const;

export function getDemoRoleForCredentials(email: string, password: string): DemoRole | null {
  return (Object.keys(demoCredentials) as DemoRole[]).find(role => demoCredentials[role].email === email.trim().toLowerCase() && demoCredentials[role].password === password) ?? null;
}

export const defaultDemoComplaint: DemoComplaint = {
  publicId: "CF-DEMO-1042",
  title: "Unsafe pothole near the community crossing",
  description: "A deep pothole at the community crossing is forcing two-wheelers into the opposing lane during peak traffic.",
  category: "Road infrastructure",
  address: "Community Crossing, Demo Ward",
  latitude: 19.076,
  longitude: 72.8777,
  status: "SUBMITTED",
  priority: "HIGH",
  history: [{ status: "SUBMITTED", at: "Just now", note: "Test report created in the isolated demo workspace." }],
};

export const demoFlow: Array<{ status: DemoStatus; label: string; note: string }> = [
  { status: "SUBMITTED", label: "Submitted", note: "Citizen report received" },
  { status: "UNDER_REVIEW", label: "Under review", note: "Authority validation started" },
  { status: "VERIFIED", label: "Verified", note: "Issue and location confirmed" },
  { status: "ASSIGNED", label: "Assigned", note: "Roads team assigned" },
  { status: "IN_PROGRESS", label: "In progress", note: "Repair work underway" },
  { status: "RESOLVED", label: "Resolved", note: "Resolution details recorded" },
];

export function createDemoComplaint(previous: DemoComplaint, title: string, description: string, now = Date.now()): DemoComplaint | null {
  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  if (normalizedTitle.length < 6 || normalizedDescription.length < 12) return null;
  return {
    ...previous,
    publicId: `CF-DEMO-${String(now).slice(-5)}`,
    title: normalizedTitle,
    description: normalizedDescription,
    status: "SUBMITTED",
    priority: "HIGH",
    history: [{ status: "SUBMITTED", at: "Just now", note: "Test report submitted in the isolated demo workspace." }],
  };
}

export function advanceDemoComplaint(complaint: DemoComplaint): DemoComplaint | null {
  const currentIndex = demoFlow.findIndex(step => step.status === complaint.status);
  const target = demoFlow[Math.min(currentIndex + 1, demoFlow.length - 1)];
  if (!target || target.status === complaint.status) return null;
  return { ...complaint, status: target.status, history: [...complaint.history, { status: target.status, at: "Just now", note: target.note }] };
}

export function getDemoRole(): DemoRole | null {
  if (typeof window === "undefined") return null;
  const role = sessionStorage.getItem(roleKey);
  return role === "citizen" || role === "admin" ? role : null;
}

export function setDemoRole(role: DemoRole) {
  sessionStorage.setItem(roleKey, role);
}

export function clearDemoRole() {
  sessionStorage.removeItem(roleKey);
}

export function getDemoComplaint(): DemoComplaint {
  if (typeof window === "undefined") return defaultDemoComplaint;
  try {
    const saved = sessionStorage.getItem(complaintKey);
    return saved ? JSON.parse(saved) as DemoComplaint : defaultDemoComplaint;
  } catch {
    return defaultDemoComplaint;
  }
}

export function saveDemoComplaint(complaint: DemoComplaint) {
  sessionStorage.setItem(complaintKey, JSON.stringify(complaint));
}

export function resetDemoComplaint() {
  sessionStorage.removeItem(complaintKey);
}
