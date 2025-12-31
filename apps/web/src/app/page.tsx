"use client";

import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { AppCard } from "../components/AppCard";
import CalculateIcon from "@mui/icons-material/Calculate";
import TuneIcon from "@mui/icons-material/Tune";
import ScienceIcon from "@mui/icons-material/Science";
import { Timeline } from "@mui/icons-material";

export default function Dashboard() {
  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 8, textAlign: "center" }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(to right, #053a7bff, #00C4F9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            Engineering Suite
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "text.secondary",
              maxWidth: "600px",
              mx: "auto",
            }}
          >
            A unified platform for process design, hydraulic analysis, and
            equipment sizing.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={4}>
            <AppCard
              title="Network Editor"
              description="Hydraulic network analysis for single phase flow. Calculate pressure drops, velocities, and fittings."
              icon={<Timeline fontSize="large" />}
              href="/network-editor"
              status="active"
            />
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <AppCard
              title="Pressure Safety Valve Sizing"
              description="PSV sizing based on ASME and EN standards. Includes data from vendor's catalog."
              icon={<TuneIcon fontSize="large" />}
              href="/psv"
              status="active"
            />
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <AppCard
              title="Control Valve Sizing"
              description="CV sizing based on ISA 75.01. Includes cavitation checks."
              icon={<TuneIcon fontSize="large" />}
              status="coming_soon"
            />
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <AppCard
              title="Orifice Calculator"
              description="Restriction orifice and flow meter sizing (ISO 5167). Beta ratio and permanent pressure loss."
              icon={<CalculateIcon fontSize="large" />}
              status="coming_soon"
            />
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <AppCard
              title="Fluid Properties"
              description="Thermodynamic properties using the CoolProp engine. Phase envelopes and flash calculations."
              icon={<ScienceIcon fontSize="large" />}
              status="coming_soon"
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
