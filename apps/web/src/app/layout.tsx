import type { Metadata } from "next";
import localFont from "next/font/local";
import { Box } from "@mui/material";
import "./globals.css";

const inter = localFont({
    src: "./fonts/Inter-roman.var.woff2",
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Engineering Suite",
    description: "Advanced Process Engineering Tools",
};

import { Providers } from "./providers";
import { TopToolbar } from "../components/TopToolbar";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
                <Providers>
                    <Box
                        sx={{
                            position: "sticky",
                            top: 0,
                            zIndex: 1000,
                            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                            backdropFilter: "blur(4px)",
                        }}
                    >
                        <TopToolbar />
                    </Box>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
