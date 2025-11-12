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
import { getUserInfo } from "../utils/getUserInfo"
    
interface SidebarProps {
    role?: string;
    userInfo?: {
        name?: string;
        email?: string;
    };
}

export default function Sidebar({ role, userInfo }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    
    // Determine role from prop or centralized helper
    const info = getUserInfo()
    try { console.debug('[Sidebar] getUserInfo:', info) } catch (e) {}

    let resolvedRole = role || (info && info.role) || null

    // Extra logging to help debug why Coordinator link may be hidden
    try {
        // isSystemAdmin: role string contains system indicator + admin (e.g. 'sysadmin')
        const isSystemAdmin = !!(info && info.isAdmin) || (resolvedRole && String(resolvedRole).toLowerCase().includes('sys') && String(resolvedRole).toLowerCase().includes('admin'))

        // extract explicit StaffType from the parsed raw user object (prefer explicit StaffType fields)
        const raw = info?.raw || null
        const staffType = raw?.StaffType || raw?.Staff_Type || raw?.staff_type || raw?.staffType || (raw?.user && (raw.user.StaffType || raw.user.staff_type || raw.user.staffType)) || null
        const isStaffAdmin = !!staffType && String(staffType).toLowerCase() === 'admin'

        console.log('[Sidebar] resolvedRole=', resolvedRole, 'staffType=', staffType, 'isSystemAdmin=', isSystemAdmin, 'isStaffAdmin=', isStaffAdmin)
        if (isSystemAdmin) console.log('[Sidebar] resolvedRole appears to be a system-admin role')
        if (isStaffAdmin) console.log('[Sidebar] staffType indicates Admin — Coordinator link will be shown')
    } catch (e) { /* ignore logging errors */ }

    const links = [
        { href: "/dashboard/campaign", icon: Ticket },
        { href: "/dashboard/calendar", icon: Calendar },
    ];

    // Only show coordinator management link for users whose StaffType is explicitly 'Admin'
    // This prevents other roles (including system-level roles) from accidentally seeing the coordinator page.
    const raw = info?.raw || null
    const staffType = raw?.StaffType || raw?.Staff_Type || raw?.staff_type || raw?.staffType || (raw?.user && (raw.user.StaffType || raw.user.staff_type || raw.user.staffType)) || null
    const isStaffAdmin = !!staffType && String(staffType).toLowerCase() === 'admin'
    if (isStaffAdmin) {
        links.push({ href: "/dashboard/coordinator-management", icon: UsersRound })
    }

    links.push({ href: "/dashboard/stakeholder-management", icon: ContactRound })
    
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
                ? "bg-danger text-white"
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
