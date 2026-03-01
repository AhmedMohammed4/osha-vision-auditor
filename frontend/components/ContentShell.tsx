"use client";

import { usePathname } from "next/navigation";

export default function ContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Landing page keeps the transparent/beams look.
  // Every other page gets a solid background so text is readable.
  if (pathname === "/") return <>{children}</>;

  return (
    <div style={{ position: "relative", zIndex: 20, backgroundColor: "var(--bg-base)" }}>
      {children}
    </div>
  );
}
