import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type ViewMode = 'form' | 'chat';
type Theme = 'light' | 'dark';

interface UIState {
  sidebarCollapsed: boolean;
  viewMode: ViewMode;
  theme: Theme;
  selectedHCPForLogging: string | null;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  viewMode: 'form',
  theme: 'light',
  selectedHCPForLogging: null,
  toast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    setSelectedHCPForLogging: (state, action: PayloadAction<string | null>) => {
      state.selectedHCPForLogging = action.payload;
    },
    showToast: (
      state,
      action: PayloadAction<{ message: string; type: 'success' | 'error' | 'info' }>,
    ) => {
      state.toast = action.payload;
    },
    clearToast: (state) => {
      state.toast = null;
    },
  },
});

export const {
  toggleSidebar,
  setViewMode,
  setTheme,
  setSelectedHCPForLogging,
  showToast,
  clearToast,
} = uiSlice.actions;
export default uiSlice.reducer;
