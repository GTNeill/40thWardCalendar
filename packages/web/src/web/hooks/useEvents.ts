import { useQuery } from "@tanstack/react-query";
import type { CalEvent } from "../lib/calendarUtils";

interface EventsResponse {
  events: CalEvent[];
  grouped: Record<string, CalEvent[]>;
  fetchedAt: string;
}

interface EventParams {
  timeMin: string;
  timeMax: string;
}

async function fetchEvents(params: EventParams): Promise<EventsResponse> {
  const qs = new URLSearchParams({ timeMin: params.timeMin, timeMax: params.timeMax });
  const res = await fetch(`/api/events?${qs}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

const FOUR_HOURS = 4 * 60 * 60 * 1000;

function refetchInterval() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? FOUR_HOURS : false;
}

export function useEvents(params: EventParams) {
  return useQuery<EventsResponse, Error>({
    queryKey: ["calendar-events", params.timeMin, params.timeMax],
    queryFn: () => fetchEvents(params),
    refetchInterval,
    staleTime: FOUR_HOURS,
    retry: 2,
  });
}
