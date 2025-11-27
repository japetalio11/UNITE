import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { Kbd } from "@heroui/kbd";
import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import NextLink from "next/link";
import {ChevronRight} from '@gravity-ui/icons';
import Image from "next/image";

import { siteConfig } from "@/config/site";
import { Magnifier } from "@gravity-ui/icons";

export const Navbar = () => {
  const searchInput = (
    <Input
      aria-label="Search"
      classNames={{
        inputWrapper: "bg-default-100",
        input: "text-sm",
      }}
      endContent={
        <Kbd className="hidden lg:inline-block" keys={["command"]}>
          K
        </Kbd>
      }
      labelPlacement="outside"
      placeholder="Search..."
      startContent={
        <Magnifier className="text-base text-default-400 pointer-events-none flex-shrink-0" />
      }
      type="search"
    />
  );

  return (
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-1" href="/">
            <Image alt="Unite Logo" height={64} src="/unite.svg" width={64} />
          </NextLink>
        </NavbarBrand>
        <ul className="hidden lg:flex gap-4 justify-start ml-2">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href || item.label}>
              {item.href ? (
                <NextLink
                  className="text-sm text-default-800 hover:bg-black hover:text-white px-3 py-2 rounded-lg transition-colors"
                  href={item.href}
                >
                  {item.label}
                </NextLink>
              ) : (
                <span className="text-sm text-default-800 px-3 py-2 rounded-lg">
                  {item.label}
                </span>
              )}
            </NavbarItem>
          ))}
        </ul>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="hidden md:flex">
          <Button as={Link} color="primary" href="/auth/signin" variant="faded">
            Sign In
          </Button>
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
          <Button
            as={Link}
            className="text-white"
            color="danger"
            href="/auth/signup"
            variant="solid"
          >
            Sign Up
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu className="bg-white">
        <div className="mt-2 flex flex-col gap-2">
          <Button as={Link} color="primary" href="/auth/signin" variant="faded">
            Sign In
          </Button>

          <Button
            as={Link}
            className="text-white"
            color="danger"
            href="/auth/signup"
            variant="solid"
          >
            Sign Up
          </Button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {siteConfig.navMenuItems.map((item, index, array) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <Link
                className="mt-2 w-full flex items-center justify-between"
                href={item.href}
              >
                <span
                  className={
                    index === array.length - 1
                      ? "text-black"
                      : "text-default-800"
                  }
                >
                  {item.label}
                </span>
                {index !== array.length - 1 && (
                  <ChevronRight className="text-default-600" />
                )}
              </Link>
            </NavbarMenuItem>
          ))}
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
