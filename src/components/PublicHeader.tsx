import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { NiecLogo } from "@/components/brand/NiecLogo";
import { useAuth } from "@/lib/auth";

export function PublicHeader({ className = "" }: { className?: string }) {
  const [mobileNav, setMobileNav] = useState(false);
  const { user } = useAuth();

  return (
    <header className={`sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-lg ${className}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" aria-label="NIEC Home">
          <NiecLogo variant="horizontal" theme="light" size={38} withTagline />
        </Link>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="/#about" className="transition hover:text-foreground">About</a>
          <a href="/#cops" className="transition hover:text-foreground">Communities</a>
          <a href="/#impact" className="transition hover:text-foreground">Impact</a>
          {user ? (
            <Link to="/dashboard" className="transition hover:text-foreground">Dashboard</Link>
          ) : (
            <Link to="/login" className="transition hover:text-foreground">Sign in</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileNav(true)}
            className="text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link
            to={user ? "/dashboard" : "/apply"}
            className="inline-flex items-center gap-2 rounded-full bg-[#003302] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:scale-[1.02]"
          >
            {user ? "Dashboard" : "Join NIEC"}
          </Link>
        </div>
      </div>
      {mobileNav && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg md:hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <span className="text-sm uppercase tracking-widest text-muted-foreground">Menu</span>
            <button
              onClick={() => setMobileNav(false)}
              aria-label="Close menu"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-6 text-lg">
            <a href="/#about" onClick={() => setMobileNav(false)} className="rounded-md px-3 py-3 hover:bg-muted">About</a>
            <a href="/#cops" onClick={() => setMobileNav(false)} className="rounded-md px-3 py-3 hover:bg-muted">Communities</a>
            <a href="/#impact" onClick={() => setMobileNav(false)} className="rounded-md px-3 py-3 hover:bg-muted">Impact</a>
            {user ? (
              <Link to="/dashboard" onClick={() => setMobileNav(false)} className="rounded-md px-3 py-3 hover:bg-muted">Dashboard</Link>
            ) : (
              <Link to="/login" onClick={() => setMobileNav(false)} className="rounded-md px-3 py-3 hover:bg-muted">Sign in</Link>
            )}
            <Link
              to={user ? "/dashboard" : "/apply"}
              onClick={() => setMobileNav(false)}
              className="mt-2 rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
            >
              {user ? "Dashboard" : "Join NIEC"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
