"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Scoreboard } from "./Scoreboard";
import type { ConnectionStatus } from "./ConnectionDot";
import type { DisplayMatchData } from "@/lib/match/demo";
import { createClient } from "@/lib/supabase/client";
import { deriveMatchState } from "@/lib/match/state";

type LiveMatchProps = {
  initialData: DisplayMatchData;
};

const BACKOFF_MS = [1000, 2000, 5000, 10000] as const;
const POLL_WHEN_NOT_LIVE_MS = 10_000;

export function LiveMatch({ initialData }: LiveMatchProps) {
  const [data, setData] = useState(initialData);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    initialData.source === "supabase" ? "reconnecting" : "live",
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const canUseRealtime = data.source === "supabase";

  const refetchMatch = useCallback(async () => {
    const response = await fetch(`/api/matches/${data.match.id}/display`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to refetch match ${data.match.id}`);
    }

    setData((await response.json()) as DisplayMatchData);
  }, [data.match.id]);

  useEffect(() => {
    if (!canUseRealtime) {
      return;
    }

    let disposed = false;
    const supabase = createClient();

    function clearRetryTimer() {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }

    function removeCurrentChannel() {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }

    function scheduleReconnect() {
      clearRetryTimer();
      setConnectionStatus("reconnecting");

      const delay =
        BACKOFF_MS[Math.min(retryAttemptRef.current, BACKOFF_MS.length - 1)];
      retryAttemptRef.current += 1;
      retryTimerRef.current = setTimeout(connect, delay);
    }

    async function handleChange() {
      try {
        await refetchMatch();
      } catch {
        setConnectionStatus("reconnecting");
        scheduleReconnect();
      }
    }

    function connect() {
      if (disposed) {
        return;
      }

      removeCurrentChannel();

      const channel = supabase
        .channel(`display:${data.match.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match",
            filter: `id=eq.${data.match.id}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "inning",
            filter: `match_id=eq.${data.match.id}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "toss",
          },
          handleChange,
        )
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            retryAttemptRef.current = 0;
            setConnectionStatus("live");
            await refetchMatch();
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            scheduleReconnect();
            return;
          }

          if (status === "CLOSED") {
            setConnectionStatus(disposed ? "offline" : "reconnecting");
          }
        });

      channelRef.current = channel;
    }

    connect();

    return () => {
      disposed = true;
      clearRetryTimer();
      removeCurrentChannel();
    };
  }, [canUseRealtime, data.match.id, refetchMatch]);

  useEffect(() => {
    if (!canUseRealtime || connectionStatus === "live") {
      return;
    }

    const interval = setInterval(() => {
      refetchMatch().catch(() => {
        setConnectionStatus("offline");
      });
    }, POLL_WHEN_NOT_LIVE_MS);

    return () => clearInterval(interval);
  }, [canUseRealtime, connectionStatus, refetchMatch]);

  const state = useMemo(() => deriveMatchState(data.match, data.tosses), [data]);
  const lastToss = data.tosses.at(-1) ?? null;

  return (
    <Scoreboard
      match={data.match}
      state={state}
      lastToss={lastToss}
      connectionStatus={connectionStatus}
      source={data.source}
    />
  );
}
