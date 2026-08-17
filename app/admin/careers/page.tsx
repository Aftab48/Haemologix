import type { Metadata } from "next";
import { isCareersAdmin } from "@/lib/careers/auth";
import CareersAdminLogin from "./CareersAdminLogin";
import CareersManager from "./CareersManager";
import styles from "./careers-admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Careers Desk | Haemologix Admin",
  robots: { index: false, follow: false },
};

export default async function CareersAdminPage() {
  const authenticated = await isCareersAdmin();

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      {authenticated ? <CareersManager /> : <CareersAdminLogin />}
    </main>
  );
}
