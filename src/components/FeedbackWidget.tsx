"use client";

import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
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
  { value: "general", label: "Masukan Umum" },
  { value: "bug", label: "Laporan Bug" },
  { value: "suggestion", label: "Saran Fitur" },
  { value: "data", label: "Masalah Data" },
];

export function FeedbackWidget() {
  const theme = useTheme();
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
          setError("Terlalu banyak permintaan. Tunggu beberapa menit.");
        } else {
          setError("Gagal mengirim. Coba lagi.");
        }
        return;
      }
      setDone(true);
      setTimeout(handleClose, 2000);
    } catch {
      setError("Gagal mengirim. Coba lagi.");
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
            boxShadow: isDark
              ? "0 20px 60px rgba(0,0,0,0.7)"
              : "0 12px 48px rgba(0,0,0,0.12)",
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
            }}
          >
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
              }}
            >
              Kirim Masukan
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
                  Terima kasih!
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", textAlign: "center", fontSize: "0.72rem" }}
                >
                  Masukan kamu sudah kami terima.
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
                  {TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value} sx={{ fontSize: "0.82rem" }}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  multiline
                  rows={4}
                  size="small"
                  placeholder="Tulis masukan kamu..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  fullWidth
                  sx={fieldSx(isDark)}
                  inputProps={{ maxLength: 1000 }}
                />

                <TextField
                  size="small"
                  placeholder="Email (opsional)"
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
                    "Kirim"
                  )}
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Slide>

      <Fab
        onClick={open ? handleClose : handleOpen}
        size="small"
        sx={{
          position: "fixed",
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          left: { xs: 16, sm: "auto" },
          right: { xs: "auto", sm: 76 },
          zIndex: 1299,
          width: 40,
          height: 40,
          bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.1)"
            : "1px solid rgba(0,0,0,0.1)",
          boxShadow: "none",
          backdropFilter: "blur(12px)",
          transition: "all 0.2s ease",
          "&:hover": {
            bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)",
            boxShadow: "none",
          },
        }}
      >
        {open ? (
          <CloseIcon sx={{ fontSize: 17 }} />
        ) : (
          <ChatBubbleOutlineIcon sx={{ fontSize: 17 }} />
        )}
      </Fab>
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
