"use client";

import { useEffect, useState } from "react";
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
    
    // Prefer the `userInfo` prop when provided (it may be passed from the layout/server)
    // so both server and client render the same initial HTML and avoid hydration mismatches.
    // IMPORTANT: do NOT call `getUserInfo()` during initial render because it reads
    // client-only APIs (localStorage) and will produce different HTML on server vs client.
    // Instead, initialize `info` from the `userInfo` prop if available; otherwise
    // start with null and load client info in an effect after hydration.
    // serverInfo represents data that came from server props and is stable during SSR
    const serverInfo = userInfo && Object.keys(userInfo).length ? (userInfo as any) : null

    // client-only info loaded after hydration
    const [info, setInfo] = useState<any>(serverInfo);

    // (moved below -- depends on server-side variables that are declared later)

    // (useEffect moved below after server-side admin detection so it can
    // reference values derived from serverInfo)

    // resolvedRole should prefer the explicit `role` prop, then serverInfo (if present),
    // then client info (after hydration). This keeps SSR deterministic when serverInfo is provided.
    let resolvedRole = role || (serverInfo && serverInfo.role) || (info && info.role) || null

    // (links are declared later, after server/client admin detection, so they
    // can reference the `showCoordinatorLink` state)

    // Show coordinator management link only when the user is a system admin
    // (explicit system admin flag or role that includes system+admin), OR when
    // the user's StaffType is explicitly 'Admin'. This keeps coordinator access
    // limited to true admins while allowing system-level admins to see it.
    // Prefer server-derived admin flags when available (to match SSR). If server info
    // isn't available, fall back to client info or client-detected admin flag.
    const serverRaw = (serverInfo && (serverInfo.raw || serverInfo)) || null;
    const serverStaffType = serverRaw?.StaffType || serverRaw?.Staff_Type || serverRaw?.staff_type || serverRaw?.staffType || (serverRaw?.user && (serverRaw.user.StaffType || serverRaw.user.staff_type || serverRaw.user.staffType)) || null;
    const serverRoleFromResolved = role || (serverInfo && serverInfo.role) ? String(role || serverInfo.role).toLowerCase() : '';
    const serverIsSystemAdmin = !!(serverInfo && serverInfo.isAdmin) || (serverRoleFromResolved && serverRoleFromResolved.includes('sys') && serverRoleFromResolved.includes('admin'));
    const serverIsStaffTypeAdmin = !!serverStaffType && String(serverStaffType).toLowerCase() === 'admin';

    // Determine initial coordinator visibility from server-provided data only.
    const initialShowCoordinator = serverIsSystemAdmin || serverIsStaffTypeAdmin;
    const [showCoordinatorLink, setShowCoordinatorLink] = useState<boolean>(initialShowCoordinator);

    useEffect(() => {
        // Load client-only user info only when we don't have serverInfo.
        // This prevents client-only data from changing the initial render and
        // causing hydration mismatches. If the server didn't already indicate
        // admin rights, allow the client to enable the coordinator link after
        // hydration if the client data shows admin privileges.
        if (!serverInfo) {
            try {
                const loaded = getUserInfo();
                if (loaded) setInfo(loaded as any);

                if (!initialShowCoordinator) {
                    const roleFromLoaded = loaded?.role ? String(loaded.role).toLowerCase() : '';
                    const rawLoaded = loaded?.raw || loaded || null;
                    const staffTypeLoaded = rawLoaded?.StaffType || rawLoaded?.Staff_Type || rawLoaded?.staff_type || rawLoaded?.staffType || (rawLoaded?.user && (rawLoaded.user.StaffType || rawLoaded.user.staff_type || rawLoaded.user.staffType)) || null;
                    const loadedIsSystemAdmin = !!(loaded && loaded.isAdmin) || (roleFromLoaded.includes('sys') && roleFromLoaded.includes('admin'));
                    const loadedIsStaffAdmin = !!staffTypeLoaded && String(staffTypeLoaded).toLowerCase() === 'admin';
                    if (loadedIsSystemAdmin || loadedIsStaffAdmin) setShowCoordinatorLink(true);
                }
            } catch (e) {
                // ignore client-only read errors
            }
        }
    }, [serverInfo]);

    const raw = (info && (info.raw || info)) || null;
    const staffType = raw?.StaffType || raw?.Staff_Type || raw?.staff_type || raw?.staffType || (raw?.user && (raw.user.StaffType || raw.user.staff_type || raw.user.staffType)) || null;
    const roleFromResolved = resolvedRole ? String(resolvedRole).toLowerCase() : '';
    const isSystemAdmin = !!(info && info.isAdmin) || (roleFromResolved.includes('sys') && roleFromResolved.includes('admin'));
    const isStaffTypeAdmin = !!staffType && String(staffType).toLowerCase() === 'admin';

    // At render time, prefer the server-derived flags for the initial value of
    // `showCoordinatorLink`. `showCoordinatorLink` is a state variable that may
    // be updated after hydration by the effect above.
    // Build the stable list of links in the final location so we can use
    // `showCoordinatorLink` (server-derived initial state, potentially
    // updated after hydration) to control coordinator visibility.
    const links = [
        { href: "/dashboard/campaign", icon: Ticket, key: "campaign", visible: true },
        { href: "/dashboard/calendar", icon: Calendar, key: "calendar", visible: true },
        { href: "/dashboard/stakeholder-management", icon: ContactRound, key: "stakeholder", visible: true },
        { href: "/dashboard/coordinator-management", icon: UsersRound, key: "coordinator", visible: showCoordinatorLink },
    ];
    
    const bottomLinks = [{ href: "/notifications", icon: Bell }];
    
    const renderButton = (href: string, Icon: any, key: string, visible = true) => {
        const isActive = pathname === href;

        // When `visible` is false, render the same DOM structure but hide it
        // visually and make it non-interactive. This preserves element order
        // and attributes across SSR and the initial client render.
        const hiddenClasses = !visible ? "invisible pointer-events-none" : "";

        // Render a Next <Link> with attributes applied directly to the anchor
        // so we control attribute presence on both server and client. Avoid
        // depending on the HeroUI Button internals which may add attributes
        // during client hydration and produce diffs.
        return (
        <Link
            href={href}
            key={key}
            aria-hidden={visible ? 'false' : 'true'}
            tabIndex={visible ? 0 : -1}
            className={`w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors duration-200 ${hiddenClasses} ${
                isActive
                ? "bg-danger text-white"
                : "text-black border border-gray-300 hover:bg-gray-100"
            }`}
        >
            <Icon size={16} strokeWidth={2} className="-translate-y-[0.5px]" />
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
            {links.map(({ href, icon, key, visible }) => renderButton(href, icon, `link-${key}`, visible))}
        </div>
    
        {/* Bottom section */}
        <div className="flex flex-col items-center space-y-4">
            {bottomLinks.map(({ href, icon }) =>
            renderButton(href, icon, `bottom-${href}`)
            )}
            <Popover placement="right">
            <PopoverTrigger>
                {/* Native button here keeps attributes stable between SSR and CSR */}
                <button
                type="button"
                aria-hidden={'false'}
                tabIndex={0}
                className="w-10 h-10 !p-0 flex items-center justify-center rounded-full text-black border border-default-300 hover:bg-gray-100"
                data-slot="trigger"
                aria-haspopup="dialog"
                aria-expanded={false}
                >
                <Settings size={16} strokeWidth={2} className="-translate-y-[0.5px]" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="p-2">
                <div className="flex flex-col gap-1 min-w-[140px]">
                <button type="button" onClick={handleLogout} aria-hidden={'false'} tabIndex={0} className="justify-start text-left w-full px-2 py-1 rounded hover:bg-gray-100">
                    Log out
                </button>
                </div>
            </PopoverContent>
            </Popover>
        </div>
        </div>
    );
}
