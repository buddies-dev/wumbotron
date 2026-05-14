type DisplayPageProps = {
  params: Promise<{
    matchId: string;
  }>;
};

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { matchId } = await params;

  console.log("display match id:", matchId);

  return (
    <main className="safe-area flex h-full items-center justify-center">
      <div>
        <p className="text-2xl font-semibold uppercase tracking-[0.2em] text-sky-300">
          Display
        </p>
        <h1 className="mt-4 text-7xl font-bold tracking-normal">{matchId}</h1>
      </div>
    </main>
  );
}
