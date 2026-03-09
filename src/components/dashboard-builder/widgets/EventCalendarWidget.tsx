"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { EventCalendar } from "@/components/EventCalendar";
import { supabase } from "@/lib/supabase";
import type { IDXCalendarEvent } from "@/lib/types";

export function EventCalendarWidget() {
  const [events, setEvents] = useState<IDXCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("idx_calendar_events")
        .select("*")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(50);
      setEvents(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} /></Box>;

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      <EventCalendar events={events} />
    </Box>
  );
}
