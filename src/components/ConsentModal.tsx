"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import GavelIcon from "@mui/icons-material/Gavel";

const CONSENT_KEY = "gunaa_consent_v1";

const EXEMPT_PATHS = ["/terms", "/privacy", "/auth"];

const sections = [
  {
    title: "For Informational Purposes Only",
    titleId: "Hanya untuk Tujuan Informasi",
    body: "All content on this platform — including algorithm-generated analyses, market intelligence reports, charts, and data visualizations — is provided strictly for educational and research purposes. Nothing on this platform constitutes financial advice, investment advice, or a recommendation to buy, sell, or hold any security or asset.",
    bodyId: "Seluruh konten di platform ini — termasuk analisis algoritmik, laporan market intelligence, grafik, dan visualisasi data — disediakan semata-mata untuk tujuan edukasi dan penelitian. Tidak ada konten yang merupakan nasihat keuangan, saran investasi, atau rekomendasi untuk membeli, menjual, atau menahan efek maupun aset apapun.",
    accent: "rgba(201,168,76,0.5)",
  },
  {
    title: "No Liability",
    titleId: "Tanpa Tanggung Jawab",
    body: "Gunaa and its operators make no representations or warranties regarding the accuracy, completeness, or timeliness of any information. We accept no liability whatsoever for any financial losses, damages, or adverse consequences — direct or indirect — arising from your use of or reliance on any content on this platform.",
    bodyId: "Gunaa dan pengelolanya tidak membuat pernyataan atau jaminan mengenai keakuratan, kelengkapan, atau ketepatan waktu informasi yang tersedia. Kami tidak bertanggung jawab atas kerugian finansial, kerusakan, atau dampak negatif apapun — langsung maupun tidak langsung — yang timbul dari penggunaan atau ketergantungan Anda pada konten di platform ini.",
    accent: "rgba(251,113,133,0.55)",
  },
  {
    title: "Your Decision, Your Responsibility",
    titleId: "Keputusan Anda, Tanggung Jawab Anda",
    body: "Any investment or trading decision you make is entirely your own responsibility. You should always conduct independent due diligence and consult a licensed financial advisor before committing capital. All investments carry inherent risk, including the possible loss of your entire principal.",
    bodyId: "Setiap keputusan investasi atau perdagangan yang Anda buat sepenuhnya merupakan tanggung jawab Anda sendiri. Selalu lakukan analisis mandiri dan konsultasikan dengan penasihat keuangan berlisensi sebelum menempatkan modal. Semua investasi mengandung risiko, termasuk kemungkinan kehilangan seluruh modal Anda.",
    accent: "rgba(201,168,76,0.5)",
  },
  {
    title: "Analytical Limitations",
    titleId: "Keterbatasan Analitik",
    body: "Analyses are generated algorithmically from structured data and publicly available information. They are not predictions of future performance, may contain errors or omissions, and should be treated as a starting point for research only — not as a definitive investment guide.",
    bodyId: "Analisis dihasilkan secara algoritmik dari data terstruktur dan informasi yang tersedia untuk umum. Bukan merupakan prediksi kinerja masa depan, dapat mengandung kesalahan atau ketidaklengkapan, dan harus diperlakukan hanya sebagai titik awal penelitian — bukan panduan investasi yang definitif.",
    accent: "rgba(129,140,248,0.45)",
  },
];

export function ConsentModal() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isExempt = EXEMPT_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isExempt) return;
    try {
      const accepted = localStorage.getItem(CONSENT_KEY);
      if (!accepted) setOpen(true);
    } catch {
      // localStorage unavailable
    }
  }, [isExempt]);

  const handleAgree = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;

  const bodyColor = isDark ? "rgba(232,237,245,0.72)" : "rgba(12,18,34,0.68)";
  const bodyColorMuted = isDark ? "rgba(232,237,245,0.48)" : "rgba(12,18,34,0.46)";

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(0,0,0,0.8)",
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          overflow: "hidden",
          border: isDark
            ? "1px solid rgba(201,168,76,0.15)"
            : "1px solid rgba(201,168,76,0.2)",
        },
      }}
    >
      <DialogContent sx={{ p: 0, overflowY: "auto" }}>
        {/* Header */}
        <Box
          sx={{
            px: { xs: 3, sm: 4 },
            py: 3.5,
            background: "linear-gradient(135deg, #0c1222 0%, #161d34 100%)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "2px",
              background:
                "linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)",
            },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <GavelIcon sx={{ fontSize: 14, color: "#c9a227" }} />
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "#c9a227",
                fontFamily: '"JetBrains Mono", monospace',
                textTransform: "uppercase",
              }}
            >
              Platform Disclaimer
            </Typography>
          </Stack>
          <Typography
            sx={{
              fontSize: { xs: "1.25rem", sm: "1.45rem" },
              fontWeight: 800,
              color: "#f5f0e8",
              fontFamily: '"Outfit", sans-serif',
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              mb: 0.4,
            }}
          >
            Before You Continue
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "1rem", sm: "1.15rem" },
              fontWeight: 600,
              color: "rgba(245,240,232,0.55)",
              fontFamily: '"Outfit", sans-serif',
              letterSpacing: "-0.015em",
              lineHeight: 1.2,
              mb: 1.25,
            }}
          >
            Sebelum Melanjutkan
          </Typography>
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.4)",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              lineHeight: 1.55,
            }}
          >
            Gunaa is a data analytics platform for Indonesian Exchange (BEI/IDX) securities.{" "}
            <Box component="span" sx={{ color: "rgba(255,255,255,0.28)" }}>
              Gunaa adalah platform analitik data untuk efek yang tercatat di Bursa Efek Indonesia (BEI/IDX).
            </Box>
          </Typography>
        </Box>

        {/* Disclaimer sections */}
        <Box
          sx={{
            px: { xs: 3, sm: 3.5 },
            py: 3,
            bgcolor: isDark ? "#0c1222" : "#fafaf8",
          }}
        >
          <Stack spacing={2.5}>
            {sections.map((s, i) => (
              <Box
                key={i}
                sx={{
                  pl: 2,
                  borderLeft: `2px solid ${s.accent}`,
                }}
              >
                {/* Title bilingual */}
                <Stack direction="row" spacing={1} alignItems="baseline" mb={0.5} flexWrap="wrap">
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: isDark ? "rgba(232,237,245,0.55)" : "rgba(12,18,34,0.5)",
                      fontFamily: '"JetBrains Mono", monospace',
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      color: isDark ? "rgba(232,237,245,0.3)" : "rgba(12,18,34,0.3)",
                      fontFamily: '"JetBrains Mono", monospace',
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    / {s.titleId}
                  </Typography>
                </Stack>

                {/* English body */}
                <Typography
                  sx={{
                    fontSize: "0.78rem",
                    color: bodyColor,
                    lineHeight: 1.68,
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    mb: 0.75,
                  }}
                >
                  {s.body}
                </Typography>

                {/* Indonesian body */}
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: bodyColorMuted,
                    lineHeight: 1.65,
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    fontStyle: "italic",
                  }}
                >
                  {s.bodyId}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Agree section */}
        <Box
          sx={{
            px: { xs: 3, sm: 3.5 },
            pb: 3.5,
            bgcolor: isDark ? "#0c1222" : "#fafaf8",
          }}
        >
          <Divider
            sx={{
              mb: 2.5,
              borderColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.07)",
            }}
          />

          {/* Bilingual agreement text */}
          <Typography
            sx={{
              fontSize: "0.71rem",
              color: isDark ? "rgba(232,237,245,0.45)" : "rgba(12,18,34,0.5)",
              mb: 0.75,
              lineHeight: 1.7,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
          >
            By clicking below, you confirm you are 18 years of age or older, have read and
            understood this disclaimer, and agree to our{" "}
            <Box
              component="a"
              href="/terms"
              target="_blank"
              rel="noopener"
              sx={{
                color: "#c9a227",
                textDecoration: "none",
                fontWeight: 600,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Terms of Service
            </Box>{" "}
            and{" "}
            <Box
              component="a"
              href="/privacy"
              target="_blank"
              rel="noopener"
              sx={{
                color: "#c9a227",
                textDecoration: "none",
                fontWeight: 600,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Privacy Policy
            </Box>
            .
          </Typography>
          <Typography
            sx={{
              fontSize: "0.68rem",
              color: isDark ? "rgba(232,237,245,0.3)" : "rgba(12,18,34,0.35)",
              mb: 2,
              lineHeight: 1.7,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontStyle: "italic",
            }}
          >
            Dengan mengklik tombol di bawah, Anda menyatakan berusia 18 tahun atau lebih, telah
            membaca dan memahami disclaimer ini, serta menyetujui{" "}
            <Box
              component="a"
              href="/terms"
              target="_blank"
              rel="noopener"
              sx={{
                color: isDark ? "rgba(201,168,76,0.6)" : "rgba(161,124,47,0.65)",
                textDecoration: "none",
                fontWeight: 600,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Syarat &amp; Ketentuan
            </Box>{" "}
            dan{" "}
            <Box
              component="a"
              href="/privacy"
              target="_blank"
              rel="noopener"
              sx={{
                color: isDark ? "rgba(201,168,76,0.6)" : "rgba(161,124,47,0.65)",
                textDecoration: "none",
                fontWeight: 600,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Kebijakan Privasi
            </Box>{" "}
            kami.
          </Typography>

          <Button
            fullWidth
            onClick={handleAgree}
            sx={{
              py: 1.4,
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.88rem",
              fontFamily: '"Outfit", sans-serif',
              letterSpacing: "-0.01em",
              background: "linear-gradient(135deg, #c9a227 0%, #d4b45c 100%)",
              color: "#0c1222",
              boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
              lineHeight: 1.3,
              "&:hover": {
                background: "linear-gradient(135deg, #d4b45c 0%, #e0c070 100%)",
                boxShadow: "0 6px 28px rgba(201,168,76,0.45)",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease",
            }}
          >
            I Understand & Agree to Continue
            <Box
              component="span"
              sx={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 500,
                opacity: 0.7,
                letterSpacing: "0",
              }}
            >
              Saya Mengerti &amp; Setuju Melanjutkan
            </Box>
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
