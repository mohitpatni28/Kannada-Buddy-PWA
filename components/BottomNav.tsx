"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Today", icon: "T" },
  { href: "/travel", label: "Practice", icon: "P" },
  { href: "/phrasebook", label: "Search", icon: "S" },
  { href: "/review", label: "Progress", icon: "G" },
  { href: "/settings", label: "Settings", icon: "⚙" }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" || pathname === "/today" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"}>
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
