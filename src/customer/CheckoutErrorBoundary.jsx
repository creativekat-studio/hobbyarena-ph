import { Component } from "react";
import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { MONO_FONT } from "../theme.js";

import { clearCheckoutConfirmation } from "../lib/checkoutConfirmation.js";

export default class CheckoutErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Checkout failed to render:", error);
  }

  handleReset = () => {
    try {
      clearCheckoutConfirmation();
    } catch {
      // ignore
    }
    this.setState({ error: null });
    window.location.assign("/checkout");
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            Checkout couldn&apos;t load
          </Typography>
          <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
            {error.message || "Something went wrong while loading checkout."}
          </Alert>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="contained"
              onClick={this.handleReset}
              sx={{ fontFamily: MONO_FONT, textTransform: "uppercase" }}
            >
              Reset checkout
            </Button>
            <Button component={RouterLink} to="/products" variant="outlined" color="inherit">
              Back to shop
            </Button>
          </Stack>
        </Box>
      </Container>
    );
  }
}
