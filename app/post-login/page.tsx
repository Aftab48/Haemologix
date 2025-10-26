"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";

export default function PostLogin() {
  const Menudata: { title: String }[] = [
    { title: "Donor" },
    { title: "Hospital/Blood Bank" },
    { title: "Admin" },
  ];

  return (
    <GradientBackground className="flex flex-col py-20 px-4 items-center justify-center">
      <h1 className="text-xl font-outfit font-bold text-primary mb-4">Choose your role</h1>
      <div className="grid grid-cols-1 gap-x-16 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {Menudata.map((data, i) => (
          <Card
            key={i}
            className="glass-morphism border border-accent/30 card-hover text-white placeholder:text-gray-400 flex flex-col justify-between items-center h-full p-4 shadow-lg hover:shadow-primary/50"
          >
            <Link
              href={i === 0 ? "/donor" : i === 1 ? "/hospital" : "/admin"}
              target={i === 3 || i === 4 ? "_blank" : "_self"}
            >
              <CardHeader className="text-center font-semibold mt-4">
                <CardTitle> {data.title} </CardTitle>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>
    </GradientBackground>
  );
}
