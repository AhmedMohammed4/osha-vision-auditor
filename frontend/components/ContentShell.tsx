"use client";

import { usePathname } from "next/navigation";

export default function ContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // These pages manage their own contained card layout.
  const noShell = ["/", "/history", "/results", "/upload"];
  if (noShell.includes(pathname)) return <>{children}</>;

  return (
    <div style={{ position: "relative", zIndex: 20, backgroundColor: "var(--bg-base)" }}>
      {children}
    </div>
  );
}
