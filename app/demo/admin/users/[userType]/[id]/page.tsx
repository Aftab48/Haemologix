"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import GradientBackground from "@/components/GradientBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDemoSandbox } from "@/hooks/use-demo-sandbox";
import type { DemoAdminView } from "@/lib/demo/types";

export default function DemoUserDetailPage() {
  const params = useParams<{ userType: string; id: string }>();
  const { data, loading } = useDemoSandbox<DemoAdminView>("admin");
  const user = data?.users.find((item) => item.id === params.id && item.role.toLowerCase() === params.userType.toLowerCase());
  return (
    <GradientBackground className="min-h-screen p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="outline" className="mb-5"><Link href="/demo/admin">Back to demo admin</Link></Button>
        <Card className="glass-morphism">
          <CardHeader><CardTitle className="text-text-dark">{loading ? "Loading synthetic profile…" : user?.name || "Demo user not found"}</CardTitle></CardHeader>
          {user && <CardContent className="space-y-3 text-text-dark"><div className="flex gap-2"><Badge>{user.role}</Badge><Badge className={user.status === "APPROVED" ? "bg-green-600" : user.status === "PENDING" ? "bg-yellow-600" : "bg-red-700"}>{user.suspended ? "SUSPENDED" : user.status}</Badge></div><p><strong>Email:</strong> {user.email}</p><p><strong>Phone:</strong> {user.phone}</p><p><strong>Address:</strong> {user.address}</p>{user.bloodGroup && <p><strong>Blood group:</strong> {user.bloodGroup}</p>}<p className="rounded-lg bg-yellow-500/10 p-3 text-sm">This profile is synthetic and stored only inside the global demo sandbox.</p></CardContent>}
        </Card>
      </div>
    </GradientBackground>
  );
}
