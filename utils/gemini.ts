import type {
  ChatAttachment,
  ChatMessage,
  ConceptNode,
  ConceptTree,
  PageContext,
  QuestQuestion,
  SandboxSpec,
} from './types';

// All Gemini calls live here. Plain REST fetch (no SDK needed in a service
// worker) with responseSchema so output is guaranteed-parseable JSON.
//
// Key comes from .env → WXT_GEMINI_API_KEY (baked at build time; acceptable
// for a hackathon demo build, never for a published extension).

const MODEL = 'gemini-2.5-flash';
const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export function hasApiKey(): boolean {
  return Boolean(import.meta.env.WXT_GEMINI_API_KEY);
}

async function generateJson<T>(prompt: string, schema: object): Promise<T> {
  const key = import.meta.env.WXT_GEMINI_API_KEY;
  if (!key) throw new Error('WXT_GEMINI_API_KEY is not set (add it to .env)');

  const res = await fetch(`${BASE}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return JSON.parse(text) as T;
}

// ---------- 1. decompose: text → concept tree ----------

const NODE_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          parentId: { type: 'string', nullable: true },
          label: { type: 'string' },
          kind: { type: 'string', enum: ['concept', 'definition', 'example', 'formula'] },
          summary: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['id', 'parentId', 'label', 'kind', 'summary', 'explanation'],
      },
    },
  },
  required: ['topic', 'nodes'],
};

const DECOMPOSE_RULES = `Rules (strict):
- Exactly ONE root node with parentId set to null (use the string id "root").
- Tree depth: at most 3 levels. At most 4 children per node.
- "summary": max 12 words, plain language, no jargon.
- "explanation": 2-3 short sentences a 14-year-old would understand.
- "kind": concept | definition | example | formula. Use "formula" only for
  actual equations/quantitative relationships.
- Fewer, clearer nodes beat many detailed ones. 5-9 nodes total.`;

// Vision path: decompose whatever is VISIBLE in a screenshot (a PDF, a diagram,
// a photo of notes, a web page). This is how PDFs work — Chrome blocks content
// scripts in its PDF viewer, but a captured image goes straight to Gemini vision.
export async function decomposeImage(
  imageBase64: string,
  pageTitle: string,
  url: string,
): Promise<ConceptTree> {
  const key = import.meta.env.WXT_GEMINI_API_KEY;
  if (!key) throw new Error('WXT_GEMINI_API_KEY is not set (add it to .env)');

  const res = await fetch(`${BASE}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: 'image/png', data: imageBase64 } },
            {
              text: `You are helping a student with ADHD who feels overwhelmed. Read the
study material shown in this image (it may be a PDF page, diagram, or notes)
and break the MAIN content into a small concept tree.

${DECOMPOSE_RULES}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: NODE_SCHEMA,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content from the image');
  const result = JSON.parse(text) as { topic: string; nodes: ConceptNode[] };
  return {
    topic: result.topic,
    sourceUrl: url,
    sourceTitle: pageTitle,
    createdAt: Date.now(),
    nodes: result.nodes.map((n) => ({
      ...n,
      parentId: !n.parentId || n.parentId === 'null' ? null : n.parentId,
    })),
  };
}

export async function decompose(
  text: string,
  pageTitle: string,
  url: string,
): Promise<ConceptTree> {
  const result = await generateJson<{ topic: string; nodes: ConceptNode[] }>(
    `You are helping a student with ADHD who feels overwhelmed by walls of text.
Break the following text into a small concept tree.

Rules (strict):
- Exactly ONE root node with parentId set to null (use the string id "root").
- Tree depth: at most 3 levels. At most 4 children per node.
- "summary": max 12 words, plain language, no jargon.
- "explanation": 2-3 short sentences a 14-year-old would understand.
- "kind": concept | definition | example | formula. Use "formula" only for
  actual equations/quantitative relationships.
- Fewer, clearer nodes beat many detailed ones. 5-9 nodes total.

Text (from "${pageTitle}"):
"""
${text.slice(0, 6000)}
"""`,
    NODE_SCHEMA,
  );

  return {
    topic: result.topic,
    sourceUrl: url,
    sourceTitle: pageTitle,
    createdAt: Date.now(),
    // Normalize: Gemini sometimes returns "null" as a string for the root.
    nodes: result.nodes.map((n) => ({
      ...n,
      parentId: !n.parentId || n.parentId === 'null' ? null : n.parentId,
    })),
  };
}

// ---------- 2. quest: nodes → quick quiz ----------

const QUEST_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['pick', 'match'] },
          prompt: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answer: { type: 'string' },
        },
        required: ['type', 'prompt', 'options', 'answer'],
      },
    },
  },
  required: ['questions'],
};

export async function generateQuest(nodes: ConceptNode[]): Promise<QuestQuestion[]> {
  const result = await generateJson<{ questions: QuestQuestion[] }>(
    `Create a rapid 30-60 second comprehension check for a student with ADHD,
based ONLY on these concepts:

${nodes.map((n) => `- ${n.label}: ${n.explanation}`).join('\n')}

Rules:
- Exactly 3 questions, type "pick" (single correct answer from options).
- 3-4 options each; "answer" must exactly match one option.
- Short, punchy prompts. No trick questions — this is a confidence builder.`,
    QUEST_SCHEMA,
  );
  return result.questions;
}

// ---------- chat: the Coach tab ----------
// The page the student is reading is ALWAYS the context — they never have to
// paste anything. Attachments (photos of worksheets etc.) go along as
// inline_data parts.

export async function chat(
  question: string,
  page: PageContext | null,
  topic: string | null,
  history: ChatMessage[],
  attachments: ChatAttachment[],
): Promise<string> {
  const key = import.meta.env.WXT_GEMINI_API_KEY;
  if (!key) throw new Error('WXT_GEMINI_API_KEY is not set (add it to .env)');

  const userParts: object[] = [];
  // If the page was captured as an image (e.g. a PDF), give vision the screenshot.
  if (page?.image) {
    userParts.push({ inline_data: { mime_type: 'image/png', data: page.image } });
  }
  for (const a of attachments) {
    userParts.push({ inline_data: { mime_type: a.mimeType, data: a.data } });
  }
  userParts.push({ text: question });

  const contents = [
    ...history.slice(-10).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: userParts },
  ];

  const res = await fetch(`${BASE}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text: `You are Unravel's study coach for students with ADHD and other
special study needs. Rules:
- Short answers. Small paragraphs (2-3 sentences max). Plain language.
- Never dump a wall of text. Use short bullet lists when listing.
- Encouraging but not patronising.
${topic ? `\nThe student is currently studying: ${topic}` : ''}
${
  page
    ? `\nThe student is reading this page — treat it as the primary context:
Title: ${page.pageTitle}
URL: ${page.url}
Page content:
"""
${page.pageText.slice(0, 15000)}
"""`
    : ''
}`,
          },
        ],
      },
      contents,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return text;
}

// ---------- 3. sandbox: text → interactive formula spec ----------

const SANDBOX_SCHEMA = {
  type: 'object',
  properties: {
    isQuantitative: { type: 'boolean' },
    expression: { type: 'string' },
    xVar: { type: 'string' },
    xMin: { type: 'number' },
    xMax: { type: 'number' },
    yLabel: { type: 'string' },
    variables: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          label: { type: 'string' },
          min: { type: 'number' },
          max: { type: 'number' },
          step: { type: 'number' },
          default: { type: 'number' },
        },
        required: ['name', 'label', 'min', 'max', 'step', 'default'],
      },
    },
  },
  required: ['isQuantitative', 'expression', 'xVar', 'xMin', 'xMax', 'yLabel', 'variables'],
};

export async function generateSandbox(text: string): Promise<SandboxSpec> {
  return generateJson<SandboxSpec>(
    `Analyse this text. If it describes a quantitative relationship (formula,
law, curve), produce an interactive sandbox spec; otherwise set
isQuantitative to false and leave other fields empty/minimal.

Rules:
- "expression": a mathjs-compatible expression using ONLY the variable names
  you list plus the xVar. Example: "v * sin(theta) * x - 0.5 * 9.8 * x^2".
  No assignments, no functions other than sin/cos/tan/exp/log/sqrt/abs.
- "xVar": the variable swept along the x-axis; "xMin"/"xMax": a sensible
  sweep range for it.
- "variables": the OTHER variables (sliders), 1-3 of them, with sensible
  min/max/step/default so the graph visibly changes when dragged.

Text:
"""
${text.slice(0, 4000)}
"""`,
    SANDBOX_SCHEMA,
  );
}
