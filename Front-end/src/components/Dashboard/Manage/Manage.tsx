"use client";
import React from "react";
import dynamic from "next/dynamic";

// Dynamically import Licensing to prevent SSR issues with browser APIs (Polkadot.js)
const Licensing = dynamic(() => import("./License"), {
  ssr: false,
  loading: () => (
    <div className="bg-[#1C1A11] w-full h-screen flex items-center justify-center">
      <p className="text-white">Loading license management...</p>
    </div>
  ),
});

interface ManageProps {
  onDataChange?: (data: any) => void;
}

export default function Manage({ onDataChange }: ManageProps) {
  return (
    <div className="bg-[#1C1A11] w-full">
      <Licensing onDataChange={onDataChange} />
    </div>
  );
}
