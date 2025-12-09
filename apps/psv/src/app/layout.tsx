import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const inter = localFont({
    src: "./fonts/Inter-roman.var.woff2",
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: "PSV Sizing - Process Engineering Suite",
    description: "Pressure Safety Valve sizing and overpressure protection management.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
