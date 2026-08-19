import { AdminDemo, CitizenDemo } from "@/pages/DemoWorkspace";
import { defaultDemoComplaint, demoFlow } from "@/lib/demoSession";
import { Eye, ShieldCheck } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function DemoPreview() {
  const [, params] = useRoute("/demo-preview/:role");
  const isAdmin = params?.role === "admin";
  const currentIndex = isAdmin ? 3 : 0;
  const complaint = { ...defaultDemoComplaint, history: [...defaultDemoComplaint.history] };

  return <main className="min-h-screen bg-[#f7f9f8] text-slate-950"><div className="border-b border-blue-200 bg-blue-50"><div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3 text-sm leading-6 text-blue-950 sm:px-6"><Eye className="h-4 w-4 shrink-0" /><p><strong>Read-only visual preview.</strong> This route exists only to inspect the isolated demonstration interface. Use <Link href="/demo-login" className="font-bold underline">Demo sign in</Link> with test credentials for the interactive sample workflow.</p></div></div><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-4 font-extrabold tracking-tight sm:px-6"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-700 text-white"><ShieldCheck className="h-5 w-5" /></span>CIVIC<span className="text-emerald-700">FLOW</span><span className="ml-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">{isAdmin ? "Administrator" : "Citizen"} preview</span></div></header><div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:py-10">{isAdmin ? <AdminDemo complaint={{ ...complaint, status: demoFlow[currentIndex].status, history: [...complaint.history, { status: demoFlow[currentIndex].status, at: "Preview", note: "Read-only administrator preview state." }] }} currentIndex={currentIndex} onAdvance={() => undefined} readOnly /> : <CitizenDemo complaint={complaint} draftTitle={complaint.title} draftDescription={complaint.description} onTitle={() => undefined} onDescription={() => undefined} onSubmit={event => event.preventDefault()} currentIndex={currentIndex} />}</div></main>;
}
