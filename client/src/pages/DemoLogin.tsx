import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoCredentials, getDemoRoleForCredentials, setDemoRole, type DemoRole } from "@/lib/demoSession";
import { ArrowLeft, ArrowRight, CircleCheck, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";

export default function DemoLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function useCredential(role: DemoRole) {
    setEmail(demoCredentials[role].email);
    setPassword(demoCredentials[role].password);
    setError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const role = getDemoRoleForCredentials(email, password);
    if (!role) {
      setError("Use one of the test credentials displayed below. These accounts exist only in the local demo workspace.");
      return;
    }
    setDemoRole(role);
    navigate("/demo");
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d1fae5,transparent_35%),#f8fafc] px-5 py-8 text-slate-950 sm:px-6 lg:py-14">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-800"><ArrowLeft className="h-4 w-4" /> Back to CIVICFLOW</Link>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
        <section className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/15 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-200"><ShieldCheck className="h-3.5 w-3.5" /> Isolated product demonstration</div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Explore the workflow without a real account.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Use a test identity to explore citizen reporting or administrator operations. Demo actions use sample data in this browser only: they do not create database records, upload evidence, or access real complaints.</p>
          <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/[.06] p-5 text-sm text-slate-200">
            {[[CircleCheck, "Test credentials are intentionally public", "They only unlock this isolated local demo."], [LockKeyhole, "Production access remains protected", "Real citizen, authority, and admin routes still require OAuth and server-side role checks."], [UsersRound, "Role-specific walkthroughs", "See different citizen and admin capabilities with the same sample report."]].map(([Icon, title, copy]) => { const ActualIcon = Icon as typeof CircleCheck; return <div className="flex gap-3" key={title as string}><ActualIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><p><strong className="block text-white">{title as string}</strong><span className="text-slate-300">{copy as string}</span></p></div>; })}
          </div>
        </section>
        <div className="space-y-5">
          <Card className="border-white bg-white/95 shadow-xl shadow-slate-900/10"><CardHeader><CardTitle>Demo sign in</CardTitle><CardDescription>Choose a test role below, then continue to its sample workspace.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="demo-email">Email</Label><Input id="demo-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="demo.citizen@civicflow.test" autoComplete="off" /></div><div className="space-y-2"><Label htmlFor="demo-password">Password</Label><Input id="demo-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter demo password" autoComplete="off" /></div>{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}<Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">Open demo workspace <ArrowRight className="ml-2 h-4 w-4" /></Button></form></CardContent></Card>
          <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(demoCredentials) as DemoRole[]).map(role => <Card key={role} className="border-emerald-100 bg-white"><CardContent className="p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">{role === "citizen" ? "Citizen demo" : "Administrator demo"}</p><p className="mt-3 break-all font-mono text-xs text-slate-700">{demoCredentials[role].email}</p><p className="mt-1 font-mono text-xs text-slate-700">{demoCredentials[role].password}</p><Button type="button" variant="outline" size="sm" className="mt-4 w-full" onClick={() => useCredential(role)}>Use {role} demo</Button></CardContent></Card>)}</div>
        </div>
      </div>
    </div>
  </main>;
}
