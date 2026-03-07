"use client";
import dynamic from "next/dynamic";

const NavBar = dynamic(() => import("@/components/NavBar"), {
  ssr: false,
});

const AcceptLicense = dynamic(
  () => import("@/components/Extrinsics/acceptLicense"),
  {
    ssr: false,
  }
);

export default function AvailableOffers() {
  return (
    <div className="scrollable bg-[#1C1A11] ">
      <NavBar />
      <AcceptLicense />
    </div>
  );
}
