export default function Home() {
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
          Placeholder routes are available at{" "}
          <code className="text-sky-200">/display/test</code> and{" "}
          <code className="text-sky-200">/control/test</code>.
        </p>
      </section>
    </main>
  );
}
