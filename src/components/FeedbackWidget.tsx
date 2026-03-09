"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import Grow from "@mui/material/Grow";
import Fade from "@mui/material/Fade";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const TYPES = [
  { value: "general", labelKey: "feedback.title" },
  { value: "bug", labelKey: "feedback.bugReport" },
  { value: "suggestion", labelKey: "feedback.featureSuggestion" },
  { value: "data", labelKey: "feedback.dataFeedback" },
] as const;

export function FeedbackWidget() {
  const theme = useTheme();
  const { t } = useLocale();
  const isDark = theme.palette.mode === "dark";
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [showCallout, setShowCallout] = useState(false);

  const isIntelligentPage = pathname.startsWith("/intelligent");

  const handleClose = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      setMessage("");
      setEmail("");
      setType("general");
      setDone(false);
      setError("");
    }, 350);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  useEffect(() => {
    const showTimer = setTimeout(() => setShowCallout(true), 1500);
    const hideTimer = setTimeout(() => setShowCallout(false), 7000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (isIntelligentPage) return null;

  const handleOpen = () => {
    setOpen(true);
    setDone(false);
    setError("");
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message,
          email: email.trim() || undefined,
          page: pathname,
        }),
      });
      if (!res.ok) {
        setError(
          res.status === 429
            ? t("feedback.tooManyRequests")
            : t("feedback.sendFailed")
        );
        return;
      }
      setDone(true);
      setTimeout(handleClose, 2200);
    } catch {
      setError(t("feedback.sendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const surface = isDark ? "rgba(12,12,16,0.97)" : "rgba(255,255,255,0.98)";
  const hairline = isDark
    ? "1px solid rgba(255,255,255,0.07)"
    : "1px solid rgba(0,0,0,0.07)";
  const accent = theme.palette.primary.main;

  return (
    <>
      {open && (
        <Fade in>
          <Box
            onClick={handleClose}
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 1298,
              bgcolor: isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)",
              backdropFilter: "blur(2px)",
            }}
          />
        </Fade>
      )}

      <Grow
        in={open}
        style={{ transformOrigin: "bottom right" }}
        timeout={280}
      >
        <Box
          sx={{
            position: "fixed",
            bottom: { xs: 16, sm: 80 },
            right: { xs: 16, sm: 80 },
            left: { xs: 16, sm: "auto" },
            width: { xs: "calc(100% - 32px)", sm: 340 },
            zIndex: 1299,
            borderRadius: "16px",
            overflow: "hidden",
            background: surface,
            border: hairline,
            boxShadow: isDark
              ? `0 32px 80px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,162,39,0.1), inset 0 1px 0 rgba(255,255,255,0.04)`
              : `0 24px 64px -8px rgba(0,0,0,0.14), 0 0 0 1px rgba(201,162,39,0.12), inset 0 1px 0 rgba(255,255,255,0.8)`,
          }}
        >
          <Box
            sx={{
              position: "relative",
              px: 2.5,
              pt: 2,
              pb: 1.5,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 20,
                right: 20,
                height: "1px",
                background: isDark
                  ? "linear-gradient(90deg, transparent, rgba(201,162,39,0.25), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(201,162,39,0.3), transparent)",
              },
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: accent,
                  mb: 0.25,
                }}
              >
                {t("feedback.sendFeedback")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: "text.secondary",
                  lineHeight: 1.3,
                }}
              >
                {t("feedback.helpUsImprove")}
              </Typography>
            </Box>
            <IconButton
              onClick={handleClose}
              size="small"
              sx={{
                mt: -0.5,
                mr: -0.5,
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Box sx={{ p: 2.5, pt: 2 }}>
            {done ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  py: 4,
                }}
              >
                <CheckCircleOutlineIcon
                  sx={{ fontSize: 36, color: "#22c55e", mb: 0.5 }}
                />
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#22c55e",
                  }}
                >
                  {t("feedback.thankYou")}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    color: "text.secondary",
                    textAlign: "center",
                  }}
                >
                  {t("feedback.feedbackReceived")}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {TYPES.map((item) => {
                    const active = type === item.value;
                    return (
                      <Box
                        key={item.value}
                        onClick={() => setType(item.value)}
                        sx={{
                          px: 1.25,
                          py: 0.5,
                          borderRadius: "6px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          userSelect: "none",
                          transition: "all 0.15s ease",
                          border: "1px solid",
                          borderColor: active
                            ? accent
                            : isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(0,0,0,0.08)",
                          bgcolor: active
                            ? isDark
                              ? "rgba(201,162,39,0.14)"
                              : "rgba(201,162,39,0.1)"
                            : "transparent",
                          color: active
                            ? accent
                            : "text.secondary",
                          "&:hover": {
                            borderColor: active
                              ? accent
                              : isDark
                                ? "rgba(255,255,255,0.18)"
                                : "rgba(0,0,0,0.18)",
                            bgcolor: active
                              ? isDark
                                ? "rgba(201,162,39,0.18)"
                                : "rgba(201,162,39,0.14)"
                              : isDark
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(0,0,0,0.03)",
                          },
                        }}
                      >
                        {t(item.labelKey)}
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ position: "relative" }}>
                  <TextField
                    multiline
                    rows={3}
                    size="small"
                    placeholder={t("feedback.placeholder")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    fullWidth
                    sx={fieldSx(isDark)}
                    slotProps={{ htmlInput: { maxLength: 1000 } }}
                  />
                  <Typography
                    sx={{
                      position: "absolute",
                      bottom: 6,
                      right: 10,
                      fontSize: "0.62rem",
                      fontFamily: '"JetBrains Mono", monospace',
                      color: message.length > 900
                        ? "warning.main"
                        : "text.secondary",
                      opacity: message.length > 0 ? 0.7 : 0,
                      transition: "opacity 0.2s ease",
                      pointerEvents: "none",
                    }}
                  >
                    {message.length}/1000
                  </Typography>
                </Box>

                <TextField
                  size="small"
                  placeholder={t("feedback.emailOptional")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  sx={fieldSx(isDark)}
                  type="email"
                />

                {error && (
                  <Typography sx={{ fontSize: "0.72rem", color: "error.main" }}>
                    {error}
                  </Typography>
                )}

                <Button
                  fullWidth
                  disableElevation
                  disabled={loading || !message.trim()}
                  onClick={handleSubmit}
                  sx={{
                    mt: 0.5,
                    height: 38,
                    borderRadius: "8px",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    bgcolor: accent,
                    color: "#0a0a0a",
                    "&:hover": {
                      bgcolor: theme.palette.primary.light,
                    },
                    "&:disabled": {
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.05)",
                      color: "text.disabled",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={14} sx={{ color: "inherit" }} />
                  ) : (
                    t("feedback.submit")
                  )}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Grow>

      <Fade in={showCallout && !open} timeout={400} unmountOnExit>
        <Box
          onClick={() => {
            setShowCallout(false);
            handleOpen();
          }}
          sx={{
            position: "fixed",
            bottom: "calc(28px + env(safe-area-inset-bottom, 0px))",
            right: { xs: "auto", sm: 128 },
            left: { xs: 68, sm: "auto" },
            zIndex: 1299,
            maxWidth: { xs: "calc(100vw - 84px)", sm: 200 },
            px: 1.5,
            py: 1,
            borderRadius: "10px",
            cursor: "pointer",
            background: isDark ? surface : "rgba(255,255,255,0.95)",
            border: `1px solid ${accent}`,
            boxShadow: isDark
              ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,162,39,0.08)`
              : `0 8px 24px rgba(201,162,39,0.15), 0 0 0 1px rgba(201,162,39,0.08)`,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: isDark
                ? `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,162,39,0.15)`
                : `0 12px 32px rgba(201,162,39,0.2), 0 0 0 1px rgba(201,162,39,0.12)`,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 500,
              color: isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.75)",
              lineHeight: 1.4,
            }}
          >
            {t("feedback.helpUsImprove")}
          </Typography>
        </Box>
      </Fade>

      <Fab
        onClick={() => {
          setShowCallout(false);
          if (open) handleClose();
          else handleOpen();
        }}
        size="small"
        sx={{
          position: "fixed",
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          right: { xs: "auto", sm: 76 },
          left: { xs: 16, sm: "auto" },
          zIndex: 1299,
          width: 44,
          height: 44,
          bgcolor: open ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : accent,
          color: open ? "text.secondary" : "#0a0a0a",
          border: "none",
          boxShadow: open
            ? "none"
            : isDark
              ? "0 4px 20px rgba(201,162,39,0.3)"
              : "0 4px 20px rgba(201,162,39,0.35)",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          "&:hover": {
            bgcolor: open
              ? isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(0,0,0,0.1)"
              : theme.palette.primary.light,
            transform: "scale(1.06)",
          },
        }}
      >
        {open ? (
          <CloseIcon sx={{ fontSize: 18 }} />
        ) : (
          <ChatBubbleOutlineIcon sx={{ fontSize: 20 }} />
        )}
      </Fab>
    </>
  );
}

function fieldSx(isDark: boolean) {
  return {
    "& .MuiInputBase-root": {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: "0.82rem",
      bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
      borderRadius: "8px",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.16)",
    },
    "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "primary.main",
      borderWidth: "1px",
    },
    "& .MuiInputBase-input::placeholder": {
      fontSize: "0.8rem",
      opacity: 0.45,
    },
  };
}
