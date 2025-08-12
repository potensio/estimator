"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "./ui/button";
import { CopyIcon, ChartNoAxesGantt, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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
  };

  const handleFormatJson = () => {
    if (isValid) {
      try {
        const parsed = JSON.parse(jsonValue);
        setJsonValue(JSON.stringify(parsed, null, 2));
      } catch (err) {
        // Do nothing if invalid
      }
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

      toast({
        title: "Success",
        description: "Modules and features generated successfully!",
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
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-0">
        <div className="mb-4 flex items-center justify-between px-6 pt-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">JSON Editor</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className={`h-2 w-2 rounded-full ${
                  isValid ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              {isValid ? "Valid" : "Invalid JSON"}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant={"secondary"}>
              <ChartNoAxesGantt />
            </Button>
            <Button variant={"secondary"}>
              <CopyIcon />
            </Button>
            {projectId && (
              <Button
                variant="outline"
                onClick={handleGenerateModules}
                disabled={isGenerating}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate Modules"}
              </Button>
            )}
            <Button>Save Changes</Button>
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
                fontSize: 14,
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
