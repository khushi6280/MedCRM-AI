import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Interaction } from '../../types';
import { mockInteractions } from '../../data/mockData';

interface InteractionState {
  interactions: Interaction[];
  selectedInteractionId: string | null;
  filterHCPId: string | null;
  filterStatus: string | null;
}

const initialState: InteractionState = {
  interactions: mockInteractions,
  selectedInteractionId: null,
  filterHCPId: null,
  filterStatus: null,
};

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    addInteraction: (state, action: PayloadAction<Interaction>) => {
      state.interactions.unshift(action.payload);
    },
    updateInteraction: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Interaction> }>,
    ) => {
      const idx = state.interactions.findIndex((i) => i.id === action.payload.id);
      if (idx !== -1) {
        state.interactions[idx] = {
          ...state.interactions[idx],
          ...action.payload.updates,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    deleteInteraction: (state, action: PayloadAction<string>) => {
      state.interactions = state.interactions.filter((i) => i.id !== action.payload);
    },
    selectInteraction: (state, action: PayloadAction<string | null>) => {
      state.selectedInteractionId = action.payload;
    },
    setFilterHCPId: (state, action: PayloadAction<string | null>) => {
      state.filterHCPId = action.payload;
    },
    setFilterStatus: (state, action: PayloadAction<string | null>) => {
      state.filterStatus = action.payload;
    },
  },
});

export const {
  addInteraction,
  updateInteraction,
  deleteInteraction,
  selectInteraction,
  setFilterHCPId,
  setFilterStatus,
} = interactionSlice.actions;
export default interactionSlice.reducer;
