import { FitText } from "@/components/display/FitText";

type DisplayPageProps = {
  params: Promise<{
    matchId: string;
  }>;
};

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { matchId } = await params;

  console.log("display match id:", matchId);

  return (
    <main className="flex h-full items-center justify-center">
      <div className="w-full text-center">
        <p className="text-display-label font-semibold uppercase text-sky-300">
          Display
        </p>
        <FitText
          className="mt-[2vmin] font-black tracking-normal"
          minFontSize={72}
          maxFontSize={280}
        >
          {matchId}
        </FitText>
      </div>
    </main>
  );
}
