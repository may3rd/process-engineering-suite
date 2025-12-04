import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
            <body className={inter.className} style={{ margin: 0, padding: 0 }}>
                <Providers>
                    <TopToolbar />
                    {children}
                </Providers>
            </body>
        </html>
    );
}