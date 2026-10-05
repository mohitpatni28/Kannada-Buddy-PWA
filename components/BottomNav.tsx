"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { SquaresFour } from "@phosphor-icons/react/dist/csr/SquaresFour";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { ChartLine } from "@phosphor-icons/react/dist/csr/ChartLine";
import { Gear } from "@phosphor-icons/react/dist/csr/Gear";

const items = [
  { href: "/", label: "Today", icon: House },
  { href: "/travel", label: "Practice", icon: SquaresFour },
  { href: "/phrasebook", label: "Search", icon: MagnifyingGlass },
  { href: "/review", label: "Progress", icon: ChartLine },
  { href: "/settings", label: "Settings", icon: Gear }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" || pathname === "/today" : pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/phrasebook" && pathname === "/library");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? "nav-item active" : "nav-item"}>
              <span className="nav-icon" aria-hidden="true">
                <Icon size={23} weight={active ? "fill" : "regular"} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
