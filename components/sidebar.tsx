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
import { debug } from '@/utils/devLogger'
    
interface SidebarProps {
    role?: string;
    userInfo?: {
        name?: string;
        email?: string;
    };
    // Server-provided initial visibility flags (preferred when provided)
    initialShowCoordinator?: boolean;
    initialShowStakeholder?: boolean;
}

export default function Sidebar({ role, userInfo, initialShowCoordinator, initialShowStakeholder }: SidebarProps) {
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
    // Only treat as system admin when server explicitly marks isAdmin or role looks like a system admin.
    // Coerce to a boolean to avoid accidental string values leaking through the || operator
    // which can cause TypeScript to infer a union type (boolean | string).
    const serverIsSystemAdmin = Boolean(
        (serverInfo && serverInfo.isAdmin) ||
        (serverRoleFromResolved && serverRoleFromResolved.includes('sys') && serverRoleFromResolved.includes('admin'))
    );

    // Detect if the server-provided user is a coordinator (staff-type or role)
    const serverIsCoordinator = Boolean(
        serverStaffType && String(serverStaffType).toLowerCase() === 'coordinator'
    ) || (serverRoleFromResolved && serverRoleFromResolved.includes('coordinator'));

    // Determine initial coordinator visibility from server-provided data only
    // unless explicit props were passed from a server layout. Prefer the
    // explicit `initialShow*` props when provided to make the component
    // deterministic during SSR and avoid hydration flashes.
    const computedInitialShowCoordinator = serverIsSystemAdmin;
    const computedInitialShowStakeholder = Boolean(serverIsSystemAdmin || serverIsCoordinator);

    const [showCoordinatorLink, setShowCoordinatorLink] = useState<boolean>(
        initialShowCoordinator ?? computedInitialShowCoordinator
    );
    const [showStakeholderLink, setShowStakeholderLink] = useState<boolean>(
        initialShowStakeholder ?? computedInitialShowStakeholder
    );

    useEffect(() => {
        // dev: log server/client initial snapshot on mount
        try {
            debug('[sidebar] mount snapshot', {
                serverInfo: serverInfo || null,
                initialShowCoordinator,
                initialShowStakeholder,
                computedInitialShowCoordinator,
                computedInitialShowStakeholder,
                resolvedRole: resolvedRole || null,
            })
        } catch (e) {}

        // Listen for in-window auth-change events (dispatched after login)
        const onAuthChanged = (ev?: any) => {
            try {
                debug('[sidebar] auth-change event received', ev?.detail || null)
                const loaded = getUserInfo()
                if (loaded) setInfo(loaded as any)

                // Recompute visibility from loaded client info. We allow client-side
                // updates after initial render so SPA logins can update the UI.
                const roleFromLoaded = loaded?.role ? String(loaded.role).toLowerCase() : ''
                const rawLoaded = loaded?.raw || loaded || null
                const staffTypeLoaded = rawLoaded?.StaffType || rawLoaded?.Staff_Type || rawLoaded?.staff_type || rawLoaded?.staffType || (rawLoaded?.user && (rawLoaded.user.StaffType || rawLoaded.user.staff_type || rawLoaded.user.staffType)) || null
                const loadedIsSystemAdmin = !!(loaded && loaded.isAdmin) || (roleFromLoaded.includes('sys') && roleFromLoaded.includes('admin'))
                const loadedIsCoordinator = (!!staffTypeLoaded && String(staffTypeLoaded).toLowerCase() === 'coordinator') || (roleFromLoaded.includes('coordinator'))

                // Update visibility based on loaded info
                if (loadedIsSystemAdmin && !showCoordinatorLink) setShowCoordinatorLink(true)
                if ((loadedIsCoordinator || loadedIsSystemAdmin) && !showStakeholderLink) setShowStakeholderLink(true)
                // If loaded indicates removal of privileges, update accordingly
                if (!loadedIsSystemAdmin && showCoordinatorLink && typeof initialShowCoordinator === 'undefined') setShowCoordinatorLink(false)
                if (!loadedIsCoordinator && !loadedIsSystemAdmin && showStakeholderLink && typeof initialShowStakeholder === 'undefined') setShowStakeholderLink(false)
            } catch (e) {
                // ignore
            }
        }

        window.addEventListener('unite:auth-changed', onAuthChanged as EventListener)
        // storage event fires in other windows/tabs; listen to update from those
        const onStorage = (e: StorageEvent) => {
            try {
                debug('[sidebar] storage event', { key: e.key, newValue: e.newValue })
                onAuthChanged({ detail: null })
            } catch (err) {}
        }
        window.addEventListener('storage', onStorage)
        // Load client-only user info only when we don't have serverInfo.
        // This prevents client-only data from changing the initial render and
        // causing hydration mismatches. If the server didn't already indicate
        // admin rights, allow the client to enable the coordinator link after
        // hydration if the client data shows admin privileges.
        if (!serverInfo) {
            try {
                const loaded = getUserInfo();
                // keep client-side info for display
                if (loaded) setInfo(loaded as any);

                // small development-only diagnostics + fallback checks. These
                // do not run in production to avoid leaking sensitive info.
                // developer-only debug logging removed

                // Only attempt client-side elevation when the server did NOT
                // provide an explicit initialShowCoordinator prop. If the
                // server supplied a value, treat it as authoritative.
                if (typeof initialShowCoordinator === 'undefined') {
                    // Only allow the client-loaded data to enable the coordinator
                    // link if the loaded user is a system admin (isAdmin flag or
                    // role that contains both 'sys'/'system' and 'admin').
                    const roleFromLoaded = loaded?.role ? String(loaded.role).toLowerCase() : '';
                    let loadedIsSystemAdmin = !!(loaded && loaded.isAdmin) || (roleFromLoaded.includes('sys') && roleFromLoaded.includes('admin'));

                    // Fallback: if getUserInfo didn't flag admin, try parsing
                    // sessionStorage or an alternate `user` key. This helps in
                    // cases where login wrote to sessionStorage (rememberMe off)
                    // or where the UNITE client stores the user under a different
                    // key. Only used as a resilient dev fallback.
                    if (!loadedIsSystemAdmin) {
                        try {
                            const fallbackRaw = (typeof window !== 'undefined' && (window.localStorage.getItem('unite_user') || window.sessionStorage.getItem('unite_user') || window.localStorage.getItem('user'))) || null;
                            if (fallbackRaw) {
                                const parsedFallback = JSON.parse(fallbackRaw);
                                const fbRole = parsedFallback?.role || parsedFallback?.StaffType || parsedFallback?.staff_type || parsedFallback?.staffType || null;
                                const fbLower = fbRole ? String(fbRole).toLowerCase() : '';
                                loadedIsSystemAdmin = loadedIsSystemAdmin || ((/sys|system/.test(fbLower) && /admin/.test(fbLower)) || !!parsedFallback?.isAdmin);
                                // dev-only debug removed
                            }
                        } catch (e) {
                            // ignore fallback parse errors
                        }
                    }

                    if (loadedIsSystemAdmin) setShowCoordinatorLink(true);
                }
                // If the stakeholder link isn't already visible from server, allow
                // the client-loaded info to enable it for coordinators or system admins.
                // Same for stakeholder visibility: only allow client-side
                // changes if the server didn't provide an explicit prop.
                if (typeof initialShowStakeholder === 'undefined') {
                    const roleFromLoaded2 = loaded?.role ? String(loaded.role).toLowerCase() : '';
                    const rawLoaded = loaded?.raw || loaded || null;
                    const staffTypeLoaded = rawLoaded?.StaffType || rawLoaded?.Staff_Type || rawLoaded?.staff_type || rawLoaded?.staffType || (rawLoaded?.user && (rawLoaded.user.StaffType || rawLoaded.user.staff_type || rawLoaded.user.staffType)) || null;
                    // Consider a user a coordinator if either their StaffType explicitly
                    // equals 'Coordinator' or their role string contains 'coordinator'.
                    const loadedIsCoordinator = (!!staffTypeLoaded && String(staffTypeLoaded).toLowerCase() === 'coordinator') || (roleFromLoaded2.includes('coordinator'));
                    const loadedIsSystemAdmin2 = !!(loaded && loaded.isAdmin) || (roleFromLoaded2.includes('sys') && roleFromLoaded2.includes('admin'));
                    if (loadedIsCoordinator || loadedIsSystemAdmin2) setShowStakeholderLink(true);
                }
            } catch (e) {
                // ignore client-only read errors
            }
        }
        return () => {
            try { window.removeEventListener('unite:auth-changed', onAuthChanged as EventListener) } catch (e) {}
            try { window.removeEventListener('storage', onStorage) } catch (e) {}
        }
    }, [serverInfo]);

    

    // client-derived info (for display purposes) — we only need `info` for
    // non-privileged UI pieces. Coordinator visibility is driven by
    // `showCoordinatorLink` which used server-derived initial state and is
    // updated only if client info proves system-admin status after
    // hydration.
    const raw = (info && (info.raw || info)) || null;
    const roleFromResolved = resolvedRole ? String(resolvedRole).toLowerCase() : '';
    const isSystemAdmin = !!(info && info.isAdmin) || (roleFromResolved.includes('sys') && roleFromResolved.includes('admin'));

    // Mount-time debug snapshot to inspect server/client derived state.
    // This runs only on the client and is safe for hydration.
    useEffect(() => {
        try {
            const snapshot = {
                serverInfo: serverInfo || null,
                initialShowCoordinator,
                showCoordinatorLink,
                initialShowStakeholder,
                showStakeholderLink,
                resolvedRole: resolvedRole || null,
                info: info || null,
                isSystemAdmin: isSystemAdmin || false,
            };
            // client-only debug removed
        } catch (e) {
            // ignore snapshot errors
        }
    }, [serverInfo, info, showCoordinatorLink, showStakeholderLink, resolvedRole, isSystemAdmin, initialShowCoordinator, initialShowStakeholder]);

    // At render time, prefer the server-derived flags for the initial value of
    // `showCoordinatorLink`. `showCoordinatorLink` is a state variable that may
    // be updated after hydration by the effect above.
    // Build the stable list of links in the final location so we can use
    // `showCoordinatorLink` (server-derived initial state, potentially
    // updated after hydration) to control coordinator visibility.
    const links = [
        { href: "/dashboard/campaign", icon: Ticket, key: "campaign", visible: true },
        { href: "/dashboard/calendar", icon: Calendar, key: "calendar", visible: true },
        // Only show stakeholder-management to system admins OR coordinators.
        { href: "/dashboard/stakeholder-management", icon: ContactRound, key: "stakeholder", visible: showStakeholderLink },
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
            try {
                // remove the non-HttpOnly cookie if present (development/compatibility)
                if (typeof document !== 'undefined') {
                    document.cookie = 'unite_user=; Max-Age=0; path=/';
                }
            } catch {}
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
