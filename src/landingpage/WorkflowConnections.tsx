import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

interface WorkflowConnectionsProps {
  containerRef: React.RefObject<HTMLElement>;
}

interface Point { x: number; y: number }
interface Segment {
  start: Point;
  end: Point;
  isL2R: boolean;
}

export const WorkflowConnections: React.FC<WorkflowConnectionsProps> = ({ containerRef }) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [nodes, setNodes] = useState<Point[]>([]);
  const lineContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const containerEl = containerRef.current;
      if (!containerEl) return;

      const containerRect = containerEl.getBoundingClientRect();
      const getPos = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2
        };
      };

      const n_r_b = getPos('node-radial-bottom');
      const n_f_t = getPos('node-features-top');
      const n0 = getPos('node-features-bottom');
      const n1 = getPos('node-workflow-top');
      const n2 = getPos('node-workflow-bottom');
      const n3 = getPos('node-org-top');
      const n4 = getPos('node-org-bottom');
      const n5 = getPos('node-stats-top');
      const n6 = getPos('node-stats-bottom');
      const n7 = getPos('node-collab-top');

      const allNodes = [n_r_b, n_f_t, n0, n1, n2, n3, n4, n5, n6, n7];
      if (allNodes.some(n => n === null)) return;

      setNodes(allNodes as Point[]);

      setSegments([
        { start: n_r_b!, end: n_f_t!, isL2R: n_r_b!.x < n_f_t!.x },
        { start: n0!, end: n1!, isL2R: n0!.x < n1!.x },
        { start: n2!, end: n3!, isL2R: n2!.x < n3!.x },
        { start: n4!, end: n5!, isL2R: n4!.x < n5!.x },
        { start: n6!, end: n7!, isL2R: n6!.x < n7!.x },
      ]);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    const timeout = setTimeout(updatePosition, 100);
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timeout);
    };
  }, [containerRef]);

  // Track the scroll of the entire workflow container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const [dotPos, setDotPos] = useState({ x: 0, y: 0, opacity: 0 });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (nodes.length < 10 || segments.length < 5) return;
    
    // The total height of the container dictates the Y mapping
    const containerHeight = containerRef.current?.getBoundingClientRect().height || 0;
    const currentY = progress * containerHeight;

    let found = false;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (currentY >= seg.start.y && currentY <= seg.end.y) {
        const h = seg.end.y - seg.start.y;
        const w = Math.abs(seg.end.x - seg.start.x);
        const targetY = currentY - seg.start.y;
        
        const r = Math.min(20, h / 2 - 1, w / 2 - 1);
        
        const l1 = h / 2 - r;
        const l2 = (Math.PI / 2) * r;
        const l3 = w - 2 * r;
        const l4 = (Math.PI / 2) * r;
        const l5 = h / 2 - r;
        const totalLength = l1 + l2 + l3 + l4 + l5;
        
        let t = targetY / h; // 0 to 1
        t = Math.max(0, Math.min(1, t)); // clamp
        const distance = t * totalLength;
        
        let xLocal: number;
        let yLocal: number;
        
        if (distance <= l1) {
          xLocal = seg.isL2R ? 0 : w;
          yLocal = distance;
        } else if (distance <= l1 + l2) {
          const d = distance - l1;
          const theta = d / r; // 0 to PI/2
          if (seg.isL2R) {
            xLocal = r - r * Math.cos(theta);
            yLocal = (h / 2 - r) + r * Math.sin(theta);
          } else {
            xLocal = (w - r) + r * Math.cos(theta);
            yLocal = (h / 2 - r) + r * Math.sin(theta);
          }
        } else if (distance <= l1 + l2 + l3) {
          const d = distance - (l1 + l2);
          yLocal = h / 2;
          xLocal = seg.isL2R ? r + d : (w - r) - d;
        } else if (distance <= l1 + l2 + l3 + l4) {
          const d = distance - (l1 + l2 + l3);
          const theta = d / r;
          if (seg.isL2R) {
            xLocal = (w - r) + r * Math.sin(theta);
            yLocal = (h / 2 + r) - r * Math.cos(theta);
          } else {
            xLocal = r - r * Math.sin(theta);
            yLocal = (h / 2 + r) - r * Math.cos(theta);
          }
        } else {
          const d = distance - (l1 + l2 + l3 + l4);
          xLocal = seg.isL2R ? w : 0;
          yLocal = h / 2 + r + d;
        }
        
        const absoluteX = Math.min(seg.start.x, seg.end.x) + xLocal;
        const absoluteY = seg.start.y + yLocal;

        // Fade out dot near the ends (within 5% of segment height)
        let opacity = 1;
        const margin = h * 0.05;
        if (targetY < margin) opacity = targetY / margin;
        if (targetY > h - margin) opacity = (h - targetY) / margin;

        setDotPos({ x: absoluteX, y: absoluteY, opacity });
        found = true;
        break;
      }
    }

    if (!found) {
      // Dot is behind a graphic or outside the bounds
      setDotPos(prev => ({ ...prev, opacity: 0 }));
    }
  });

  if (segments.length === 0) return null;

  return (
    <div ref={lineContainerRef} className="absolute inset-0 pointer-events-none z-0 hidden md:block">
      {/* Render the 3 separate dashed lines */}
      {segments.map((seg, idx) => {
        const x = Math.min(seg.start.x, seg.end.x);
        const y = seg.start.y;
        const w = Math.abs(seg.end.x - seg.start.x);
        const h = seg.end.y - seg.start.y;
        
        const r = Math.min(20, h / 2 - 1, w / 2 - 1);
        let pathD: string;
        
        if (seg.isL2R) {
          pathD = `M 0,0 L 0,${h/2 - r} Q 0,${h/2} ${r},${h/2} L ${w - r},${h/2} Q ${w},${h/2} ${w},${h/2 + r} L ${w},${h}`;
        } else {
          pathD = `M ${w},0 L ${w},${h/2 - r} Q ${w},${h/2} ${w - r},${h/2} L ${r},${h/2} Q 0,${h/2} 0,${h/2 + r} L 0,${h}`;
        }

        return (
          <svg 
            key={idx}
            width={w} 
            height={h} 
            viewBox={`0 0 ${w} ${h}`} 
            className="overflow-visible absolute"
            style={{ left: x, top: y }}
          >
            <path 
              id={`path-${idx}`}
              d={pathD} 
              fill="none" 
              stroke="currentColor" 
              className="text-brand-gold"
              strokeWidth="2" 
            />
          </svg>
        );
      })}

      {/* The Single Moving Dot */}
      <motion.div 
        className="absolute w-4 h-4 rounded-full bg-brand-gold shadow-glow z-20"
        style={{ 
          left: dotPos.x, 
          top: dotPos.y, 
          opacity: dotPos.opacity,
          translateX: '-50%', 
          translateY: '-50%' 
        }}
      />
    </div>
  );
};
