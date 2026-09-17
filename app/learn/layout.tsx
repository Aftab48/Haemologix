import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <GradientBackground>
      <Header activePage="learn" />
      {children}
      <footer className="px-4 pb-12">
        <nav
          aria-label="About Haemologix"
          className="container mx-auto max-w-3xl flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-dark/80 font-dm-sans"
        >
          <Link href="/learn" className="hover:underline">All articles</Link>
          <Link href="/about" className="hover:underline">About us</Link>
          <Link href="/contact" className="hover:underline">Contact</Link>
          <Link href="/privacy-policy" className="hover:underline">Privacy policy</Link>
        </nav>
      </footer>
    </GradientBackground>
  );
}
