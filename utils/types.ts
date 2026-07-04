// Shared shapes for the whole extension. Every surface (content script,
// background, side panel, popup, dashboard) speaks these types.

export type NodeKind = 'concept' | 'definition' | 'example' | 'formula';

export interface ConceptNode {
  id: string;
  parentId: string | null; // null = root
  label: string;
  kind: NodeKind;
  summary: string; // <=12 words, shown on the node itself
  explanation: string; // 2-3 sentence plain-language expansion, shown on click
}

export interface ConceptTree {
  topic: string;
  sourceUrl: string;
  sourceTitle: string;
  createdAt: number;
  nodes: ConceptNode[];
}

export interface QuestQuestion {
  type: 'pick' | 'match';
  prompt: string;
  options: string[];
  answer: string;
}

export interface SandboxSpec {
  isQuantitative: boolean;
  expression: string; // mathjs-safe expression, e.g. "v * cos(theta) * t"
  xVar: string;
  xMin: number;
  xMax: number;
  yLabel: string;
  variables: {
    name: string;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
  }[];
}

export interface SessionRecord {
  date: string; // YYYY-MM-DD
  url: string;
  topic: string;
  nodesExpanded: number;
  questsDone: number;
  xpEarned: number;
}

export interface UnravelState {
  xp: number;
  streak: { count: number; lastActiveDate: string };
  sessions: SessionRecord[];
  settings: { dyslexiaFont: boolean; reducedMotion: boolean; theme: 'light' | 'dark' };
}

// Chat (the Coach tab). Context = the whole page the student is reading,
// captured by the content script — no screenshot-into-Gemini app switching.
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  ts: number;
}

export interface ChatAttachment {
  mimeType: string;
  data: string; // base64, no data: prefix
  name: string;
}

export interface PageContext {
  pageText: string;
  pageTitle: string;
  url: string;
  image?: string; // base64 screenshot (no data: prefix) when captured via vision
}

// Runtime messages
export interface UnravelSelectionMessage {
  type: 'UNRAVEL_SELECTION';
  text: string;
  pageTitle: string;
  url: string;
  pageText: string; // full visible page text (truncated) for chat context
}

export interface ChatAskMessage {
  type: 'CHAT_ASK';
  question: string;
  attachments: ChatAttachment[];
}

// Capture the visible tab (works on PDFs, images, anything) and unravel it
// with Gemini vision — the multimodal path.
export interface CaptureUnravelMessage {
  type: 'CAPTURE_UNRAVEL';
}

// Side-panel-only requests (handled in-panel, not via background) use direct
// gemini calls; these two go through background so the key stays server-side.
export interface QuestRequestMessage {
  type: 'QUEST_REQUEST';
  nodeIds: string[];
}

export interface SandboxRequestMessage {
  type: 'SANDBOX_REQUEST';
  text: string;
}

export type RuntimeMessage =
  | UnravelSelectionMessage
  | ChatAskMessage
  | QuestRequestMessage
  | SandboxRequestMessage
  | CaptureUnravelMessage;
