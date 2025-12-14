"use client";

import { useState, useRef, useCallback } from "react";
import {
    Box,
    Tabs,
    Tab,
    TextField,
    IconButton,
    Tooltip,
    Paper,
    useTheme,
    Divider,
} from "@mui/material";
import {
    FormatBold,
    FormatItalic,
    Title,
    FormatListBulleted,
    FormatListNumbered,
    Code,
    Link,
    InsertPhoto,
    FormatQuote,
    HorizontalRule,
    Functions,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    minRows?: number;
    maxRows?: number;
}

interface ToolbarAction {
    icon: React.ReactNode;
    label: string;
    prefix: string;
    suffix: string;
    block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
    { icon: <FormatBold fontSize="small" />, label: "Bold", prefix: "**", suffix: "**" },
    { icon: <FormatItalic fontSize="small" />, label: "Italic", prefix: "_", suffix: "_" },
    { icon: <Title fontSize="small" />, label: "Heading", prefix: "### ", suffix: "", block: true },
    { icon: <FormatQuote fontSize="small" />, label: "Quote", prefix: "> ", suffix: "", block: true },
    { icon: <Code fontSize="small" />, label: "Code", prefix: "`", suffix: "`" },
    { icon: <Link fontSize="small" />, label: "Link", prefix: "[", suffix: "](url)" },
    { icon: <Functions fontSize="small" />, label: "Inline Math ($...$)", prefix: "$", suffix: "$" },
    { icon: <Functions fontSize="small" />, label: "Block Math ($$...$$)", prefix: "\n$$\n", suffix: "\n$$\n", block: true },
    { icon: <FormatListBulleted fontSize="small" />, label: "Bullet List", prefix: "- ", suffix: "", block: true },
    { icon: <FormatListNumbered fontSize="small" />, label: "Numbered List", prefix: "1. ", suffix: "", block: true },
    { icon: <HorizontalRule fontSize="small" />, label: "Divider", prefix: "\n---\n", suffix: "", block: true },
];

export function MarkdownEditor({
    value,
    onChange,
    placeholder,
    disabled = false,
    minRows = 10,
    maxRows = 30,
}: MarkdownEditorProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const [activeTab, setActiveTab] = useState(0);
    const textFieldRef = useRef<HTMLTextAreaElement>(null);

    const handleToolbarAction = useCallback((action: ToolbarAction) => {
        const textarea = textFieldRef.current;
        if (!textarea || disabled) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);

        let newText: string;
        let newCursorPos: number;

        if (action.block && start > 0 && value[start - 1] !== '\n') {
            // For block elements, add newline before if not at start of line
            newText = value.substring(0, start) + '\n' + action.prefix + selectedText + action.suffix + value.substring(end);
            newCursorPos = start + 1 + action.prefix.length + selectedText.length + action.suffix.length;
        } else {
            newText = value.substring(0, start) + action.prefix + selectedText + action.suffix + value.substring(end);
            newCursorPos = start + action.prefix.length + selectedText.length + action.suffix.length;
        }

        onChange(newText);

        // Restore focus and set cursor position
        setTimeout(() => {
            textarea.focus();
            if (selectedText) {
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            } else {
                // If no selection, place cursor before suffix
                const cursorPos = start + action.prefix.length;
                textarea.setSelectionRange(cursorPos, cursorPos);
            }
        }, 0);
    }, [value, onChange, disabled]);

    return (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
            {/* Header with Tabs and Toolbar */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
                    borderBottom: 1,
                    borderColor: "divider",
                    px: 1,
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{ minHeight: 40 }}
                >
                    <Tab label="Write" sx={{ minHeight: 40, py: 0, textTransform: "none" }} />
                    <Tab label="Preview" sx={{ minHeight: 40, py: 0, textTransform: "none" }} />
                </Tabs>

                {/* Toolbar - only show on Write tab */}
                {activeTab === 0 && !disabled && (
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        {TOOLBAR_ACTIONS.map((action) => (
                            <Tooltip key={action.label} title={action.label}>
                                <IconButton
                                    size="small"
                                    onClick={() => handleToolbarAction(action)}
                                    sx={{ color: "text.secondary" }}
                                >
                                    {action.icon}
                                </IconButton>
                            </Tooltip>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Content Area */}
            <Box sx={{ minHeight: 200 }}>
                {activeTab === 0 ? (
                    <TextField
                        inputRef={textFieldRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        fullWidth
                        multiline
                        minRows={minRows}
                        maxRows={maxRows}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                border: "none",
                                "& fieldset": { border: "none" },
                            },
                            "& .MuiInputBase-input": {
                                fontFamily: "monospace",
                                fontSize: "0.875rem",
                                p: 2,
                            },
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            p: 2,
                            minHeight: minRows * 24,
                            maxHeight: maxRows * 24,
                            overflow: "auto",
                            // KaTeX display equations can be wider than the container; allow horizontal scrolling.
                            "& .katex-display": { overflowX: "auto", overflowY: "hidden" },
                            "& h1, & h2, & h3, & h4, & h5, & h6": {
                                mt: 2,
                                mb: 1,
                                fontWeight: 600,
                            },
                            "& h1": { fontSize: "1.5rem" },
                            "& h2": { fontSize: "1.25rem" },
                            "& h3": { fontSize: "1.1rem" },
                            "& p": { my: 1, lineHeight: 1.6 },
                            "& ul, & ol": { pl: 3, my: 1 },
                            "& li": { my: 0.5 },
                            "& blockquote": {
                                borderLeft: 3,
                                borderColor: "primary.main",
                                pl: 2,
                                ml: 0,
                                color: "text.secondary",
                                fontStyle: "italic",
                            },
                            "& code": {
                                fontFamily: "monospace",
                                bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                                px: 0.5,
                                py: 0.25,
                                borderRadius: 0.5,
                                fontSize: "0.85em",
                            },
                            "& pre": {
                                my: 1,
                                borderRadius: 1,
                                overflow: "auto",
                            },
                            "& pre code": {
                                bgcolor: "transparent",
                                p: 0,
                            },
                            "& hr": {
                                border: "none",
                                borderTop: 1,
                                borderColor: "divider",
                                my: 2,
                            },
                            "& a": {
                                color: "primary.main",
                                textDecoration: "none",
                                "&:hover": { textDecoration: "underline" },
                            },
                            "& table": {
                                borderCollapse: "collapse",
                                width: "100%",
                                my: 1,
                            },
                            "& th, & td": {
                                border: 1,
                                borderColor: "divider",
                                px: 1.5,
                                py: 0.75,
                                textAlign: "left",
                            },
                            "& th": {
                                bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                                fontWeight: 600,
                            },
                        }}
                    >
                        {value ? (
                            <ReactMarkdown
                                // Supports GitHub-flavored markdown + LaTeX math:
                                // - Inline math: `$E=mc^2$`
                                // - Display math: `$$\\Delta P = f \\cdot (L/D) \\cdot (\\rho v^2 / 2)$$`
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    code({ node, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || "");
                                        const inline = !match;
                                        return !inline ? (
                                            <SyntaxHighlighter
                                                style={isDark ? oneDark : oneLight}
                                                language={match[1]}
                                                PreTag="div"
                                            >
                                                {String(children).replace(/\n$/, "")}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        );
                                    },
                                }}
                            >
                                {value}
                            </ReactMarkdown>
                        ) : (
                            <Box sx={{ color: "text.disabled", fontStyle: "italic" }}>
                                Nothing to preview
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
}

// Simpler preview-only component for displaying markdown
interface MarkdownPreviewProps {
    content: string;
    maxLines?: number;
}

export function MarkdownPreview({ content, maxLines }: MarkdownPreviewProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    return (
        <Box
            sx={{
                overflow: "hidden",
                ...(maxLines && {
                    display: "-webkit-box",
                    WebkitLineClamp: maxLines,
                    WebkitBoxOrient: "vertical",
                }),
                "& .katex-display": { overflowX: "auto", overflowY: "hidden" },
                "& h1, & h2, & h3, & h4, & h5, & h6": {
                    mt: 1,
                    mb: 0.5,
                    fontWeight: 600,
                    fontSize: "0.95rem",
                },
                "& p": { my: 0.5, lineHeight: 1.5, fontSize: "0.875rem" },
                "& ul, & ol": { pl: 2, my: 0.5 },
                "& li": { my: 0.25, fontSize: "0.875rem" },
                "& code": {
                    fontFamily: "monospace",
                    bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    px: 0.5,
                    borderRadius: 0.5,
                    fontSize: "0.8em",
                },
                "& blockquote": {
                    borderLeft: 2,
                    borderColor: "primary.main",
                    pl: 1,
                    ml: 0,
                    color: "text.secondary",
                    fontSize: "0.875rem",
                },
            }}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {content}
            </ReactMarkdown>
        </Box>
    );
}
