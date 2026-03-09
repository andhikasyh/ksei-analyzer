"use client";

import Container from "@mui/material/Container";
import Box from "@mui/material/Box";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 1.5, sm: 2, md: 3 },
          px: { xs: 1.5, sm: 2, md: 3 },
          position: "relative",
          zIndex: 1,
          minWidth: 0,
        }}
      >
        <Box>{children}</Box>
      </Container>
    </>
  );
}
