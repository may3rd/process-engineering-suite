import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { Providers } from "./providers";
import { Box } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";

import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
    title: "Process Design Agents",
    description: "AI-powered process design workbench",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body style={{ margin: 0, padding: 0 }}>
                <AppRouterCacheProvider>
                    <Providers>
                        <AppShell>
                            {children}
                        </AppShell>
                    </Providers>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
