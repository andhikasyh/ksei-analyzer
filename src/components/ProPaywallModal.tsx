"use client";

import { useState, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PsychologyIcon from "@mui/icons-material/Psychology";
import GoogleIcon from "@mui/icons-material/Google";
import EmailIcon from "@mui/icons-material/Email";
import { useProContext } from "@/lib/pro-context";

export type PaywallMode = "login" | "pro" | "signup";

interface ProPaywallModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: PaywallMode;
  reason?: "insight" | "chat";
}

const MAYAR_PAYMENT_LINK = process.env.NEXT_PUBLIC_MAYAR_PAYMENT_LINK || "https://mayar.id/pay/bei-analyzer-pro";

const PRO_FEATURES = [
  { icon: <TrendingUpIcon sx={{ fontSize: 16 }} />, text: "Akses laporan Market Intelligence harian" },
  { icon: <PsychologyIcon sx={{ fontSize: 16 }} />, text: "AI Chat tanpa batas—tanya apa saja tentang saham IDX" },
  { icon: <NotificationsIcon sx={{ fontSize: 16 }} />, text: "Newsletter harian via email setiap hari bursa" },
  { icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, text: "Analisis mendalam: sektor, foreign flow, prediksi harga" },
];

function EmailAuthForm({
  mode,
  onSwitch,
  onSuccess,
}: {
  mode: "login" | "signup";
  onSwitch: () => void;
  onSuccess: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { signInWithEmail, signUpWithEmail } = useProContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const fn = mode === "login" ? signInWithEmail : signUpWithEmail;
    const { error } = await fn(email.trim(), password);

    if (error) {
      setError(error);
      setLoading(false);
    } else if (mode === "signup") {
      setSuccess("Cek email kamu untuk konfirmasi akun.");
      setLoading(false);
    } else {
      onSuccess();
    }
  }, [email, password, mode, signInWithEmail, signUpWithEmail, onSuccess]);

  const accent = isDark ? "#d4a843" : "#a17c2f";
  const inputSx = {
    "& .MuiOutlinedInput-root": {
      fontSize: "0.85rem",
      borderRadius: "10px",
      "& fieldset": { borderColor: isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.12)" },
      "&:hover fieldset": { borderColor: accent },
      "&.Mui-focused fieldset": { borderColor: accent, borderWidth: 1 },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: accent },
  };

  return (
    <Stack spacing={1.5}>
      <TextField
        fullWidth
        size="small"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        sx={inputSx}
      />
      <TextField
        fullWidth
        size="small"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        sx={inputSx}
      />

      {error && (
        <Typography sx={{ fontSize: "0.75rem", color: "#fb7185", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          {error}
        </Typography>
      )}
      {success && (
        <Typography sx={{ fontSize: "0.75rem", color: "#34d399", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          {success}
        </Typography>
      )}

      <Button
        fullWidth
        variant="contained"
        onClick={handleSubmit}
        disabled={loading || !email.trim() || !password.trim()}
        sx={{
          bgcolor: isDark ? "#d4a843" : "#a17c2f",
          color: "#060a14",
          fontWeight: 700,
          fontSize: "0.82rem",
          borderRadius: "10px",
          py: 1,
          "&:hover": { bgcolor: isDark ? "#e8c468" : "#c49a3a" },
          "&:disabled": { opacity: 0.5 },
        }}
      >
        {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
      </Button>

      <Typography
        sx={{
          fontSize: "0.72rem",
          color: "text.secondary",
          textAlign: "center",
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}
      >
        {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
        <Box
          component="span"
          onClick={onSwitch}
          sx={{ color: accent, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}
        >
          {mode === "login" ? "Daftar" : "Masuk"}
        </Box>
      </Typography>
    </Stack>
  );
}

export function ProPaywallModal({ open, onClose, initialMode = "login", reason = "insight" }: ProPaywallModalProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { signInWithGoogle, user, isPro } = useProContext();
  const [mode, setMode] = useState<PaywallMode>(initialMode);

  const accent = isDark ? "#d4a843" : "#a17c2f";
  const accentLight = isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.07)";

  const handleAuthSuccess = useCallback(() => {
    setMode("pro");
  }, []);

  const handlePayment = useCallback(() => {
    window.open(MAYAR_PAYMENT_LINK, "_blank", "noopener,noreferrer");
  }, []);

  if (open && user && isPro) {
    onClose();
    return null;
  }

  const isAuthMode = mode === "login" || mode === "signup";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            border: `1px solid ${isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.12)"}`,
            bgcolor: isDark ? "#0d1425" : "#ffffff",
            overflow: "visible",
            backgroundImage: "none",
          },
        },
        backdrop: {
          sx: { backdropFilter: "blur(8px)", bgcolor: "rgba(0,0,0,0.6)" },
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 1,
            color: "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3, pt: 3.5 }}>
        {isAuthMode ? (
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: "center" }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "14px",
                  background: `linear-gradient(135deg, ${accentLight}, rgba(129,140,248,0.08))`,
                  border: `1px solid ${isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.15)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 1.5,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 22, color: accent }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  letterSpacing: "-0.02em",
                  mb: 0.5,
                }}
              >
                {mode === "login" ? "Masuk ke Akun" : "Buat Akun Baru"}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  lineHeight: 1.5,
                }}
              >
                {reason === "insight"
                  ? "Kamu sudah mencoba laporan gratis. Masuk atau daftar untuk lanjut ke Pro."
                  : "Masuk untuk akses AI Chat tanpa batas dan fitur Pro lainnya."}
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon sx={{ fontSize: 18 }} />}
              onClick={signInWithGoogle}
              sx={{
                borderColor: isDark ? "rgba(107,127,163,0.25)" : "rgba(12,18,34,0.15)",
                color: "text.primary",
                fontWeight: 600,
                fontSize: "0.82rem",
                borderRadius: "10px",
                py: 0.9,
                "&:hover": {
                  borderColor: accent,
                  bgcolor: accentLight,
                },
              }}
            >
              Lanjut dengan Google
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Divider sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", fontFamily: '"JetBrains Mono", monospace' }}>
                atau
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            <EmailAuthForm
              mode={mode === "login" ? "login" : "signup"}
              onSwitch={() => setMode(mode === "login" ? "signup" : "login")}
              onSuccess={handleAuthSuccess}
            />

            <Box
              sx={{
                p: 1.5,
                borderRadius: "12px",
                bgcolor: isDark ? "rgba(129,140,248,0.05)" : "rgba(99,102,241,0.04)",
                border: `1px solid ${isDark ? "rgba(129,140,248,0.1)" : "rgba(99,102,241,0.08)"}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "text.secondary",
                  textAlign: "center",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  lineHeight: 1.5,
                }}
              >
                Setelah masuk, aktifkan Pro untuk akses penuh seharga{" "}
                <Box component="span" sx={{ color: accent, fontWeight: 700 }}>
                  Rp99.000/bulan
                </Box>
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: "center" }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "14px",
                  background: `linear-gradient(135deg, ${accentLight}, rgba(129,140,248,0.08))`,
                  border: `1px solid ${isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.15)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 1.5,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 22, color: accent }} />
              </Box>

              <Box sx={{ mb: 0.75 }}>
                <Chip
                  label="Promo Terbatas"
                  size="small"
                  sx={{
                    fontSize: "0.6rem",
                    height: 18,
                    fontWeight: 700,
                    bgcolor: isDark ? "rgba(251,113,133,0.12)" : "rgba(225,29,72,0.08)",
                    color: isDark ? "#fb7185" : "#e11d48",
                    fontFamily: '"JetBrains Mono", monospace',
                    letterSpacing: "0.04em",
                    mb: 1,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  letterSpacing: "-0.025em",
                  mb: 0.5,
                }}
              >
                Aktifkan Pro
              </Typography>

              <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 1, mb: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: "text.secondary",
                    textDecoration: "line-through",
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                  }}
                >
                  Rp559.000
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 800,
                    fontSize: "1.6rem",
                    letterSpacing: "-0.03em",
                    color: accent,
                    lineHeight: 1,
                  }}
                >
                  Rp99.000
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  /bulan
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "text.secondary",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                Hemat 82% — harga spesial untuk early adopters
              </Typography>
            </Box>

            <Stack spacing={1}>
              {PRO_FEATURES.map((f, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "6px",
                      bgcolor: accentLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: accent,
                      mt: 0.1,
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      color: isDark ? "rgba(232,237,245,0.85)" : "rgba(12,18,34,0.75)",
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      lineHeight: 1.4,
                    }}
                  >
                    {f.text}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Button
              fullWidth
              variant="contained"
              onClick={handlePayment}
              startIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
              sx={{
                background: isDark
                  ? "linear-gradient(135deg, #d4a843, #e8c468)"
                  : "linear-gradient(135deg, #a17c2f, #c49a3a)",
                color: "#060a14",
                fontWeight: 800,
                fontSize: "0.88rem",
                borderRadius: "12px",
                py: 1.2,
                letterSpacing: "-0.01em",
                fontFamily: '"Outfit", sans-serif',
                boxShadow: isDark
                  ? "0 4px 20px rgba(212,168,67,0.25)"
                  : "0 4px 20px rgba(161,124,47,0.2)",
                "&:hover": {
                  background: isDark
                    ? "linear-gradient(135deg, #e8c468, #f0d070)"
                    : "linear-gradient(135deg, #c49a3a, #d4aa45)",
                  boxShadow: isDark
                    ? "0 6px 28px rgba(212,168,67,0.35)"
                    : "0 6px 28px rgba(161,124,47,0.3)",
                },
              }}
            >
              Bayar via Mayar.id — Rp99.000/bln
            </Button>

            <Typography
              sx={{
                fontSize: "0.65rem",
                color: "text.secondary",
                textAlign: "center",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                lineHeight: 1.5,
              }}
            >
              Pembayaran diproses oleh{" "}
              <Box component="span" sx={{ fontWeight: 600 }}>
                Mayar.id
              </Box>
              {" "}· Transfer bank, QRIS, e-wallet tersedia · Aktif dalam 1x24 jam
            </Typography>

            {!user && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Divider sx={{ flex: 1 }} />
                <Button
                  size="small"
                  startIcon={<EmailIcon sx={{ fontSize: 14 }} />}
                  onClick={() => setMode("login")}
                  sx={{
                    fontSize: "0.68rem",
                    color: "text.secondary",
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    px: 1.5,
                    borderRadius: "8px",
                    "&:hover": { color: accent },
                  }}
                >
                  Sudah bayar? Masuk
                </Button>
                <Divider sx={{ flex: 1 }} />
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
