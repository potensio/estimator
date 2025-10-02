// T-shirt size estimation utilities

// T-shirt size scale mapping to hours
export const TSHIRT_SCALE = {
  'XS': { hours: 0.5, description: "Extra Small - Very simple task" },
  'S': { hours: 1, description: "Small - Simple task" },
  'M': { hours: 2, description: "Medium - Standard task" },
  'L': { hours: 4, description: "Large - Complex task" },
  'XL': { hours: 8, description: "Extra Large - Very complex task" },
  'XXL': { hours: 16, description: "Too Large - Should be broken down" }
} as const;

export type TShirtSize = keyof typeof TSHIRT_SCALE;
export type OptimisticLevel = 'optimistic' | 'realistic' | 'pessimistic';

// T-shirt size sequence for easy reference
export const TSHIRT_SEQUENCE: TShirtSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Adjustment multipliers for different optimistic levels
export const TSHIRT_ADJUSTMENTS = {
  optimistic: {
    description: "Best case scenario - ideal conditions, no blockers",
    sizeShift: -1, // Move down 1 T-shirt size level
    minSize: 'XS' // Minimum size is XS
  },
  realistic: {
    description: "Most likely scenario - normal development conditions",
    sizeShift: 0, // No change
    minSize: 'XS'
  },
  pessimistic: {
    description: "Worst case scenario - accounting for unknowns and challenges",
    sizeShift: 1, // Move up 1 T-shirt size level
    maxSize: 'XXL' // Maximum size is XXL
  }
} as const;

/**
 * Convert T-shirt size to hours
 */
export function tshirtToHours(size: TShirtSize): number {
  return TSHIRT_SCALE[size].hours;
}

/**
 * Convert hours to closest T-shirt size
 */
export function hoursToTShirt(hours: number): TShirtSize {
  let closestSize: TShirtSize = 'XS';
  let minDiff = Math.abs(hours - TSHIRT_SCALE['XS'].hours);
  
  for (const size of TSHIRT_SEQUENCE) {
    const diff = Math.abs(hours - TSHIRT_SCALE[size].hours);
    if (diff < minDiff) {
      minDiff = diff;
      closestSize = size;
    }
  }
  
  return closestSize;
}

/**
 * Get the next T-shirt size in sequence
 */
export function getNextTShirtSize(current: TShirtSize): TShirtSize {
  const currentIndex = TSHIRT_SEQUENCE.indexOf(current);
  if (currentIndex === -1 || currentIndex === TSHIRT_SEQUENCE.length - 1) {
    return current; // Return current if not found or already at max
  }
  return TSHIRT_SEQUENCE[currentIndex + 1];
}

/**
 * Get the previous T-shirt size in sequence
 */
export function getPreviousTShirtSize(current: TShirtSize): TShirtSize {
  const currentIndex = TSHIRT_SEQUENCE.indexOf(current);
  if (currentIndex === -1 || currentIndex === 0) {
    return current; // Return current if not found or already at min
  }
  return TSHIRT_SEQUENCE[currentIndex - 1];
}

/**
 * Adjust T-shirt size based on optimistic level
 */
export function adjustTShirtSize(
  originalSize: TShirtSize,
  level: OptimisticLevel
): TShirtSize {
  const adjustment = TSHIRT_ADJUSTMENTS[level];
  
  if (adjustment.sizeShift === 0) {
    return originalSize; // No change for realistic
  }
  
  if (adjustment.sizeShift > 0) {
    // Move up (pessimistic)
    return getNextTShirtSize(originalSize);
  } else {
    // Move down (optimistic)
    return getPreviousTShirtSize(originalSize);
  }
}

/**
 * Calculate total estimation for a module with T-shirt size adjustments (bottom-up approach)
 */
export function calculateModuleEstimation(
  modulesData: any,
  level: OptimisticLevel = 'realistic',
  teamVelocity: number = 20 // Default team velocity in hours per sprint
) {
  let totalOriginalHours = 0;
  let totalAdjustedHours = 0;
  
  const adjustments: Record<string, any> = {};
  
  // Process each module
  if (modulesData.modules) {
    for (const module of modulesData.modules) {
      let moduleOriginalHours = 0;
      let moduleAdjustedHours = 0;
      
      if (module.features) {
        for (const feature of module.features) {
          let featureOriginalHours = 0;
          let featureAdjustedHours = 0;
          
          // Only calculate from sub-features (bottom-up approach)
          if (feature.sub_features) {
            for (const subFeature of feature.sub_features) {
              if (subFeature.estimation && subFeature.estimation.tshirt_size) {
                const originalSize = subFeature.estimation.tshirt_size as TShirtSize;
                const adjustedSize = adjustTShirtSize(originalSize, level);
                
                const originalHours = tshirtToHours(originalSize);
                const adjustedHours = tshirtToHours(adjustedSize);
                
                featureOriginalHours += originalHours;
                featureAdjustedHours += adjustedHours;
                
                adjustments[subFeature.id] = {
                  original_size: originalSize,
                  adjusted_size: adjustedSize,
                  original_hours: originalHours,
                  adjusted_hours: adjustedHours,
                  adjustment_reason: TSHIRT_ADJUSTMENTS[level].description
                };
              }
            }
          }
          
          // Store calculated totals in feature object for UI display
          feature.calculated_hours = {
            original: featureOriginalHours,
            adjusted: Math.round(featureAdjustedHours)
          };
          
          moduleOriginalHours += featureOriginalHours;
          moduleAdjustedHours += featureAdjustedHours;
        }
      }
      
      // Store calculated totals in module object for UI display
      module.calculated_hours = {
        original: moduleOriginalHours,
        adjusted: Math.round(moduleAdjustedHours)
      };
      
      totalOriginalHours += moduleOriginalHours;
      totalAdjustedHours += moduleAdjustedHours;
    }
  }
  
  const estimatedSprints = totalAdjustedHours / teamVelocity;
  const estimatedWeeks = estimatedSprints * 2; // Assuming 2-week sprints
  
  return {
    scenario: level,
    team_velocity: teamVelocity,
    adjustments,
    totals: {
      original_hours: totalOriginalHours,
      adjusted_hours: totalAdjustedHours,
      estimated_sprints: Math.ceil(estimatedSprints * 10) / 10, // Round to 1 decimal
      estimated_weeks: Math.ceil(estimatedWeeks * 10) / 10
    }
  };
}

/**
 * Validate if a string is a valid T-shirt size
 */
export function isValidTShirtSize(size: string): size is TShirtSize {
  return size in TSHIRT_SCALE;
}

/**
 * Get estimation summary for display
 */
export function getEstimationSummary(
  totalHours: number,
  teamVelocity: number = 20
) {
  const sprints = totalHours / teamVelocity;
  const weeks = sprints * 2;
  
  return {
    hours: totalHours,
    sprints: Math.ceil(sprints * 10) / 10,
    weeks: Math.ceil(weeks * 10) / 10,
    team_velocity: teamVelocity
  };
}