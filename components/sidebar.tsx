"use client";

import { Button } from "@heroui/button";
import {
  Calendar,
  Settings,
  UsersRound,
  Ticket,
  Bell,
  ContactRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", icon: Ticket },
    { href: "/inventory", icon: Calendar },
    { href: "/requests", icon: UsersRound },
    { href: "/campaign", icon: ContactRound },
  ];

  const bottomLinks = [{ href: "/notifications", icon: Bell }];

  const renderButton = (href: string, Icon: any, key: string) => {
    const isActive = pathname === href;

    return (
      <Link href={href} key={key}>
        <Button
          isIconOnly
          variant="light"
          className={`w-10 h-10 !p-0 flex items-center justify-center rounded-full transition-colors duration-200 ${
            isActive
              ? "bg-red-600 text-white"
              : "text-black border border-gray-300 hover:bg-gray-100"
          }`}
        >
          <Icon size={16} strokeWidth={2} className="-translate-y-[0.5px]" />
        </Button>
      </Link>
    );
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("hospitalId");
    } catch {}
    router.push("/auth/login");
  };

  return (
    <div className="w-16 h-screen bg-white flex flex-col items-center justify-between py-6 border-r border-default-300">
      {/* Top section */}
      <div className="flex flex-col items-center space-y-4">
        {links.map(({ href, icon }) => renderButton(href, icon, `link-${href}`))}
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center space-y-4">
        {bottomLinks.map(({ href, icon }) =>
          renderButton(href, icon, `bottom-${href}`)
        )}
        <Popover placement="right">
          <PopoverTrigger>
            <Button
              isIconOnly
              variant="light"
              className="w-10 h-10 !p-0 flex items-center justify-center rounded-full text-black border border-default-300 hover:bg-gray-100"
            >
              <Settings size={16} strokeWidth={2} className="-translate-y-[0.5px]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-2">
            <div className="flex flex-col gap-1 min-w-[140px]">
              <Button variant="light" className="justify-start" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
