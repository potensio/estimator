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