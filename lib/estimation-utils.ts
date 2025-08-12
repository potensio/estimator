// Fibonacci estimation utilities

// Fibonacci scale mapping points to hours
export const FIBONACCI_SCALE = {
  1: { hours: 2, description: "Very simple task" },
  2: { hours: 4, description: "Simple task" },
  3: { hours: 6, description: "Small task" },
  5: { hours: 14, description: "Medium task" },
  8: { hours: 20, description: "Large task" },
  13: { hours: 34, description: "Very large task" },
  21: { hours: 54, description: "Epic task" },
  34: { hours: 88, description: "Should be broken down" },
  55: { hours: 144, description: "Too large - must break down" }
} as const;

export type FibonacciPoint = keyof typeof FIBONACCI_SCALE;
export type OptimisticLevel = 'optimistic' | 'realistic' | 'pessimistic';

// Fibonacci sequence for easy reference
export const FIBONACCI_SEQUENCE: FibonacciPoint[] = [1, 2, 3, 5, 8, 13, 21, 34, 55];

// Adjustment multipliers for different optimistic levels
export const FIBONACCI_ADJUSTMENTS = {
  optimistic: {
    description: "Best case scenario - ideal conditions, no blockers",
    pointsShift: -1, // Move down 1 Fibonacci level
    maxShift: 1 // Minimum point is 1
  },
  realistic: {
    description: "Most likely scenario - normal development conditions",
    pointsShift: 0, // No change
    maxShift: 0
  },
  pessimistic: {
    description: "Worst case scenario - accounting for unknowns and challenges",
    pointsShift: 1, // Move up 1 Fibonacci level
    maxShift: 55 // Maximum point is 55
  }
} as const;

/**
 * Convert Fibonacci points to hours
 */
export function fibonacciToHours(points: FibonacciPoint): number {
  return FIBONACCI_SCALE[points].hours;
}

/**
 * Convert hours to closest Fibonacci points
 */
export function hoursToFibonacci(hours: number): FibonacciPoint {
  let closestPoint: FibonacciPoint = 1;
  let minDiff = Math.abs(hours - FIBONACCI_SCALE[1].hours);
  
  for (const point of FIBONACCI_SEQUENCE) {
    const diff = Math.abs(hours - FIBONACCI_SCALE[point].hours);
    if (diff < minDiff) {
      minDiff = diff;
      closestPoint = point;
    }
  }
  
  return closestPoint;
}

/**
 * Get the next Fibonacci number in sequence
 */
export function getNextFibonacci(current: FibonacciPoint): FibonacciPoint {
  const currentIndex = FIBONACCI_SEQUENCE.indexOf(current);
  if (currentIndex === -1 || currentIndex === FIBONACCI_SEQUENCE.length - 1) {
    return current; // Return current if not found or already at max
  }
  return FIBONACCI_SEQUENCE[currentIndex + 1];
}

/**
 * Get the previous Fibonacci number in sequence
 */
export function getPreviousFibonacci(current: FibonacciPoint): FibonacciPoint {
  const currentIndex = FIBONACCI_SEQUENCE.indexOf(current);
  if (currentIndex === -1 || currentIndex === 0) {
    return current; // Return current if not found or already at min
  }
  return FIBONACCI_SEQUENCE[currentIndex - 1];
}

/**
 * Adjust Fibonacci points based on optimistic level
 */
export function adjustFibonacciPoints(
  originalPoints: FibonacciPoint,
  level: OptimisticLevel
): FibonacciPoint {
  const adjustment = FIBONACCI_ADJUSTMENTS[level];
  
  if (adjustment.pointsShift === 0) {
    return originalPoints; // No change for realistic
  }
  
  if (adjustment.pointsShift > 0) {
    // Move up (pessimistic)
    return getNextFibonacci(originalPoints);
  } else {
    // Move down (optimistic)
    return getPreviousFibonacci(originalPoints);
  }
}

/**
 * Calculate total estimation for a module with Fibonacci adjustments
 */
export function calculateModuleEstimation(
  modulesData: any,
  level: OptimisticLevel = 'realistic',
  teamVelocity: number = 20 // Default team velocity in points per sprint
) {
  let totalOriginalPoints = 0;
  let totalAdjustedPoints = 0;
  let totalOriginalHours = 0;
  let totalAdjustedHours = 0;
  
  const adjustments: Record<string, any> = {};
  
  // Process each module
  if (modulesData.modules) {
    for (const module of modulesData.modules) {
      if (module.features) {
        for (const feature of module.features) {
          if (feature.estimation && feature.estimation.fibonacci_points) {
            const originalPoints = feature.estimation.fibonacci_points as FibonacciPoint;
            const adjustedPoints = adjustFibonacciPoints(originalPoints, level);
            
            const originalHours = fibonacciToHours(originalPoints);
            const adjustedHours = fibonacciToHours(adjustedPoints);
            
            totalOriginalPoints += originalPoints;
            totalAdjustedPoints += adjustedPoints;
            totalOriginalHours += originalHours;
            totalAdjustedHours += adjustedHours;
            
            adjustments[feature.id] = {
              original_points: originalPoints,
              adjusted_points: adjustedPoints,
              original_hours: originalHours,
              adjusted_hours: adjustedHours,
              adjustment_reason: FIBONACCI_ADJUSTMENTS[level].description
            };
          }
          
          // Process sub-features
          if (feature.sub_features) {
            for (const subFeature of feature.sub_features) {
              if (subFeature.estimation && subFeature.estimation.fibonacci_points) {
                const originalPoints = subFeature.estimation.fibonacci_points as FibonacciPoint;
                const adjustedPoints = adjustFibonacciPoints(originalPoints, level);
                
                const originalHours = fibonacciToHours(originalPoints);
                const adjustedHours = fibonacciToHours(adjustedPoints);
                
                totalOriginalPoints += originalPoints;
                totalAdjustedPoints += adjustedPoints;
                totalOriginalHours += originalHours;
                totalAdjustedHours += adjustedHours;
                
                adjustments[subFeature.id] = {
                  original_points: originalPoints,
                  adjusted_points: adjustedPoints,
                  original_hours: originalHours,
                  adjusted_hours: adjustedHours,
                  adjustment_reason: FIBONACCI_ADJUSTMENTS[level].description
                };
              }
            }
          }
        }
      }
    }
  }
  
  const estimatedSprints = totalAdjustedPoints / teamVelocity;
  const estimatedWeeks = estimatedSprints * 2; // Assuming 2-week sprints
  
  return {
    scenario: level,
    team_velocity: teamVelocity,
    adjustments,
    totals: {
      original_points: totalOriginalPoints,
      adjusted_points: totalAdjustedPoints,
      original_hours: totalOriginalHours,
      adjusted_hours: totalAdjustedHours,
      estimated_sprints: Math.ceil(estimatedSprints * 10) / 10, // Round to 1 decimal
      estimated_weeks: Math.ceil(estimatedWeeks * 10) / 10
    }
  };
}

/**
 * Validate if a number is a valid Fibonacci point
 */
export function isValidFibonacciPoint(point: number): point is FibonacciPoint {
  return point in FIBONACCI_SCALE;
}

/**
 * Get estimation summary for display
 */
export function getEstimationSummary(
  totalPoints: number,
  totalHours: number,
  teamVelocity: number = 20
) {
  const sprints = totalPoints / teamVelocity;
  const weeks = sprints * 2;
  
  return {
    points: totalPoints,
    hours: totalHours,
    sprints: Math.ceil(sprints * 10) / 10,
    weeks: Math.ceil(weeks * 10) / 10,
    team_velocity: teamVelocity
  };
}