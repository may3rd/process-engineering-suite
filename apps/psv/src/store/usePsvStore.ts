import { create } from 'zustand';
import { createNavigationSlice } from './slices/navigationSlice';
import { createUISlice } from './slices/uiSlice';
import { createPsvSlice } from './slices/psvSlice';
import { createCollaborationSlice } from './slices/collaborationSlice';
import { createWarningsSlice } from './slices/warningsSlice';
import { createRevisionSlice } from './slices/revisionSlice';
import { PsvStore } from './types';

export const usePsvStore = create<PsvStore>()((...a) => ({
    ...createUISlice(...a),
    ...createNavigationSlice(...a),
    ...createPsvSlice(...a),
    ...createCollaborationSlice(...a),
    ...createWarningsSlice(...a),
    ...createRevisionSlice(...a),
}));
