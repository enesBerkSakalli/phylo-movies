/**
 * pure domain logic for calculating animation state based on time and playlist length.
 */

export function calculatePlaybackState({ 
  timestamp, 
  startTime, 
  speed, 
  totalItems,
  transitionDuration = 1.0, // Default 1s per transition
  pauseDuration = 0.0       // Default 0s pause
}) {
  if (!startTime || totalItems <= 1) {
    const endIdx = Math.max(0, totalItems - 1);
    return {
      progress: 1,
      isFinished: true,
      fromIndex: endIdx,
      toIndex: endIdx,
      localT: 0,
      isInPause: false
    };
  }

  const segmentCount = totalItems - 1;
  
  // Calculate total duration: T * N + P * (N-1)
  const totalDuration = (segmentCount * transitionDuration) + 
                        (Math.max(0, segmentCount - 1) * pauseDuration);

  const elapsedSeconds = (timestamp - startTime) / 1000;
  const effectiveTime = elapsedSeconds * speed;
  
  const rawProgress = totalDuration > 0 ? effectiveTime / totalDuration : 1;
  const isFinished = rawProgress >= 1.0;
  const progress = Math.max(0, Math.min(1, rawProgress));

  // Determine which segment we are in (Logic adapted from AnimationTimeline.js)
  const segmentWithPause = transitionDuration + pauseDuration;
  const timeBeforeLast = (segmentCount - 1) * segmentWithPause;
  const clampedTime = Math.min(effectiveTime, totalDuration);
  
  let segmentIndex;
  let timeInSegment;

  if (clampedTime >= timeBeforeLast) {
    // Last segment
    segmentIndex = segmentCount - 1;
    timeInSegment = clampedTime - timeBeforeLast;
  } else {
    // Earlier segments
    segmentIndex = Math.floor(clampedTime / segmentWithPause);
    timeInSegment = clampedTime - (segmentIndex * segmentWithPause);
  }
  
  segmentIndex = Math.max(0, Math.min(segmentIndex, segmentCount - 1));

  let localT;
  let isInPause = false;

  if (isFinished) {
    localT = 1;
    isInPause = false;
  } else if (timeInSegment <= transitionDuration) {
    // Transition phase
    localT = Math.min(1, Math.max(0, timeInSegment / transitionDuration));
  } else {
    // Pause phase
    localT = 1;
    isInPause = true;
  }

  const fromIndex = segmentIndex;
  const toIndex = Math.min(fromIndex + 1, totalItems - 1);

  return {
    progress,
    isFinished,
    fromIndex,
    toIndex,
    localT,
    isInPause
  };
}
