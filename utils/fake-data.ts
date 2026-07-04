import type { ConceptTree, QuestQuestion, SandboxSpec } from './types';

// Hardcoded decompose response so the entire pipeline can be built and
// demoed without an API key. Swapped for the real Gemini call when
// WXT_GEMINI_API_KEY is set (see gemini.ts / background.ts).

export function fakeDecompose(text: string, pageTitle: string, url: string): ConceptTree {
  return {
    topic: 'Photosynthesis',
    sourceUrl: url,
    sourceTitle: pageTitle,
    createdAt: Date.now(),
    nodes: [
      {
        id: 'root',
        parentId: null,
        label: 'Photosynthesis',
        kind: 'concept',
        summary: 'Plants turn light into chemical energy',
        explanation:
          'Photosynthesis is how plants make their own food. They capture sunlight and use it to convert water and carbon dioxide into glucose (sugar) and oxygen.',
      },
      {
        id: 'inputs',
        parentId: 'root',
        label: 'What goes in',
        kind: 'concept',
        summary: 'Light, water, carbon dioxide',
        explanation:
          'Three ingredients: sunlight (energy source), water (absorbed by roots), and carbon dioxide (taken from the air through tiny leaf pores called stomata).',
      },
      {
        id: 'outputs',
        parentId: 'root',
        label: 'What comes out',
        kind: 'concept',
        summary: 'Glucose for the plant, oxygen for us',
        explanation:
          'The plant produces glucose, which it uses for energy and growth, and releases oxygen as a by-product — the oxygen we breathe.',
      },
      {
        id: 'chlorophyll',
        parentId: 'inputs',
        label: 'Chlorophyll',
        kind: 'definition',
        summary: 'The green pigment that captures light',
        explanation:
          'Chlorophyll is a green pigment inside chloroplasts. It absorbs red and blue light and reflects green — which is why plants look green.',
      },
      {
        id: 'equation',
        parentId: 'outputs',
        label: 'The equation',
        kind: 'formula',
        summary: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
        explanation:
          'Six molecules of carbon dioxide plus six of water, powered by light, become one glucose molecule and six oxygen molecules.',
      },
      {
        id: 'leaf-example',
        parentId: 'inputs',
        label: 'Why leaves are flat',
        kind: 'example',
        summary: 'Big surface area catches more light',
        explanation:
          'Leaves are broad and thin so they expose as much chlorophyll as possible to sunlight — a real-world design optimised for light capture.',
      },
    ],
  };
}

export function fakeQuest(): QuestQuestion[] {
  return [
    {
      type: 'pick',
      prompt: 'What gas do plants release during photosynthesis?',
      options: ['Oxygen', 'Nitrogen', 'Carbon dioxide'],
      answer: 'Oxygen',
    },
    {
      type: 'pick',
      prompt: 'Which pigment captures light in a plant?',
      options: ['Haemoglobin', 'Chlorophyll', 'Melanin'],
      answer: 'Chlorophyll',
    },
    {
      type: 'pick',
      prompt: 'What sugar does photosynthesis produce?',
      options: ['Fructose', 'Glucose', 'Lactose'],
      answer: 'Glucose',
    },
  ];
}

// Projectile motion — a formula that visibly changes with sliders, so the
// sandbox demos well without an API key.
export function fakeSandbox(): SandboxSpec {
  return {
    isQuantitative: true,
    expression: 'v * sin(theta * pi / 180) * x / (v * cos(theta * pi / 180)) - 0.5 * 9.8 * (x / (v * cos(theta * pi / 180)))^2',
    xVar: 'x',
    xMin: 0,
    xMax: 40,
    yLabel: 'height (m)',
    variables: [
      { name: 'v', label: 'Launch speed (m/s)', min: 5, max: 30, step: 1, default: 20 },
      { name: 'theta', label: 'Angle (°)', min: 10, max: 80, step: 5, default: 45 },
    ],
  };
}
