"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  FilePlus2,
  LogOut,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import styles from "./careers-admin.module.css";

type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
type WorkplaceType = "ON_SITE" | "HYBRID" | "REMOTE";

type Job = {
  id: string;
  slug: string;
  title: string;
  team: string;
  location: string;
  summary: string;
  description: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  applicationUrl: string | null;
  applicationEmail: string | null;
  status: JobStatus;
  publishedAt: string | null;
  closesAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type JobForm = Omit<Job, "id" | "createdAt" | "updatedAt">;

const emptyJob: JobForm = {
  slug: "",
  title: "",
  team: "",
  location: "Howrah, West Bengal",
  summary: "",
  description: "",
  employmentType: "FULL_TIME",
  workplaceType: "ON_SITE",
  applicationUrl: "",
  applicationEmail: "founders@haemologix.in",
  status: "DRAFT",
  publishedAt: null,
  closesAt: null,
  sortOrder: 0,
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function statusLabel(job: Job) {
  if (job.status !== "PUBLISHED") return job.status;
  if (job.publishedAt && new Date(job.publishedAt) > new Date()) return "SCHEDULED";
  if (job.closesAt && new Date(job.closesAt) <= new Date()) return "EXPIRED";
  return "LIVE";
}

export default function CareersManager() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<JobForm>(emptyJob);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const selected = jobs.find((job) => job.id === selectedId) ?? null;
  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) =>
      !query || `${job.title} ${job.team} ${job.location} ${job.status}`.toLowerCase().includes(query),
    );
  }, [jobs, search]);

  const counts = useMemo(() => ({
    all: jobs.length,
    live: jobs.filter((job) => statusLabel(job) === "LIVE").length,
    draft: jobs.filter((job) => job.status === "DRAFT").length,
    closed: jobs.filter((job) => job.status === "CLOSED" || statusLabel(job) === "EXPIRED").length,
  }), [jobs]);

  async function loadJobs(preferredId?: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/careers/admin/jobs", { cache: "no-store" });
      if (response.status === 401) return router.refresh();
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load jobs.");
      setJobs(result.jobs);
      const id = preferredId ?? selectedId;
      if (id) {
        const fresh = result.jobs.find((job: Job) => job.id === id);
        if (fresh) selectJob(fresh);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectJob(job: Job) {
    setSelectedId(job.id);
    setForm({
      slug: job.slug,
      title: job.title,
      team: job.team,
      location: job.location,
      summary: job.summary,
      description: job.description,
      employmentType: job.employmentType,
      workplaceType: job.workplaceType,
      applicationUrl: job.applicationUrl ?? "",
      applicationEmail: job.applicationEmail ?? "",
      status: job.status,
      publishedAt: job.publishedAt,
      closesAt: job.closesAt,
      sortOrder: job.sortOrder,
    });
    setSlugEdited(true);
    setMessage("");
    setError("");
  }

  function newJob() {
    setSelectedId(null);
    setForm({ ...emptyJob });
    setSlugEdited(false);
    setMessage("");
    setError("");
  }

  function update<K extends keyof JobForm>(key: K, value: JobForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateTitle(title: string) {
    setForm((current) => ({
      ...current,
      title,
      slug: slugEdited ? current.slug : slugify(title),
    }));
  }

  async function saveJob(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      ...form,
      applicationUrl: form.applicationUrl || null,
      applicationEmail: form.applicationEmail || null,
      publishedAt: form.publishedAt || null,
      closesAt: form.closesAt || null,
    };

    try {
      const response = await fetch(
        selectedId ? `/api/careers/admin/jobs/${selectedId}` : "/api/careers/admin/jobs",
        {
          method: selectedId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (response.status === 401) return router.refresh();
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save the job.");
      setMessage(selectedId ? "Changes saved." : "Job created.");
      await loadJobs(result.job.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the job.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob() {
    if (!selectedId || !selected || !window.confirm(`Delete “${selected.title}”? This cannot be undone.`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/careers/admin/jobs/${selectedId}`, { method: "DELETE" });
      if (response.status === 401) return router.refresh();
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete the job.");
      newJob();
      await loadJobs();
      setMessage("Job deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the job.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/careers/admin/session", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className={styles.managerShell}>
      <header className={styles.managerHeader}>
        <div>
          <p className={styles.kicker}>HLX / PEOPLE OPERATIONS / LIVE DESK</p>
          <h1>Careers control room</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/careers" target="_blank"><ArrowUpRight /> Public careers page</Link>
          <button type="button" onClick={logout}><LogOut /> Sign out</button>
        </div>
      </header>

      <section className={styles.statStrip} aria-label="Job summary">
        <div><span>ALL ROLES</span><strong>{counts.all}</strong></div>
        <div><span>LIVE NOW</span><strong>{counts.live}</strong></div>
        <div><span>DRAFTS</span><strong>{counts.draft}</strong></div>
        <div><span>CLOSED / EXPIRED</span><strong>{counts.closed}</strong></div>
      </section>

      <div className={styles.managerGrid}>
        <aside className={styles.jobRail}>
          <div className={styles.railTools}>
            <button type="button" className={styles.newButton} onClick={newJob}>
              <FilePlus2 /> New position
            </button>
            <button type="button" className={styles.iconButton} onClick={() => void loadJobs()} aria-label="Refresh jobs">
              <RefreshCw className={loading ? styles.spinning : ""} />
            </button>
          </div>
          <label className={styles.searchBox}>
            <Search aria-hidden="true" />
            <span className={styles.srOnly}>Search positions</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles or teams" />
          </label>
          <div className={styles.jobList}>
            {loading && jobs.length === 0 ? <p className={styles.railEmpty}>Loading positions…</p> : null}
            {!loading && filteredJobs.length === 0 ? <p className={styles.railEmpty}>No positions match this view.</p> : null}
            {filteredJobs.map((job) => (
              <button
                type="button"
                key={job.id}
                onClick={() => selectJob(job)}
                className={`${styles.jobCard} ${selectedId === job.id ? styles.jobCardActive : ""}`}
              >
                <span className={styles.jobStatus} data-status={statusLabel(job)}>{statusLabel(job)}</span>
                <strong>{job.title}</strong>
                <small>{job.team} / {job.location}</small>
                <time>{new Date(job.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</time>
              </button>
            ))}
          </div>
          <Link href="/admin" className={styles.adminBack}><ArrowLeft /> Main admin dashboard</Link>
        </aside>

        <section className={styles.editorPane}>
          <div className={styles.editorHeading}>
            <div className={styles.editorIcon}><BriefcaseBusiness /></div>
            <div>
              <span>{selectedId ? `EDIT / ${selectedId.slice(-8).toUpperCase()}` : "NEW / UNSAVED"}</span>
              <h2>{form.title || "Untitled position"}</h2>
            </div>
            {selected && statusLabel(selected) === "LIVE" ? (
              <Link href={`/careers/${selected.slug}`} target="_blank">View live <ArrowUpRight /></Link>
            ) : null}
          </div>

          <form onSubmit={saveJob} className={styles.editorForm}>
            <fieldset>
              <legend>01 / ROLE IDENTITY</legend>
              <div className={styles.twoColumns}>
                <label>Job title<input value={form.title} onChange={(event) => updateTitle(event.target.value)} maxLength={160} required /></label>
                <label>URL slug<input value={form.slug} onChange={(event) => { setSlugEdited(true); update("slug", event.target.value.toLowerCase()); }} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={160} required /></label>
                <label>Team<input value={form.team} onChange={(event) => update("team", event.target.value)} maxLength={100} required /></label>
                <label>Location<input value={form.location} onChange={(event) => update("location", event.target.value)} maxLength={160} required /></label>
                <label>Employment type<select value={form.employmentType} onChange={(event) => update("employmentType", event.target.value as EmploymentType)}><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CONTRACT">Contract</option><option value="INTERNSHIP">Internship</option></select></label>
                <label>Workplace<select value={form.workplaceType} onChange={(event) => update("workplaceType", event.target.value as WorkplaceType)}><option value="ON_SITE">On site</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option></select></label>
              </div>
            </fieldset>

            <fieldset>
              <legend>02 / PUBLIC BRIEF</legend>
              <label>Short summary<textarea className={styles.summaryInput} value={form.summary} onChange={(event) => update("summary", event.target.value)} maxLength={300} required /><small>{form.summary.length}/300</small></label>
              <label>Full description <span>Markdown supported</span><textarea className={styles.descriptionInput} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder={"## What you’ll do\n\n- Build clear, reliable workflows\n- Work closely with hospitals and donors\n\n## What we’re looking for\n\nTell candidates what matters."} required /></label>
            </fieldset>

            <fieldset>
              <legend>03 / APPLICATION ROUTE</legend>
              <div className={styles.twoColumns}>
                <label>Application URL <span>Optional</span><input type="url" value={form.applicationUrl ?? ""} onChange={(event) => update("applicationUrl", event.target.value)} placeholder="https://…" /></label>
                <label>Application email <span>Optional</span><input type="email" value={form.applicationEmail ?? ""} onChange={(event) => update("applicationEmail", event.target.value)} placeholder="careers@haemologix.in" /></label>
              </div>
              <p className={styles.fieldNote}>Published roles need at least one application route. The URL takes priority when both are present.</p>
            </fieldset>

            <fieldset>
              <legend>04 / PUBLISHING</legend>
              <div className={styles.publishGrid}>
                <label>Status<select value={form.status} onChange={(event) => update("status", event.target.value as JobStatus)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="CLOSED">Closed</option></select></label>
                <label>Publish at <span>Blank = immediately</span><input type="datetime-local" value={toLocalInput(form.publishedAt)} onChange={(event) => update("publishedAt", toIsoOrNull(event.target.value))} /></label>
                <label>Close at <span>Optional</span><input type="datetime-local" value={toLocalInput(form.closesAt)} onChange={(event) => update("closesAt", toIsoOrNull(event.target.value))} /></label>
                <label>Sort order <span>Lower appears first</span><input type="number" min={-10000} max={10000} value={form.sortOrder} onChange={(event) => update("sortOrder", Number(event.target.value))} /></label>
              </div>
            </fieldset>

            {(error || message) && <p className={error ? styles.formError : styles.formSuccess} role="status">{error || message}</p>}
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveButton} disabled={saving}>
                <Save /> {saving ? "Saving…" : selectedId ? "Save changes" : "Create position"}
              </button>
              {selectedId ? <button type="button" className={styles.deleteButton} onClick={deleteJob} disabled={saving}><Trash2 /> Delete</button> : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
