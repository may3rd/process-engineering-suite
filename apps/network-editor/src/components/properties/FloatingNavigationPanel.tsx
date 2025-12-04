import React from "react";
import { createPortal } from "react-dom";
import { Stack, IconButton, Box } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

type Props = {
    footerNode: HTMLDivElement | null;
    onBack?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onForward?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    backDisabled?: boolean;
    forwardDisabled?: boolean;
};

export const FloatingNavigationPanel = ({
    footerNode,
    onBack,
    onForward,
    backDisabled = false,
    forwardDisabled = false,
}: Props) => {
    if (!footerNode) return null;

    const buttonStyle = {
        color: "text.primary",
        padding: "8px",
        "&:hover": {
            backgroundColor: (theme: any) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
        },
        "&.Mui-disabled": {
            color: "rgba(0, 0, 0, 0.26)",
        },
    };

    return createPortal(
        <Box
            sx={{
                position: "absolute",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1200,
                pointerEvents: "auto",
                backgroundColor: "background.paper",
                borderRadius: "50px",
                boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                gap: 1,
            }}
        >
            <IconButton
                onClick={onBack}
                disabled={backDisabled}
                sx={buttonStyle}
                size="large"
            >
                <ChevronLeft fontSize="inherit" />
            </IconButton>
            <IconButton
                onClick={onForward}
                disabled={forwardDisabled}
                sx={buttonStyle}
                size="large"
            >
                <ChevronRight fontSize="inherit" />
            </IconButton>
        </Box>,
        footerNode
    );
};
