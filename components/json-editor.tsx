"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "./ui/button";
import {
  CopyIcon,
  ChartNoAxesGantt,
  Sparkles,
  History,
  ChevronDown,
  Loader2,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { convertModulesToMarkdown, downloadMarkdownFile, type ModuleData } from "@/lib/markdown-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { formatDistanceToNow } from "date-fns";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

interface JsonEditorProps {
  data: any;
  onCopy?: () => void;
  projectId?: string;
  onGenerate?: (data: any) => void;
}

export function JsonEditor({
  data,
  onCopy,
  projectId,
  onGenerate,
}: JsonEditorProps) {
  const [jsonValue, setJsonValue] = useState(JSON.stringify(data, null, 2));
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [projectName, setProjectName] = useState<string>("");
  const { toast } = useToast();

  // Add beforeunload warning when generation is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault();
        e.returnValue =
          "Module generation is in progress. Are you sure you want to leave?";
        return "Module generation is in progress. Are you sure you want to leave?";
      }
    };

    if (isGenerating) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isGenerating]);

  // Load existing module versions when component mounts
  useEffect(() => {
    if (projectId) {
      loadModuleVersions();
      loadProjectName();
    }
  }, [projectId]);

  const loadModuleVersions = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/module-versions`
      );
      if (response.ok) {
        const result = await response.json();
        setVersions(result.versions || []);
        setActiveVersionId(result.activeVersionId);

        // Load latest version by default if no active version
        if (result.versions.length > 0) {
          const targetVersion = result.activeVersionId 
            ? result.versions.find((v: any) => v.id === result.activeVersionId)
            : result.versions[0]; // Load latest version (first in array)
          
          if (targetVersion?.modulesData) {
            setJsonValue(JSON.stringify(targetVersion.modulesData, null, 2));
            setActiveVersionId(targetVersion.id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading module versions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectName = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const project = await response.json();
        setProjectName(project.name || "Untitled Project");
      }
    } catch (error) {
      console.error("Error loading project name:", error);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    setJsonValue(newValue);
    try {
      JSON.parse(newValue);
      setIsValid(true);
      setError("");
    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonValue);
    toast({
      title: "Success",
      description: "JSON copied to clipboard!",
    });
  };

  const exportToMarkdown = () => {
     try {
       if (!jsonValue) {
         toast({
           title: "Error",
           description: "No data to export",
           variant: "destructive",
         });
         return;
       }
 
       const parsedData = JSON.parse(jsonValue);
       const moduleData = {
         modules: parsedData.modules || [],
         metadata: {
           generated_at: new Date().toISOString(),
           total_modules: parsedData.modules?.length || 0,
           project_name: projectName
         }
       };

       const markdownContent = convertModulesToMarkdown(moduleData, projectName);
       const timestamp = new Date().toISOString().split('T')[0];
       const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_estimation_${timestamp}.md`;
       
       downloadMarkdownFile(markdownContent, filename);
       
       toast({
         title: "Success",
         description: "Markdown file downloaded successfully!",
       });
     } catch (error) {
       console.error("Error exporting to markdown:", error);
       toast({
         title: "Error",
         description: "Failed to export to markdown",
         variant: "destructive",
       });
     }
   };

  const handleFormatJson = () => {
    if (isValid) {
      try {
        const parsed = JSON.parse(jsonValue);
        setJsonValue(JSON.stringify(parsed, null, 2));
        toast({
          title: "Success",
          description: "JSON formatted successfully!",
        });
      } catch (err) {
        // Do nothing if invalid
      }
    }
  };

  const handleUpdateCurrentVersion = async () => {
    if (!projectId || !activeVersionId) {
      toast({
        title: "Error",
        description: "No active version to update",
        variant: "destructive",
      });
      return;
    }

    if (!isValid) {
      toast({
        title: "Error",
        description: "Cannot save invalid JSON",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const parsedData = JSON.parse(jsonValue);

      const response = await fetch(
        `/api/projects/${projectId}/module-versions/${activeVersionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            modulesData: parsedData,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Update failed:", errorData);
        throw new Error(errorData.error || "Failed to update version");
      }

      const result = await response.json();
      console.log("Update successful:", result);

      // Refresh versions list
      await loadModuleVersions();

      toast({
        title: "Success",
        description: "Version updated successfully!",
      });

      return result;
    } catch (error) {
      console.error("Error updating version:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update version",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchVersion = async (versionId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/module-versions/${versionId}/activate`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to switch version");
      }

      // Find and load the selected version
      const selectedVersion = versions.find((v) => v.id === versionId);
      if (selectedVersion?.modulesData) {
        setJsonValue(JSON.stringify(selectedVersion.modulesData, null, 2));
        setActiveVersionId(versionId);

        toast({
          title: "Success",
          description: `Switched to ${
            selectedVersion.name || `Version ${selectedVersion.version}`
          }`,
        });
      }
    } catch (error) {
      console.error("Error switching version:", error);
      toast({
        title: "Error",
        description: "Failed to switch version",
        variant: "destructive",
      });
    }
  };

  const handleGenerateModules = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Project ID is required for module generation",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/generate-epics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate modules");
      }

      const result = await response.json();
      const generatedData = result.modules;

      // Update the JSON editor with generated data
      setJsonValue(JSON.stringify(generatedData, null, 2));

      // Call onGenerate callback if provided
      if (onGenerate) {
        onGenerate(generatedData);
      }

      // Refresh versions list to show the newly saved version
      await loadModuleVersions();

      // Auto-select the latest version (the one just generated)
      if (result.version?.id) {
        setActiveVersionId(result.version.id);
      }

      toast({
        title: "Success",
        description:
          result.message || "Modules generated and saved successfully!",
      });

      console.log("Generated modules saved:", {
        versionId: result.version?.id,
        version: result.version?.version,
        name: result.version?.name,
      });
    } catch (error) {
      console.error("Error generating modules:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate modules",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm relative">
      {/* Loading Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center">
              <p className="font-medium text-gray-900">Generating Modules</p>
              <p className="text-sm text-gray-500">This may take a few moments...</p>
            </div>
          </div>
        </div>
      )}
      <div className="p-0">
        <div className="mb-4 flex items-center justify-between px-6 pt-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">JSON Editor</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className={`h-2 w-2 rounded-full ${
                  isLoading
                    ? "bg-yellow-500"
                    : isValid
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              ></div>
              {isLoading ? "Loading..." : isValid ? "Valid" : "Invalid JSON"}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={"secondary"}
              onClick={handleFormatJson}
              disabled={!isValid}
              title="Format JSON"
            >
              <ChartNoAxesGantt className="h-4 w-4" />
            </Button>
            <Button 
              variant={"secondary"} 
              onClick={handleCopyJson}
              title="Copy JSON"
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={"secondary"}
              onClick={exportToMarkdown}
              title="Export to Markdown"
              disabled={!isValid || !jsonValue}
            >
              <FileText className="h-4 w-4" />
            </Button>
            {projectId && versions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isLoading}>
                    <History className="h-4 w-4" />
                    {`v.${versions.find((v) => v.id === activeVersionId)?.version || "Current"}`}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {versions.map((version) => (
                    <DropdownMenuItem
                      key={version.id}
                      onClick={() => handleSwitchVersion(version.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          v.{version.version}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {version.id === activeVersionId && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {projectId && (
              <Button
                variant="outline"
                onClick={handleGenerateModules}
                disabled={isGenerating || isLoading}
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate Modules"}
              </Button>
            )}
            <Button
              onClick={handleUpdateCurrentVersion}
              disabled={isSaving || !isValid || isLoading || !projectId || !activeVersionId}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
        <div className="bg-black overflow-hidden">
          <div className="h-[calc(100vh-160px)] w-full">
            <MonacoEditor
              height="100%"
              language="json"
              value={jsonValue}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
                tabSize: 2,
                insertSpaces: true,
              }}
            />
          </div>
        </div>
        {!isValid && error && (
          <div className="mt-2 p-3 rounded-md bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              Invalid JSON: {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
