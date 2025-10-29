/**
 * Calculate the interval between major tick marks based on zoom level and duration
 * @param pixelsPerSecond - Current zoom level (pixels per second)
 * @param duration - Timeline duration in seconds
 * @returns Interval in seconds between major tick marks
 */
export function getTickInterval(
  pixelsPerSecond: number,
  duration: number
): number {
  // High zoom: show more detailed intervals
  if (pixelsPerSecond > 120) {
    return 0.5; // Every 0.5 seconds
  }
  if (pixelsPerSecond > 80) {
    return 2; // Every 2 seconds
  }
  if (pixelsPerSecond > 40) {
    return 5; // Every 5 seconds
  }
  if (pixelsPerSecond > 20) {
    return 10; // Every 10 seconds
  }
  // Low zoom: show larger intervals, potentially based on duration
  if (duration > 600) {
    return 120; // Every 2 minutes for very long timelines
  }
  if (duration > 300) {
    return 60; // Every minute
  }
  return 30; // Every 30 seconds
}

/**
 * Determine which unit to display based on zoom level
 * @param pixelsPerSecond - Current zoom level (pixels per second)
 * @returns The unit type to display ("f" for frames, "s" for seconds, "m" for minutes)
 */
export function getTimeUnit(pixelsPerSecond: number): "f" | "s" | "m" {
  if (pixelsPerSecond > 120) {
    return "f"; // Show frames at high zoom
  }
  if (pixelsPerSecond < 60) {
    return "m"; // Show minutes at low zoom
  }
  return "s"; // Show seconds at medium zoom
}
