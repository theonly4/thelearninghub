import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrainingAssignmentDialog } from "@/components/admin/TrainingAssignmentDialog";
import {
  BookOpen,
  Package,
  Clock,
  Users,
  FileText,
  Loader2,
  Send,
} from "lucide-react";
import { WORKFORCE_GROUP_LABELS, WorkforceGroup } from "@/types/hipaa";

interface TrainingMaterial {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  workforce_groups: WorkforceGroup[];
  sequence_number: number;
}

interface QuizPackage {
  id: string;
  name: string;
  description: string | null;
  workforce_group: WorkforceGroup;
  training_year: number;
  question_count: number;
}

export default function TrainingLibraryPage() {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [packages, setPackages] = useState<QuizPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    fetchLibrary();
  }, []);

  async function fetchLibrary() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get admin's profile and organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, first_name, last_name")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      setOrganizationId(profile.organization_id);
      setUserName(`${profile.first_name} ${profile.last_name}`);

      // Fetch released training materials
      const { data: contentReleases } = await supabase
        .from("content_releases")
        .select("content_id")
        .eq("organization_id", profile.organization_id)
        .eq("content_type", "training_material");

      const releasedMaterialIds = contentReleases?.map((r) => r.content_id) || [];

      if (releasedMaterialIds.length > 0) {
        const { data: materialsData } = await supabase
          .from("training_materials")
          .select("id, title, description, estimated_minutes, workforce_groups, sequence_number")
          .in("id", releasedMaterialIds)
          .order("sequence_number");

        setMaterials(
          (materialsData || []).map((m) => ({
            ...m,
            workforce_groups: m.workforce_groups as WorkforceGroup[],
          }))
        );
      }

      // Fetch released quiz packages
      const { data: packageReleases } = await supabase
        .from("package_releases")
        .select(`
          package_id,
          workforce_group,
          training_year,
          question_packages (id, name, description)
        `)
        .eq("organization_id", profile.organization_id);

      if (packageReleases && packageReleases.length > 0) {
        // Get question counts
        const packageIds = packageReleases.map((pr: any) => pr.package_id);
        const { data: questionCounts } = await supabase
          .from("package_questions")
          .select("package_id")
          .in("package_id", packageIds);

        const countMap: Record<string, number> = {};
        questionCounts?.forEach((q) => {
          countMap[q.package_id] = (countMap[q.package_id] || 0) + 1;
        });

        setPackages(
          packageReleases.map((pr: any) => ({
            id: pr.package_id,
            name: pr.question_packages?.name || "Quiz Package",
            description: pr.question_packages?.description || null,
            workforce_group: pr.workforce_group as WorkforceGroup,
            training_year: pr.training_year,
            question_count: countMap[pr.package_id] || 0,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching library:", error);
      toast.error("Failed to load training library");
    } finally {
      setIsLoading(false);
    }
  }

  const totalMinutes = materials.reduce((sum, m) => sum + m.estimated_minutes, 0);

  if (isLoading) {
    return (
      <DashboardLayout userRole="org_admin" userName={userName}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="org_admin" userName={userName}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Training Library
            </h1>
            <p className="text-muted-foreground">
              Content released to your organization for assignment
            </p>
          </div>
          <Button onClick={() => setAssignDialogOpen(true)} className="gap-2">
            <Send className="h-4 w-4" />
            Assign Training
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Training Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{materials.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Quiz Packages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{packages.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Total Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMinutes} min</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Workforce Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set([
                  ...materials.flatMap((m) => m.workforce_groups),
                  ...packages.map((p) => p.workforce_group),
                ]).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="materials">
          <TabsList>
            <TabsTrigger value="materials" className="gap-2">
              <FileText className="h-4 w-4" />
              Materials ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="packages" className="gap-2">
              <Package className="h-4 w-4" />
              Quiz Packages ({packages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materials" className="mt-4">
            {materials.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Training Materials</h3>
                  <p className="text-sm text-muted-foreground">
                    No training materials have been released to your organization yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {materials.map((material) => (
                  <Card key={material.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{material.title}</CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {material.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">{material.estimated_minutes} min</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {material.workforce_groups.map((group) => (
                          <Badge key={group} variant="secondary" className="text-xs">
                            {WORKFORCE_GROUP_LABELS[group]}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="packages" className="mt-4">
            {packages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Quiz Packages</h3>
                  <p className="text-sm text-muted-foreground">
                    No quiz packages have been released to your organization yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {packages.map((pkg) => (
                  <Card key={pkg.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{pkg.name}</CardTitle>
                          {pkg.description && (
                            <CardDescription className="line-clamp-2 mt-1">
                              {pkg.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant="outline">{pkg.training_year}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {WORKFORCE_GROUP_LABELS[pkg.workforce_group]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {pkg.question_count} questions
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TrainingAssignmentDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        organizationId={organizationId || undefined}
        onSuccess={fetchLibrary}
      />
    </DashboardLayout>
  );
}
