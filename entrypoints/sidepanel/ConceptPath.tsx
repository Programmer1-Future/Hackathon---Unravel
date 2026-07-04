import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import type { ConceptNode, ConceptTree, NodeKind } from '@/utils/types';
import Sandbox from './Sandbox';
import { Chip } from './ui';

// The map, reimagined as a vertical Progressive Path instead of a pannable
// canvas. You read top-to-bottom; tapping a card reveals its explanation and
// indents its children below with a connector line. No pan, no zoom, no drag —
// just a calm scroll. This is what "break the wall of text into nodes" should
// feel like for an overwhelmed reader.

const KIND: Record<NodeKind, { dot: string; badge: string; ring: string; label: string }> = {
  concept: {
    dot: 'bg-primary',
    badge: 'bg-primary/10 text-primary',
    ring: 'border-primary',
    label: 'Concept',
  },
  definition: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-500/12 text-sky-600',
    ring: 'border-sky-500',
    label: 'Definition',
  },
  example: {
    dot: 'bg-accent-green',
    badge: 'bg-accent-green/15 text-emerald-600',
    ring: 'border-accent-green',
    label: 'Example',
  },
  formula: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/15 text-amber-600',
    ring: 'border-amber-500',
    label: 'Formula',
  },
};

interface Props {
  tree: ConceptTree;
  expanded: Set<string>;
  explored: Set<string>;
  onToggle: (id: string) => void;
}

export default function ConceptPath({ tree, expanded, explored, onToggle }: Props) {
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, ConceptNode[]>();
    for (const n of tree.nodes) {
      const list = map.get(n.parentId) ?? [];
      list.push(n);
      map.set(n.parentId, list);
    }
    return map;
  }, [tree]);

  const roots = childrenByParent.get(null) ?? [];

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {roots.map((node) => (
        <PathNode
          key={node.id}
          node={node}
          depth={0}
          childrenByParent={childrenByParent}
          expanded={expanded}
          explored={explored}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

interface NodeProps {
  node: ConceptNode;
  depth: number;
  childrenByParent: Map<string | null, ConceptNode[]>;
  expanded: Set<string>;
  explored: Set<string>;
  onToggle: (id: string) => void;
}

function PathNode({ node, depth, childrenByParent, expanded, explored, onToggle }: NodeProps) {
  const kids = childrenByParent.get(node.id) ?? [];
  const hasKids = kids.length > 0;
  const isOpen = expanded.has(node.id);
  const wasExplored = explored.has(node.id);
  const kind = KIND[node.kind];

  return (
    <div className="relative">
      <motion.button
        layout
        onClick={() => onToggle(node.id)}
        className={`w-full rounded-2xl border-2 bg-card p-3.5 text-left pop transition-colors ${
          isOpen ? kind.ring : 'border-line-soft hover:border-line'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* status dot */}
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              wasExplored ? 'bg-accent-green' : kind.dot
            }`}
          >
            {wasExplored ? (
              <Check className="h-3 w-3 text-[#04372b]" strokeWidth={3} />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <Chip className={kind.badge}>{kind.label}</Chip>
            <h3 className="mt-1.5 text-sm font-extrabold leading-snug text-ink">{node.label}</h3>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-ink-faint">
              {node.summary}
            </p>
          </div>

          {hasKids && (
            <motion.span
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 shrink-0 text-ink-faint"
            >
              <ChevronRight className="h-4 w-4" />
            </motion.span>
          )}
        </div>

        {/* explanation reveals inside the card */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <p className="mt-2.5 border-t border-line pt-2.5 text-sm font-medium leading-relaxed text-ink-soft">
                {node.explanation}
              </p>
              {node.kind === 'formula' && <Sandbox text={`${node.label}. ${node.explanation}`} />}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* children: indented, with a connector line */}
      <AnimatePresence initial={false}>
        {isOpen && hasKids && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="ml-[9px] mt-3 flex flex-col gap-3 border-l-2 border-line pl-4">
              {kids.map((child) => (
                <PathNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  childrenByParent={childrenByParent}
                  expanded={expanded}
                  explored={explored}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
