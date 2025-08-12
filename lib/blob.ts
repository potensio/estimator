import { put, del, list } from "@vercel/blob";
import OpenAI from "openai";
import pdf from "pdf-parse";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface BlobUploadResult {
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
}

export async function uploadToBlob(
  file: File,
  filename: string
): Promise<BlobUploadResult> {
  try {
    const blob = await put(filename, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      size: file.size,
    };
  } catch (error) {
    console.error("Error uploading to Vercel Blob:", error);
    throw new Error("Failed to upload file to blob storage");
  }
}

export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (error) {
    console.error("Error deleting from Vercel Blob:", error);
    throw new Error("Failed to delete file from blob storage");
  }
}

export async function listBlobFiles(): Promise<any[]> {
  try {
    const { blobs } = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blobs;
  } catch (error) {
    console.error("Error listing blob files:", error);
    throw new Error("Failed to list blob files");
  }
}

export function getBlobUrl(pathname: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  return `${baseUrl}${pathname}`;
}

export async function readBlobContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob content: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error("Error reading blob content:", error);
    throw new Error("Failed to read file content from blob storage");
  }
}

export async function uploadFileToOpenAI(
  blobUrl: string,
  filename: string
): Promise<string> {
  try {
    // Download file content from blob
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from blob: ${response.statusText}`);
    }

    const fileBuffer = await response.arrayBuffer();
    const file = new File([fileBuffer], filename, {
      type: response.headers.get("content-type") || "application/octet-stream",
    });

    // Upload to OpenAI
    const openaiFile = await openai.files.create({
      file: file,
      purpose: "assistants",
    });

    return openaiFile.id;
  } catch (error) {
    console.error("Error uploading file to OpenAI:", error);
    throw new Error("Failed to upload file to OpenAI");
  }
}

export async function deleteOpenAIFile(fileId: string): Promise<void> {
  try {
    await openai.files.delete(fileId);
  } catch (error) {
    console.error("Error deleting OpenAI file:", error);
    throw new Error("Failed to delete file from OpenAI");
  }
}

export async function analyzeProjectWithOpenAI(
  projectName: string,
  projectDescription: string,
  fileIds: string[],
  requirementsChecklist: any
): Promise<any> {
  try {
    // Create analysis prompt
    const prompt = `
You are a senior business analyst. Analyze the uploaded project documents and extract key information about the project itself.

Project Name: ${projectName}
Project Description: ${projectDescription}

IMPORTANT INSTRUCTIONS:
1. Focus on WHAT THE PROJECT IS and WHAT IT DOES, not on documentation quality
2. Extract actual project details from the uploaded documents
3. If information exists in the documents, give high coverage scores
4. Only mark items as missing if they are truly not mentioned in the documents
5. Write the project summary based on the actual project described in the documents
6. You MUST respond ONLY with valid JSON, no additional text or explanations

Categories to evaluate based on content presence:
- Functional: ${ANALYSIS_CHECKLIST.functional.join(", ")}
- Business: ${ANALYSIS_CHECKLIST.business.join(", ")}
- User Experience: ${ANALYSIS_CHECKLIST.userExperience.join(", ")}
- Scope: ${ANALYSIS_CHECKLIST.scope.join(", ")}

Respond ONLY in this JSON format:
{
  "functionalCoverage": <0-100>,
  "businessCoverage": <0-100>,
  "userExperienceCoverage": <0-100>,
  "scopeCoverage": <0-100>,
  "overallClarity": <0-100>,
  "missingItems": ["list only items that are genuinely not mentioned in the documents"],
  "projectSummary": "Based on the documents provided, describe what this project is about. Include: the main purpose/problem it solves, key features mentioned, target users if specified, technology stack if mentioned, and business objectives if described. Focus on the actual project, not the documentation quality."
}
`;

    // Create assistant with file attachments
    const assistant = await openai.beta.assistants.create({
      name: "Project Analyzer",
      instructions: prompt,
      model: "gpt-5-mini",
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_stores: [{
            file_ids: fileIds
          }]
        }
      }
    });

    // Create thread and run
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: "Please analyze the uploaded project documents according to the instructions."
        }
      ]
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Analysis failed with status: ${runStatus.status}`);
    }

    // Get messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    
    if (!lastMessage || !lastMessage.content[0] || lastMessage.content[0].type !== 'text') {
      throw new Error("No valid response from assistant");
    }

    const content = lastMessage.content[0].text.value;

    // Clean up
    await openai.beta.assistants.delete(assistant.id);

    // Parse JSON response
    let analysisData;
    try {
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      analysisData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse JSON response:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }
    
    return {
      functionalCoverage: analysisData.functionalCoverage || 0,
      businessCoverage: analysisData.businessCoverage || 0,
      userExperienceCoverage: analysisData.userExperienceCoverage || 0,
      scopeCoverage: analysisData.scopeCoverage || 0,
      overallClarity: analysisData.overallClarity || 0,
      missingItems: analysisData.missingItems || [],
      projectSummary: analysisData.projectSummary || "No summary available",
    };
  } catch (error) {
    console.error("Error analyzing project with OpenAI:", error);
    throw new Error("Failed to analyze project with OpenAI");
  }
}

// Timeout wrapper function
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}

// Enhanced generation with retry logic
async function generateWithRetry(prompt: string, fileIds: string[], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(
        generateSingleRequest(prompt, fileIds),
        120000 // 2 minute timeout
      );
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Generate single request to OpenAI
async function generateSingleRequest(prompt: string, fileIds: string[]) {
  let assistant;
  try {
    console.log('Creating OpenAI assistant...');
    assistant = await openai.beta.assistants.create({
      name: "Module Generator",
      instructions: prompt,
      model: "gpt-4o",
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_stores: [{
            file_ids: fileIds
          }]
        }
      }
    });
    console.log('Assistant created:', assistant.id);

    console.log('Creating thread...');
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: "Please generate the requested breakdown based on the uploaded project documents."
        }
      ]
    });
    console.log('Thread created:', thread.id);

    console.log('Starting run...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });
    console.log('Run started:', run.id);

    // Wait for completion with better logging
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes with 1 second intervals
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('OpenAI run exceeded maximum wait time');
      }
      
      if (attempts % 10 === 0) {
        console.log(`Waiting for completion... Status: ${runStatus.status} (${attempts}s)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
    }

    console.log('Run completed with status:', runStatus.status);

    if (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed') {
        console.error('Run failed with error:', runStatus.last_error);
      }
      throw new Error(`Generation failed with status: ${runStatus.status}`);
    }

    console.log('Retrieving messages...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    
    if (!lastMessage || !lastMessage.content[0] || lastMessage.content[0].type !== 'text') {
      throw new Error("No valid response from assistant");
    }

    const content = lastMessage.content[0].text.value;
    console.log('Response received, length:', content.length);

    // Parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonString);
      console.log('JSON parsed successfully');
      return parsed;
    } catch (parseError) {
      console.error("Failed to parse JSON response:", content.substring(0, 500) + '...');
      throw new Error("Invalid JSON response from OpenAI");
    }
  } catch (error) {
    console.error('Error in generateSingleRequest:', error);
    throw error;
  } finally {
    // Clean up assistant
    if (assistant) {
      try {
        await openai.beta.assistants.delete(assistant.id);
        console.log('Assistant cleaned up');
      } catch (cleanupError) {
        console.error('Failed to cleanup assistant:', cleanupError);
      }
    }
  }
}

// Generate modules overview (lightweight)
export async function generateModulesOverview(
  projectName: string,
  projectDescription: string,
  fileIds: string[]
): Promise<any> {
  const prompt = `
You are a senior software architect. Analyze the project and identify ONLY the main modules. Keep it high-level.

Project Name: ${projectName}
Project Description: ${projectDescription}

INSTRUCTIONS:
1. Identify main system modules (e.g., Authentication, Payment, Reporting)
2. Provide brief descriptions for each module
3. Estimate number of features per module
4. Keep it simple and high-level
5. You MUST respond ONLY with valid JSON, no additional text

Respond ONLY in this JSON format:
{
  "modules": [
    {
      "id": "module-001",
      "name": "Module Name",
      "description": "Brief description of what this module handles",
      "estimated_features": 5
    }
  ]
}
`;

  return await generateWithRetry(prompt, fileIds);
}

// Generate detailed features for a specific module
export async function generateModuleDetails(
  moduleId: string,
  moduleName: string,
  moduleDescription: string,
  fileIds: string[]
): Promise<any> {
  const prompt = `
You are a senior software architect. Focus ONLY on module: ${moduleName}
Generate ALL features and sub-features for this specific module.

Module: ${moduleName}
Description: ${moduleDescription}

INSTRUCTIONS:
1. Generate comprehensive features for this module only
2. Break down each feature into specific sub-features
3. Include technical considerations
4. Think like a developer - what needs to be built?
5. Include edge cases and error handling
6. You MUST respond ONLY with valid JSON, no additional text

Respond ONLY in this JSON format:
{
  "id": "${moduleId}",
  "name": "${moduleName}",
  "description": "${moduleDescription}",
  "features": [
    {
      "id": "feature-001",
      "name": "Feature Name",
      "description": "Detailed feature description",
      "complexity": "low|medium|high",
      "sub_features": [
        {
          "id": "sub-001",
          "name": "Sub-feature Name",
          "description": "Specific implementation detail",
          "technical_notes": "Any technical considerations"
        }
      ],
      "dependencies": ["other-feature-ids"],
      "integrations": ["external systems if any"]
    }
  ]
}
`;

  return await generateWithRetry(prompt, fileIds);
}

// Main function for chunked module generation
export async function generateModulesWithOpenAI(
  projectName: string,
  projectDescription: string,
  fileIds: string[]
): Promise<any> {
  try {
    console.log('Starting module generation for project:', projectName);
    console.log('File IDs available:', fileIds.length);
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Step 1: Generate high-level modules first
    console.log('Generating modules overview...');
    let modulesOverview;
    try {
      modulesOverview = await generateModulesOverview(projectName, projectDescription, fileIds);
    } catch (overviewError) {
      console.error('Failed to generate overview, using fallback:', overviewError);
      // Fallback to basic structure
      modulesOverview = {
        modules: [
          {
            id: 'module-001',
            name: 'Core System',
            description: 'Main application functionality',
            estimated_features: 5
          },
          {
            id: 'module-002', 
            name: 'User Management',
            description: 'User authentication and profile management',
            estimated_features: 3
          },
          {
            id: 'module-003',
            name: 'Data Management',
            description: 'Data processing and storage',
            estimated_features: 4
          }
        ]
      };
    }
    
    if (!modulesOverview || !modulesOverview.modules || modulesOverview.modules.length === 0) {
      throw new Error('Failed to generate modules overview or no modules found');
    }
    
    console.log(`Generated ${modulesOverview.modules.length} modules overview`);
    
    // Step 2: Generate detailed features for each module separately
    const detailedModules = [];
    const failedModules = [];
    
    for (let i = 0; i < modulesOverview.modules.length; i++) {
      const module = modulesOverview.modules[i];
      try {
        console.log(`Generating details for module ${i + 1}/${modulesOverview.modules.length}: ${module.name}`);
        const detailedModule = await generateModuleDetails(
          module.id,
          module.name,
          module.description,
          fileIds
        );
        detailedModules.push(detailedModule);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (moduleError) {
        console.error(`Failed to generate details for module ${module.name}:`, moduleError);
        failedModules.push(module.name);
        
        // Add basic module structure as fallback
        detailedModules.push({
          id: module.id,
          name: module.name,
          description: module.description,
          features: [
            {
              id: `${module.id}_basic_001`,
              name: `${module.name} Core Features`,
              description: `Essential functionality for ${module.name}`,
              complexity: 'medium',
              sub_features: [
                {
                  id: `${module.id}_sub_001`,
                  name: 'Basic Implementation',
                  description: 'Core implementation requirements',
                  technical_notes: 'Standard implementation approach'
                }
              ],
              dependencies: [],
              integrations: []
            },
            {
              id: `${module.id}_basic_002`,
              name: `${module.name} Configuration`,
              description: `Configuration and setup for ${module.name}`,
              complexity: 'low',
              sub_features: [
                {
                  id: `${module.id}_sub_002`,
                  name: 'Configuration Setup',
                  description: 'Initial configuration requirements',
                  technical_notes: 'Configuration management'
                }
              ],
              dependencies: [],
              integrations: []
            }
          ],
          complexity: 'medium',
          dependencies: [],
          technical_notes: 'Details generation failed - comprehensive fallback structure provided'
        });
      }
    }
    
    const result = {
      modules: detailedModules,
      metadata: {
        generated_at: new Date().toISOString(),
        total_modules: detailedModules.length,
        project_name: projectName,
        failed_modules: failedModules,
        generation_status: failedModules.length > 0 ? 'partial_success' : 'success',
        fallback_used: failedModules.length > 0
      }
    };
    
    console.log('Module generation completed:', {
      total: detailedModules.length,
      failed: failedModules.length,
      status: result.metadata.generation_status
    });
    
    return result;
  } catch (error) {
    console.error('Error in chunked module generation:', error);
    
    // Ultimate fallback - return basic structure
    console.log('Using ultimate fallback structure');
    return {
      modules: [
        {
          id: 'fallback-001',
          name: 'Application Core',
          description: 'Main application functionality and business logic',
          features: [
            {
              id: 'fallback-001-f001',
              name: 'Core Business Logic',
              description: 'Essential business rules and processing',
              complexity: 'high',
              sub_features: [
                {
                  id: 'fallback-001-sf001',
                  name: 'Business Rule Engine',
                  description: 'Implementation of core business rules',
                  technical_notes: 'Requires careful design and testing'
                }
              ],
              dependencies: [],
              integrations: []
            }
          ],
          complexity: 'high',
          dependencies: [],
          technical_notes: 'Fallback structure - requires manual refinement'
        },
        {
          id: 'fallback-002',
          name: 'User Interface',
          description: 'User interface components and interactions',
          features: [
            {
              id: 'fallback-002-f001',
              name: 'UI Components',
              description: 'Reusable user interface components',
              complexity: 'medium',
              sub_features: [
                {
                  id: 'fallback-002-sf001',
                  name: 'Component Library',
                  description: 'Standardized UI component set',
                  technical_notes: 'Follow design system guidelines'
                }
              ],
              dependencies: [],
              integrations: []
            }
          ],
          complexity: 'medium',
          dependencies: ['fallback-001'],
          technical_notes: 'Fallback structure - requires manual refinement'
        }
      ],
      metadata: {
        generated_at: new Date().toISOString(),
        total_modules: 2,
        project_name: projectName,
        failed_modules: [],
        generation_status: 'fallback',
        fallback_used: true,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}



const ANALYSIS_CHECKLIST = {
  functional: [
    "User roles and permissions",
    "Core features and functionality", 
    "Integration requirements"
  ],
  business: [
    "Target users and personas",
    "Business objectives and goals"
  ],
  userExperience: [
    "User interface requirements",
    "Device requirements"
  ],
  scope: [
    "Project timeline and phases",
    "Risk factors",
    "Dependencies and assumptions"
  ]
};