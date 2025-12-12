"use client";

import { ProtectiveSystem, Project, SizingCase } from "@/data/types";

export type WorkflowStatus = ProtectiveSystem['status'] | Project['status'];

export const WORKFLOW_STATUS_SEQUENCE: WorkflowStatus[] = [
    'draft',
    'in_review',
    'checked',
    'approved',
    'issued',
];

const STATUS_COLOR_MAP: Record<WorkflowStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
    draft: 'default',
    in_review: 'warning', // orange
    checked: 'info',      // blue
    approved: 'success',  // green
    issued: 'primary',
};

export const getWorkflowStatusColor = (status: WorkflowStatus) => STATUS_COLOR_MAP[status] ?? 'default';

export const getWorkflowStatusLabel = (status: WorkflowStatus) =>
    status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

export const isWorkflowStatus = (value: string): value is WorkflowStatus =>
    WORKFLOW_STATUS_SEQUENCE.includes(value as WorkflowStatus);

const SIZING_STATUS_COLOR_MAP: Record<SizingCase['status'], "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
    draft: 'default',
    calculated: 'warning',
    verified: 'info',
    approved: 'success',
};

export const SIZING_STATUS_SEQUENCE: SizingCase['status'][] = [
    'draft',
    'calculated',
    'verified',
    'approved',
];

export const getSizingStatusColor = (status: SizingCase['status']) => SIZING_STATUS_COLOR_MAP[status] ?? 'default';

export const getSizingStatusLabel = (status: SizingCase['status']) =>
    status.charAt(0).toUpperCase() + status.slice(1);
