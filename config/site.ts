export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "UNITE",
  description: "It's not another health tech platform, it's a movement.",
  // Leave About Us href blank to render as a static label in the navbar
  navItems: [
    {
      label: "About Us",
      href: "",
    },
    {
      label: "Calendar",
      href: "/calendar",
    },
  ],
  navMenuItems: [
    {
      label: "About Us",
      href: "",
    },
    {
      label: "Calendar",
      href: "/calendar",
    },
  ],
  links: {
    github: "https://github.com/heroui-inc/heroui",
    twitter: "https://twitter.com/hero_ui",
    docs: "https://heroui.com",
    discord: "https://discord.gg/9b6yyZKmH4",
    sponsor: "https://patreon.com/jrgarciadev",
  },
};
