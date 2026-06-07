/**
 * Global reusable Tooltip component.
 *
 * Usage (simple string):
 *   <Tooltip content="Some label"><button>Hover me</button></Tooltip>
 *
 * Usage (rich content):
 *   <Tooltip content={<div><b>Title</b><p>Detail</p></div>}>
 *     <span>Hover me</span>
 *   </Tooltip>
 *
 * Props:
 *   content     — string or ReactNode shown inside the tooltip
 *   side        — preferred side: "top" | "bottom" | "left" | "right"  (default "top")
 *   delay       — ms before showing (default 120)
 *   disabled    — suppress entirely
 *   className   — extra classes on the trigger wrapper
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  side?: Side;
  delay?: number;
  disabled?: boolean;
  className?: string;
  /** Set to true when wrapping SVG elements — uses <g> instead of <span> as anchor */
  svgMode?: boolean;
  children: ReactNode;
}

// Gap between the tooltip box and the anchor edge (px)
const GAP = 8;
// Viewport padding — keep tooltip inside the window (px)
const VP_PAD = 10;

export function Tooltip({
  content,
  side = 'top',
  delay = 120,
  disabled = false,
  className = '',
  svgMode = false,
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({ top: 0, left: 0 });
  const anchorRef = useRef<SVGGElement | HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computePos = useCallback(() => {
    const anchor = anchorRef.current;
    const tip = tooltipRef.current;
    if (!anchor || !tip) return;

    const a = anchor.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0;
    let left = 0;

    if (side === 'top') {
      top = a.top - t.height - GAP;
      left = a.left + a.width / 2 - t.width / 2;
    } else if (side === 'bottom') {
      top = a.bottom + GAP;
      left = a.left + a.width / 2 - t.width / 2;
    } else if (side === 'left') {
      top = a.top + a.height / 2 - t.height / 2;
      left = a.left - t.width - GAP;
    } else {
      // right
      top = a.top + a.height / 2 - t.height / 2;
      left = a.right + GAP;
    }

    // Clamp to viewport
    left = Math.max(VP_PAD, Math.min(left, vw - t.width - VP_PAD));
    top = Math.max(VP_PAD, Math.min(top, vh - t.height - VP_PAD));

    setPos({ top: top + window.scrollY, left: left + window.scrollX });
  }, [side]);

  const show = useCallback(() => {
    if (disabled || !content) return;
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [disabled, content, delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  // Recompute position whenever visible or content changes
  useEffect(() => {
    if (visible) {
      // Use rAF to wait for the tooltip DOM node to be painted and sized
      requestAnimationFrame(() => computePos());
    }
  }, [visible, computePos]);

  if (disabled || !content) {
    if (svgMode) return <g className={className}>{children}</g>;
    return <span className={className}>{children}</span>;
  }

  const portal = visible
    ? createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className="shiesty-tooltip"
          style={{
            position: 'absolute',
            zIndex: 99999,
            pointerEvents: 'none',
            ...pos,
          }}
        >
          {content}
        </div>,
        document.body,
      )
    : null;

  if (svgMode) {
    return (
      <>
        <g
          ref={anchorRef as React.RefObject<SVGGElement>}
          className={className}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {children}
        </g>
        {portal}
      </>
    );
  }

  return (
    <>
      <span
        ref={anchorRef as React.RefObject<HTMLSpanElement>}
        className={`inline-flex items-center ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {portal}
    </>
  );
}

/**
 * Pre-built "skill card" tooltip for the SkillTree.
 * Matches the project theme (#0d0d14, gold border, mono font).
 */
export function SkillTooltip({
  name,
  description,
  effectPerRank,
  currentRank,
  maxRank,
  treeColor,
  isLocked,
  reqPointsInTree,
}: {
  name: string;
  description?: string;
  effectPerRank?: string;
  currentRank: number;
  maxRank: number;
  treeColor: string;
  isLocked: boolean;
  reqPointsInTree?: number;
}) {
  return (
    <div
      style={{
        background: '#0d0d14',
        border: `1px solid ${treeColor}`,
        borderLeftWidth: 3,
        padding: '10px 14px',
        minWidth: 220,
        maxWidth: 280,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div
        style={{
          color: treeColor,
          fontSize: 11,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 4,
        }}
      >
        {name}
      </div>

      {description && (
        <div
          style={{
            color: '#c8b8d8',
            fontSize: 10,
            lineHeight: 1.5,
            marginBottom: 6,
          }}
        >
          {description}
        </div>
      )}

      {effectPerRank && (
        <div
          style={{
            color: '#f1aa1c',
            fontSize: 10,
            fontStyle: 'italic',
            marginBottom: 6,
            borderLeft: '2px solid #f1aa1c',
            paddingLeft: 6,
          }}
        >
          {effectPerRank}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: reqPointsInTree ? 4 : 0,
        }}
      >
        <span
          style={{ color: '#8a7a9a', fontSize: 9, textTransform: 'uppercase' }}
        >
          Rank
        </span>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: maxRank }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                border: `1px solid ${treeColor}`,
                background: i < currentRank ? treeColor : 'transparent',
              }}
            />
          ))}
        </div>
        <span style={{ color: treeColor, fontSize: 10, fontWeight: 700 }}>
          {currentRank}/{maxRank}
        </span>
      </div>

      {reqPointsInTree != null && reqPointsInTree > 0 && (
        <div style={{ color: '#e83a3a', fontSize: 9, marginBottom: 4 }}>
          Requires {reqPointsInTree} pts in tree
        </div>
      )}

      {isLocked && (
        <div style={{ color: '#e83a3a', fontSize: 9, marginTop: 4 }}>
          🔒 Locked — meet prerequisites first
        </div>
      )}

      <div
        style={{
          borderTop: '1px solid #1e1e2e',
          marginTop: 6,
          paddingTop: 5,
          color: '#4a4a5a',
          fontSize: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Left-click: add · Right-click: remove
      </div>
    </div>
  );
}

/** Simple styled label tooltip — matches app theme. */
export function LabelTooltip({ text }: { text: string }) {
  return (
    <div
      style={{
        background: '#0d0d14',
        border: '1px solid #2d1f38',
        padding: '4px 10px',
        color: '#c8b8d8',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
}
