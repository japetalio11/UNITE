import { Link } from "@heroui/link";
import { Button } from "@heroui/button";

import { Navbar } from "@/components/navbar";
    
export default function Home() {
    return (
        <>
        <Navbar />
        <section className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] py-8 md:py-10">
            <div className="inline-block max-w-3xl text-center">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                One <span className="text-[#FF3B3B]">donation</span>, infinite
                <br />
                possibilities
            </h1>
            <p className="text-lg text-default-800 mt-4">
                It's not another health tech platform. It's a movement.
            </p>
            </div>
    
            <div className="flex gap-3 mt-8">
            <Button
                as={Link}
                href="/auth/signup"
                color="danger"
                className="text-white"
                variant="solid"
                size="md"
            >
                Sign up
            </Button>
            <Button as={Link} href="/learn-more" variant="bordered" size="md">
                Learn more
            </Button>
            </div>
        </section>
        </>
    );
}
