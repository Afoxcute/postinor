"use client";

import dynamic from "next/dynamic";

const NavBar = dynamic(() => import("@/components/NavBar"), {
  ssr: false,
});

const MakePeriodicPaymentPage = dynamic(() => import("@/components/Extrinsics/makePeriodicPayment"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[#1C1A11]">
      <p className="text-white">Loading contracts...</p>
    </div>
  ),
});

export default function MakePeriodicPaymentRoute() {
  return (
    <div className="scrollable bg-[#1C1A11]">
      <NavBar />
      <MakePeriodicPaymentPage />
    </div>
  );
}


