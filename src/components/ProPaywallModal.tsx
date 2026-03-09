"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { User } from "@supabase/supabase-js";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useProContext } from "@/lib/pro-context";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export type PaywallMode = "login" | "pro" | "signup" | "payment";

interface ProPaywallModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: PaywallMode;
  reason?: "insight" | "chat";
}

const MAYAR_EMBED_URL = process.env.NEXT_PUBLIC_MAYAR_EMBED_URL || "https://gunaa.myr.id/pl/Gunaa-sub";
const MAYAR_EMBED_SCRIPT = "https://mayarembed.r2.mayar.id/mayarEmbed.min.js";

const PRO_FEATURES = [
  "Laporan Market Intelligence harian setiap hari bursa",
  "AI Chat tanpa batas tentang saham IDX",
  "Newsletter harian dikirim ke email kamu",
  "Analisis sektor, foreign flow, dan prediksi harga",
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

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Terlalu lemah", color: "#ef4444" };
  if (score === 2) return { score, label: "Lemah", color: "#f97316" };
  if (score === 3) return { score, label: "Cukup", color: "#eab308" };
  if (score === 4) return { score, label: "Kuat", color: "#22c55e" };
  return { score, label: "Sangat kuat", color: "#10b981" };
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
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const turnstileRef = useRef<TurnstileInstance>(null);

  useEffect(() => {
    setEmail(""); setPassword(""); setConfirm("");
    setShowPw(false); setShowConfirm(false);
    setTouched({ email: false, password: false, confirm: false });
    setError(""); setSuccess(""); setCaptchaToken("");
    turnstileRef.current?.reset();
  }, [mode]);

  const strength = passwordStrength(password);
  const isSignup = mode === "signup";
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = password.length >= 8;
  const confirmMatch = !isSignup || confirm === password;
  const hasCaptcha = !TURNSTILE_SITE_KEY || !!captchaToken;
  const canSubmit = emailValid && passwordOk && confirmMatch && hasCaptcha && !loading;

  const emailError = touched.email && !emailValid ? "Format email tidak valid" : "";
  const passwordError = touched.password && !passwordOk ? "Minimal 8 karakter" : "";
  const confirmError = touched.confirm && isSignup && !confirmMatch ? "Password tidak cocok" : "";

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setSuccess("");
    const fn = isSignup ? signUpWithEmail : signInWithEmail;
    const { error } = await fn(email.trim(), password, captchaToken || undefined);
    if (error) {
      const msg: Record<string, string> = {
        "Invalid login credentials": "Email atau password salah.",
        "Email not confirmed": "Cek inbox kamu dulu untuk konfirmasi email.",
        "User already registered": "Email ini sudah terdaftar. Coba masuk.",
      };
      setError(msg[error] ?? error);
      turnstileRef.current?.reset();
      setCaptchaToken("");
      setLoading(false);
    } else if (isSignup) {
      setSuccess("Hampir selesai! Cek email kamu untuk konfirmasi akun.");
      setLoading(false);
    } else {
      onSuccess();
    }
  }, [canSubmit, isSignup, email, password, captchaToken, signInWithEmail, signUpWithEmail, onSuccess]);

  const accent = isDark ? "#c9a227" : "#c9a227";
  const fieldSx = (hasError: boolean) => ({
    "& .MuiOutlinedInput-root": {
      fontSize: "0.83rem",
      borderRadius: "8px",
      "& fieldset": {
        borderColor: hasError
          ? "#ef4444"
          : isDark ? "rgba(107,127,163,0.18)" : "rgba(12,18,34,0.1)",
      },
      "&:hover fieldset": {
        borderColor: hasError
          ? "#f87171"
          : isDark ? "rgba(107,127,163,0.35)" : "rgba(12,18,34,0.22)",
      },
      "&.Mui-focused fieldset": { borderColor: hasError ? "#ef4444" : accent, borderWidth: 1 },
    },
    "& .MuiInputLabel-root": { fontSize: "0.82rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: hasError ? "#ef4444" : accent },
  });

  return (
    <Stack spacing={1.5}>
      {/* email */}
      <TextField
        fullWidth size="small" label="Email" type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        error={!!emailError}
        helperText={emailError}
        sx={fieldSx(!!emailError)}
        slotProps={{
          formHelperText: { sx: { fontSize: "0.68rem", ml: 0 } },
        }}
      />

      {/* password */}
      <Box>
        <TextField
          fullWidth size="small" label="Password"
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, password: true }))}
          onKeyDown={(e) => e.key === "Enter" && !isSignup && handleSubmit()}
          error={!!passwordError}
          helperText={passwordError || (isSignup ? "Minimal 8 karakter" : undefined)}
          sx={fieldSx(!!passwordError)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPw((p) => !p)}
                    tabIndex={-1}
                    sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                    {showPw ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
            formHelperText: { sx: { fontSize: "0.68rem", ml: 0 } },
          }}
        />
        {/* strength bar — signup only */}
        {isSignup && password.length > 0 && (
          <Box sx={{ mt: 0.75 }}>
            <Box sx={{ display: "flex", gap: 0.5, mb: 0.4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Box key={s} sx={{
                  flex: 1, height: 3, borderRadius: 2,
                  bgcolor: s <= strength.score ? strength.color : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                  transition: "background-color 0.25s ease",
                }} />
              ))}
            </Box>
            <Typography sx={{ fontSize: "0.65rem", color: strength.color, fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 }}>
              {strength.label}
            </Typography>
          </Box>
        )}
      </Box>

      {/* confirm password — signup only */}
      {isSignup && (
        <TextField
          fullWidth size="small" label="Konfirmasi password"
          type={showConfirm ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          error={!!confirmError}
          helperText={confirmError}
          sx={fieldSx(!!confirmError)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  {confirm.length > 0 && confirm === password ? (
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#22c55e" }} />
                  ) : (
                    <IconButton size="small" onClick={() => setShowConfirm((p) => !p)}
                      tabIndex={-1}
                      sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                      {showConfirm ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            },
            formHelperText: { sx: { fontSize: "0.68rem", ml: 0 } },
          }}
        />
      )}

      {error && (
        <Box sx={{
          px: 1.5, py: 1, borderRadius: "8px",
          bgcolor: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.07)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}>
          <Typography sx={{ fontSize: "0.72rem", color: isDark ? "#fb7185" : "#e11d48", fontFamily: '"Plus Jakarta Sans", sans-serif', lineHeight: 1.5 }}>
            {error}
          </Typography>
        </Box>
      )}
      {success && (
        <Box sx={{
          px: 1.5, py: 1, borderRadius: "8px",
          bgcolor: isDark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.07)",
          border: "1px solid rgba(34,197,94,0.2)",
        }}>
          <Typography sx={{ fontSize: "0.72rem", color: "#22c55e", fontFamily: '"Plus Jakarta Sans", sans-serif', lineHeight: 1.5, fontWeight: 600 }}>
            {success}
          </Typography>
        </Box>
      )}

      {TURNSTILE_SITE_KEY && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
            onError={() => setCaptchaToken("")}
            options={{
              theme: isDark ? "dark" : "light",
              size: "flexible",
            }}
          />
        </Box>
      )}

      <Button fullWidth variant="contained" onClick={handleSubmit}
        disabled={!canSubmit}
        sx={{
          bgcolor: accent, color: "#050505", fontWeight: 700, fontSize: "0.82rem",
          borderRadius: "8px", py: 0.9, boxShadow: "none", mt: 0.5,
          "&:hover": { bgcolor: isDark ? "#e0b83d" : "#e0b83d", boxShadow: "none" },
          "&:disabled": { opacity: 0.4 },
        }}
      >
        {loading
          ? <CircularProgress size={16} sx={{ color: "#050505" }} />
          : mode === "login" ? "Masuk" : "Buat akun"}
      </Button>

      <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", textAlign: "center", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
        <Box component="span" onClick={onSwitch}
          sx={{ color: accent, cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>
          {mode === "login" ? "Daftar gratis" : "Masuk"}
        </Box>
      </Typography>
    </Stack>
  );
}

function MayarEmbed({ email }: { email?: string }) {
  useMayarEmbed();

  let embedSrc = MAYAR_EMBED_URL;
  if (email) {
    const sep = MAYAR_EMBED_URL.includes("?") ? "&" : "?";
    embedSrc = `${MAYAR_EMBED_URL}${sep}email=${encodeURIComponent(email)}`;
  }

  return (
    <Box sx={{ width: "100%", "& iframe": { display: "block" } }}>
      <iframe
        allowFullScreen
        // @ts-expect-error -- non-standard attribute
        allowpaymentrequest="allowpaymentrequest"
        scrolling="no"
        frameBorder="0"
        width="100%"
        height="600"
        src={embedSrc}
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

interface ReferralCodeInputProps {
  user: User | null;
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
      setError("Kamu harus login terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    const result = await redeemReferral(code.trim());
    setLoading(false);
    if (result.ok) {
      setSuccess(`Pro aktif — ${result.free_months ?? 1} bulan gratis.`);
      setTimeout(() => onSuccess(), 2000);
    } else {
      setError(result.error ?? "Kode tidak valid.");
    }
  }, [code, user, redeemReferral, onSuccess]);

  if (!open) {
    return (
      <Typography
        onClick={() => setOpen(true)}
        sx={{
          fontSize: "0.7rem",
          color: "text.secondary",
          textAlign: "center",
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          cursor: "pointer",
          "&:hover": { color: accent },
          transition: "color 0.15s ease",
        }}
      >
        Punya kode referral?
      </Typography>
    );
  }

  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        Kode referral
      </Typography>
      <Box sx={{ display: "flex", gap: 0.75 }}>
        <Box
          component="input"
          placeholder="KODE-REFERRAL"
          value={code}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleRedeem()}
          sx={{
            flex: 1, px: 1.25, py: 0.7,
            borderRadius: "8px",
            border: `1px solid ${isDark ? "rgba(107,127,163,0.18)" : "rgba(12,18,34,0.1)"}`,
            bgcolor: "transparent",
            color: "inherit",
            fontSize: "0.78rem",
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: "0.08em",
            outline: "none",
            transition: "border-color 0.15s ease",
            "&:focus": { borderColor: accent },
          }}
        />
        <Button variant="outlined" size="small" onClick={handleRedeem}
          disabled={loading || !code.trim()}
          sx={{
            fontSize: "0.72rem", fontWeight: 600, borderRadius: "8px", px: 1.5,
            borderColor: isDark ? "rgba(107,127,163,0.25)" : "rgba(12,18,34,0.15)",
            color: "text.secondary",
            "&:hover": { borderColor: accent, color: accent, bgcolor: "transparent" },
            "&:disabled": { opacity: 0.4 },
          }}
        >
          {loading ? <CircularProgress size={13} /> : "Pakai"}
        </Button>
      </Box>
      {error && <Typography sx={{ fontSize: "0.68rem", color: isDark ? "#fb7185" : "#e11d48", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{error}</Typography>}
      {success && <Typography sx={{ fontSize: "0.68rem", color: "#34d399", fontWeight: 600, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{success}</Typography>}
    </Stack>
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
  const isMobile = useMediaQuery((t) => t.breakpoints.down("sm"));
  const { user, isPro, redeemReferral } = useProContext();
  const [mode, setMode] = useState<PaywallMode>(initialMode);

  const accent = isDark ? "#c9a227" : "#c9a227";

  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  const handleAuthSuccess = useCallback(() => setMode("pro"), []);

  if (open && user && isPro) {
    onClose();
    return null;
  }

  const isAuthMode = mode === "login" || mode === "signup";
  const isPaymentMode = mode === "payment";
  const isProMode = mode === "pro";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth={isPaymentMode ? "sm" : "xs"}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: isMobile ? 0 : "16px",
            border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.07)"}`,
            bgcolor: isDark ? "#0d0d0d" : "#f0eeeb",
            backgroundImage: "none",
            overflow: "hidden",
            boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.6)" : "0 24px 64px rgba(0,0,0,0.12)",
          },
        },
        backdrop: {
          sx: { backdropFilter: "blur(6px)", bgcolor: "rgba(0,0,0,0.55)" },
        },
      }}
    >
      {/* header */}
      <Box sx={{ display: "flex", alignItems: "center", px: 2.5, pt: 2, pb: 0 }}>
        {isPaymentMode && (
          <IconButton size="small" onClick={() => setMode("pro")}
            sx={{ color: "text.secondary", mr: 0.5, "&:hover": { color: "text.primary" } }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onClose}
          sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: isPaymentMode ? 1 : 2, pb: 3, overflowY: "auto" }}>

        {/* ── AUTH ── */}
        {isAuthMode && (
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 700, fontSize: "1.05rem",
                letterSpacing: "-0.02em",
              }}>
                {mode === "login" ? "Masuk" : "Buat akun"}
              </Typography>
            </Box>

            <EmailAuthForm
              mode={mode === "login" ? "login" : "signup"}
              onSwitch={() => setMode(mode === "login" ? "signup" : "login")}
              onSuccess={handleAuthSuccess}
            />
          </Stack>
        )}

        {/* ── PRO PRICING ── */}
        {isProMode && (
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.58rem", fontWeight: 600,
                letterSpacing: "0.1em", color: accent,
                textTransform: "uppercase", mb: 1,
              }}>
                Gunaa Pro
              </Typography>

              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, mb: 0.5 }}>
                <Typography sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 800, fontSize: "1.75rem",
                  letterSpacing: "-0.03em", color: accent, lineHeight: 1,
                }}>
                  Rp99.000
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  / bulan
                </Typography>
                <Typography sx={{
                  fontSize: "0.65rem", color: "text.secondary",
                  textDecoration: "line-through",
                  fontFamily: '"Plus Jakarta Sans", sans-serif', ml: 0.5,
                }}>
                  Rp559.000
                </Typography>
              </Box>

              <Typography sx={{
                fontSize: "0.72rem", color: "text.secondary",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}>
                Harga early adopter — hemat 82%
              </Typography>
            </Box>

            <Stack spacing={0.85}>
              {PRO_FEATURES.map((text, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                  <Box sx={{
                    width: 4, height: 4, borderRadius: "50%",
                    bgcolor: accent, flexShrink: 0, mt: "7px",
                  }} />
                  <Typography sx={{
                    fontSize: "0.78rem",
                    color: isDark ? "rgba(232,237,245,0.78)" : "rgba(12,18,34,0.68)",
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    lineHeight: 1.5,
                  }}>
                    {text}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Button
              fullWidth variant="contained"
              onClick={() => user ? setMode("payment") : setMode("login")}
              sx={{
                bgcolor: accent, color: "#050505",
                fontWeight: 700, fontSize: "0.85rem",
                borderRadius: "8px", py: 1, boxShadow: "none",
                "&:hover": { bgcolor: isDark ? "#e0b83d" : "#e0b83d", boxShadow: "none" },
              }}
            >
              Berlangganan sekarang
            </Button>

            <Typography sx={{
              fontSize: "0.62rem", color: "text.secondary",
              textAlign: "center",
              fontFamily: '"Plus Jakarta Sans", sans-serif', lineHeight: 1.6,
            }}>
              Transfer bank · QRIS · e-wallet · via Mayar.id
            </Typography>

            <ReferralCodeInput
              user={user}
              redeemReferral={redeemReferral}
              accent={accent}
              isDark={isDark}
              onSuccess={onClose}
            />

            {!user && (
              <Typography sx={{
                fontSize: "0.7rem", color: "text.secondary",
                textAlign: "center",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}>
                Sudah punya akun?{" "}
                <Box component="span" onClick={() => setMode("login")}
                  sx={{ color: accent, cursor: "pointer", fontWeight: 600 }}>
                  Masuk
                </Box>
              </Typography>
            )}
          </Stack>
        )}

        {/* ── PAYMENT EMBED ── */}
        {isPaymentMode && (
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <Typography sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.58rem", fontWeight: 600,
                letterSpacing: "0.1em", color: accent,
                textTransform: "uppercase",
              }}>
                Gunaa Pro · 1 bulan
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                <Typography sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 700, fontSize: "1rem",
                  letterSpacing: "-0.02em", color: accent, lineHeight: 1,
                }}>
                  Rp99.000
                </Typography>
                <Typography sx={{ fontSize: "0.62rem", color: "text.secondary", textDecoration: "line-through", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  Rp559.000
                </Typography>
              </Box>
            </Box>

            <MayarEmbed email={user?.email} />

            <Typography sx={{
              fontSize: "0.6rem", color: "text.secondary",
              textAlign: "center",
              fontFamily: '"Plus Jakarta Sans", sans-serif', lineHeight: 1.6,
            }}>
              Akun diaktifkan dalam 1×24 jam setelah pembayaran dikonfirmasi.
            </Typography>
          </Stack>
        )}

      </DialogContent>
    </Dialog>
  );
}
