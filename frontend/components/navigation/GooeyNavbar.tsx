"use client";

import { usePathname } from "next/navigation";
import GooeyNav from "./GooeyNav";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Upload", href: "/upload" },
  { label: "History", href: "/history" },
  { label: "Results", href: "/results" },
];

export default function GooeyNavbar() {
  const pathname = usePathname();
  const activeIndex = navItems.findIndex((item) => item.href === pathname);

  return (
    <GooeyNav
      items={navItems}
      initialActiveIndex={activeIndex !== -1 ? activeIndex : 0}
    />
  );
}
