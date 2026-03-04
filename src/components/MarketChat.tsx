"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import PersonIcon from "@mui/icons-material/Person";

interface MarketChatProps {
  context?: { reportDate: string; reportSummary: string };
  placeholder?: string;
  compact?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type StreamState = "idle" | "loading" | "streaming" | "done" | "error";

function parseMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

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

function useMdStyles(isDark: boolean, accent: string) {
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  return {
    fontSize: "0.85rem",
    lineHeight: 1.75,
    color: "text.primary",
    letterSpacing: "0.01em",
    "& .md-h1": { fontSize: "1.1rem", fontWeight: 700, mt: 2.5, mb: 1, pb: 0.5, borderBottom: `1px solid ${border}`, color: accent },
    "& .md-h2": { fontSize: "1rem", fontWeight: 700, mt: 2, mb: 0.75, color: "text.primary" },
    "& .md-h3": { fontSize: "0.92rem", fontWeight: 700, mt: 1.5, mb: 0.5, color: "text.primary" },
    "& .md-p": { my: 0.75, color: isDark ? "rgba(232,237,245,0.88)" : "rgba(12,18,34,0.75)" },
    "& .md-code": { fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", bgcolor: isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.05)", px: 0.6, py: 0.15, borderRadius: "4px", color: accent },
    "& .md-ul, & .md-ol": { pl: 2.5, my: 0.75 },
    "& .md-li, & .md-oli": { mb: 0.4, color: isDark ? "rgba(232,237,245,0.85)" : "rgba(12,18,34,0.78)", "& strong": { color: "text.primary" } },
    "& .md-hr": { border: "none", borderTop: `1px solid ${border}`, my: 1.5 },
    "& strong": { fontWeight: 700, color: "text.primary" },
    "& em": { fontStyle: "italic" },
  } as const;
}

export function MarketChat({ context, placeholder, compact }: MarketChatProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [state, setState] = useState<StreamState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const accent = isDark ? "#818cf8" : "#6366f1";
  const accentBg = isDark ? "rgba(129,140,248,0.08)" : "rgba(99,102,241,0.06)";
  const mdStyles = useMdStyles(isDark, accent);

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
        const res = await fetch("/api/market-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, context }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Chat failed");
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
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: accumulated },
              ]);
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
              // skip malformed chunks
            }
          }
        }

        if (accumulated) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: accumulated },
          ]);
          setStreamingContent("");
        }
        setState("done");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          setState(messages.length > 0 ? "done" : "idle");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Chat failed"
        );
        setState("error");
      }
    },
    [context, messages.length]
  );

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || state === "streaming" || state === "loading") return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    streamResponse(newMessages);
  }, [input, messages, state, streamResponse]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    if (streamingContent) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: streamingContent },
      ]);
      setStreamingContent("");
    }
    setState("done");
  }, [streamingContent]);

  const isWorking = state === "streaming" || state === "loading";
  const maxH = compact ? 360 : 480;

  return (
    <Paper
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: 1,
        borderColor: isDark ? "rgba(129,140,248,0.12)" : "rgba(99,102,241,0.1)",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          bgcolor: accentBg,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 14, color: accent }} />
        <Typography
          variant="caption"
          sx={{ color: accent, fontWeight: 600, letterSpacing: 0.5, fontSize: "0.65rem" }}
        >
          {context ? "ASK ABOUT THIS REPORT" : "ASK ABOUT THE MARKET"}
        </Typography>
        <Chip
          label="Claude"
          size="small"
          sx={{
            fontSize: "0.55rem",
            height: 16,
            fontWeight: 600,
            bgcolor: isDark ? "rgba(129,140,248,0.12)" : "rgba(99,102,241,0.08)",
            color: accent,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        />
        <Box sx={{ flex: 1 }} />
        {isWorking && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                bgcolor: "#34d399",
                animation: "pulse 1.5s ease-in-out infinite",
                "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.3 } },
              }}
            />
            <Typography variant="caption" sx={{ fontSize: "0.55rem", color: "text.secondary" }}>
              {state === "loading" ? "Thinking..." : "Writing..."}
            </Typography>
          </Stack>
        )}
        {state === "streaming" && (
          <IconButton size="small" onClick={stopStream} sx={{ color: "#fb7185" }}>
            <StopIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Stack>

      <Box
        ref={scrollRef}
        sx={{
          maxHeight: maxH,
          overflow: "auto",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            borderRadius: 3,
          },
        }}
      >
        {messages.length === 0 && !streamingContent && state !== "loading" && (
          <Box sx={{ p: compact ? 3 : 4, textAlign: "center" }}>
            <AutoAwesomeIcon
              sx={{ fontSize: 28, color: isDark ? "rgba(129,140,248,0.25)" : "rgba(99,102,241,0.2)", mb: 1 }}
            />
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: "0.78rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                maxWidth: 320,
                mx: "auto",
                lineHeight: 1.5,
              }}
            >
              {context
                ? `Ask any question about the ${context.reportDate} market report.`
                : "Ask anything about the Indonesian stock market, sectors, stocks, or investing strategies."}
            </Typography>
          </Box>
        )}

        {state === "loading" && messages.length > 0 && !streamingContent && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <CircularProgress size={20} sx={{ color: accent }} />
          </Box>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLastAssistant =
            !isUser && i === messages.length - 1 && state === "done";

          return (
            <Box key={i}>
              {isUser && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)",
                    borderTop: i > 0 ? 1 : 0,
                    borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  }}
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      bgcolor: isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, fontSize: "0.82rem", pt: 0.1, lineHeight: 1.5 }}
                  >
                    {m.content}
                  </Typography>
                </Stack>
              )}
              {!isUser && (
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Box
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(m.content) }}
                    sx={mdStyles}
                  />
                </Box>
              )}
            </Box>
          );
        })}

        {streamingContent && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box
              dangerouslySetInnerHTML={{ __html: parseMarkdown(streamingContent) }}
              sx={mdStyles}
            />
            <Box
              component="span"
              sx={{
                display: "inline-block",
                width: 2,
                height: 14,
                bgcolor: accent,
                ml: 0.5,
                verticalAlign: "text-bottom",
                animation: "blink 1s step-end infinite",
                "@keyframes blink": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0 } },
              }}
            />
          </Box>
        )}

        {state === "error" && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" sx={{ color: "#fb7185", fontSize: "0.8rem" }}>
              {error}
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderTop: 1,
          borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          bgcolor: isDark ? "rgba(107,127,163,0.02)" : "rgba(12,18,34,0.01)",
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder={placeholder || "Ask about the Indonesian market..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline
          maxRows={3}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={sendMessage}
                    disabled={!input.trim() || isWorking}
                    sx={{ color: input.trim() ? accent : "text.disabled" }}
                  >
                    <SendIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              fontSize: "0.82rem",
              bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)",
              "& fieldset": { borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
              "&:hover fieldset": { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" },
              "&.Mui-focused fieldset": { borderColor: accent, borderWidth: 1 },
            },
          }}
        />
      </Box>
    </Paper>
  );
}
