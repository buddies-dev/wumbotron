export default function Home() {
  const routes = [
    {
      href: "/display/test",
      label: "Display shell",
      description: "Placeholder match display route",
    },
    {
      href: "/control/test",
      label: "Control shell",
      description: "Local toss-entry control route",
    },
    {
      href: "/control/new",
      label: "New match",
      description: "Create a local control room",
    },
    {
      href: "/display/shell-demo",
      label: "Display demo",
      description: "TV-safe layout and typography demo",
    },
    {
      href: "/display/complete",
      label: "Winner demo",
      description: "Completed match display state",
    },
  ];

  return (
    <main className="flex flex-1 items-center justify-center px-8 py-16">
      <section className="w-full max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
          Wumbotron
        </p>
        <h1 className="text-5xl font-semibold tracking-normal text-white">
          Match display skeleton is ready.
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-8 text-zinc-300">
          Local route shells are ready for the next build slices.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {routes.map((route) => (
            <a
              key={route.href}
              href={route.href}
              className="rounded-lg border border-white/15 bg-white/[0.03] p-4 transition hover:border-sky-300/70 hover:bg-sky-300/10"
            >
              <span className="block text-lg font-semibold text-white">
                {route.label}
              </span>
              <span className="mt-2 block text-sm leading-5 text-zinc-400">
                {route.description}
              </span>
              <code className="mt-4 block text-sm text-sky-200">
                {route.href}
              </code>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
