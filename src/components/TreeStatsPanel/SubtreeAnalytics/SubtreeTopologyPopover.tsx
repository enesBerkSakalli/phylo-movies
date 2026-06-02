import React from 'react';
import { ListTree } from 'lucide-react';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import type { SprMovedSubtreeTopologyNode, SprMovedSubtreeTopologySnapshot } from './types';

interface SubtreeTopologyPopoverProps {
  sourceTopology?: SprMovedSubtreeTopologySnapshot | null;
  destinationTopology?: SprMovedSubtreeTopologySnapshot | null;
  sourceNewick?: string;
  destinationNewick?: string;
  variantCount?: number;
  taxaCount: number;
  leafNamesByIndex: string[];
  compact?: boolean;
}

interface LayoutNode {
  node: SprMovedSubtreeTopologyNode;
  x: number;
  y: number;
  path: string;
}

const SVG_WIDTH = 260;
const SVG_HEIGHT = 140;
const SVG_PADDING_X = 16;
const SVG_PADDING_Y = 16;
const LABEL_RESERVE = 70;
const MAX_LABELLED_LEAVES = 8;

const hasRenderableTopology = (topology?: SprMovedSubtreeTopologySnapshot | null): boolean =>
  Boolean(topology?.root);

const countLeaves = (node: SprMovedSubtreeTopologyNode): number => {
  if (!node.children.length) return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
};

const layoutTopology = (root: SprMovedSubtreeTopologyNode): LayoutNode[] => {
  const leafCount = countLeaves(root);
  const maxDepth = getMaxDepth(root);
  const usableHeight = SVG_HEIGHT - SVG_PADDING_Y * 2;
  const usableWidth = SVG_WIDTH - SVG_PADDING_X * 2 - LABEL_RESERVE;
  let leafIndex = 0;
  const nodes: LayoutNode[] = [];

  const visit = (node: SprMovedSubtreeTopologyNode, depth: number, path: string): LayoutNode => {
    const x =
      maxDepth === 0
        ? SVG_PADDING_X
        : SVG_PADDING_X + (usableWidth * depth) / Math.max(1, maxDepth);
    let y: number;

    if (!node.children.length) {
      y =
        leafCount === 1
          ? SVG_HEIGHT / 2
          : SVG_PADDING_Y + (usableHeight * leafIndex) / Math.max(1, leafCount - 1);
      leafIndex += 1;
    } else {
      const children = node.children.map((child, index) =>
        visit(child, depth + 1, `${path}-${index}`)
      );
      y = children.reduce((sum, child) => sum + child.y, 0) / children.length;
    }

    const layoutNode = { node, x, y, path };
    nodes.push(layoutNode);
    return layoutNode;
  };

  visit(root, 0, '0');
  return nodes;
};

const getMaxDepth = (node: SprMovedSubtreeTopologyNode, depth = 0): number => {
  if (!node.children.length) return depth;
  return Math.max(...node.children.map((child) => getMaxDepth(child, depth + 1)));
};

const findLayoutNode = (nodes: LayoutNode[], path: string): LayoutNode | undefined =>
  nodes.find((node) => node.path === path);

const getLeafLabel = (node: SprMovedSubtreeTopologyNode, leafNamesByIndex: string[]): string => {
  const leafIndex = node.splitIndices.length === 1 ? node.splitIndices[0] : null;
  if (leafIndex !== null && leafNamesByIndex[leafIndex]) return leafNamesByIndex[leafIndex];
  return node.name || node.splitIndices.join(',');
};

function MiniSubtreeSvg({
  topology,
  label,
  leafNamesByIndex,
}: {
  topology?: SprMovedSubtreeTopologySnapshot | null;
  label: string;
  leafNamesByIndex: string[];
}) {
  if (!topology?.root) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded border border-dashed border-border/70 px-3 text-center text-2xs text-muted-foreground">
        {topology?.unavailableReason || 'Topology unavailable.'}
      </div>
    );
  }

  const nodes = layoutTopology(topology.root);
  const showLabels = topology.leafCount <= MAX_LABELLED_LEAVES;
  const paths: React.ReactNode[] = [];

  nodes.forEach((layoutNode) => {
    layoutNode.node.children.forEach((_child, index) => {
      const child = findLayoutNode(nodes, `${layoutNode.path}-${index}`);
      if (!child) return;
      paths.push(
        <path
          key={`${layoutNode.path}-${index}`}
          d={`M ${layoutNode.x} ${layoutNode.y} H ${child.x} V ${child.y}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        />
      );
    });
  });

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-[140px] w-full rounded border border-border/70 bg-background"
    >
      {paths}
      {nodes.map((layoutNode) => {
        const isLeaf = layoutNode.node.children.length === 0;
        return (
          <g key={layoutNode.path}>
            <circle
              cx={layoutNode.x}
              cy={layoutNode.y}
              r={isLeaf ? 2.8 : 2.2}
              className={isLeaf ? 'fill-primary' : 'fill-muted-foreground'}
            />
            {showLabels && isLeaf ? (
              <text
                x={layoutNode.x + 6}
                y={layoutNode.y + 3}
                className="fill-foreground text-[9px]"
              >
                {getLeafLabel(layoutNode.node, leafNamesByIndex)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

const NewickBlock = ({ label, value }: { label: string; value?: string }) => (
  <div className="min-w-0">
    <div className="mb-1 text-2xs font-semibold uppercase text-muted-foreground">{label}</div>
    <pre className="max-h-28 overflow-auto whitespace-pre rounded border border-border/70 bg-muted/30 p-2 text-[10px] leading-snug">
      {value || 'Unavailable'}
    </pre>
  </div>
);

export function SubtreeTopologyPopover({
  sourceTopology,
  destinationTopology,
  sourceNewick,
  destinationNewick,
  variantCount = 0,
  taxaCount,
  leafNamesByIndex,
  compact = false,
}: SubtreeTopologyPopoverProps) {
  const hasTopology =
    hasRenderableTopology(sourceTopology) || hasRenderableTopology(destinationTopology);
  const variantLabel =
    variantCount > 1
      ? `${variantCount} topology variants`
      : variantCount === 1
        ? '1 topology'
        : 'Topology';

  return (
    <div
      className="spr-analytics-no-drag inline-flex"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className={compact ? 'h-6 px-1.5 text-2xs' : 'h-7 px-2 text-2xs'}
            aria-label={`Inspect moved subtree topology for ${taxaCount} taxa`}
            title={`Inspect moved subtree topology for ${taxaCount} taxa`}
          >
            <ListTree className="size-3" aria-hidden />
            {compact ? null : <span>{variantLabel}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          collisionPadding={16}
          side="bottom"
          sideOffset={6}
          className="z-[1300] max-h-[calc(100vh-96px)] w-[720px] max-w-[calc(100vw-48px)] overflow-auto p-3"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold">Moved subtree topology</div>
            <div className="text-2xs text-muted-foreground">
              {taxaCount} taxa{hasTopology ? `, ${variantLabel.toLowerCase()}` : ''}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <div className="text-2xs font-semibold uppercase text-muted-foreground">
                Source tree
              </div>
              <MiniSubtreeSvg
                topology={sourceTopology}
                label="Source moved subtree topology"
                leafNamesByIndex={leafNamesByIndex}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="text-2xs font-semibold uppercase text-muted-foreground">
                Target tree
              </div>
              <MiniSubtreeSvg
                topology={destinationTopology}
                label="Target moved subtree topology"
                leafNamesByIndex={leafNamesByIndex}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3">
            <NewickBlock label="Source Newick" value={sourceNewick || sourceTopology?.newick} />
            <NewickBlock
              label="Target Newick"
              value={destinationNewick || destinationTopology?.newick}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
