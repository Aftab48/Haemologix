export default async function DemoAdminDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🛡️</span>
          <h1 className="text-2xl font-bold text-red-600">Admin Panel (Demo)</h1>
        </div>

        <p className="text-gray-700 mb-6">
          This is the demo admin dashboard. No sign-in required. You are viewing this page from{" "}
          <strong>/demo/admin/dashboard</strong>.
        </p>

        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
          ✅ Demo mode – Auth check skipped
        </div>
      </div>
    </div>
  );
}
