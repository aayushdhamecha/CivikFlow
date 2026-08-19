import { useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, Check, ChevronLeft, ChevronRight, FileImage, ImagePlus, MapPin, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { CitizenLayout } from "@/components/civic/CitizenLayout";
import { type CivicLocation, LocationPicker } from "@/components/civic/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

const steps = ["Evidence", "Location", "Details", "Review"];
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

function CategorySelector({
  categories, loading, failed, selectedId, onSelect, onRetry,
}: {
  categories: Array<{ id: number; name: string }> | undefined;
  loading: boolean;
  failed: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRetry: () => void;
}) {
  if (loading) return <div className="mt-2 grid gap-2 sm:grid-cols-2"><div className="h-12 animate-pulse rounded-xl bg-slate-100" /><div className="h-12 animate-pulse rounded-xl bg-slate-100" /></div>;
  if (failed) return <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-4"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" /><div><p className="text-sm font-bold text-rose-900">Categories could not be loaded</p><p className="mt-1 text-sm text-rose-800">Check your connection and try again. Your report details are still safe on this page.</p><Button type="button" variant="outline" size="sm" className="mt-3 border-rose-200 bg-white text-rose-800" onClick={onRetry}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Try again</Button></div></div></div>;
  if (!categories?.length) return <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">The issue catalog is not configured yet</p><p className="mt-1 text-sm text-amber-800">Please contact the civic service administrator before submitting a new report.</p></div>;
  return <div className="mt-2 grid gap-2 sm:grid-cols-2">{categories.map(category => <button key={category.id} type="button" onClick={() => onSelect(category.id)} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${selectedId === category.id ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600" : "border-slate-200 hover:border-emerald-300"}`}><span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{category.name}</span></button>)}</div>;
}

export default function ReportIssue() {
  const [, navigate] = useLocation();
  const categoryQuery = trpc.civic.catalog.categories.useQuery();
  const createComplaint = trpc.civic.complaints.create.useMutation();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<CivicLocation | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const categoriesBlocked = categoryQuery.isLoading || categoryQuery.isError || !categoryQuery.data?.length;

  function selectFile(selected?: File) {
    if (!selected) return;
    if (!allowedTypes.includes(selected.type)) return toast.error("Use a JPG, PNG, or WebP image.");
    if (selected.size > 5 * 1024 * 1024) return toast.error("Images must be smaller than 5 MB.");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function validateStep() {
    if (step === 1 && !location) { toast.error("Confirm the issue location before continuing."); return false; }
    if (step === 2) {
      if (categoriesBlocked) { toast.error("Issue categories are not ready yet."); return false; }
      if (!categoryId) { toast.error("Select an issue category."); return false; }
      if (title.trim().length < 6) { toast.error("Give the issue a clearer title."); return false; }
      if (description.trim().length < 12) { toast.error("Please add a little more detail."); return false; }
    }
    return true;
  }

  function next() { if (validateStep()) setStep(current => Math.min(current + 1, steps.length - 1)); }

  function readAsBase64(fileToRead: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = event => { if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 12)); };
      reader.onerror = () => reject(new Error("The selected photo could not be read."));
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.readAsDataURL(fileToRead);
    });
  }

  async function uploadEvidence(fileToUpload: File, complaintId: number) {
    const base64Data = await readAsBase64(fileToUpload);
    setUploadProgress(15);
    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", "/api/evidence-upload");
      request.setRequestHeader("Content-Type", "application/json");
      request.withCredentials = true;
      request.upload.onprogress = event => { if (event.lengthComputable) setUploadProgress(15 + Math.round((event.loaded / event.total) * 70)); };
      request.upload.onload = () => setUploadProgress(88);
      request.onerror = () => reject(new Error("The photo could not be transferred."));
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) { setUploadProgress(100); resolve(); return; }
        try { reject(new Error((JSON.parse(request.responseText) as { message?: string }).message || "Evidence could not be uploaded.")); }
        catch { reject(new Error("Evidence could not be uploaded.")); }
      };
      request.send(JSON.stringify({ complaintId, filename: fileToUpload.name, mimeType: fileToUpload.type, base64Data, mediaType: "EVIDENCE" }));
    });
  }

  async function submit() {
    if (!validateStep() || !location || !categoryId) return;
    setUploadProgress(file ? 0 : 100);
    setIsUploading(Boolean(file));
    try {
      const report = await createComplaint.mutateAsync({ title, description, categoryId, latitude: location.latitude, longitude: location.longitude, address: location.address });
      if (file) {
        try { await uploadEvidence(file, report.id); }
        catch { toast.warning("Your report was submitted, but the photo could not be attached. You can try again later."); }
      }
      setSubmittedId(report.publicId);
    } catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't submit your report. Please try again."); }
    finally { setIsUploading(false); }
  }

  const categoryName = categoryQuery.data?.find(item => item.id === categoryId)?.name ?? "Not selected";
  if (submittedId) return <CitizenLayout><main className="mx-auto grid min-h-[75vh] max-w-xl place-items-center px-4 pb-24"><section className="w-full rounded-3xl border border-emerald-100 bg-white p-7 text-center shadow-sm"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-8 w-8" /></span><p className="mt-6 text-sm font-bold uppercase tracking-[.14em] text-emerald-700">Report submitted</p><h1 className="mt-2 text-3xl font-bold">Thank you for taking action.</h1><p className="mt-4 text-slate-600">Your report is now in the civic workflow. We’ll show every verified update in your timeline.</p><div className="my-6 rounded-2xl bg-slate-950 px-4 py-5 text-white"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Complaint ID</p><p className="mt-1 text-2xl font-bold tracking-wide">{submittedId}</p></div><div className="flex flex-col gap-3 sm:flex-row"><Button className="flex-1 bg-emerald-700 hover:bg-emerald-800" onClick={() => navigate(`/complaints/${submittedId}`)}>Track report</Button><Button className="flex-1" variant="outline" onClick={() => navigate("/citizen")}>Back to home</Button></div></section></main></CitizenLayout>;

  return <CitizenLayout><main className="mx-auto max-w-3xl px-4 pb-24 pt-7 sm:px-6"><button onClick={() => navigate("/citizen")} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-emerald-700"><ChevronLeft className="h-4 w-4" /> Back to home</button><div className="mt-5"><p className="text-sm font-bold uppercase tracking-[.14em] text-emerald-700">New civic report</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Report a problem</h1><p className="mt-2 text-slate-600">A few clear details help the right team take action faster.</p></div><ol className="mt-7 grid grid-cols-4 gap-2">{steps.map((label, index) => <li key={label} className="min-w-0"><div className={`h-1.5 rounded-full ${index <= step ? "bg-emerald-600" : "bg-slate-200"}`} /><span className={`mt-2 block truncate text-xs font-semibold ${index === step ? "text-emerald-700" : "text-slate-500"}`}>{index + 1}. {label}</span></li>)}</ol><section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">{step === 0 && <div><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ImagePlus className="h-5 w-5" /></span><h2 className="mt-4 text-xl font-bold">Add a clear photo</h2><p className="mt-1 text-sm leading-6 text-slate-600">A photo helps the team understand the issue. It is optional, but useful.</p>{preview ? <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-200"><img src={preview} alt="Selected evidence preview" className="h-64 w-full object-cover" /><button type="button" onClick={() => { setFile(null); setPreview(null); }} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-800 shadow"><X className="h-4 w-4" /></button><p className="absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-2 py-1 text-xs font-semibold text-white">{file?.name}</p></div> : <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center transition hover:border-emerald-300 hover:bg-emerald-50/30"><FileImage className="h-8 w-8 text-emerald-700" /><span className="mt-3 font-bold">Choose a photo</span><span className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP · up to 5 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => selectFile(event.target.files?.[0])} /></label>}</div>}{step === 1 && <div><h2 className="text-xl font-bold">Confirm the issue location</h2><p className="mt-1 text-sm leading-6 text-slate-600">Place the marker where the civic problem is actually located.</p><div className="mt-5"><LocationPicker value={location} onChange={setLocation} /></div></div>}{step === 2 && <div className="space-y-5"><div><label className="text-sm font-bold">Issue category</label><CategorySelector categories={categoryQuery.data} loading={categoryQuery.isLoading} failed={categoryQuery.isError} selectedId={categoryId} onSelect={setCategoryId} onRetry={() => categoryQuery.refetch()} /></div><div><label htmlFor="issue-title" className="text-sm font-bold">What is the problem?</label><Input id="issue-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="For example: Large pothole near bus stop" className="mt-2 h-11" maxLength={160} /></div><div><label htmlFor="issue-description" className="text-sm font-bold">Add helpful details</label><Textarea id="issue-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Tell us what is wrong and how it is affecting people." className="mt-2 min-h-32" maxLength={5_000} /><p className="mt-1 text-right text-xs text-slate-400">{description.length}/5000</p></div></div>}{step === 3 && <div><h2 className="text-xl font-bold">Review your report</h2><p className="mt-1 text-sm text-slate-600">Check the details below before sending them to the civic workflow.</p><div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200"><div className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Issue</p><p className="mt-1 font-bold">{title}</p><p className="mt-1 text-sm text-slate-600">{description}</p></div><div className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</p><p className="mt-1 font-semibold">{categoryName}</p></div><div className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirmed location</p><p className="mt-1 text-sm font-semibold">{location?.address}</p></div><div className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Evidence</p><p className="mt-1 text-sm font-semibold">{file ? file.name : "No photo attached"}</p>{isUploading && <div className="mt-3"><div className="h-2 overflow-hidden rounded bg-slate-100"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-1 text-xs text-slate-500">{uploadProgress < 88 ? `Transferring photo… ${uploadProgress}%` : "Securing evidence in storage…"}</p></div>}</div></div><p className="mt-4 rounded-xl bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">AI assistance is used as a recommendation for the reviewing team; it does not replace verified civic assessment.</p></div>}</section><div className="mt-5 flex items-center justify-between gap-3"><Button variant="outline" onClick={() => setStep(current => Math.max(0, current - 1))} disabled={step === 0 || createComplaint.isPending || isUploading}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>{step < steps.length - 1 ? <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={next} disabled={step === 2 && categoriesBlocked}>Continue <ChevronRight className="ml-1 h-4 w-4" /></Button> : <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={submit} disabled={createComplaint.isPending || isUploading}>{createComplaint.isPending || isUploading ? "Submitting…" : <><Send className="mr-2 h-4 w-4" />Submit report</>}</Button>}</div></main></CitizenLayout>;
}
