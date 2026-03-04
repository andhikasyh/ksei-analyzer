"use client";

import Container from "@mui/material/Container";
import Box from "@mui/material/Box";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Box className="ambient-glow">
        <Box className="ambient-glow-extra" />
      </Box>
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2, md: 3 },
          px: { xs: 2, md: 3 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box>{children}</Box>
      </Container>
    </>
  );
}
