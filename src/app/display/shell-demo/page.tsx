import { ConnectionDot } from "@/components/display/ConnectionDot";
import { FitText } from "@/components/display/FitText";

export default function DisplayShellDemoPage() {
  return (
    <main className="relative flex h-full flex-col justify-between">
      <ConnectionDot status="live" className="absolute right-0 top-0" />

      <header className="pr-[18vmin]">
        <p className="text-display-label font-semibold uppercase text-sky-300">
          Court 1
        </p>
        <h1 className="mt-[1vmin] text-[clamp(4rem,8vw,8rem)] leading-[0.9] font-black">
          Semifinal
        </h1>
      </header>

      <section className="grid min-h-0 flex-1 grid-rows-[auto_auto_auto] items-center gap-[2vmin]">
        <div className="min-w-0">
          <FitText className="h-[7vmin] font-black" maxFontSize={76}>
            Alexandria Thunderhands
          </FitText>
        </div>

        <div className="score-nums text-center text-[clamp(8rem,16vw,18rem)] leading-[0.82] font-black">
          12
          <span className="mx-[2vw] text-[0.35em] text-zinc-500">-</span>
          9
        </div>

        <div className="min-w-0 text-right">
          <FitText className="h-[7vmin] font-black" maxFontSize={76}>
            Maximilian Wall Leaner
          </FitText>
        </div>
      </section>

      <footer className="flex items-end justify-between text-display-body text-zinc-300">
        <span>Inning 5</span>
        <span className="score-nums text-white">Next: Alexandria</span>
      </footer>
    </main>
  );
}
