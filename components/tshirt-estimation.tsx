"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { OptimisticLevel } from "@/lib/estimation-utils";
import { useToast } from "@/hooks/use-toast";

interface TShirtEstimationProps {
  projectId: string;
  moduleVersion?: any;
  onEstimationUpdate?: (estimation: any) => void;
}

interface EstimationData {
  scenario: OptimisticLevel;
  team_velocity: number;
  adjustments: Record<string, any>;
  totals: {
    original_hours: number;
    adjusted_hours: number;
    estimated_sprints: number;
    estimated_weeks: number;
  };
}

export function TShirtEstimation({
  projectId,
  moduleVersion,
  onEstimationUpdate,
}: TShirtEstimationProps) {
  const [selectedLevel, setSelectedLevel] =
    useState<OptimisticLevel>("realistic");
  const [teamVelocity, setTeamVelocity] = useState(20);
  const [estimation, setEstimation] = useState<EstimationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  // Load estimation preview when level or velocity changes
  useEffect(() => {
    if (moduleVersion) {
      loadEstimationPreview();
    }
  }, [selectedLevel, teamVelocity, moduleVersion]);

  const loadEstimationPreview = async () => {
    if (!moduleVersion) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        versionId: moduleVersion.id,
        optimisticLevel: selectedLevel,
        teamVelocity: teamVelocity.toString(),
      });

      const response = await fetch(
        `/api/projects/${projectId}/adjust-estimation?${params}`
      );
      const data = await response.json();

      if (data.success) {
        setEstimation(data.estimation);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load estimation preview",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading estimation preview:", error);
      toast({
        title: "Error",
        description: "Failed to load estimation preview",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyEstimation = async () => {
    if (!moduleVersion) return;

    setIsApplying(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/adjust-estimation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            optimisticLevel: selectedLevel,
            teamVelocity,
            versionId: moduleVersion.id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Estimation applied successfully",
        });

        if (onEstimationUpdate) {
          onEstimationUpdate(data);
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to apply estimation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error applying estimation:", error);
      toast({
        title: "Error",
        description: "Failed to apply estimation",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const getLevelColor = (level: OptimisticLevel) => {
    switch (level) {
      case "optimistic":
        return "bg-green-100 text-green-800 border-green-200";
      case "realistic":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pessimistic":
        return "bg-orange-100 text-orange-800 border-orange-200";
    }
  };

  const getLevelDescription = (level: OptimisticLevel) => {
    switch (level) {
      case "optimistic":
        return "Best case scenario - ideal conditions, no blockers";
      case "realistic":
        return "Most likely scenario - normal development conditions";
      case "pessimistic":
        return "Worst case scenario - accounting for unknowns and challenges";
    }
  };

  if (!moduleVersion) {
    return (
      <Alert>
        <AlertDescription>
          No module version available. Please generate modules first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 T-Shirt Size Estimation
            <Badge variant="outline">v{moduleVersion.version}</Badge>
          </CardTitle>
          <CardDescription>
            Adjust your project estimation based on different scenarios using
            T-shirt sizes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Team Velocity Setting */}
          <div className="space-y-2">
            <Label htmlFor="team-velocity">
              Team Velocity (hours per sprint)
            </Label>
            <Input
              id="team-velocity"
              type="number"
              value={teamVelocity}
              onChange={(e) => setTeamVelocity(parseInt(e.target.value) || 20)}
              min="1"
              max="100"
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              How many hours your team typically completes per sprint
            </p>
          </div>

          {/* Optimistic Level Selection */}
          <Tabs
            value={selectedLevel}
            onValueChange={(value) =>
              setSelectedLevel(value as OptimisticLevel)
            }
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="optimistic" className="text-green-700">
                Optimistic
              </TabsTrigger>
              <TabsTrigger value="realistic" className="text-blue-700">
                Realistic
              </TabsTrigger>
              <TabsTrigger value="pessimistic" className="text-orange-700">
                Pessimistic
              </TabsTrigger>
            </TabsList>

            <TabsContent value="optimistic" className="space-y-4">
              <div
                className={`p-4 rounded-lg border ${getLevelColor(
                  "optimistic"
                )}`}
              >
                <h4 className="font-semibold mb-2">🚀 Optimistic Scenario</h4>
                <p className="text-sm">{getLevelDescription("optimistic")}</p>
              </div>
            </TabsContent>

            <TabsContent value="realistic" className="space-y-4">
              <div
                className={`p-4 rounded-lg border ${getLevelColor(
                  "realistic"
                )}`}
              >
                <h4 className="font-semibold mb-2">⚖️ Realistic Scenario</h4>
                <p className="text-sm">{getLevelDescription("realistic")}</p>
              </div>
            </TabsContent>

            <TabsContent value="pessimistic" className="space-y-4">
              <div
                className={`p-4 rounded-lg border ${getLevelColor(
                  "pessimistic"
                )}`}
              >
                <h4 className="font-semibold mb-2">⚠️ Pessimistic Scenario</h4>
                <p className="text-sm">{getLevelDescription("pessimistic")}</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Estimation Results */}
          {estimation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {estimation.totals.adjusted_hours}h
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Hours
                    </p>
                    {estimation.totals.original_hours !==
                      estimation.totals.adjusted_hours && (
                      <p className="text-xs text-muted-foreground">
                        Original: {estimation.totals.original_hours}h
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {estimation.totals.adjusted_hours}h
                    </div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    {estimation.totals.original_hours !==
                      estimation.totals.adjusted_hours && (
                      <p className="text-xs text-muted-foreground">
                        Original: {estimation.totals.original_hours}h
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {estimation.totals.estimated_sprints}
                    </div>
                    <p className="text-sm text-muted-foreground">Sprints</p>
                    <p className="text-xs text-muted-foreground">
                      @ {teamVelocity} pts/sprint
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {estimation.totals.estimated_weeks}w
                    </div>
                    <p className="text-sm text-muted-foreground">Weeks</p>
                    <p className="text-xs text-muted-foreground">
                      2-week sprints
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Visualization */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress Estimation</span>
                  <span>
                    {Math.round(
                      (estimation.totals.adjusted_hours /
                        (estimation.totals.adjusted_hours + 40)) *
                        100
                    )}
                    % complexity
                  </span>
                </div>
                <Progress
                  value={
                    (estimation.totals.adjusted_hours /
                      (estimation.totals.adjusted_hours + 40)) *
                    100
                  }
                  className="h-2"
                />
              </div>

              {/* Detailed Breakdown */}
              {moduleVersion?.modulesData?.modules && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">📋 Bottom-Up Estimation Breakdown</h3>
                  <p className="text-sm text-muted-foreground">
                    Only sub-features are estimated. Feature and module totals are auto-calculated.
                  </p>
                  
                  {moduleVersion.modulesData.modules.map((module: any) => (
                    <Card key={module.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{module.name}</CardTitle>
                            <CardDescription className="text-sm">{module.description}</CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {module.calculated_hours?.adjusted || 0}h
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Module Total
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {module.features?.map((feature: any) => (
                          <div key={feature.id} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium text-sm">{feature.name}</h4>
                                <p className="text-xs text-muted-foreground">{feature.description}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-green-600">
                                  {feature.calculated_hours?.adjusted || 0}h
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Feature Total
                                </div>
                              </div>
                            </div>
                            
                            {feature.sub_features?.map((subFeature: any) => (
                              <div key={subFeature.id} className="flex justify-between items-center py-1 px-2 bg-white rounded border-l-2 border-l-gray-300">
                                <div className="flex-1">
                                  <span className="text-xs font-medium">{subFeature.name}</span>
                                  <p className="text-xs text-muted-foreground">{subFeature.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {subFeature.estimation && (
                                    <>
                                      <Badge variant="outline" className="text-xs">
                                        {subFeature.estimation.tshirt_size}
                                      </Badge>
                                      <span className="text-xs font-medium text-purple-600">
                                        {estimation?.adjustments[subFeature.id]?.adjusted_hours || subFeature.estimation.estimated_hours}h
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Apply Button */}
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={loadEstimationPreview}
                  variant="outline"
                  disabled={isLoading}
                >
                  {isLoading ? "Refreshing..." : "Refresh Preview"}
                </Button>
                <Button
                  onClick={applyEstimation}
                  disabled={isApplying}
                  className={getLevelColor(selectedLevel)
                    .replace("bg-", "bg-")
                    .replace("text-", "text-white ")}
                >
                  {isApplying
                    ? "Applying..."
                    : `Apply ${
                        selectedLevel.charAt(0).toUpperCase() +
                        selectedLevel.slice(1)
                      } Estimation`}
                </Button>
              </div>
            </div>
          )}

          {isLoading && !estimation && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">
                Loading estimation...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
