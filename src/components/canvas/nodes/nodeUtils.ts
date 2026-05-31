import { Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

export const getSharedNodeClasses = (
  selected: boolean,
  isSearchActive: boolean,
  isMatch: boolean,
  isSimulating: boolean,
  isActiveInSimulation: boolean,
  baseClasses: string = "relative w-[280px] rounded-xl border bg-card transition-all duration-300 shadow-md hover:shadow-glow hover:scale-[1.02] border-border/40 dark:border-white/5 hover:border-brand-gold dark:hover:border-brand-gold"
) => {
  return cn(
    baseClasses,
    selected && !isSimulating ? "border-brand-gold dark:border-brand-gold hover:border-brand-gold dark:hover:border-brand-gold scale-[1.02] z-10 shadow-glow" : "",
    isSearchActive && !isMatch && !isSimulating ? "opacity-30 grayscale" : "",
    isSearchActive && isMatch && !isSimulating ? "border-brand-gold dark:border-brand-gold hover:border-brand-gold dark:hover:border-brand-gold shadow-glow z-20" : "",
    isSimulating && isActiveInSimulation ? "border-brand-gold dark:border-brand-gold hover:border-brand-gold dark:hover:border-brand-gold shadow-[0_0_20px_rgba(188,155,89,0.3)] scale-[1.02] z-30" : "",
    isSimulating && !isActiveInSimulation ? "opacity-30 grayscale blur-[1px]" : ""
  );
};

export const getRotatedHandlePosition = (logicalPosition: Position, rotation: number = 0): Position => {
  const positions = [Position.Top, Position.Right, Position.Bottom, Position.Left];
  const currentIndex = positions.indexOf(logicalPosition);
  
  if (currentIndex === -1) return logicalPosition;

  const offset = Math.floor(((rotation || 0) % 360) / 90);
  const newIndex = (currentIndex + offset) % 4;
  
  return positions[newIndex];
};

export const getHandleClass = (position: Position, isActive: boolean, isOccupied: boolean = false, isTarget: boolean = false) => {
  const baseClasses = "gryf-handle";
  const targetClasses = isTarget ? "gryf-handle-target" : "";
  const activeClasses = isActive ? "active" : "";
  const occupiedClasses = isOccupied ? "gryf-handle-occupied" : "";

  // We remove manual position classes to let standard React Flow styles perfectly center the handles.
  // case Position.Left: ...

  return cn(baseClasses, targetClasses, activeClasses, occupiedClasses);
};



/** Handle class for database connection points — square shape, cyan color */
export const getDbHandleClass = (position: Position, isActive: boolean, isTarget: boolean = false) => {
  const baseClasses = "gryf-handle-db";
  const targetClasses = isTarget ? "gryf-handle-db-target" : "";
  const activeClasses = isActive ? "active" : "";

  // We remove manual position classes to let standard React Flow styles perfectly center the handles.
  // case Position.Left: ...

  return cn(baseClasses, targetClasses, activeClasses);
};
