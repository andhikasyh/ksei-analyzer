"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import type { IDXCalendarEvent } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const days: { date: Date; inMonth: boolean }[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, inMonth: false });
  }

  for (let i = 1; i <= totalDays; i++) {
    days.push({ date: new Date(year, month, i), inMonth: true });
  }

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), inMonth: false });
    }
  }

  return days;
}

function toDateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatEventTime(datetime: string | null): string {
  if (!datetime) return "";
  const d = new Date(datetime);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

type RangeFilter = "week" | "month" | "year";

function getWeekRange(date: Date): [string, string] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [toDateKey(monday), toDateKey(sunday)];
}

function getMonthRange(date: Date): [string, string] {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return [toDateKey(start), toDateKey(end)];
}

function getYearRange(date: Date): [string, string] {
  return [`${date.getFullYear()}-01-01`, `${date.getFullYear()}-12-31`];
}

interface EventCalendarProps {
  events: IDXCalendarEvent[];
}

export function EventCalendar({ events }: EventCalendarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("week");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const eventsByDate = useMemo(() => {
    const map: Record<string, IDXCalendarEvent[]> = {};
    events.forEach((ev) => {
      const key = ev.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach((ev) => types.add(ev.event_type));
    return ["All", ...Array.from(types).sort()];
  }, [events]);

  const filteredEvents = useMemo(() => {
    let result: IDXCalendarEvent[];
    if (selectedDate) {
      result = (eventsByDate[selectedDate] || []).sort((a, b) =>
        a.event_date.localeCompare(b.event_date)
      );
    } else {
      let start: string, end: string;
      if (rangeFilter === "week") {
        [start, end] = getWeekRange(today);
      } else if (rangeFilter === "month") {
        [start, end] = getMonthRange(today);
      } else {
        [start, end] = getYearRange(today);
      }
      result = events
        .filter((ev) => ev.event_date >= start && ev.event_date <= end)
        .sort((a, b) => a.event_date.localeCompare(b.event_date));
    }
    if (typeFilter !== "All") {
      result = result.filter((ev) => ev.event_type === typeFilter);
    }
    return result;
  }, [selectedDate, rangeFilter, typeFilter, events, eventsByDate]);

  const prevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(null);
  }, []);

  const todayKey = toDateKey(today);

  const eventTypeColor = (type: string) => {
    if (type.includes("RUPS")) return isDark ? "#c084fc" : "#9333ea";
    if (type.includes("Dividen")) return isDark ? "#34d399" : "#059669";
    if (type.includes("Paparan")) return isDark ? "#60a5fa" : "#2563eb";
    return isDark ? "#fbbf24" : "#d97706";
  };

  const eventTypeBg = (type: string) => {
    if (type.includes("RUPS")) return isDark ? "rgba(192,132,252,0.1)" : "rgba(147,51,234,0.06)";
    if (type.includes("Dividen")) return isDark ? "rgba(52,211,153,0.1)" : "rgba(5,150,105,0.06)";
    if (type.includes("Paparan")) return isDark ? "rgba(96,165,250,0.1)" : "rgba(37,99,235,0.06)";
    return isDark ? "rgba(251,191,36,0.1)" : "rgba(217,119,6,0.06)";
  };

  const dotColor = (dateKey: string) => {
    const evs = eventsByDate[dateKey];
    if (!evs || evs.length === 0) return null;
    const types = evs.map((e) => e.event_type);
    if (types.some((t) => t.includes("RUPS"))) return isDark ? "#c084fc" : "#9333ea";
    if (types.some((t) => t.includes("Dividen"))) return isDark ? "#34d399" : "#059669";
    return isDark ? "#fbbf24" : "#d97706";
  };

  const filterLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Box
      sx={{
        display: { xs: "block", lg: "flex" },
        gap: 1,
        alignItems: "stretch",
        height: { lg: 380 },
      }}
    >
      {/* LEFT: Calendar grid */}
      <Box sx={{ flex: "3 1 0%", minWidth: 0, mb: { xs: 1, lg: 0 } }}>
        <Paper
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            position: "relative",
            height: "100%",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, ${isDark ? "#c084fc" : "#9333ea"}, ${isDark ? "#fbbf24" : "#d97706"}, transparent)`,
              opacity: 0.5,
            },
          }}
        >
          <Box sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 0.75 }}
            >
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <IconButton
                  size="small"
                  onClick={prevMonth}
                  sx={{
                    width: 26,
                    height: 26,
                    bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
                  }}
                >
                  <ChevronLeftIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Typography
                  sx={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 700,
                    fontSize: { xs: "0.8rem", sm: "0.88rem" },
                    letterSpacing: "-0.02em",
                    minWidth: { xs: 0, sm: 140 },
                    textAlign: "center",
                  }}
                >
                  {MONTHS[currentMonth]} {currentYear}
                </Typography>
                <IconButton
                  size="small"
                  onClick={nextMonth}
                  sx={{
                    width: 26,
                    height: 26,
                    bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
                  }}
                >
                  <ChevronRightIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
              <Chip
                label="Today"
                size="small"
                onClick={() => { goToToday(); }}
                sx={{
                  fontSize: "0.6rem",
                  height: 22,
                  fontWeight: 700,
                  cursor: "pointer",
                  bgcolor: isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.08)",
                  color: "primary.main",
                  "&:hover": {
                    bgcolor: isDark ? "rgba(212,168,67,0.18)" : "rgba(161,124,47,0.14)",
                  },
                }}
              />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 0,
                width: "100%",
              }}
            >
              {WEEKDAYS.map((day) => (
                <Box key={day} sx={{ textAlign: "center", py: 0.5 }}>
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "text.secondary",
                      opacity: 0.7,
                      fontFamily: '"Outfit", sans-serif',
                    }}
                  >
                    {day}
                  </Typography>
                </Box>
              ))}

              {calendarDays.map(({ date, inMonth }, idx) => {
                const dateKey = toDateKey(date);
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;
                const hasEvents = !!eventsByDate[dateKey];
                const eventCount = eventsByDate[dateKey]?.length || 0;
                const dot = dotColor(dateKey);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <Tooltip
                    key={idx}
                    title={hasEvents ? `${eventCount} event${eventCount > 1 ? "s" : ""}` : ""}
                    placement="top"
                    arrow
                    disableHoverListener={!hasEvents}
                  >
                    <Box
                      onClick={() => {
                        if (inMonth) {
                          setSelectedDate(isSelected ? null : dateKey);
                        }
                      }}
                      sx={{
                        textAlign: "center",
                        py: 0.4,
                        cursor: inMonth ? "pointer" : "default",
                        position: "relative",
                        borderRadius: 1,
                        transition: "all 0.15s ease",
                        bgcolor: isSelected
                          ? isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.08)"
                          : isToday
                            ? isDark ? "rgba(52,211,153,0.06)" : "rgba(5,150,105,0.04)"
                            : "transparent",
                        border: isSelected
                          ? `1px solid ${isDark ? "rgba(212,168,67,0.3)" : "rgba(161,124,47,0.2)"}`
                          : isToday
                            ? `1px solid ${isDark ? "rgba(52,211,153,0.2)" : "rgba(5,150,105,0.15)"}`
                            : "1px solid transparent",
                        "&:hover": inMonth
                          ? {
                              bgcolor: isDark
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(0,0,0,0.03)",
                            }
                          : {},
                        mx: 0.15,
                        my: 0.1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.78rem",
                          fontWeight: isToday || isSelected ? 700 : hasEvents ? 600 : 400,
                          fontFamily: '"JetBrains Mono", monospace',
                          color: !inMonth
                            ? isDark ? "rgba(107,127,163,0.25)" : "rgba(84,98,128,0.3)"
                            : isToday
                              ? isDark ? "#34d399" : "#059669"
                              : isSelected
                                ? "primary.main"
                                : isWeekend
                                  ? "text.secondary"
                                  : "text.primary",
                          lineHeight: 1.6,
                        }}
                      >
                        {date.getDate()}
                      </Typography>
                      {hasEvents && inMonth && (
                        <Stack
                          direction="row"
                          spacing={0.3}
                          justifyContent="center"
                          sx={{ position: "absolute", bottom: 1, left: 0, right: 0 }}
                        >
                          {eventCount <= 3 ? (
                            Array.from({ length: eventCount }).map((_, i) => (
                              <Box
                                key={i}
                                sx={{
                                  width: 3,
                                  height: 3,
                                  borderRadius: "50%",
                                  bgcolor: dot || theme.palette.primary.main,
                                  opacity: 0.8,
                                }}
                              />
                            ))
                          ) : (
                            <>
                              <Box
                                sx={{
                                  width: 3,
                                  height: 3,
                                  borderRadius: "50%",
                                  bgcolor: dot || theme.palette.primary.main,
                                  opacity: 0.8,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "0.4rem",
                                  color: dot || theme.palette.primary.main,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                  mt: "1px",
                                }}
                              >
                                +{eventCount - 1}
                              </Typography>
                            </>
                          )}
                        </Stack>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* RIGHT: Events list */}
      <Box sx={{ flex: "2 1 0%", minWidth: 0 }}>
        <Paper
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, ${isDark ? "#34d399" : "#059669"}, transparent)`,
              opacity: 0.5,
            },
          }}
        >
          <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: isDark ? "#34d399" : "#059669",
                    animation: "pulseGlow 2s ease-in-out infinite",
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {selectedDate ? filterLabel : "Upcoming"}
                </Typography>
                {selectedDate && (
                  <Chip
                    label="Clear"
                    size="small"
                    onClick={() => setSelectedDate(null)}
                    sx={{
                      height: 16,
                      fontSize: "0.5rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      bgcolor: isDark ? "rgba(251,191,36,0.1)" : "rgba(217,119,6,0.06)",
                      color: isDark ? "#fbbf24" : "#d97706",
                    }}
                  />
                )}
              </Stack>

              <Stack direction="row" spacing={0} alignItems="center">
                {!selectedDate && ([
                  { key: "week" as RangeFilter, label: "Week" },
                  { key: "month" as RangeFilter, label: "Month" },
                  { key: "year" as RangeFilter, label: "Year" },
                ]).map((tab) => (
                  <Box
                    key={tab.key}
                    onClick={() => setRangeFilter(tab.key)}
                    sx={{
                      px: 1,
                      py: 0.3,
                      cursor: "pointer",
                      borderRadius: 0.75,
                      fontSize: "0.62rem",
                      fontWeight: rangeFilter === tab.key ? 700 : 500,
                      fontFamily: '"Outfit", sans-serif',
                      color: rangeFilter === tab.key
                        ? isDark ? "#34d399" : "#059669"
                        : "text.secondary",
                      bgcolor: rangeFilter === tab.key
                        ? isDark ? "rgba(52,211,153,0.1)" : "rgba(5,150,105,0.06)"
                        : "transparent",
                      transition: "all 0.12s ease",
                      "&:hover": {
                        bgcolor: isDark ? "rgba(52,211,153,0.06)" : "rgba(5,150,105,0.04)",
                      },
                    }}
                  >
                    {tab.label}
                  </Box>
                ))}
                <Chip
                  label={filteredEvents.length}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    ml: 0.75,
                    bgcolor: isDark ? "rgba(52,211,153,0.1)" : "rgba(5,150,105,0.06)",
                    color: isDark ? "#34d399" : "#059669",
                  }}
                />
              </Stack>
            </Stack>

            {/* Event type filter chips */}
            {eventTypes.length > 2 && (
              <Stack direction="row" spacing={0.4} useFlexGap sx={{ mt: 0.75, flexWrap: "wrap" }}>
                {eventTypes.map((t) => (
                  <Chip
                    key={t}
                    label={t === "All" ? "All Types" : t}
                    size="small"
                    onClick={() => setTypeFilter(t)}
                    sx={{
                      height: 20, fontSize: "0.52rem", fontWeight: typeFilter === t ? 700 : 500,
                      cursor: "pointer",
                      bgcolor: typeFilter === t
                        ? (t.includes("RUPS") ? (isDark ? "rgba(192,132,252,0.15)" : "rgba(147,51,234,0.08)")
                          : t.includes("Dividen") ? (isDark ? "rgba(52,211,153,0.15)" : "rgba(5,150,105,0.08)")
                          : t.includes("Paparan") ? (isDark ? "rgba(96,165,250,0.15)" : "rgba(37,99,235,0.08)")
                          : (isDark ? "rgba(251,191,36,0.15)" : "rgba(217,119,6,0.08)"))
                        : "transparent",
                      color: typeFilter === t
                        ? (t.includes("RUPS") ? (isDark ? "#c084fc" : "#9333ea")
                          : t.includes("Dividen") ? (isDark ? "#34d399" : "#059669")
                          : t.includes("Paparan") ? (isDark ? "#60a5fa" : "#2563eb")
                          : (isDark ? "#fbbf24" : "#d97706"))
                        : "text.secondary",
                      border: "1px solid",
                      borderColor: typeFilter === t ? "currentColor" : "transparent",
                      "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" },
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Box
            sx={{
              overflow: "auto",
              flex: 1,
              minHeight: 0,
              px: 1,
              pb: 1,
            }}
          >
            {filteredEvents.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 80,
                }}
              >
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.72rem",
                    opacity: 0.6,
                    fontStyle: "italic",
                  }}
                >
                  No events {selectedDate ? "on this date" : `this ${rangeFilter}`}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={0.25}>
                {filteredEvents.map((ev, idx) => {
                  const evDate = new Date(ev.event_date);
                  const daysUntil = Math.ceil(
                    (evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isImminent = daysUntil >= 0 && daysUntil <= 3;

                  return (
                    <Box
                      key={`${ev.id}-${idx}`}
                      onClick={() => router.push(`/stock/${ev.code}`)}
                      sx={{
                        px: 0.75,
                        py: 0.5,
                        borderRadius: 1,
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                        bgcolor: isImminent
                          ? isDark ? "rgba(251,191,36,0.04)" : "rgba(217,119,6,0.03)"
                          : "transparent",
                        "&:hover": {
                          bgcolor: isDark
                            ? "rgba(212,168,67,0.06)"
                            : "rgba(161,124,47,0.04)",
                        },
                      }}
                    >
                      <Stack direction="row" spacing={0.75} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 28,
                            height: 30,
                            borderRadius: 1,
                            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                            border: `1px solid ${isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.05)"}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.4rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: eventTypeColor(ev.event_type),
                              lineHeight: 1,
                            }}
                          >
                            {evDate.toLocaleDateString("en-GB", { month: "short" })}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              lineHeight: 1.1,
                              color: "text.primary",
                            }}
                          >
                            {evDate.getDate()}
                          </Typography>
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                color: "primary.main",
                              }}
                            >
                              {ev.code}
                            </Typography>
                            <Chip
                              label={ev.event_type}
                              size="small"
                              sx={{
                                height: 15,
                                fontSize: "0.48rem",
                                fontWeight: 700,
                                bgcolor: eventTypeBg(ev.event_type),
                                color: eventTypeColor(ev.event_type),
                              }}
                            />
                            {isImminent && (
                              <Chip
                                label={daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
                                size="small"
                                sx={{
                                  height: 15,
                                  fontSize: "0.45rem",
                                  fontWeight: 700,
                                  bgcolor: isDark ? "rgba(251,191,36,0.12)" : "rgba(217,119,6,0.08)",
                                  color: isDark ? "#fbbf24" : "#d97706",
                                }}
                              />
                            )}
                          </Stack>
                          <Typography
                            sx={{
                              fontSize: "0.62rem",
                              color: "text.secondary",
                              lineHeight: 1.3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ev.description}
                          </Typography>
                          {ev.rups_datetime && (
                            <Stack direction="row" spacing={0.3} alignItems="center" sx={{ mt: 0.15 }}>
                              <AccessTimeIcon sx={{ fontSize: 9, color: "text.secondary", opacity: 0.5 }} />
                              <Typography
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: "0.55rem",
                                  color: "text.secondary",
                                  opacity: 0.7,
                                }}
                              >
                                {formatEventTime(ev.rups_datetime)}
                              </Typography>
                            </Stack>
                          )}
                        </Box>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
