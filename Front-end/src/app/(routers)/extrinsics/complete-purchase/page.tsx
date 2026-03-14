"use client";

import dynamic from "next/dynamic";

const NavBar = dynamic(() => import("@/components/NavBar"), {
  ssr: false,
});

const CompletePurchase = dynamic(() => import("@/components/Extrinsics/completePurchase"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[#1C1A11]">
      <p className="text-white">Loading purchase contracts...</p>
    </div>
  ),
});

export default function CompletePurchasePage() {
  return (
    <div className="scrollable bg-[#1C1A11]">
      <NavBar />
      <CompletePurchase />
    </div>
  );
}


