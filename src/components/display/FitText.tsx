"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type FitTextProps = {
  children: ReactNode;
  className?: string;
  minFontSize?: number;
  maxFontSize?: number;
};

export function FitText({
  children,
  className,
  minFontSize = 48,
  maxFontSize = 260,
}: FitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [fontSize, setFontSize] = useState(minFontSize);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) {
      return;
    }

    const measure = () => {
      const width = container.clientWidth;
      const height = container.clientHeight || maxFontSize;

      if (width === 0) {
        return;
      }

      let low = minFontSize;
      let high = maxFontSize;
      let best = minFontSize;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        text.style.fontSize = `${mid}px`;

        if (text.scrollWidth <= width && text.scrollHeight <= height) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setFontSize(best);
    };

    const scheduleMeasure = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(container);
    scheduleMeasure();

    return () => {
      observer.disconnect();

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [children, maxFontSize, minFontSize]);

  const style = {
    "--fit-text-size": `${fontSize}px`,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
    >
      <div
        ref={textRef}
        className="overflow-hidden whitespace-nowrap leading-[0.9]"
        style={{ fontSize: "var(--fit-text-size)" }}
      >
        {children}
      </div>
    </div>
  );
}
