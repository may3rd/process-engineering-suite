"use client";

import { Box, Container, CircularProgress } from "@mui/material";
import { useEffect, lazy, Suspense } from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
const HierarchyBrowser = lazy(() =>
  import("@/components/HierarchyBrowser").then((mod) => ({
    default: mod.HierarchyBrowser,
  })),
);
const ProtectiveSystemList = lazy(() =>
  import("@/components/ProtectiveSystemList").then((mod) => ({
    default: mod.ProtectiveSystemList,
  })),
);
const ProtectiveSystemDetail = lazy(() =>
  import("@/components/ProtectiveSystemDetail").then((mod) => ({
    default: mod.ProtectiveSystemDetail,
  })),
);
const DashboardPage = lazy(() =>
  import("@/components/DashboardPage").then((mod) => ({
    default: mod.DashboardPage,
  })),
);
const AccountSettingsPage = lazy(() =>
  import("@/components/AccountSettingsPage").then((mod) => ({
    default: mod.AccountSettingsPage,
  })),
);
const CaseConsiderationPage = lazy(() =>
  import("@/components/CaseConsiderationPage").then((mod) => ({
    default: mod.CaseConsiderationPage,
  })),
);
const GlobalActivityPage = lazy(() =>
  import("@/components/GlobalActivityPage").then((mod) => ({
    default: mod.GlobalActivityPage,
  })),
);
import { usePsvStore } from "@/store/usePsvStore";

export default function PsvApp() {
  const {
    selection,
    selectedProject,
    selectedPsv,
    currentPage,
    isLoading,
    initialize,
  } = usePsvStore();

  // Initialize data on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Box sx={{ minHeight: "100vh - 72px", pb: 4 }}>
      <Container maxWidth="xl" sx={{ pt: 4 }}>
        {currentPage !== "dashboard" &&
          currentPage !== "account" &&
          currentPage !== "activity" && (
            <Box className="print-hide" sx={{ mb: 3 }}>
              <Breadcrumbs />
            </Box>
          )}

        {isLoading && !selectedProject && !selectedPsv ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "50vh",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Suspense fallback={<CircularProgress />}>
            {currentPage === "dashboard" && <DashboardPage key="dashboard" />}
            {currentPage === "account" && <AccountSettingsPage key="account" />}
            {currentPage === "activity" && (
              <GlobalActivityPage key="activity" />
            )}
            {currentPage === "scenario_consideration" && (
              <CaseConsiderationPage key="scenario" />
            )}
            {currentPage !== "dashboard" &&
              currentPage !== "account" &&
              currentPage !== "activity" &&
              currentPage !== "scenario_consideration" &&
              selectedPsv && (
                <ProtectiveSystemDetail key={`psv-${selectedPsv.id}`} />
              )}
            {currentPage !== "dashboard" &&
              currentPage !== "account" &&
              currentPage !== "activity" &&
              currentPage !== "scenario_consideration" &&
              !selectedPsv &&
              selectedProject && (
                <ProtectiveSystemList key={`project-${selectedProject.id}`} />
              )}
            {currentPage !== "dashboard" &&
              currentPage !== "account" &&
              currentPage !== "activity" &&
              currentPage !== "scenario_consideration" &&
              !selectedPsv &&
              !selectedProject && (
                <HierarchyBrowser
                  key={`hierarchy-${selection.customerId ?? "root"}-${selection.plantId ?? ""}-${selection.unitId ?? ""}-${selection.areaId ?? ""}`}
                />
              )}
          </Suspense>
        )}
      </Container>
    </Box>
  );
}
