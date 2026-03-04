"use client";

import Container from "@mui/material/Container";
import Box from "@mui/material/Box";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, px: { xs: 2, md: 3 } }}>
      <Box>{children}</Box>
    </Container>
  );
}
