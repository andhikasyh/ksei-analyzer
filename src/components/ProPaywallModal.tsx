"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PsychologyIcon from "@mui/icons-material/Psychology";
import BarChartIcon from "@mui/icons-material/BarChart";
import GoogleIcon from "@mui/icons-material/Google";
import { useProContext } from "@/lib/pro-context";

export type PaywallMode = "login" | "pro" | "signup" | "payment";

interface ProPaywallModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: PaywallMode;
  reason?: "insight" | "chat";
}

const MAYAR_EMBED_URL = process.env.NEXT_PUBLIC_MAYAR_EMBED_URL || "https://gunaa.myr.id/pl/testing-73669";
const MAYAR_EMBED_SCRIPT = "https://mayarembed.r2.mayar.id/mayarEmbed.min.js";

const PRO_FEATURES = [
  { icon: <TrendingUpIcon sx={{ fontSize: 15 }} />, text: "Laporan Market Intelligence harian" },
  { icon: <PsychologyIcon sx={{ fontSize: 15 }} />, text: "AI Chat tanpa batas tentang saham IDX" },
  { icon: <NotificationsIcon sx={{ fontSize: 15 }} />, text: "Newsletter harian tiap hari bursa" },
  { icon: <BarChartIcon sx={{ fontSize: 15 }} />, text: "Analisis sektor, foreign flow, prediksi harga" },
];

function useMayarEmbed() {
  useEffect(() => {
    if (document.querySelector(`script[src="${MAYAR_EMBED_SCRIPT}"]`)) return;
    const script = document.createElement("script");
    script.src = MAYAR_EMBED_SCRIPT;
    script.type = "text/javascript";
    script.async = true;
    document.body.appendChild(script);
  }, []);
}

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
      <TextField fullWidth size="small" label="Email" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()} sx={inputSx} />
      <TextField fullWidth size="small" label="Password" type="password" value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()} sx={inputSx} />

      {error && <Typography sx={{ fontSize: "0.75rem", color: "#fb7185", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{error}</Typography>}
      {success && <Typography sx={{ fontSize: "0.75rem", color: "#34d399", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{success}</Typography>}

      <Button fullWidth variant="contained" onClick={handleSubmit}
        disabled={loading || !email.trim() || !password.trim()}
        sx={{
          bgcolor: isDark ? "#d4a843" : "#a17c2f",
          color: "#060a14", fontWeight: 700, fontSize: "0.82rem", borderRadius: "10px", py: 1,
          "&:hover": { bgcolor: isDark ? "#e8c468" : "#c49a3a" },
          "&:disabled": { opacity: 0.5 },
        }}
      >
        {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
      </Button>

      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", textAlign: "center", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
        <Box component="span" onClick={onSwitch}
          sx={{ color: accent, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>
          {mode === "login" ? "Daftar" : "Masuk"}
        </Box>
      </Typography>
    </Stack>
  );
}

function MayarEmbed() {
  useMayarEmbed();
  return (
    <Box
      sx={{
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        "& iframe": { display: "block" },
      }}
    >
      <iframe
        allowFullScreen
        // @ts-expect-error -- non-standard allowpaymentrequest attribute
        allowpaymentrequest="allowpaymentrequest"
        scrolling="no"
        frameBorder="0"
        width="100%"
        height="600"
        src={MAYAR_EMBED_URL}
        data-hide-merchant-logo="true"
        data-hide-product-images="true"
        data-hide-header="true"
        data-hide-badge-secure="true"
        data-hide-language="true"
        data-hide-desc-product="true"
        style={{ border: "none", display: "block" }}
      />
    </Box>
  );
}

import type { User } from "@supabase/supabase-js";

interface ReferralCodeInputProps {
  user: User | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redeemReferral: (code: string) => Promise<{ ok: boolean; error?: string; free_months?: number }>;
  accent: string;
  isDark: boolean;
  onSuccess: () => void;
}

function ReferralCodeInput({ user, redeemReferral, accent, isDark, onSuccess }: ReferralCodeInputProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRedeem = useCallback(async () => {
    if (!code.trim()) return;
    if (!user) {
      setError("Kamu harus login terlebih dahulu untuk menggunakan kode referral.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    const result = await redeemReferral(code.trim());
    setLoading(false);
    if (result.ok) {
      setSuccess(`Berhasil! Pro aktif selama ${result.free_months ?? 1} bulan gratis.`);
      setTimeout(() => onSuccess(), 2000);
    } else {
      setError(result.error ?? "Gagal menggunakan kode referral.");
    }
  }, [code, user, redeemReferral, onSuccess]);

  const inputBorder = isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.12)";

  if (!open) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Divider sx={{ flex: 1 }} />
        <Button size="small" onClick={() => setOpen(true)}
          sx={{ fontSize: "0.68rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif', px: 1.5, borderRadius: "8px", whiteSpace: "nowrap", "&:hover": { color: accent } }}>
          Punya kode referral?
        </Button>
        <Divider sx={{ flex: 1 }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      p: 1.5, borderRadius: "12px",
      bgcolor: isDark ? "rgba(107,127,163,0.05)" : "rgba(12,18,34,0.025)",
      border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.07)"}`,
    }}>
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 1 }}>
        Kode Referral
      </Typography>
      <Box sx={{ display: "flex", gap: 0.75 }}>
        <Box
          component="input"
          placeholder="Masukkan kode..."
          value={code}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleRedeem()}
          sx={{
            flex: 1,
            px: 1.25,
            py: 0.75,
            borderRadius: "8px",
            border: `1px solid ${inputBorder}`,
            bgcolor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.02)",
            color: "text.primary",
            fontSize: "0.82rem",
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: "0.06em",
            outline: "none",
            transition: "border-color 0.15s ease",
            "&:focus": { borderColor: accent },
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          sx={{
            fontSize: "0.75rem", fontWeight: 700, borderRadius: "8px", px: 1.5,
            borderColor: accent, color: accent,
            "&:hover": { bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.06)" },
            "&:disabled": { opacity: 0.5 },
          }}
        >
          {loading ? <CircularProgress size={14} sx={{ color: accent }} /> : "Gunakan"}
        </Button>
      </Box>
      {error && (
        <Typography sx={{ fontSize: "0.7rem", color: "#fb7185", fontFamily: '"Plus Jakarta Sans", sans-serif', mt: 0.75 }}>
          {error}
        </Typography>
      )}
      {success && (
        <Typography sx={{ fontSize: "0.7rem", color: "#34d399", fontWeight: 600, fontFamily: '"Plus Jakarta Sans", sans-serif', mt: 0.75 }}>
          {success}
        </Typography>
      )}
    </Box>
  );
}

export function ProPaywallModal({
  open,
  onClose,
  initialMode = "login",
  reason = "insight",
}: ProPaywallModalProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { signInWithGoogle, user, isPro, redeemReferral } = useProContext();
  const [mode, setMode] = useState<PaywallMode>(initialMode);
  const [googleLoading, setGoogleLoading] = useState(false);

  const accent = isDark ? "#d4a843" : "#a17c2f";
  const accentLight = isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.07)";

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setGoogleLoading(false);
    }
  }, [open, initialMode]);

  const handleAuthSuccess = useCallback(() => {
    setMode("pro");
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    // browser will redirect away — loading state stays until navigation
  }, [signInWithGoogle]);

  if (open && user && isPro) {
    onClose();
    return null;
  }

  const isAuthMode = mode === "login" || mode === "signup";
  const isPaymentMode = mode === "payment";
  const isProMode = mode === "pro";

  const dialogMaxWidth = isPaymentMode ? "sm" : "xs";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={dialogMaxWidth}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            border: `1px solid ${isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.12)"}`,
            bgcolor: isDark ? "#0d1425" : "#ffffff",
            backgroundImage: "none",
            overflow: "hidden",
          },
        },
        backdrop: {
          sx: { backdropFilter: "blur(8px)", bgcolor: "rgba(0,0,0,0.65)" },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2.5,
          pt: 2,
          pb: 0,
          gap: 1,
        }}
      >
        {isPaymentMode && (
          <IconButton
            size="small"
            onClick={() => setMode("pro")}
            sx={{ color: "text.secondary", mr: 0.5, "&:hover": { color: "text.primary" } }}
          >
            <ArrowBackIcon sx={{ fontSize: 17 }} />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }}>
          {isPaymentMode && (
            <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "0.88rem", letterSpacing: "-0.01em" }}>
              Pembayaran Pro
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: isPaymentMode ? 2 : 3, pt: isPaymentMode ? 1.5 : 2.5 }}>

        {isAuthMode && (
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.6rem", letterSpacing: "0.12em", color: accent, mb: 1.5, textTransform: "uppercase" }}>
                BEI Analyzer Pro
              </Typography>
              <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em", mb: 0.5 }}>
                {mode === "login" ? "Masuk ke Akun" : "Buat Akun Baru"}
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif', lineHeight: 1.5 }}>
                {reason === "insight"
                  ? "Kamu sudah mencoba laporan gratis. Masuk atau daftar untuk lanjut ke Pro."
                  : "Masuk untuk akses AI Chat tanpa batas dan fitur Pro lainnya."}
              </Typography>
            </Box>

            <Button fullWidth variant="outlined"
              startIcon={googleLoading ? <CircularProgress size={16} sx={{ color: accent }} /> : <GoogleIcon sx={{ fontSize: 18 }} />}
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              sx={{
                borderColor: isDark ? "rgba(107,127,163,0.25)" : "rgba(12,18,34,0.15)",
                color: "text.primary", fontWeight: 600, fontSize: "0.82rem", borderRadius: "10px", py: 0.9,
                "&:hover": { borderColor: accent, bgcolor: accentLight },
                "&:disabled": { opacity: 0.7 },
              }}
            >
              {googleLoading ? "Mengarahkan ke Google..." : "Lanjut dengan Google"}
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Divider sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", fontFamily: '"JetBrains Mono", monospace' }}>atau</Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            <EmailAuthForm
              mode={mode === "login" ? "login" : "signup"}
              onSwitch={() => setMode(mode === "login" ? "signup" : "login")}
              onSuccess={handleAuthSuccess}
            />


          </Stack>
        )}

        {isProMode && (
          <Stack spacing={2}>
            <Box sx={{ textAlign: "center" }}>
              <Box sx={{ mb: 0.75 }}>
                <Chip label="Promo Terbatas" size="small" sx={{
                  fontSize: "0.6rem", height: 18, fontWeight: 700,
                  bgcolor: isDark ? "rgba(251,113,133,0.12)" : "rgba(225,29,72,0.08)",
                  color: isDark ? "#fb7185" : "#e11d48",
                  fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.04em",
                }} />
              </Box>
              <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.025em", mb: 0.4 }}>
                Aktifkan Pro
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 1, mb: 0.3 }}>
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", textDecoration: "line-through", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  Rp559.000
                </Typography>
                <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: "1.6rem", letterSpacing: "-0.03em", color: accent, lineHeight: 1 }}>
                  Rp99.000
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  /bulan
                </Typography>
              </Box>
              <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                Hemat 82% — harga spesial early adopters
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
              {PRO_FEATURES.map((f, i) => (
                <Box key={i} sx={{
                  display: "flex", alignItems: "flex-start", gap: 0.75,
                  p: 1, borderRadius: "10px",
                  bgcolor: isDark ? "rgba(107,127,163,0.05)" : "rgba(12,18,34,0.025)",
                  border: `1px solid ${isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.05)"}`,
                }}>
                  <Box sx={{ color: accent, flexShrink: 0, mt: 0.1 }}>{f.icon}</Box>
                  <Typography sx={{ fontSize: "0.7rem", color: isDark ? "rgba(232,237,245,0.82)" : "rgba(12,18,34,0.7)", fontFamily: '"Plus Jakarta Sans", sans-serif', lineHeight: 1.4 }}>
                    {f.text}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={() => user ? setMode("payment") : setMode("login")}
              sx={{
                background: isDark ? "linear-gradient(135deg, #d4a843, #e8c468)" : "linear-gradient(135deg, #a17c2f, #c49a3a)",
                color: "#060a14", fontWeight: 800, fontSize: "0.9rem",
                borderRadius: "12px", py: 1.25, letterSpacing: "-0.01em",
                fontFamily: '"Outfit", sans-serif',
                boxShadow: isDark ? "0 4px 20px rgba(212,168,67,0.3)" : "0 4px 20px rgba(161,124,47,0.22)",
                "&:hover": {
                  background: isDark ? "linear-gradient(135deg, #e8c468, #f0d070)" : "linear-gradient(135deg, #c49a3a, #d4aa45)",
                  boxShadow: isDark ? "0 6px 28px rgba(212,168,67,0.4)" : "0 6px 28px rgba(161,124,47,0.32)",
                },
              }}
            >
              Bayar Sekarang — Rp99.000/bln
            </Button>

            <Typography sx={{ fontSize: "0.62rem", color: "text.secondary", textAlign: "center", fontFamily: '"Plus Jakarta Sans", sans-serif', lineHeight: 1.5 }}>
              Transfer bank · QRIS · e-wallet · Diproses oleh <Box component="span" sx={{ fontWeight: 600 }}>Mayar.id</Box> · Aktif dalam 1x24 jam
            </Typography>

            <ReferralCodeInput user={user} redeemReferral={redeemReferral} accent={accent} isDark={isDark} onSuccess={onClose} />

            {!user && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Divider sx={{ flex: 1 }} />
                <Button size="small" onClick={() => setMode("login")}
                  sx={{ fontSize: "0.68rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif', px: 1.5, borderRadius: "8px", "&:hover": { color: accent } }}>
                  Sudah punya akun? Masuk
                </Button>
                <Divider sx={{ flex: 1 }} />
              </Box>
            )}
          </Stack>
        )}

        {isPaymentMode && (
          <Box>
            <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  Pro Member · 1 bulan
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", textDecoration: "line-through", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  Rp559.000
                </Typography>
                <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: "1.1rem", color: accent, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  Rp99.000
                </Typography>
              </Box>
            </Box>
            <MayarEmbed />
            <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", textAlign: "center", fontFamily: '"Plus Jakarta Sans", sans-serif', mt: 1.5, lineHeight: 1.5 }}>
              Setelah pembayaran dikonfirmasi, akun kamu akan diaktifkan otomatis dalam 1x24 jam.
            </Typography>
          </Box>
        )}

      </DialogContent>
    </Dialog>
  );
}
