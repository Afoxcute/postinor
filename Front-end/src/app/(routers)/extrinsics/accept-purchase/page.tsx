"use client";

import dynamic from "next/dynamic";

const NavBar = dynamic(() => import("@/components/NavBar"), {
  ssr: false,
});

const AcceptPurchase = dynamic(() => import("@/components/Extrinsics/acceptPurchase"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[#1C1A11]">
      <p className="text-white">Loading purchase offers...</p>
    </div>
  ),
});

export default function AcceptPurchasePage() {
  return (
    <div className="scrollable bg-[#1C1A11]">
      <NavBar />
      <AcceptPurchase />
    </div>
  );
}

