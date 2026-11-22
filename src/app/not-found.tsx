import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 py-20 text-center">
      <div>
        <p className="kicker text-[var(--accent)]">Error 404</p>
        <h1 className="headline mt-3 text-[clamp(2rem,6vw,3.5rem)]">This story is not on our wire</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-[#5b6779]">
          The page you requested has been moved, unpublished or never existed. Try the latest feed or search the archive.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="kicker bg-[var(--ink)] px-6 py-3 text-white hover:bg-[var(--brand)]">
            Go to homepage
          </Link>
          <Link href="/latest" className="kicker border border-[var(--ink)] px-6 py-3 text-[var(--ink)] hover:bg-white">
            Latest news
          </Link>
          <Link href="/search" className="kicker border border-[#c9d0da] px-6 py-3 text-[#5b6779] hover:border-[var(--accent)] hover:text-[var(--accent)]">
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
