import React, { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';

export function OffsetJoystick({ valueX, valueY, onChange, maxOffset = 500 }) {
  const padRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const radius = 70;

  const handleMove = (clientX, clientY, commit = false) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const clampedX = clamp(dx, -radius, radius);
    const clampedY = clamp(dy, -radius, radius);
    const newX = Math.round((clampedX / radius) * maxOffset);
    const newY = Math.round((clampedY / radius) * maxOffset);
    onChange(newX, newY, commit);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e) => handleMove(e.clientX, e.clientY);
    const handlePointerUp = (e) => {
      handleMove(e.clientX, e.clientY, true);
      setIsDragging(false);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const indicatorX = clamp((valueX / maxOffset) * radius, -radius, radius);
  const indicatorY = clamp((valueY / maxOffset) * radius, -radius, radius);

  return (
    <div className="flex flex-col gap-2">
      <Label>Tree Spacing (X/Y)</Label>
      <div
        ref={padRef}
        className="relative h-[160px] w-[160px] rounded-lg border border-border bg-muted/40"
        onPointerDown={(e) => {
          setIsDragging(true);
          handleMove(e.clientX, e.clientY);
        }}
        role="slider"
        aria-label="Tree spacing joystick"
        aria-valuetext={`X ${valueX}, Y ${valueY}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-px w-full bg-border" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center rotate-90">
          <div className="h-px w-full bg-border" />
        </div>
        <div
          className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow"
          style={{
            left: `${80 + indicatorX}px`,
            top: `${80 + indicatorY}px`,
            transition: isDragging ? 'none' : 'transform 120ms ease'
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>X: {valueX}</span>
        <span>Y: {valueY}</span>
      </div>
    </div>
  );
}
