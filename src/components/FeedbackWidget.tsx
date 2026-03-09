"use client";

import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import Slide from "@mui/material/Slide";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CheckIcon from "@mui/icons-material/Check";

const TYPES = [
  { value: "general", labelKey: "feedback.title" },
  { value: "bug", labelKey: "feedback.bugReport" },
  { value: "suggestion", labelKey: "feedback.featureSuggestion" },
  { value: "data", labelKey: "feedback.dataFeedback" },
];

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

  const isIntelligentPage = pathname.startsWith("/intelligent");
  if (isIntelligentPage) return null;

  const handleOpen = () => {
    setOpen(true);
    setDone(false);
    setError("");
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setMessage("");
      setEmail("");
      setType("general");
      setDone(false);
      setError("");
    }, 300);
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
        if (res.status === 429) {
          setError(t("feedback.tooManyRequests"));
        } else {
          setError(t("feedback.sendFailed"));
        }
        return;
      }
      setDone(true);
      setTimeout(handleClose, 2000);
    } catch {
      setError(t("feedback.sendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const border = isDark
    ? "1px solid rgba(255,255,255,0.08)"
    : "1px solid rgba(0,0,0,0.08)";

  const panelBg = isDark
    ? "rgba(15,15,20,0.96)"
    : "rgba(255,255,255,0.97)";

  return (
    <>
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
            right: { xs: 12, sm: 76 },
            left: { xs: 12, sm: "auto" },
            width: { xs: "calc(100vw - 24px)", sm: 320 },
            zIndex: 1299,
            borderRadius: "14px",
            overflow: "hidden",
            background: panelBg,
            border,
            borderTop: "3px solid",
            borderTopColor: "primary.main",
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(201,162,39,0.15)"
              : "0 16px 56px rgba(0,0,0,0.18), 0 0 0 1px rgba(201,162,39,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.5,
              borderBottom: border,
              bgcolor: isDark ? "rgba(201,162,39,0.06)" : "rgba(201,162,39,0.04)",
            }}
          >
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "primary.main",
              }}
            >
              {t("feedback.sendFeedback")}
            </Typography>
            <IconButton size="small" onClick={handleClose} sx={{ color: "text.secondary" }}>
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>

          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {done ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                  py: 3,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    bgcolor: "rgba(34,197,94,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckIcon sx={{ color: "#22c55e", fontSize: 20 }} />
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#22c55e",
                  }}
                >
                  {t("feedback.thankYou")}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", textAlign: "center", fontSize: "0.72rem" }}
                >
                  {t("feedback.feedbackReceived")}
                </Typography>
              </Box>
            ) : (
              <>
                <TextField
                  select
                  size="small"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  fullWidth
                  sx={fieldSx(isDark)}
                >
                  {TYPES.map((item) => (
                    <MenuItem key={item.value} value={item.value} sx={{ fontSize: "0.82rem" }}>
                      {t(item.labelKey)}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  multiline
                  rows={4}
                  size="small"
                  placeholder={t("feedback.placeholder")}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  fullWidth
                  sx={fieldSx(isDark)}
                  inputProps={{ maxLength: 1000 }}
                />

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
                  <Typography
                    sx={{ fontSize: "0.72rem", color: "error.main" }}
                  >
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
                    height: 36,
                    borderRadius: "8px",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    bgcolor: isDark ? "rgba(255,255,255,0.9)" : "rgba(10,10,10,0.88)",
                    color: isDark ? "#0a0a0a" : "#ffffff",
                    "&:hover": {
                      bgcolor: isDark ? "#ffffff" : "#000000",
                    },
                    "&:disabled": {
                      bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
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
              </>
            )}
          </Box>
        </Box>
      </Slide>

      <Box
        sx={{
          position: "fixed",
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          left: { xs: 16, sm: "auto" },
          right: { xs: "auto", sm: 76 },
          zIndex: 1299,
          display: "flex",
          alignItems: "center",
          gap: 0,
          flexDirection: { xs: "column", sm: "row-reverse" },
        }}
      >
        {!open && (
          <Slide direction="right" in mountOnEnter unmountOnExit>
            <Box
              sx={{
                position: "relative",
                maxWidth: { xs: "calc(100vw - 80px)", sm: 200 },
                mb: { xs: 1, sm: 0 },
                mr: { xs: 0, sm: 1 },
                px: 1.5,
                py: 1.25,
                borderRadius: "10px",
                background: isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.1)",
                border: "1px solid",
                borderColor: "primary.main",
                boxShadow: isDark
                  ? "0 4px 16px rgba(0,0,0,0.3)"
                  : "0 4px 16px rgba(201,162,39,0.15)",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: { xs: "-6px", sm: "50%" },
                  left: { xs: 24, sm: "100%" },
                  marginBottom: { xs: 0, sm: "-6px" },
                  marginLeft: { xs: 0, sm: "-1px" },
                  width: 12,
                  height: 12,
                  background: isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.1)",
                  borderRight: { xs: "none", sm: "1px solid" },
                  borderBottom: { xs: "1px solid", sm: "none" },
                  borderColor: "primary.main",
                  transform: { xs: "rotate(-45deg)", sm: "rotate(45deg)" },
                },
              }}
            >
              <Typography
                sx={{
                  position: "relative",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.78)",
                  lineHeight: 1.35,
                }}
              >
                {t("feedback.helpUsImprove")}
              </Typography>
            </Box>
          </Slide>
        )}
        <Fab
          onClick={open ? handleClose : handleOpen}
          size="small"
          sx={{
            width: 48,
            height: 48,
            bgcolor: "primary.main",
            color: "rgba(0,0,0,0.88)",
            border: "none",
            boxShadow: isDark
              ? "0 4px 20px rgba(201,162,39,0.35), 0 0 0 1px rgba(201,162,39,0.2)"
              : "0 6px 24px rgba(201,162,39,0.4), 0 0 0 1px rgba(201,162,39,0.15)",
            backdropFilter: "blur(12px)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              bgcolor: "primary.light",
              color: "rgba(0,0,0,0.92)",
              boxShadow: isDark
                ? "0 6px 28px rgba(201,162,39,0.45), 0 0 0 1px rgba(201,162,39,0.3)"
                : "0 8px 32px rgba(201,162,39,0.5), 0 0 0 1px rgba(201,162,39,0.25)",
              transform: "scale(1.06)",
            },
          }}
        >
          {open ? (
            <CloseIcon sx={{ fontSize: 20 }} />
          ) : (
            <ChatBubbleOutlineIcon sx={{ fontSize: 22 }} />
          )}
        </Fab>
      </Box>
    </>
  );
}

function fieldSx(isDark: boolean) {
  return {
    "& .MuiInputBase-root": {
      fontFamily: '"DM Sans", sans-serif',
      fontSize: "0.82rem",
      bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
      borderRadius: "8px",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
    },
    "& .MuiInputBase-input::placeholder": {
      fontSize: "0.82rem",
      opacity: 0.5,
    },
  };
}
