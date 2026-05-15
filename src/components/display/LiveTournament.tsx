"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Bracket } from "./Bracket";
import type { ConnectionStatus } from "./ConnectionDot";
import type { DisplayTournamentData } from "@/lib/bracket/load-display-tournament";
import { createClient } from "@/lib/supabase/client";

type LiveTournamentProps = {
  initialData: DisplayTournamentData;
};

const BACKOFF_MS = [1000, 2000, 5000, 10000] as const;
const POLL_WHEN_NOT_LIVE_MS = 10_000;

export function LiveTournament({ initialData }: LiveTournamentProps) {
  const [data, setData] = useState(initialData);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    initialData.source === "supabase" ? "reconnecting" : "live",
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const canUseRealtime = data.source === "supabase";

  const refetchTournament = useCallback(async () => {
    const response = await fetch(
      `/api/tournaments/${data.tournament.id}/display`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Failed to refetch tournament ${data.tournament.id}`);
    }

    setData((await response.json()) as DisplayTournamentData);
  }, [data.tournament.id]);

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
        await refetchTournament();
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
        .channel(`display:tournament:${data.tournament.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tournament",
            filter: `id=eq.${data.tournament.id}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "player",
            filter: `tournament_id=eq.${data.tournament.id}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bracket_match",
            filter: `tournament_id=eq.${data.tournament.id}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match",
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "inning",
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
            await refetchTournament();
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
  }, [canUseRealtime, data.tournament.id, refetchTournament]);

  useEffect(() => {
    if (!canUseRealtime || connectionStatus === "live") {
      return;
    }

    const interval = setInterval(() => {
      refetchTournament().catch(() => {
        setConnectionStatus("offline");
      });
    }, POLL_WHEN_NOT_LIVE_MS);

    return () => clearInterval(interval);
  }, [canUseRealtime, connectionStatus, refetchTournament]);

  return <Bracket data={data} connectionStatus={connectionStatus} />;
}
