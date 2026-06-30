"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const adminRoutes = [
  { name: "仪表板", path: "/admin" },
  { name: "收藏集", path: "/admin/collections" },
  { name: "书签", path: "/admin/bookmarks" },
  { name: "设置", path: "/admin/settings/basic" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === "/admin/settings/basic") {
      return pathname === path || pathname.startsWith("/admin/settings/");
    }
    return pathname === path;
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <aside className="w-64 border-r bg-white h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Pintree管理</h2>
      </div>
      <nav className="p-2">
        <ul className="space-y-1">
          {adminRoutes.map((route) => (
            <li key={route.path}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  isActive(route.path) && "bg-accent"
                )}
                onClick={() => router.push(route.path)}
              >
                {route.name}
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="absolute bottom-0 w-64 p-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          退出登录
        </Button>
      </div>
    </aside>
  );
}