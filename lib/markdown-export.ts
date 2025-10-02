export interface ModuleData {
  modules: Array<{
    id: string;
    name: string;
    description: string;
    features: Array<{
      id: string;
      name: string;
      description: string;
      complexity: string;
      sub_features: Array<{
        id: string;
        name: string;
        description: string;
        technical_notes?: string;
        estimation: {
          tshirt_size: string;
          estimated_hours: number;
          reasoning: string;
        };
      }>;
      dependencies?: string[];
      integrations?: string[];
    }>;
    calculated_hours?: {
      original: number;
      adjusted: number;
    };
  }>;
  metadata?: {
    generated_at: string;
    total_modules: number;
    project_name?: string;
  };
}

export function convertModulesToMarkdown(data: ModuleData, projectName?: string): string {
  const timestamp = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let markdown = `# 📋 Project Estimation Report\n\n`;
  
  if (projectName) {
    markdown += `**Project:** ${projectName}\n\n`;
  }
  
  markdown += `**Generated:** ${timestamp}\n\n`;
  
  if (data.metadata) {
    markdown += `**Total Modules:** ${data.metadata.total_modules}\n\n`;
  }

  markdown += `---\n\n`;

  // Summary Table with detailed estimation
  markdown += `## 📊 Estimation Overview\n\n`;
  markdown += `| No | Module | Features | Sub-Features | Total Hours | Complexity |\n`;
  markdown += `|----|--------|----------|--------------|-------------|------------|\n`;
  
  let totalHours = 0;
  let totalFeatures = 0;
  let totalSubFeatures = 0;
  
  data.modules.forEach((module, index) => {
    const moduleHours = module.calculated_hours?.adjusted || 
      module.features?.reduce((sum, feature) => 
        sum + (feature.sub_features?.reduce((subSum, sub) => 
          subSum + (sub.estimation?.estimated_hours || 0), 0) || 0), 0) || 0;
    
    const featureCount = module.features?.length || 0;
    const subFeatureCount = module.features?.reduce((sum, feature) => 
      sum + (feature.sub_features?.length || 0), 0) || 0;
    
    totalHours += moduleHours;
    totalFeatures += featureCount;
    totalSubFeatures += subFeatureCount;
    
    markdown += `| ${index + 1} | ${module.name} | ${featureCount} | ${subFeatureCount} | ${moduleHours}h | ${getComplexityEmoji(module.features)} |\n`;
  });
  
  markdown += `| **TOTAL** | **${data.modules.length} Modules** | **${totalFeatures}** | **${totalSubFeatures}** | **${totalHours}h** | - |\n\n`;

  // Quick Summary Box
  markdown += `### 🎯 Project Summary\n\n`;
  markdown += `> **Total Estimated Hours:** ${totalHours}h\n`;
  markdown += `> **Estimated Work Days:** ${Math.ceil(totalHours / 8)} days (8h/day)\n`;
  markdown += `> **Estimated Work Weeks:** ${Math.ceil(totalHours / 40)} weeks (40h/week)\n`;
  markdown += `> **Total Modules:** ${data.modules.length}\n`;
  markdown += `> **Total Features:** ${totalFeatures}\n`;
  markdown += `> **Total Sub-features:** ${totalSubFeatures}\n\n`;



  // Detailed Breakdown
  markdown += `## 🔍 Detailed Breakdown\n\n`;
  
  data.modules.forEach((module, moduleIndex) => {
    const moduleHours = module.calculated_hours?.adjusted || 
      module.features?.reduce((sum, feature) => 
        sum + (feature.sub_features?.reduce((subSum, sub) => 
          subSum + (sub.estimation?.estimated_hours || 0), 0) || 0), 0) || 0;
    
    markdown += `### ${moduleIndex + 1}. ${module.name} (${moduleHours}h)\n\n`;
    markdown += `**Description:** ${module.description}\n\n`;

    if (module.features && module.features.length > 0) {
      module.features.forEach((feature, featureIndex) => {
        const featureHours = feature.sub_features?.reduce((sum, sub) => 
          sum + (sub.estimation?.estimated_hours || 0), 0) || 0;
        
        markdown += `#### ${moduleIndex + 1}.${featureIndex + 1} ${feature.name} (${featureHours}h)\n\n`;
        markdown += `**Description:** ${feature.description}\n\n`;
        markdown += `**Complexity:** ${feature.complexity}\n\n`;
        
        if (feature.dependencies && feature.dependencies.length > 0) {
          markdown += `**Dependencies:** ${feature.dependencies.join(', ')}\n\n`;
        }
        
        if (feature.integrations && feature.integrations.length > 0) {
          markdown += `**Integrations:** ${feature.integrations.join(', ')}\n\n`;
        }

        if (feature.sub_features && feature.sub_features.length > 0) {
          markdown += `**Sub-features:**\n\n`;
          markdown += `| No | Task | Description | Hours | T-shirt | Reasoning |\n`;
          markdown += `|----|------|-------------|-------|---------|-----------|\n`;
          
          feature.sub_features.forEach((subFeature, subIndex) => {
            const hours = subFeature.estimation?.estimated_hours || 0;
            const size = subFeature.estimation?.tshirt_size || 'N/A';
            const reasoning = subFeature.estimation?.reasoning || 'No reasoning provided';
            const description = subFeature.description || 'No description';
            
            markdown += `| ${subIndex + 1} | ${subFeature.name} | ${description} | ${hours}h | ${size} | ${reasoning} |\n`;
          });
          
          markdown += `\n`;
        }
        
        markdown += `---\n\n`;
      });
    }
  });

  // T-shirt Size Guide
  markdown += `## 📏 T-shirt Size Estimation Guide\n\n`;
  markdown += `| Size | Hours | Description |\n`;
  markdown += `|------|-------|-------------|\n`;
  markdown += `| XS | 0.5h | Very simple task (basic CRUD, simple UI) |\n`;
  markdown += `| S | 1h | Simple task (form validation, basic API) |\n`;
  markdown += `| M | 2h | Small task (authentication flow, data processing) |\n`;
  markdown += `| L | 4h | Medium task (complex business logic, integrations) |\n`;
  markdown += `| XL | 8h | Large task (full feature with multiple components) |\n`;
  markdown += `| XXL | 16h | Very large task (complex system integration) |\n`;
  markdown += `| XXXL | 32h | Epic task (major feature with many dependencies) |\n\n`;

  // Project Summary
  markdown += `## 📈 Project Summary\n\n`;
  markdown += `- **Total Estimated Hours:** ${totalHours}h\n`;
  markdown += `- **Total Modules:** ${data.modules.length}\n`;
  markdown += `- **Total Features:** ${totalFeatures}\n`;
  markdown += `- **Total Sub-features:** ${totalSubFeatures}\n\n`;

  // Estimated timeline (assuming 40h work week)
  const workWeeks = Math.ceil(totalHours / 40);
  const workDays = Math.ceil(totalHours / 8);
  
  markdown += `## 📅 Estimated Timeline\n\n`;
  markdown += `- **Work Days (8h/day):** ${workDays} days\n`;
  markdown += `- **Work Weeks (40h/week):** ${workWeeks} weeks\n`;
  markdown += `- **Calendar Months (assuming 20 work days/month):** ${Math.ceil(workDays / 20)} months\n\n`;

  markdown += `---\n\n`;
  markdown += `*Generated by Etalas Estimator on ${timestamp}*\n`;

  return markdown;
}

function getComplexityEmoji(features?: any[]): string {
  if (!features || features.length === 0) return '⚪';
  
  const complexities = features.map(f => f.complexity).filter(Boolean);
  const hasHigh = complexities.includes('high');
  const hasMedium = complexities.includes('medium');
  
  if (hasHigh) return '🔴';
  if (hasMedium) return '🟡';
  return '🟢';
}

function calculateSizeBreakdown(modules: any[]) {
  const breakdown: Record<string, { count: number; hours: number }> = {
    'XS': { count: 0, hours: 0 },
    'S': { count: 0, hours: 0 },
    'M': { count: 0, hours: 0 },
    'L': { count: 0, hours: 0 },
    'XL': { count: 0, hours: 0 },
    'XXL': { count: 0, hours: 0 },
    'XXXL': { count: 0, hours: 0 }
  };
  
  modules.forEach(module => {
    module.features?.forEach((feature: any) => {
      feature.sub_features?.forEach((subFeature: any) => {
        if (subFeature.estimation) {
          const size = subFeature.estimation.tshirt_size;
          const hours = subFeature.estimation.estimated_hours || 0;
          
          if (breakdown[size]) {
            breakdown[size].count++;
            breakdown[size].hours += hours;
          } else {
            // Handle unknown sizes
            if (!breakdown['Other']) {
              breakdown['Other'] = { count: 0, hours: 0 };
            }
            breakdown['Other'].count++;
            breakdown['Other'].hours += hours;
          }
        }
      });
    });
  });
  
  return breakdown;
}

export function downloadMarkdownFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}