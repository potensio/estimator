"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, RefreshCcw, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Analysis {
  functionalCoverage: number;
  businessCoverage: number;
  userExperienceCoverage: number;
  scopeCoverage: number;
  overallClarity: number;
  missingItems: string[];
  summary: string;
}

type ProjectAnalysisProps = {
  projectId: string;
  hasFiles: boolean;
};

export function ProjectAnalysis({ projectId, hasFiles }: ProjectAnalysisProps) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/analyze`);
      const data = await response.json();

      if (data.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
      toast({
        title: "Error",
        description: "Failed to fetch analysis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setAnalysis(data.analysis);

      toast({
        title: "Analysis Complete",
        description: "Project analysis has been completed successfully",
      });
    } catch (error) {
      console.error("Error running analysis:", error);
      toast({
        title: "Error",
        description: "Failed to analyze project",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (hasFiles) {
      fetchAnalysis();
    }
  }, [projectId, hasFiles]);

  if (!hasFiles) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            No Files Uploaded
          </CardTitle>
          <CardDescription>
            Upload project documents to get started with analysis
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Analysis
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Analysis</CardTitle>
          <CardDescription>
            Analyze your project documents to get insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runAnalysis} disabled={analyzing} className="w-full">
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Run Analysis"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Project Overview</CardTitle>

          <Button
            variant="outline"
            size="sm"
            onClick={runAnalysis}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Re-analyzing...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Re-analyze
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {analysis.summary && (
            <div className="space-y-2">
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {analysis.summary}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requirements Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  Functional Requirements
                </span>
              </div>
              <span className="text-sm font-semibold">
                {analysis.functionalCoverage}%
              </span>
            </div>
            <Progress value={analysis.functionalCoverage} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  Business Requirements
                </span>
              </div>
              <span className="text-sm font-semibold">
                {analysis.businessCoverage}%
              </span>
            </div>
            <Progress value={analysis.businessCoverage} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">User Experience</span>
              </div>
              <span className="text-sm font-semibold">
                {analysis.userExperienceCoverage}%
              </span>
            </div>
            <Progress value={analysis.userExperienceCoverage} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Project Scope</span>
              </div>
              <span className="text-sm font-semibold">
                {analysis.scopeCoverage}%
              </span>
            </div>
            <Progress value={analysis.scopeCoverage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Missing Information */}
      {analysis.missingItems && analysis.missingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Missing Information ({analysis.missingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.missingItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200"
                >
                  <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800 font-medium">{item}</p>
                  </div>
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
