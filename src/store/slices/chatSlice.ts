import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatMessage, ToolCallInfo } from '../../types';

interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  currentTool: string | null;
  toolHistory: ToolCallInfo[];
}

const initialState: ChatState = {
  messages: [],
  isProcessing: false,
  currentTool: null,
  toolHistory: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    updateMessage: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<ChatMessage> }>,
    ) => {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (msg) {
        Object.assign(msg, action.payload.updates);
      }
    },
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    setCurrentTool: (state, action: PayloadAction<string | null>) => {
      state.currentTool = action.payload;
    },
    addToolCall: (state, action: PayloadAction<ToolCallInfo>) => {
      state.toolHistory.push(action.payload);
    },
    clearChat: (state) => {
      state.messages = [];
      state.toolHistory = [];
      state.currentTool = null;
      state.isProcessing = false;
    },
  },
});

export const {
  addMessage,
  updateMessage,
  setProcessing,
  setCurrentTool,
  addToolCall,
  clearChat,
} = chatSlice.actions;
export default chatSlice.reducer;
