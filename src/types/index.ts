export type InteractionChannel =
  | 'In-Person'
  | 'Phone'
  | 'Video'
  | 'Email'
  | 'Conference';

export type InteractionType =
  | 'Product Discussion'
  | 'Scientific Exchange'
  | 'Follow-up'
  | 'Product Demo'
  | 'Adverse Event Report'
  | 'General';

export type InteractionStatus = 'Completed' | 'Planned' | 'Cancelled';

export type Priority = 'High' | 'Medium' | 'Low';

export interface HCP {
  id: string;
  name: string;
  specialty: string;
  organization: string;
  tier: 'KOL' | 'High-Volume' | 'Standard';
  city: string;
  state: string;
  email: string;
  phone: string;
  npi: string;
  lastInteractionDate: string | null;
  totalInteractions: number;
  avatarColor: string;
}

export interface InteractionProduct {
  name: string;
  discussed: boolean;
  samplesDropped: number;
}

export interface Interaction {
  id: string;
  hcpId: string;
  hcpName: string;
  date: string;
  channel: InteractionChannel;
  type: InteractionType;
  status: InteractionStatus;
  priority: Priority;
  products: InteractionProduct[];
  summary: string;
  keyOutcomes: string[];
  followUpActions: string[];
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  durationMinutes: number;
  location: string;
  repName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
}

export interface ToolCallInfo {
  toolName: string;
  args: Record<string, unknown>;
  result: string;
  status: 'success' | 'error' | 'pending';
}

export interface AgentState {
  messages: ChatMessage[];
  isProcessing: boolean;
  currentTool: string | null;
  toolHistory: ToolCallInfo[];
}
