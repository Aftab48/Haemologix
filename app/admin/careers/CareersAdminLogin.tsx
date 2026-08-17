"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import styles from "./careers-admin.module.css";

export default function CareersAdminLogin() {
  const router = useRouter();
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/careers/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      setPasskey("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.loginShell}>
      <div className={styles.loginTopline}>
        <span>HLX / PEOPLE OPERATIONS</span>
        <span>RESTRICTED DESK</span>
      </div>
      <div className={styles.loginCard}>
        <div className={styles.loginMarker}><KeyRound aria-hidden="true" /></div>
        <p className={styles.kicker}>CAREERS CONTROL ROOM</p>
        <h1>Publish the work that cannot wait.</h1>
        <p className={styles.loginCopy}>
          Sign in with the dedicated careers passkey. This desk uses the isolated careers database,
          not the production application database.
        </p>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <label htmlFor="careers-passkey">Careers admin passkey</label>
          <input
            id="careers-passkey"
            type="password"
            autoComplete="current-password"
            value={passkey}
            onChange={(event) => setPasskey(event.target.value)}
            required
            autoFocus
          />
          {error && <p className={styles.formError} role="alert">{error}</p>}
          <button type="submit" disabled={submitting || !passkey}>
            {submitting ? "Checking…" : "Enter careers desk"}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
        <Link href="/admin" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" /> Back to main admin
        </Link>
      </div>
    </section>
  );
}
