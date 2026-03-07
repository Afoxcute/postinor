"use client";
import BentoLinks from "@/components/Dashboard/BentoLinks";
import AcceptLicense from "@/components/Extrinsics/acceptLicense";
import dynamic from "next/dynamic";

const NavBar = dynamic(() => import("@/components/NavBar"), {
  ssr: false,
});
export default function Extrinsics() {
  return (
    <div className="scrollable bg-[#1C1A11] ">
      <NavBar />
      <BentoLinks />
    </div>
  );
}
