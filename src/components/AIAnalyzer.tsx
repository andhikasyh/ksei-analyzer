"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RefreshIcon from "@mui/icons-material/Refresh";
import StopIcon from "@mui/icons-material/Stop";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";

interface AIAnalyzerProps {
  stockCode: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type StreamState = "idle" | "loading" | "streaming" | "done" | "error";

function parseMarkdownTables(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (line: string) =>
          line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

        const headerCells = parseRow(tableLines[0]);
        const isSeparator = (line: string) => /^\|[\s:|-]+\|$/.test(line.trim());
        const dataStartIdx = isSeparator(tableLines[1]) ? 2 : 1;
        const hasHeader = isSeparator(tableLines[1]);

        let tableHtml = '<div class="md-table-wrap"><table class="md-table">';
        if (hasHeader) {
          tableHtml += "<thead><tr>";
          headerCells.forEach((c) => {
            tableHtml += `<th>${c}</th>`;
          });
          tableHtml += "</tr></thead>";
        }

        tableHtml += "<tbody>";
        const startIdx = hasHeader ? dataStartIdx : 0;
        for (let r = startIdx; r < tableLines.length; r++) {
          if (isSeparator(tableLines[r])) continue;
          const cells = parseRow(tableLines[r]);
          tableHtml += "<tr>";
          cells.forEach((c) => {
            tableHtml += `<td>${c}</td>`;
          });
          tableHtml += "</tr>";
        }
        tableHtml += "</tbody></table></div>";
        result.push(tableHtml);
      } else {
        result.push(...tableLines);
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join("\n");
}

function parseMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = parseMarkdownTables(html);

  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h3">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h2">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="md-h1">$1</h2>');

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, '<code class="md-code">$1</code>');

  html = html.replace(/^---$/gm, '<hr class="md-hr" />');

  html = html.replace(/^- (.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(
    /(<li class="md-li">.*<\/li>\n?)+/g,
    (match) => `<ul class="md-ul">${match}</ul>`
  );

  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-oli">$1</li>');
  html = html.replace(
    /(<li class="md-oli">.*<\/li>\n?)+/g,
    (match) => `<ol class="md-ol">${match}</ol>`
  );

  const lines = html.split("\n");
  const result: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("<ol") ||
      trimmed.startsWith("<hr") ||
      trimmed.startsWith("<li") ||
      trimmed.startsWith("<div") ||
      trimmed.startsWith("<table") ||
      trimmed === ""
    ) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      if (trimmed !== "") result.push(trimmed);
    } else {
      if (!inParagraph) {
        result.push('<p class="md-p">');
        inParagraph = true;
      }
      result.push(trimmed);
    }
  }
  if (inParagraph) result.push("</p>");

  return result.join("\n");
}

function useMarkdownStyles(isDark: boolean, accentColor: string) {
  const borderSub = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  return {
    fontFamily: '"Source Serif 4", "Georgia", serif',
    fontSize: "0.88rem",
    lineHeight: 1.8,
    color: "text.primary",
    "& .md-h1": {
      fontFamily: '"Playfair Display", serif',
      fontSize: "1.3rem",
      fontWeight: 700,
      mt: 3,
      mb: 1.5,
      pb: 0.5,
      borderBottom: `1px solid ${borderSub}`,
      color: accentColor,
    },
    "& .md-h2": {
      fontFamily: '"Playfair Display", serif',
      fontSize: "1.1rem",
      fontWeight: 700,
      mt: 2.5,
      mb: 1,
      color: "text.primary",
    },
    "& .md-h3": {
      fontSize: "0.95rem",
      fontWeight: 700,
      mt: 2,
      mb: 0.75,
      color: "text.primary",
    },
    "& .md-p": {
      my: 1,
      color: isDark ? "rgba(232,237,245,0.85)" : "rgba(12,18,34,0.78)",
    },
    "& .md-code": {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "0.78rem",
      bgcolor: isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.05)",
      px: 0.6,
      py: 0.15,
      borderRadius: "4px",
      color: accentColor,
    },
    "& .md-ul, & .md-ol": {
      pl: 2.5,
      my: 1,
    },
    "& .md-li, & .md-oli": {
      mb: 0.5,
      color: isDark ? "rgba(232,237,245,0.85)" : "rgba(12,18,34,0.78)",
      "& strong": { color: "text.primary" },
    },
    "& .md-hr": {
      border: "none",
      borderTop: `1px solid ${borderSub}`,
      my: 2,
    },
    "& strong": {
      fontWeight: 700,
      color: "text.primary",
    },
    "& em": {
      fontStyle: "italic",
    },
    "& .md-table-wrap": {
      overflowX: "auto",
      my: 1.5,
      borderRadius: "8px",
      border: `1px solid ${borderSub}`,
    },
    "& .md-table": {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "0.8rem",
      fontFamily: '"JetBrains Mono", monospace',
      "& th": {
        textAlign: "left",
        p: "8px 12px",
        fontWeight: 700,
        fontSize: "0.72rem",
        color: isDark ? "rgba(232,237,245,0.6)" : "rgba(12,18,34,0.5)",
        borderBottom: `1px solid ${borderSub}`,
        bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      },
      "& td": {
        p: "6px 12px",
        borderBottom: `1px solid ${borderSub}`,
        color: isDark ? "rgba(232,237,245,0.85)" : "rgba(12,18,34,0.78)",
      },
      "& tbody tr:last-child td": {
        borderBottom: "none",
      },
      "& tbody tr:hover": {
        bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.015)",
      },
    },
  } as const;
}

export function AIAnalyzerPanel({ stockCode }: AIAnalyzerProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [state, setState] = useState<StreamState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && (state === "streaming" || state === "loading")) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamingContent, state]);

  const streamResponse = useCallback(
    async (apiMessages: ChatMessage[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStreamingContent("");
      setError("");
      setState("loading");

      try {
        const res = await fetch("/api/ai-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockCode, messages: apiMessages }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to start analysis");
        }

        setState("streaming");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
              setStreamingContent("");
              setState("done");
              return;
            }
            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) {
                setError(parsed.error);
                setState("error");
                return;
              }
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingContent(accumulated);
              }
            } catch {
              // skip malformed
            }
          }
        }

        if (accumulated) {
          setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
          setStreamingContent("");
        }
        setState("done");
      } catch (err: any) {
        if (err.name === "AbortError") {
          setState(messages.length > 0 ? "done" : "idle");
          return;
        }
        setError(err.message || "Analysis failed");
        setState("error");
      }
    },
    [stockCode, messages.length]
  );

  const runInitialAnalysis = useCallback(() => {
    const userMsg: ChatMessage = {
      role: "user",
      content: "Analyze this stock comprehensively.",
    };
    setMessages([userMsg]);
    streamResponse([userMsg]);
  }, [streamResponse]);

  const sendFollowUp = useCallback(() => {
    const text = followUp.trim();
    if (!text || state === "streaming" || state === "loading") return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setFollowUp("");
    streamResponse(newMessages);
  }, [followUp, messages, state, streamResponse]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendFollowUp();
      }
    },
    [sendFollowUp]
  );

  const stopAnalysis = useCallback(() => {
    abortRef.current?.abort();
    if (streamingContent) {
      setMessages((prev) => [...prev, { role: "assistant", content: streamingContent }]);
      setStreamingContent("");
    }
    setState("done");
  }, [streamingContent]);

  const handleCopy = useCallback(async () => {
    const allContent = messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(allContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [messages]);

  const handleRegenerate = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    runInitialAnalysis();
  }, [runInitialAnalysis]);

  const accentColor = isDark ? "#c9a84c" : "#a17c2f";
  const accentBg = isDark ? "rgba(201,168,76,0.08)" : "rgba(161,124,47,0.06)";
  const subtleBg = isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)";
  const borderColor = isDark ? "rgba(201,168,76,0.12)" : "rgba(161,124,47,0.1)";
  const mdStyles = useMarkdownStyles(isDark, accentColor);

  if (state === "idle" && messages.length === 0) {
    return (
      <Paper
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: 3,
          textAlign: "center",
          border: `1px dashed ${borderColor}`,
          background: `linear-gradient(135deg, ${subtleBg}, transparent)`,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: accentBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 28, color: accentColor }} />
        </Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, mb: 0.5, fontFamily: '"Playfair Display", serif' }}
        >
          AI Stock Analysis
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 3,
            maxWidth: 420,
            mx: "auto",
            lineHeight: 1.6,
          }}
        >
          Get a clear, easy-to-understand stock analysis powered by Claude Sonnet 4.6.
          Includes a score, buy/sell recommendation, and you can ask follow-up questions.
        </Typography>
        <Button
          variant="contained"
          onClick={runInitialAnalysis}
          startIcon={<AutoAwesomeIcon />}
          sx={{
            px: 4,
            py: 1.2,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
            bgcolor: accentColor,
            color: isDark ? "#0c1222" : "#fff",
            "&:hover": { bgcolor: isDark ? "#d4b45c" : "#8a6a27" },
          }}
        >
          Generate Analysis
        </Button>
      </Paper>
    );
  }

  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const initialAnalysis = assistantMessages[0]?.content || "";
  const followUpPairs: { question: string; answer: string }[] = [];

  for (let i = 1; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user") {
      const next = messages[i + 1];
      followUpPairs.push({
        question: m.content,
        answer: next?.role === "assistant" ? next.content : "",
      });
    }
  }

  const isStreaming = state === "streaming";
  const isLoading = state === "loading";
  const isWorking = isStreaming || isLoading;

  const isStreamingInitial = isWorking && assistantMessages.length === 0;
  const isStreamingFollowUp = isWorking && assistantMessages.length > 0;

  return (
    <Paper
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
          bgcolor: accentBg,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 16, color: accentColor }} />
        <Typography
          variant="caption"
          sx={{ color: accentColor, fontWeight: 600, letterSpacing: 0.5 }}
        >
          AI ANALYSIS
        </Typography>
        <Chip
          label="Claude Sonnet 4.6"
          size="small"
          sx={{
            fontSize: "0.6rem",
            height: 18,
            fontWeight: 600,
            bgcolor: isDark ? "rgba(201,168,76,0.12)" : "rgba(161,124,47,0.08)",
            color: accentColor,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        />
        <Box sx={{ flex: 1 }} />

        {isWorking && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "#34d399",
                animation: "pulse 1.5s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.3 },
                },
              }}
            />
            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "text.secondary" }}>
              {isLoading ? "Gathering data..." : "Writing..."}
            </Typography>
          </Stack>
        )}

        {isStreaming && (
          <IconButton size="small" onClick={stopAnalysis} sx={{ color: "#fb7185" }}>
            <StopIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}

        {state === "done" && (
          <>
            <IconButton size="small" onClick={handleCopy} sx={{ color: "text.secondary" }}>
              {copied ? (
                <CheckIcon sx={{ fontSize: 16, color: "#34d399" }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              )}
            </IconButton>
            <IconButton size="small" onClick={handleRegenerate} sx={{ color: "text.secondary" }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </>
        )}
      </Stack>

      {/* Content area */}
      <Box
        ref={scrollRef}
        sx={{
          maxHeight: { xs: 520, md: 720 },
          overflow: "auto",
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            borderRadius: 3,
          },
        }}
      >
        {/* Loading state */}
        {isLoading && assistantMessages.length === 0 && !streamingContent && (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress size={32} sx={{ color: accentColor, mb: 2 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Gathering stock data & searching for news...
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {state === "error" && messages.length <= 1 && (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "#fb7185", mb: 2 }}>
              {error}
            </Typography>
            <Button
              size="small"
              onClick={runInitialAnalysis}
              sx={{ textTransform: "none", color: accentColor }}
            >
              Try Again
            </Button>
          </Box>
        )}

        {/* Initial analysis */}
        {(initialAnalysis || isStreamingInitial) && (
          <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
            <Box
              dangerouslySetInnerHTML={{
                __html: parseMarkdown(
                  isStreamingInitial ? streamingContent : initialAnalysis
                ),
              }}
              sx={mdStyles}
            />
            {isStreamingInitial && streamingContent && (
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  width: 2,
                  height: 16,
                  bgcolor: accentColor,
                  ml: 0.5,
                  verticalAlign: "text-bottom",
                  animation: "blink 1s step-end infinite",
                  "@keyframes blink": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0 },
                  },
                }}
              />
            )}
          </Box>
        )}

        {/* Follow-up Q&A pairs */}
        {followUpPairs.map((pair, idx) => {
          const isLast = idx === followUpPairs.length - 1;
          const showStreaming = isLast && isStreamingFollowUp;

          return (
            <Box key={idx}>
              <Box
                sx={{
                  borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                }}
              >
                {/* User question */}
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    px: { xs: 2, md: 3 },
                    py: 1.5,
                    bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)",
                  }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      bgcolor: isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, pt: 0.25, lineHeight: 1.6 }}
                  >
                    {pair.question}
                  </Typography>
                </Stack>

                {/* AI answer */}
                {(pair.answer || (showStreaming && streamingContent)) && (
                  <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
                    <Box
                      dangerouslySetInnerHTML={{
                        __html: parseMarkdown(
                          showStreaming && !pair.answer ? streamingContent : pair.answer
                        ),
                      }}
                      sx={mdStyles}
                    />
                    {showStreaming && !pair.answer && streamingContent && (
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          width: 2,
                          height: 16,
                          bgcolor: accentColor,
                          ml: 0.5,
                          verticalAlign: "text-bottom",
                          animation: "blink 1s step-end infinite",
                          "@keyframes blink": {
                            "0%, 100%": { opacity: 1 },
                            "50%": { opacity: 0 },
                          },
                        }}
                      />
                    )}
                  </Box>
                )}

                {/* Loading for follow-up */}
                {showStreaming && !streamingContent && (
                  <Box sx={{ px: { xs: 2, md: 3 }, py: 3, textAlign: "center" }}>
                    <CircularProgress size={20} sx={{ color: accentColor }} />
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}

        {/* Error on follow-up */}
        {state === "error" && messages.length > 1 && (
          <Box
            sx={{
              px: { xs: 2, md: 3 },
              py: 2,
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
            }}
          >
            <Typography variant="body2" sx={{ color: "#fb7185", fontSize: "0.82rem" }}>
              {error}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Follow-up input */}
      {(state === "done" || state === "error") && assistantMessages.length > 0 && (
        <Box
          sx={{
            px: { xs: 1.5, md: 2.5 },
            py: 1.5,
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            bgcolor: isDark ? "rgba(107,127,163,0.02)" : "rgba(12,18,34,0.01)",
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder={`Ask about ${stockCode} or other IDX stocks...`}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            maxRows={3}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={sendFollowUp}
                      disabled={!followUp.trim()}
                      sx={{
                        color: followUp.trim() ? accentColor : "text.disabled",
                      }}
                    >
                      <SendIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                fontSize: "0.85rem",
                bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)",
                "& fieldset": {
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                },
                "&:hover fieldset": {
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: accentColor,
                  borderWidth: 1,
                },
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: "text.disabled",
              fontSize: "0.6rem",
              mt: 0.5,
              display: "block",
              textAlign: "center",
            }}
          >
            Responses are scoped to Indonesian stock market (BEI/IDX) data only
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
