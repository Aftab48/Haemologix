"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function PostLogin() {
  const Menudata: { title: String }[] = [
    { title: "Donor" },
    { title: "Hospital/Blood Bank" },
    { title: "Admin" },
  ];

  return (
    <div className="flex flex-col py-20 px-4 bg-gradient-to-br from-red-900 via-red-900 to-yellow-600 items-center justify-center min-h-screen">
      <h1 className="text-xl font-bold mb-4">Choose your role</h1>
      <div className="grid grid-cols-1 gap-x-16 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {Menudata.map((data, i) => (
          <Card
            key={i}
            className="border-px shadow-md bg-white/5 border-white/20 text-white placeholder:text-gray-400 flex flex-col justify-between items-center h-full p-4"
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
    </div>
  );
}
