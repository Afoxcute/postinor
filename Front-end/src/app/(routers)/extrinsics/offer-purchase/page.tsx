"use client";

import dynamic from "next/dynamic";

const NavBar = dynamic(() => import("@/components/NavBar"), {
  ssr: false,
});

const OfferPurchasePage = dynamic(() => import("@/components/Extrinsics/offerPurchase"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[#1C1A11]">
      <p className="text-white">Loading NFTs...</p>
    </div>
  ),
});

export default function OfferPurchaseRoute() {
  return (
    <div className="scrollable bg-[#1C1A11]">
      <NavBar />
      <OfferPurchasePage />
    </div>
  );
}


