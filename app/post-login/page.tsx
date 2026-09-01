"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";

export default function PostLogin() {
  const Menudata: { title: string }[] = [
    { title: "Donor" },
    { title: "Hospital/Blood Bank" },
    { title: "Admin" },
  ];

  return (
    <GradientBackground className="role-picker flex flex-col py-20 px-4 items-center justify-center">
      <div className="role-picker-heading">
        <p>Access / Select workspace</p>
        <h1>Choose your role</h1>
      </div>
      <div className="role-picker-grid grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Menudata.map((data, i) => (
          <Card
            key={i}
            className="role-picker-card glass-morphism border border-accent/30 text-text-dark flex min-h-48 flex-col justify-between items-center h-full p-4"
          >
            <Link
              href={i === 0 ? "/donor" : i === 1 ? "/hospital" : "/admin"}
              target={i === 3 || i === 4 ? "_blank" : "_self"}
            >
              <CardHeader className="text-center font-semibold mt-4">
                <CardTitle className="text-text-dark"> {data.title} </CardTitle>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>
    </GradientBackground>
  );
}
