"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { name: "概览", href: "/dashboard" },
  { name: "租户管理", href: "/dashboard/accounts" },
  { name: "资源中心", href: "/dashboard/resources" },
  { name: "监控面板", href: "/dashboard/monitor" },
  { name: "检索测试", href: "/dashboard/search" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="ml-6 flex space-x-8">
      {links.map((link) => {
        const isActive =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.name}
            href={link.href}
            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
              isActive
                ? "border-blue-500 text-gray-900"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
