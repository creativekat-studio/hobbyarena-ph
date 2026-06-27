import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useRouteError } from "react-router-dom";
import { MONO_FONT } from "../theme.js";

export default function RouteErrorFallback({ title = "Something went wrong" }) {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Please refresh the page or return home.";

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
      <Box
        sx={{
          p: { xs: 4, md: 5 },
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          textAlign: "center",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5, mb: 3 }}>
          {message}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
          <Button component={RouterLink} to="/" variant="contained" sx={{ fontFamily: MONO_FONT, textTransform: "uppercase" }}>
            Go home
          </Button>
          <Button component={RouterLink} to="/shop" variant="outlined" color="inherit">
            Browse shop
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
