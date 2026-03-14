"use client";

import dynamic from "next/dynamic";

const ExpireLicense = dynamic(
  () => import("@/components/Extrinsics/expireLicense"),
  { ssr: false }
);

const NavBar = dynamic(() => import("@/components/NavBar"), {
  ssr: false,
});

export default function ExpireLicensePage() {
  return (
    <div className="min-h-screen bg-[#1C1A11]">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-[#FACC15] mb-8">Expire License</h1>
        <ExpireLicense />
      </main>
    </div>
  );
}