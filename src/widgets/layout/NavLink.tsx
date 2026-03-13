"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

interface NavLinkProps {
  to: string;
  className?: string | ((props: { isActive: boolean; isPending: boolean }) => string);
  activeClassName?: string;
  pendingClassName?: string;
  children?: React.ReactNode;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, pendingClassName, to, end, ...props }, ref) => {
    const pathname = usePathname();

    // Simular a lógica do NavLink original do react-router-dom
    const isActive = end
      ? pathname === to
      : pathname.startsWith(to);

    const isPending = false; // Next.js Link não tem estado 'pending' no cliente da mesma forma

    const resolvedClassName = typeof className === "function"
      ? className({ isActive, isPending })
      : cn(className, isActive && activeClassName);

    return (
      <Link
        ref={ref}
        href={to}
        className={resolvedClassName}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
