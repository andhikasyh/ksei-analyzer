"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Fade from "@mui/material/Fade";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PlaceIcon from "@mui/icons-material/Place";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
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

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [selectedDate, eventsByDate]);

  const upcomingEvents = useMemo(() => {
    const todayKey = toDateKey(today);
    return events
      .filter((ev) => ev.event_date >= todayKey)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 8);
  }, [events]);

  const prevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDate(null);
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDate(null);
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(toDateKey(today));
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

  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper
          sx={{
            borderRadius: 2.5,
            overflow: "hidden",
            position: "relative",
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
          <Box sx={{ p: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton
                  size="small"
                  onClick={prevMonth}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
                  }}
                >
                  <ChevronLeftIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <Typography
                  sx={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 700,
                    fontSize: "1rem",
                    letterSpacing: "-0.02em",
                    minWidth: 160,
                    textAlign: "center",
                  }}
                >
                  {MONTHS[currentMonth]} {currentYear}
                </Typography>
                <IconButton
                  size="small"
                  onClick={nextMonth}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
                  }}
                >
                  <ChevronRightIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
              <Chip
                label="Today"
                size="small"
                onClick={goToToday}
                sx={{
                  fontSize: "0.65rem",
                  height: 24,
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
              }}
            >
              {WEEKDAYS.map((day) => (
                <Box
                  key={day}
                  sx={{
                    textAlign: "center",
                    py: 0.75,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6rem",
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
                        if (inMonth) setSelectedDate(isSelected ? null : dateKey);
                      }}
                      sx={{
                        textAlign: "center",
                        py: 0.5,
                        cursor: inMonth ? "pointer" : "default",
                        position: "relative",
                        borderRadius: 1.5,
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
                        mx: 0.25,
                        my: 0.15,
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
                          lineHeight: 1.8,
                        }}
                      >
                        {date.getDate()}
                      </Typography>
                      {hasEvents && inMonth && (
                        <Stack
                          direction="row"
                          spacing={0.3}
                          justifyContent="center"
                          sx={{ position: "absolute", bottom: 2, left: 0, right: 0 }}
                        >
                          {eventCount <= 3 ? (
                            Array.from({ length: eventCount }).map((_, i) => (
                              <Box
                                key={i}
                                sx={{
                                  width: 4,
                                  height: 4,
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
                                  width: 4,
                                  height: 4,
                                  borderRadius: "50%",
                                  bgcolor: dot || theme.palette.primary.main,
                                  opacity: 0.8,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "0.45rem",
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

          {selectedDate && selectedEvents.length > 0 && (
            <Fade in>
              <Box
                sx={{
                  borderTop: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)"}`,
                  p: 2,
                  bgcolor: isDark ? "rgba(13,20,37,0.5)" : "rgba(245,247,250,0.5)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    mb: 1,
                    color: "text.secondary",
                  }}
                >
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Typography>
                <Stack spacing={1}>
                  {selectedEvents.map((ev) => (
                    <Paper
                      key={ev.id}
                      onClick={() => router.push(`/stock/${ev.code}`)}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        cursor: "pointer",
                        borderLeft: `3px solid ${eventTypeColor(ev.event_type)}`,
                        bgcolor: eventTypeBg(ev.event_type),
                        border: `1px solid ${isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.05)"}`,
                        borderLeftWidth: 3,
                        borderLeftColor: eventTypeColor(ev.event_type),
                        transition: "all 0.15s ease",
                        "&:hover": {
                          transform: "translateX(2px)",
                          boxShadow: isDark
                            ? "0 4px 16px rgba(0,0,0,0.3)"
                            : "0 4px 16px rgba(0,0,0,0.06)",
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                color: "primary.main",
                              }}
                            >
                              {ev.code}
                            </Typography>
                            <Chip
                              label={ev.event_type}
                              size="small"
                              icon={<GroupsIcon sx={{ fontSize: "11px !important" }} />}
                              sx={{
                                height: 18,
                                fontSize: "0.55rem",
                                fontWeight: 700,
                                bgcolor: eventTypeBg(ev.event_type),
                                color: eventTypeColor(ev.event_type),
                                "& .MuiChip-icon": { color: "inherit", ml: 0.3 },
                              }}
                            />
                          </Stack>
                          <Typography
                            sx={{
                              fontSize: "0.7rem",
                              color: "text.secondary",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 340,
                              lineHeight: 1.4,
                            }}
                          >
                            {ev.description}
                          </Typography>
                          {ev.location && (
                            <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.4 }}>
                              <PlaceIcon sx={{ fontSize: 10, color: "text.secondary", opacity: 0.6 }} />
                              <Typography
                                sx={{
                                  fontSize: "0.58rem",
                                  color: "text.secondary",
                                  opacity: 0.7,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: 280,
                                }}
                              >
                                {ev.location}
                              </Typography>
                            </Stack>
                          )}
                        </Box>
                        {ev.rups_datetime && (
                          <Stack direction="row" spacing={0.3} alignItems="center" sx={{ flexShrink: 0, ml: 1 }}>
                            <AccessTimeIcon sx={{ fontSize: 11, color: "text.secondary", opacity: 0.6 }} />
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.65rem",
                                color: "text.secondary",
                                fontWeight: 600,
                              }}
                            >
                              {formatEventTime(ev.rups_datetime)}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </Fade>
          )}
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper
          sx={{
            borderRadius: 2.5,
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
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: isDark ? "#34d399" : "#059669",
                  animation: "pulseGlow 2s ease-in-out infinite",
                }}
              />
              <Typography
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  letterSpacing: "-0.01em",
                }}
              >
                Upcoming Events
              </Typography>
              <Chip
                label={upcomingEvents.length}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  bgcolor: isDark ? "rgba(52,211,153,0.1)" : "rgba(5,150,105,0.06)",
                  color: isDark ? "#34d399" : "#059669",
                  ml: "auto !important",
                }}
              />
            </Stack>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              px: 1.5,
              pb: 1.5,
            }}
          >
            {upcomingEvents.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  minHeight: 120,
                }}
              >
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.75rem",
                    opacity: 0.6,
                    fontStyle: "italic",
                  }}
                >
                  No upcoming events
                </Typography>
              </Box>
            ) : (
              <Stack spacing={0.75}>
                {upcomingEvents.map((ev, idx) => {
                  const evDate = new Date(ev.event_date);
                  const daysUntil = Math.ceil(
                    (evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isImminent = daysUntil <= 3;

                  return (
                    <Paper
                      key={ev.id}
                      onClick={() => router.push(`/stock/${ev.code}`)}
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        bgcolor: isImminent
                          ? isDark ? "rgba(251,191,36,0.04)" : "rgba(217,119,6,0.03)"
                          : "transparent",
                        "&:hover": {
                          bgcolor: isDark
                            ? "rgba(212,168,67,0.06)"
                            : "rgba(161,124,47,0.04)",
                          transform: "translateX(2px)",
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 38,
                            height: 42,
                            borderRadius: 1.5,
                            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                            border: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)"}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.48rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
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
                              fontSize: "0.95rem",
                              lineHeight: 1.1,
                              color: "text.primary",
                            }}
                          >
                            {evDate.getDate()}
                          </Typography>
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                fontSize: "0.72rem",
                                color: "primary.main",
                              }}
                            >
                              {ev.code}
                            </Typography>
                            <Chip
                              label={ev.event_type}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: "0.5rem",
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
                                  height: 16,
                                  fontSize: "0.48rem",
                                  fontWeight: 700,
                                  bgcolor: isDark ? "rgba(251,191,36,0.12)" : "rgba(217,119,6,0.08)",
                                  color: isDark ? "#fbbf24" : "#d97706",
                                }}
                              />
                            )}
                          </Stack>
                          <Typography
                            sx={{
                              fontSize: "0.65rem",
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
                            <Stack direction="row" spacing={0.3} alignItems="center" sx={{ mt: 0.25 }}>
                              <AccessTimeIcon sx={{ fontSize: 9, color: "text.secondary", opacity: 0.5 }} />
                              <Typography
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: "0.58rem",
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
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
