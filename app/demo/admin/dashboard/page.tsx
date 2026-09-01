import { ShieldCheck } from "lucide-react";

export default async function DemoAdminDashboard() {
  return (
    <div className="dashboard-surface admin-gate flex min-h-screen flex-col items-center justify-center p-6">
      <div className="dash-card w-full max-w-md p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="chip-ruby flex h-12 w-12 items-center justify-center rounded-sm">
            <ShieldCheck aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-bold text-primary">Admin Panel / Demo</h1>
        </div>

        <p className="mb-6 text-gray-700">
          This is the demo admin dashboard. No sign-in is required. You are viewing the isolated{" "}
          <strong>/demo/admin/dashboard</strong> workspace.
        </p>

        <div className="rounded-sm border border-secondary/30 bg-accent/25 px-4 py-3 text-sm font-medium text-secondary">
          Demo mode / Auth check skipped
        </div>
      </div>
    </div>
  );
}
