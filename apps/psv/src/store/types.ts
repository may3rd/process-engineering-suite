import {
    Customer,
    Plant,
    Unit,
    Area,
    Project,
    ProtectiveSystem,
    OverpressureScenario,
    SizingCase,
    Attachment,
    TodoItem,
    EquipmentLink,
    Equipment,
    Comment,
    ProjectNote,
    RevisionHistory,
    RevisionEntityType,
    Warning,
} from '@/data/types';

export interface HierarchySelection {
    customerId: string | null;
    plantId: string | null;
    unitId: string | null;
    areaId: string | null;
    projectId: string | null;
    psvId: string | null;
}

import { NavigationSlice } from './slices/navigationSlice';
import { UISlice } from './slices/uiSlice';
import { PsvSlice } from './slices/psvSlice';
import { CollaborationSlice } from './slices/collaborationSlice';
import { WarningsSlice } from './slices/warningsSlice';
import { RevisionSlice } from './slices/revisionSlice';

export interface PsvStore extends NavigationSlice, UISlice, PsvSlice, CollaborationSlice, WarningsSlice, RevisionSlice {
}
