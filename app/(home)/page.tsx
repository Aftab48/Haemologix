import HomePage from "@/components/HomePage";

// Server component on purpose. The previous version was a client component
// wrapping <HomePage /> in <Suspense>, and HomePage read `useSearchParams()`,
// which made Next bail the entire tree out to client-side rendering — the
// static HTML served to crawlers was literally "<div>Loading...</div>" with no
// h1, no copy and no JSON-LD. HomePage now reads the ?admin flag on the client
// after mount instead, so it server-renders fully.
export default function Home() {
  return <HomePage />;
}
