import { redirect } from "next/navigation";
import { checkRole } from "@/utils/roles"; 

export default async function AdminDashboard() {
  const isAdmin = await checkRole("admin");

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🛡️</span>
          <h1 className="text-2xl font-bold text-red-600">Admin Panel</h1>
        </div>
        
        <p className="text-gray-700 mb-6">
          Authorization Successful! You are viewing this page because your role is set to <strong>'admin'</strong>.
        </p>

        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
          ✅ AuthGuard is Active
        </div>
      </div>
    </div>
  );
}