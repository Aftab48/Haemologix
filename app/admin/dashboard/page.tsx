import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { checkRole } from "../../../utils/roles";

export default async function AdminDashboard() {
  const isAdmin = await checkRole("admin");

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="dashboard-surface admin-gate flex min-h-screen flex-col items-center justify-center p-6">
      <div className="dash-card w-full max-w-md p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="chip-ruby flex h-12 w-12 items-center justify-center rounded-sm">
            <ShieldCheck aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-bold text-primary">Admin Panel</h1>
        </div>

        <p className="mb-6 text-gray-700">
          Authorization successful. You are viewing this page because your role is set to{" "}
          <strong>admin</strong>.
        </p>

        <div className="rounded-sm border border-secondary/30 bg-accent/25 px-4 py-3 text-sm font-medium text-secondary">
          AuthGuard is active
        </div>
      </div>
    </div>
  );
}
