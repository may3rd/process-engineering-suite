import { Box, Typography, Button, Chip, SxProps, Theme, useTheme } from "@mui/material";
import { glassPanelSx } from "@eng-suite/ui-kit"; // Reusing your shared style!
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockIcon from "@mui/icons-material/Lock";

// 
import { liquidGlassBorderSx } from "@eng-suite/ui-kit";

interface AppCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    href?: string;
    status?: "active" | "coming_soon" | "maintenance";
}

export const AppCard = ({ title, description, icon, href, status = "active" }: AppCardProps) => {
    const isActive = status === "active";
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            sx={{
                ...glassPanelSx,
                p: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: isDark ? "-10px 0 40px rgba(0,0,0,0.7)," + liquidGlassBorderSx : "-10px 0 40px rgba(0,0,0,0.2)," + liquidGlassBorderSx,
                "&:hover": isActive
                    ? {
                        transform: "translateY(-4px)",
                        boxShadow: isDark ? "0 8px 32px rgba(0, 0, 0, 0.2), " + liquidGlassBorderSx : "0 8px 32px rgba(0, 0, 0, 0.2), " + liquidGlassBorderSx,
                        cursor: "pointer",
                    }
                    : {},
                opacity: isActive ? 1 : 0.7,
            } as SxProps<Theme>}
            onClick={() => {
                if (isActive && href) {
                    const separator = href.includes('?') ? '&' : '?';
                    window.location.href = `${href}${separator}theme=${theme.palette.mode}`;
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: "50%",
                        border: isDark ? "2px solid rgba(255,255,255,0.2)" : "2px solid rgba(0,0,0,0.2)",
                        background: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "primary.main", // Blue-400
                    }}
                >
                    {icon}
                </Box>
                {status !== "active" && (
                    <Chip
                        label={status === "coming_soon" ? "Coming Soon" : "Maintenance"}
                        size="small"
                        sx={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.1)', color: 'primary.main' }}
                    />
                )}
            </Box>

            <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {description}
                </Typography>
            </Box>

            <Box sx={{ mt: 'auto', pt: 2, width: '100%' }}>
                <Button
                    variant={isActive ? "contained" : "outlined"}
                    fullWidth
                    disabled={!isActive}
                    endIcon={isActive ? <ArrowForwardIcon /> : <LockIcon />}
                    sx={{
                        borderRadius: "10px",
                        textTransform: "none",
                        backgroundColor: isActive ? "#3b82f6" : "transparent",
                        borderColor: "rgba(255,255,255,0.1)",
                        boxShadow: liquidGlassBorderSx,
                        "&:hover": {
                            backgroundColor: isActive ? "#2563eb" : "transparent",
                            boxShadow: liquidGlassBorderSx,
                        }
                    }}
                >
                    {isActive ? "Launch Tool" : "Unavailable"}
                </Button>
            </Box>
        </Box>
    );
};