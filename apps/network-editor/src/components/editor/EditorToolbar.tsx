import {
    Stack,
    ButtonGroup,
    Tooltip,
    IconButton,
    ToggleButton,
    Box,
    useTheme,
    Chip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Undo as UndoIcon,
    Redo as RedoIcon,
    Grid3x3 as GridIcon,
    GridOn as GridOnIcon,
    PanTool as PanToolIcon,
    DarkMode as DarkModeIcon,
    RotateRight as RotateRightIcon,
    RotateLeft as RotateLeftIcon,
    SwapHoriz as SwapHorizIcon,
    SwapVert as SwapVertIcon,
    Save as SaveIcon,
    FolderOpen as LoadIcon,
    Image as ExportIcon,
    Visibility as VisibilityIcon,
    TableChart as TableChartIcon,
    Wallpaper as WallpaperIcon,
    Settings as SettingsIcon,
    Cable as CableIcon,
    InsertDriveFileOutlined as NoteAddIcon,
    Cloud as CloudIcon,
    CloudOff as CloudOffIcon,
    MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { useColorMode } from "@/contexts/ColorModeContext";
import ViewSettingsDialog from "@/components/ViewSettingsDialog";
import { NetworkState, ViewSettings } from "@/lib/types";
import { useState, useRef, useEffect, ChangeEvent } from "react";
import { glassToolBarButtonGroupSx } from "@eng-suite/ui-kit";
import { checkAPIHealth } from "@/lib/apiClient";
import { useIsMobile } from "@/hooks/useIsMobile";

type EditorToolbarProps = {
    network: NetworkState;
    onNetworkChange?: (updatedNetwork: NetworkState) => void;
    onNew?: () => void;
    onLoad?: () => void;
    onSave?: () => void;
    onExport?: () => void;
    onToggleSummary?: () => void;
    onToggleSnapshot?: () => void;
    setShowBackgroundSettings: (show: boolean) => void;
    setIsAddingNode: (isAdding: boolean) => void;
    isAddingNode: boolean;
    onDelete?: () => void;
    selectedId: string | null;
    selectedType: "node" | "pipe" | null;
    onUndo?: () => void;
    canUndo: boolean;
    onRedo?: () => void;
    canRedo: boolean;
    handleRotateCW: () => void;
    handleRotateCCW: () => void;
    handleSwapLeftRight: () => void;
    handleSwapUpDown: () => void;
    snapToGrid: boolean;
    setSnapToGrid: (snap: boolean) => void;
    showGrid: boolean;
    setShowGrid: (show: boolean) => void;
    panModeEnabled: boolean;
    setPanModeEnabled: (pan: boolean) => void;
    isConnectingMode?: boolean;
    onToggleConnectingMode?: () => void;
    isAnimationEnabled?: boolean;
    onToggleAnimation?: () => void;
    viewSettings: ViewSettings;
    setViewSettings: (settings: ViewSettings) => void;
};

export function EditorToolbar({
    network,
    onNetworkChange,
    onNew,
    onLoad,
    onSave,
    onExport,
    onToggleSummary,
    onToggleSnapshot,
    setShowBackgroundSettings,
    setIsAddingNode,
    isAddingNode,
    onDelete,
    selectedId,
    selectedType,
    onUndo,
    canUndo,
    onRedo,
    canRedo,
    handleRotateCW,
    handleRotateCCW,
    handleSwapLeftRight,
    handleSwapUpDown,
    snapToGrid,
    setSnapToGrid,
    showGrid,
    setShowGrid,
    panModeEnabled,
    setPanModeEnabled,
    isConnectingMode,
    onToggleConnectingMode,
    isAnimationEnabled,
    onToggleAnimation,
    viewSettings,
    setViewSettings,
}: EditorToolbarProps) {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const { isMobile, isTablet, isMobileOrTablet } = useIsMobile();
    const [viewSettingsDialogOpen, setViewSettingsDialogOpen] = useState(false);
    const backgroundInputRef = useRef<HTMLInputElement | null>(null);
    const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
    const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

    // Check API health periodically
    useEffect(() => {
        const checkHealth = async () => {
            const healthy = await checkAPIHealth();
            setApiStatus(healthy ? 'connected' : 'disconnected');
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleUploadBackground = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !onNetworkChange) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const img = new Image();
            img.onload = () => {
                onNetworkChange({
                    ...network,
                    backgroundImage: result,
                    backgroundImageSize: { width: img.width, height: img.height },
                    backgroundImageOriginalSize: { width: img.width, height: img.height },
                    backgroundImageOpacity: 1,
                    backgroundImagePosition: { x: 0, y: 0 },
                    backgroundImageLocked: true,
                });
                setShowBackgroundSettings(true);
            };
            img.src = result;
        };
        reader.readAsDataURL(file);

        // Reset input
        if (backgroundInputRef.current) {
            backgroundInputRef.current.value = "";
        }
    };

    return (
        <>
            <input
                type="file"
                accept="image/*"
                ref={backgroundInputRef}
                style={{
                    display: "none"
                }}
                onChange={handleUploadBackground}
            />
            {/* Mobile & Tablet: Bottom floating action bar */}
            {isMobileOrTablet && (
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                    sx={{
                        height: 64,
                        width: "100%",
                        flexShrink: 0,
                        bgcolor: "transparent",
                        px: 1,
                        zIndex: 10,
                        position: "absolute",
                        bottom: 16,
                        left: 0,
                        pointerEvents: "none",
                    }}
                >
                    <ButtonGroup
                        variant="contained"
                        aria-label="Mobile toolbar"
                        sx={{
                            ...glassToolBarButtonGroupSx,
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : 'background.paper',
                            pointerEvents: "auto",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        }}
                    >
                        {/* Essential mobile actions */}
                        <Tooltip title="Add Node">
                            <ToggleButton
                                value="add"
                                selected={isAddingNode}
                                onChange={() => {
                                    if (isAddingNode) {
                                        setIsAddingNode(false);
                                    } else {
                                        setIsAddingNode(true);
                                        if (isConnectingMode && onToggleConnectingMode) {
                                            onToggleConnectingMode();
                                        }
                                        if (panModeEnabled) {
                                            setPanModeEnabled(false);
                                        }
                                    }
                                }}
                                sx={{ width: 48, height: 48, border: 'none' }}
                            >
                                <AddIcon />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title="Pan Mode">
                            <ToggleButton
                                value="pan"
                                selected={panModeEnabled}
                                onChange={() => {
                                    if (panModeEnabled) {
                                        setPanModeEnabled(false);
                                    } else {
                                        setPanModeEnabled(true);
                                        if (isAddingNode) {
                                            setIsAddingNode(false);
                                        }
                                    }
                                }}
                                sx={{ width: 48, height: 48, border: 'none' }}
                            >
                                <PanToolIcon />
                            </ToggleButton>
                        </Tooltip>
                        {onToggleConnectingMode && (
                            <Tooltip title="Connecting Mode">
                                <ToggleButton
                                    value="connect"
                                    selected={isConnectingMode}
                                    onChange={() => {
                                        if (onToggleConnectingMode) {
                                            onToggleConnectingMode();
                                            if (!isConnectingMode && isAddingNode) {
                                                setIsAddingNode(false);
                                            }
                                        }
                                    }}
                                    sx={{ width: 48, height: 48, border: 'none' }}
                                >
                                    <CableIcon />
                                </ToggleButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Delete Selected">
                            <span>
                                <IconButton onClick={onDelete} disabled={!selectedId} sx={{ width: 48, height: 48 }}>
                                    <DeleteIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Undo">
                            <span>
                                <IconButton onClick={onUndo} disabled={!canUndo} sx={{ width: 48, height: 48 }}>
                                    <UndoIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="More Actions">
                            <IconButton
                                onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
                                sx={{ width: 48, height: 48 }}
                            >
                                <MoreVertIcon />
                            </IconButton>
                        </Tooltip>
                    </ButtonGroup>

                    {/* API Status Chip for Mobile/Tablet */}
                    <Tooltip title={apiStatus === 'connected' ? 'Python API Connected' : apiStatus === 'disconnected' ? 'Python API Disconnected (using local calculation)' : 'Checking API...'} arrow>
                        <Chip
                            icon={apiStatus === 'connected' ? <CloudIcon /> : <CloudOffIcon />}
                            label={apiStatus === 'connected' ? 'API' : 'Local'}
                            size="small"
                            color={apiStatus === 'connected' ? 'success' : 'default'}
                            variant={apiStatus === 'connected' ? 'filled' : 'outlined'}
                            sx={{
                                pointerEvents: 'auto',
                                opacity: apiStatus === 'checking' ? 0.5 : 1,
                                cursor: 'default',
                                '& .MuiChip-icon': {
                                    fontSize: 16,
                                },
                            }}
                        />
                    </Tooltip>
                </Stack>
            )}

            {/* Mobile/Tablet: More actions menu */}
            <Menu
                anchorEl={moreMenuAnchor}
                open={Boolean(moreMenuAnchor)}
                onClose={() => setMoreMenuAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {/* File Actions */}
                <MenuItem onClick={() => { onNew?.(); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><NoteAddIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>New</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onLoad?.(); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><LoadIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Load</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onSave?.(); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><SaveIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Save</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onExport?.(); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Export PNG</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onToggleSummary?.(); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Summary Table</ListItemText>
                </MenuItem>

                {/* Edit Actions */}
                <MenuItem onClick={() => { onRedo?.(); setMoreMenuAnchor(null); }} disabled={!canRedo}>
                    <ListItemIcon><RedoIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Redo</ListItemText>
                </MenuItem>

                {/* View Actions */}
                <MenuItem onClick={() => { setSnapToGrid(!snapToGrid); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><GridIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>{snapToGrid ? 'Disable Snap' : 'Enable Snap'}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setShowGrid(!showGrid); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><GridOnIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>{showGrid ? 'Hide Grid' : 'Show Grid'}</ListItemText>
                </MenuItem>
                {onToggleAnimation && (
                    <MenuItem onClick={() => { onToggleAnimation(); setMoreMenuAnchor(null); }}>
                        <ListItemIcon><DirectionsRunIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>{isAnimationEnabled ? 'Stop Animation' : 'Flow Animation'}</ListItemText>
                    </MenuItem>
                )}
                <MenuItem onClick={() => { setViewSettingsDialogOpen(true); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>View Settings</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { toggleColorMode(); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><DarkModeIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Toggle Theme</ListItemText>
                </MenuItem>
            </Menu>

            {/* Desktop: Top toolbar */}
            {!isMobileOrTablet && (
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{
                        height: 64,
                        width: "100%",
                        flexShrink: 0,
                        bgcolor: "transparent",
                        px: 2,
                        zIndex: 10,
                        pl: 1.5,
                        position: "absolute",
                        top: 0,
                        left: 0,
                        pointerEvents: "none",
                        opacity: 0.2,
                        transition: "opacity 0.5s ease",
                        "&:hover": {
                            opacity: 1,
                        },
                    }}
                >
                    <Stack direction="row" spacing={2} sx={{ pointerEvents: "auto" }}>
                        <ButtonGroup
                            variant="contained"
                            aria-label="File tools"
                            sx={{
                                ...glassToolBarButtonGroupSx,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : 'background.paper'
                            }}
                        >
                            <Tooltip title="New">
                                <span>
                                    <IconButton onClick={onNew} disabled={!onNew}>
                                        <NoteAddIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Load">
                                <span>
                                    <IconButton onClick={onLoad} disabled={!onLoad}>
                                        <LoadIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Save">
                                <span>
                                    <IconButton onClick={onSave} disabled={!onSave}>
                                        <SaveIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Export">
                                <span>
                                    <IconButton onClick={onExport} disabled={!onExport}>
                                        <ExportIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            {onToggleSummary && (
                                <Tooltip title="Summary Table">
                                    <IconButton onClick={onToggleSummary}>
                                        <TableChartIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Tooltip title="Upload Background">
                                <IconButton onClick={() => backgroundInputRef.current?.click()}>
                                    <WallpaperIcon />
                                </IconButton>
                            </Tooltip>
                            {network.backgroundImage && (
                                <Tooltip title="Background Settings">
                                    <IconButton onClick={() => setShowBackgroundSettings(true)}>
                                        <SettingsIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </ButtonGroup>

                        <ButtonGroup
                            variant="contained"
                            aria-label="Edit tools"
                            sx={{
                                ...glassToolBarButtonGroupSx,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : 'background.paper'
                            }}
                        >
                            <Tooltip title="Delete Selected">
                                <span>
                                    <IconButton onClick={onDelete} disabled={!selectedId}>
                                        <DeleteIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Undo">
                                <span>
                                    <IconButton onClick={onUndo} disabled={!canUndo}>
                                        <UndoIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Redo">
                                <span>
                                    <IconButton onClick={onRedo} disabled={!canRedo}>
                                        <RedoIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </ButtonGroup>

                        <ButtonGroup
                            variant="contained"
                            aria-label="Rotation tools"
                            sx={{
                                ...glassToolBarButtonGroupSx,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : 'background.paper'
                            }}
                        >
                            <Tooltip title="Rotate 90° CW">
                                <span>
                                    <IconButton onClick={handleRotateCW} disabled={!selectedId || selectedType !== "node"}>
                                        <RotateRightIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Rotate 90° CCW">
                                <span>
                                    <IconButton onClick={handleRotateCCW} disabled={!selectedId || selectedType !== "node"}>
                                        <RotateLeftIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Swap Left-Right">
                                <span>
                                    <IconButton
                                        onClick={handleSwapLeftRight}
                                        disabled={!selectedId || selectedType !== "node" || (network.nodes.find(n => n.id === selectedId)?.rotation ?? 0) % 180 !== 0}
                                    >
                                        <SwapHorizIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Swap Up-Down">
                                <span>
                                    <IconButton
                                        onClick={handleSwapUpDown}
                                        disabled={!selectedId || selectedType !== "node" || (network.nodes.find(n => n.id === selectedId)?.rotation ?? 0) % 180 !== 90}
                                    >
                                        <SwapVertIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </ButtonGroup>

                        <ButtonGroup
                            variant="contained"
                            aria-label="View tools"
                            sx={{
                                ...glassToolBarButtonGroupSx,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : 'background.paper'
                            }}
                        >
                            <Tooltip title="Snap to Grid">
                                <ToggleButton
                                    value="snap"
                                    selected={snapToGrid}
                                    onChange={() => setSnapToGrid(!snapToGrid)}
                                    sx={{ width: 40, height: 40, border: 'none' }}
                                >
                                    <GridIcon />
                                </ToggleButton>
                            </Tooltip>
                            <Tooltip title="Show Grid">
                                <ToggleButton
                                    value="grid"
                                    selected={showGrid}
                                    onChange={() => setShowGrid(!showGrid)}
                                    sx={{ width: 40, height: 40, border: 'none' }}
                                >
                                    <GridOnIcon />
                                </ToggleButton>
                            </Tooltip>
                            <Tooltip title="Pan Mode">
                                <ToggleButton
                                    value="pan"
                                    selected={panModeEnabled}
                                    onChange={() => {
                                        if (panModeEnabled) {
                                            setPanModeEnabled(false);
                                        } else {
                                            setPanModeEnabled(true);
                                            if (isAddingNode) {
                                                setIsAddingNode(false);
                                            }
                                        }
                                    }}
                                    sx={{ width: 40, height: 40, border: 'none' }}
                                >
                                    <PanToolIcon />
                                </ToggleButton>
                            </Tooltip>
                            <Tooltip title="Add Node">
                                <ToggleButton
                                    value="add"
                                    selected={isAddingNode}
                                    onChange={() => {
                                        if (isAddingNode) {
                                            setIsAddingNode(false);
                                        } else {
                                            setIsAddingNode(true);
                                            if (isConnectingMode && onToggleConnectingMode) {
                                                onToggleConnectingMode();
                                            }
                                            if (panModeEnabled) {
                                                setPanModeEnabled(false);
                                            }
                                        }
                                    }}
                                    sx={{ width: 40, height: 40, border: 'none' }}
                                >
                                    <AddIcon />
                                </ToggleButton>
                            </Tooltip>
                            {onToggleConnectingMode && (
                                <Tooltip title="Connecting Mode">
                                    <ToggleButton
                                        value="connect"
                                        selected={isConnectingMode}
                                        onChange={() => {
                                            if (onToggleConnectingMode) {
                                                onToggleConnectingMode();
                                                if (!isConnectingMode && isAddingNode) {
                                                    setIsAddingNode(false);
                                                }
                                            }
                                        }}
                                        sx={{ width: 40, height: 40, border: 'none' }}
                                    >
                                        <CableIcon />
                                    </ToggleButton>
                                </Tooltip>
                            )}
                            {onToggleAnimation && (
                                <Tooltip title="Flow Animation">
                                    <ToggleButton
                                        value="animation"
                                        selected={isAnimationEnabled}
                                        onChange={onToggleAnimation}
                                        sx={{ width: 40, height: 40, border: 'none' }}
                                    >
                                        <DirectionsRunIcon />
                                    </ToggleButton>
                                </Tooltip>
                            )}
                            <ViewSettingsDialog
                                open={viewSettingsDialogOpen}
                                onClose={() => setViewSettingsDialogOpen(false)}
                                settings={viewSettings}
                                onSettingsChange={setViewSettings}
                            />
                            <Tooltip title="View Settings">
                                <IconButton onClick={() => setViewSettingsDialogOpen(true)} sx={{ width: 40, height: 40 }}>
                                    <SettingsIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Toggle Dark Mode">
                                <IconButton onClick={toggleColorMode} sx={{ width: 40, height: 40 }}>
                                    <DarkModeIcon />
                                </IconButton>
                            </Tooltip>
                        </ButtonGroup>
                    </Stack>

                    <Box sx={{ flexGrow: 1 }} />

                    {/* API Status Indicator */}
                    <Tooltip title={apiStatus === 'connected' ? 'Python API Connected' : apiStatus === 'disconnected' ? 'Python API Disconnected (using local calculation)' : 'Checking API...'} arrow>
                        <Chip
                            icon={apiStatus === 'connected' ? <CloudIcon /> : <CloudOffIcon />}
                            label={apiStatus === 'connected' ? 'API' : 'Local'}
                            size="small"
                            color={apiStatus === 'connected' ? 'success' : 'default'}
                            variant={apiStatus === 'connected' ? 'filled' : 'outlined'}
                            sx={{
                                pointerEvents: 'auto',
                                opacity: apiStatus === 'checking' ? 0.5 : 1,
                                cursor: 'default',
                                '& .MuiChip-icon': {
                                    fontSize: 16,
                                },
                            }}
                        />
                    </Tooltip>

                    {onToggleSnapshot && (
                        <Tooltip title="Network Snapshot">
                            <IconButton onClick={onToggleSnapshot} sx={{ pointerEvents: "auto" }}>
                                <VisibilityIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            )}
        </>
    );
}
