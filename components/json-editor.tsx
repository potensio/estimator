"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "./ui/button";
import { CopyIcon, ChartNoAxesGantt } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

interface JsonEditorProps {
  data: any;
  onCopy?: () => void;
}

export function JsonEditor({ data, onCopy }: JsonEditorProps) {
  const [jsonValue, setJsonValue] = useState(JSON.stringify(data, null, 2));
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState("");

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

  const handleSaveChanges = () => {
    if (isValid) {
      console.log("Saving changes:", JSON.parse(jsonValue));
    }
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
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              onClick={handleCopyJson}
            >
              Copy JSON
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
              onClick={handleSaveChanges}
            >
              Save Changes
            </button>
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
