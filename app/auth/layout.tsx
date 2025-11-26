import { Link } from "@heroui/link";
import { ArrowLeft } from '@gravity-ui/icons';
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Left Side - Red Background with Logo */}
      <div className="hidden lg:flex lg:w-[65%] bg-danger flex-col items-start px-6">
        <div className="text-white h-[60px] flex items-center">
          <Image
            alt="Unite Logo"
            className="brightness-0 invert"
            height={60}
            src="/unite.svg"
            width={60}
          />
        </div>
      </div>

      {/* Right Side - Form Content */}
      <div className="flex-1 lg:w-[35%] flex flex-col bg-white">
        <header className="flex items-center h-[60px] px-6">
          <Link
            className="flex items-center gap-2 hover:text-default-800 transition-colors"
            href="/"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Go Back</span>
          </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 lg:px-12 pb-12">
          <div className="w-full max-w-[360px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
