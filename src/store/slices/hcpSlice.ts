import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { HCP } from '../../types';
import { mockHCPs } from '../../data/mockData';

interface HCPState {
  hcps: HCP[];
  selectedHCPId: string | null;
  searchQuery: string;
  filterSpecialty: string | null;
  filterTier: string | null;
}

const initialState: HCPState = {
  hcps: mockHCPs,
  selectedHCPId: null,
  searchQuery: '',
  filterSpecialty: null,
  filterTier: null,
};

const hcpSlice = createSlice({
  name: 'hcp',
  initialState,
  reducers: {
    selectHCP: (state, action: PayloadAction<string | null>) => {
      state.selectedHCPId = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setFilterSpecialty: (state, action: PayloadAction<string | null>) => {
      state.filterSpecialty = action.payload;
    },
    setFilterTier: (state, action: PayloadAction<string | null>) => {
      state.filterTier = action.payload;
    },
    updateHCPInteractionCount: (
      state,
      action: PayloadAction<{ hcpId: string; date: string }>,
    ) => {
      const hcp = state.hcps.find((h) => h.id === action.payload.hcpId);
      if (hcp) {
        hcp.totalInteractions += 1;
        hcp.lastInteractionDate = action.payload.date;
      }
    },
  },
});

export const {
  selectHCP,
  setSearchQuery,
  setFilterSpecialty,
  setFilterTier,
  updateHCPInteractionCount,
} = hcpSlice.actions;
export default hcpSlice.reducer;
