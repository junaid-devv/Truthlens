"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, History, Menu, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const navLinks = [
  { href: "/upload", label: "Analyze", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <BrandMark href="/" />

        <nav className="app-nav desktop-only" aria-label="Primary">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link${isActive ? " is-active" : ""}`}
              >
                <link.icon size={16} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="header-actions desktop-only">
          <Link href="/upload" className="button button-primary button-small">
            New Analysis
          </Link>
        </div>

        <button
          type="button"
          className="icon-button mobile-only"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="mobile-panel mobile-only">
          <div className="mobile-panel__inner">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link${isActive ? " is-active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <link.icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <Link
              href="/upload"
              className="button button-primary button-wide"
              onClick={() => setMobileOpen(false)}
            >
              Start New Analysis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
