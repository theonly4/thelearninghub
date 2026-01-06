import { useState, useEffect } from "react";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Send, 
  Building2, 
  FileQuestion,
  BookOpen,
  CheckCircle2,
  Calendar,
  Package,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { WORKFORCE_GROUP_LABELS, WorkforceGroup } from "@/types/hipaa";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface ContentRelease {
  id: string;
  organization_id: string;
  content_type: "quiz" | "training_material";
  content_id: string;
  released_at: string;
  notes: string | null;
}

interface PackageRelease {
  id: string;
  package_id: string;
  organization_id: string;
  workforce_group: string;
  training_year: number;
  released_at: string;
  notes: string | null;
  package_name?: string;
  package_description?: string;
}

interface QuestionPackage {
  id: string;
  name: string;
  workforce_group: WorkforceGroup;
  sequence_number: number;
  question_count?: number;
}

interface TrainingMaterial {
  id: string;
  title: string;
  sequence_number: number;
  workforce_groups: WorkforceGroup[];
}

interface PackageQuestion {
  id: string;
  question_id: string;
  question_text: string;
  question_number: number;
  hipaa_section: string;
}

const WORKFORCE_GROUPS: WorkforceGroup[] = ["all_staff", "clinical", "administrative", "management", "it"];

export default function ContentReleasesPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [releases, setReleases] = useState<ContentRelease[]>([]);
  const [packageReleases, setPackageReleases] = useState<PackageRelease[]>([]);
  const [packages, setPackages] = useState<QuestionPackage[]>([]);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  
  // Package viewer state
  const [selectedPackageRelease, setSelectedPackageRelease] = useState<PackageRelease | null>(null);
  const [packageQuestions, setPackageQuestions] = useState<PackageQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [packageViewerOpen, setPackageViewerOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [orgsRes, releasesRes, packageReleasesRes, packagesRes, materialsRes] = await Promise.all([
        supabase.from("organizations").select("id, name, slug").neq("slug", "platform-owner").order("name"),
        supabase.from("content_releases").select("*").order("released_at", { ascending: false }),
        supabase
          .from("package_releases")
          .select("id, package_id, organization_id, workforce_group, training_year, released_at, notes, question_packages(name)")
          .order("released_at", { ascending: false }),
        supabase.from("question_packages").select("id, name, workforce_group, sequence_number").order("workforce_group").order("sequence_number"),
        supabase.from("training_materials").select("id, title, sequence_number, workforce_groups").order("sequence_number"),
      ]);

      if (orgsRes.error) throw orgsRes.error;
      if (releasesRes.error) throw releasesRes.error;
      if (packageReleasesRes.error) throw packageReleasesRes.error;
      if (packagesRes.error) throw packagesRes.error;
      if (materialsRes.error) throw materialsRes.error;

      setOrganizations(orgsRes.data || []);
      setReleases((releasesRes.data || []) as ContentRelease[]);
      
      // Map package releases with package names
      const mappedPackageReleases = (packageReleasesRes.data || []).map((pr: any) => ({
        id: pr.id,
        package_id: pr.package_id,
        organization_id: pr.organization_id,
        workforce_group: pr.workforce_group,
        training_year: pr.training_year,
        released_at: pr.released_at,
        notes: pr.notes,
        package_name: pr.question_packages?.name || "Unknown Package",
      }));
      setPackageReleases(mappedPackageReleases);
      
      // Get question counts for packages
      const packagesWithCounts = await Promise.all(
        (packagesRes.data || []).map(async (pkg) => {
          const { count } = await supabase
            .from("package_questions")
            .select("*", { count: "exact", head: true })
            .eq("package_id", pkg.id);
          return { ...pkg, question_count: count || 0, workforce_group: pkg.workforce_group as WorkforceGroup };
        })
      );
      setPackages(packagesWithCounts);
      
      setMaterials(
        (materialsRes.data || []).map((m) => ({
          ...m,
          workforce_groups: m.workforce_groups as WorkforceGroup[],
        }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function getContentTitle(contentType: string, contentId: string) {
    return materials.find((m) => m.id === contentId)?.title || "Unknown Material";
  }

  function getOrgName(orgId: string) {
    return organizations.find((o) => o.id === orgId)?.name || "Unknown Organization";
  }

  function getOrgPackageCount(orgId: string) {
    return packageReleases.filter((r) => r.organization_id === orgId).length;
  }

  function getOrgMaterialCount(orgId: string) {
    return releases.filter((r) => r.organization_id === orgId && r.content_type === "training_material").length;
  }

  async function handleViewPackage(release: PackageRelease) {
    setSelectedPackageRelease(release);
    setPackageViewerOpen(true);
    setLoadingQuestions(true);
    
    try {
      const { data, error } = await supabase
        .from("package_questions")
        .select(`
          id,
          question_id,
          quiz_questions (
            question_text,
            question_number,
            hipaa_section
          )
        `)
        .eq("package_id", release.package_id);
      
      if (error) throw error;
      
      const formattedQuestions: PackageQuestion[] = (data || []).map((pq: any) => ({
        id: pq.id,
        question_id: pq.question_id,
        question_text: pq.quiz_questions?.question_text || "Unknown question",
        question_number: pq.quiz_questions?.question_number || 0,
        hipaa_section: pq.quiz_questions?.hipaa_section || "Unknown",
      })).sort((a, b) => a.question_number - b.question_number);
      
      setPackageQuestions(formattedQuestions);
    } catch (error) {
      console.error("Error fetching package questions:", error);
      toast.error("Failed to load package questions");
    } finally {
      setLoadingQuestions(false);
    }
  }

  return (
    <PlatformOwnerLayout userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Content Releases</h2>
            <p className="text-muted-foreground">
              Release question packages and training materials to organizations.
            </p>
          </div>
          <Dialog open={isReleaseDialogOpen} onOpenChange={setIsReleaseDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Release Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <UnifiedReleaseForm
                organizations={organizations}
                packages={packages}
                materials={materials}
                existingPackageReleases={packageReleases}
                existingContentReleases={releases}
                onSuccess={() => {
                  setIsReleaseDialogOpen(false);
                  fetchData();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Organization Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading organizations...
              </CardContent>
            </Card>
          ) : organizations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No organizations found.
              </CardContent>
            </Card>
          ) : (
            organizations.map((org) => (
              <Card 
                key={org.id} 
                className={`cursor-pointer transition-all hover:border-accent/50 ${
                  selectedOrg === org.id ? "border-accent ring-1 ring-accent/20" : ""
                }`}
                onClick={() => setSelectedOrg(selectedOrg === org.id ? null : org.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardDescription>/{org.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{getOrgPackageCount(org.id)}</span>
                      <span className="text-xs text-muted-foreground">packages</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">{getOrgMaterialCount(org.id)}</span>
                      <span className="text-xs text-muted-foreground">materials</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Release History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedOrg ? `Releases for ${getOrgName(selectedOrg)}` : "All Releases"}
            </CardTitle>
            <CardDescription>
              {selectedOrg 
                ? "Content released to this organization" 
                : "Click on an organization above to filter, or view all releases below"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Package Releases */}
                {packageReleases
                  .filter((r) => !selectedOrg || r.organization_id === selectedOrg)
                  .map((release) => (
                    <TableRow key={`pkg-${release.id}`} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {release.package_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary text-primary">
                          <Package className="h-3 w-3 mr-1" /> Package
                        </Badge>
                      </TableCell>
                      <TableCell>{getOrgName(release.organization_id)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          <span className="capitalize">{release.workforce_group.replace("_", " ")}</span>
                          <span className="mx-1">•</span>
                          <span>{release.training_year}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(release.released_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {release.notes || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewPackage(release)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                {/* Content Releases */}
                {releases
                  .filter((r) => !selectedOrg || r.organization_id === selectedOrg)
                  .map((release) => (
                    <TableRow key={`content-${release.id}`}>
                      <TableCell className="font-medium">
                        {getContentTitle(release.content_type, release.content_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <BookOpen className="h-3 w-3 mr-1" /> Material
                        </Badge>
                      </TableCell>
                      <TableCell>{getOrgName(release.organization_id)}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(release.released_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {release.notes || "—"}
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                {releases.filter((r) => !selectedOrg || r.organization_id === selectedOrg).length === 0 &&
                  packageReleases.filter((r) => !selectedOrg || r.organization_id === selectedOrg).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No releases found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Package Questions Viewer Sheet */}
      <Sheet open={packageViewerOpen} onOpenChange={setPackageViewerOpen}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {selectedPackageRelease?.package_name}
            </SheetTitle>
            <SheetDescription>
              {selectedPackageRelease && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="secondary">
                    {WORKFORCE_GROUP_LABELS[selectedPackageRelease.workforce_group as WorkforceGroup] || selectedPackageRelease.workforce_group}
                  </Badge>
                  <Badge variant="outline">{selectedPackageRelease.training_year}</Badge>
                </div>
              )}
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-180px)] mt-6">
            {loadingQuestions ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading questions...</p>
              </div>
            ) : packageQuestions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No questions found in this package.</p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {packageQuestions.map((q, index) => (
                  <div 
                    key={q.id} 
                    className="p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="shrink-0">
                        Q{index + 1}
                      </Badge>
                      <div className="space-y-2">
                        <p className="text-sm">{q.question_text}</p>
                        <Badge variant="secondary" className="text-xs">
                          {q.hipaa_section}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </PlatformOwnerLayout>
  );
}

// Unified Release Form Component
interface UnifiedReleaseFormProps {
  organizations: Organization[];
  packages: QuestionPackage[];
  materials: TrainingMaterial[];
  existingPackageReleases: PackageRelease[];
  existingContentReleases: ContentRelease[];
  onSuccess: () => void;
}

function UnifiedReleaseForm({
  organizations,
  packages,
  materials,
  existingPackageReleases,
  existingContentReleases,
  onSuccess,
}: UnifiedReleaseFormProps) {
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [workforceGroup, setWorkforceGroup] = useState<WorkforceGroup | "">("");
  const [trainingYear, setTrainingYear] = useState<number>(new Date().getFullYear());
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter packages by workforce group
  const filteredPackages = workforceGroup
    ? packages.filter((p) => p.workforce_group === workforceGroup)
    : [];

  // Filter materials by workforce group
  const filteredMaterials = workforceGroup
    ? materials.filter((m) => m.workforce_groups.includes(workforceGroup))
    : [];

  function isPackageAlreadyReleased(orgId: string, packageId: string) {
    return existingPackageReleases.some(
      (r) => r.organization_id === orgId && r.package_id === packageId
    );
  }

  function isOrgYearGroupConflict(orgId: string) {
    return existingPackageReleases.some(
      (r) =>
        r.organization_id === orgId &&
        r.workforce_group === workforceGroup &&
        r.training_year === trainingYear
    );
  }

  function isMaterialAlreadyReleased(orgId: string, materialId: string) {
    return existingContentReleases.some(
      (r) =>
        r.organization_id === orgId &&
        r.content_id === materialId &&
        r.content_type === "training_material"
    );
  }

  function handleOrgToggle(orgId: string) {
    setSelectedOrgs((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  }

  function handleMaterialToggle(materialId: string) {
    setSelectedMaterials((prev) =>
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedOrgs.length === 0) {
      toast.error("Please select at least one organization");
      return;
    }

    if (!workforceGroup) {
      toast.error("Please select a workforce group");
      return;
    }

    if (!selectedPackage && selectedMaterials.length === 0) {
      toast.error("Please select a question package or training materials to release");
      return;
    }

    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      let packageReleasesCreated = 0;
      let materialReleasesCreated = 0;

      // Release package to each org
      if (selectedPackage) {
        const packageReleasesToCreate = [];
        for (const orgId of selectedOrgs) {
          if (!isPackageAlreadyReleased(orgId, selectedPackage) && !isOrgYearGroupConflict(orgId)) {
            packageReleasesToCreate.push({
              package_id: selectedPackage,
              organization_id: orgId,
              workforce_group: workforceGroup,
              training_year: trainingYear,
              released_by: userData.user.id,
              notes: notes || null,
            });
          }
        }

        if (packageReleasesToCreate.length > 0) {
          const { error } = await supabase.from("package_releases").insert(packageReleasesToCreate);
          if (error) throw error;
          packageReleasesCreated = packageReleasesToCreate.length;
        }
      }

      // Release materials to each org
      if (selectedMaterials.length > 0) {
        const materialReleasesToCreate = [];
        for (const orgId of selectedOrgs) {
          for (const materialId of selectedMaterials) {
            if (!isMaterialAlreadyReleased(orgId, materialId)) {
              materialReleasesToCreate.push({
                organization_id: orgId,
                content_type: "training_material",
                content_id: materialId,
                released_by: userData.user.id,
                notes: notes || null,
              });
            }
          }
        }

        if (materialReleasesToCreate.length > 0) {
          const { error } = await supabase.from("content_releases").insert(materialReleasesToCreate);
          if (error) throw error;
          materialReleasesCreated = materialReleasesToCreate.length;
        }
      }

      if (packageReleasesCreated === 0 && materialReleasesCreated === 0) {
        toast.info("All selected content is already released to selected organizations");
        return;
      }

      const messages = [];
      if (packageReleasesCreated > 0) {
        messages.push(`${packageReleasesCreated} package release(s)`);
      }
      if (materialReleasesCreated > 0) {
        messages.push(`${materialReleasesCreated} material release(s)`);
      }
      toast.success(`Released: ${messages.join(" and ")}`);
      onSuccess();
    } catch (error: any) {
      console.error("Error releasing content:", error);
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast.error("Duplicate release detected. An organization may already have a package for this workforce group and year.");
      } else {
        toast.error("Failed to release content");
      }
    } finally {
      setSaving(false);
    }
  }

  // Check for conflicts
  const orgsWithConflicts = selectedOrgs.filter((orgId) => 
    selectedPackage && isOrgYearGroupConflict(orgId)
  );

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Release Content to Organizations</DialogTitle>
        <DialogDescription>
          Release a question package and training materials together for a workforce group.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Organizations */}
        <div className="space-y-3">
          <Label>Select Organizations</Label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
            {organizations.map((org) => (
              <div key={org.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`org-${org.id}`}
                  checked={selectedOrgs.includes(org.id)}
                  onCheckedChange={() => handleOrgToggle(org.id)}
                />
                <Label htmlFor={`org-${org.id}`} className="text-sm font-normal cursor-pointer">
                  {org.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Workforce Group & Training Year */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Workforce Group</Label>
            <Select
              value={workforceGroup}
              onValueChange={(v) => {
                setWorkforceGroup(v as WorkforceGroup);
                setSelectedPackage("");
                setSelectedMaterials([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select group..." />
              </SelectTrigger>
              <SelectContent>
                {WORKFORCE_GROUPS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {WORKFORCE_GROUP_LABELS[group]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Training Year</Label>
            <Select
              value={trainingYear.toString()}
              onValueChange={(v) => setTrainingYear(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Question Package */}
        {workforceGroup && (
          <div className="space-y-2">
            <Label>Question Package</Label>
            <Select value={selectedPackage} onValueChange={setSelectedPackage}>
              <SelectTrigger>
                <SelectValue placeholder="Select package..." />
              </SelectTrigger>
              <SelectContent>
                {filteredPackages.length === 0 ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    No packages for this group
                  </div>
                ) : (
                  filteredPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {pkg.name}
                        <span className="text-xs text-muted-foreground">
                          ({pkg.question_count || 25} questions)
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {orgsWithConflicts.length > 0 && (
              <p className="text-xs text-warning">
                Warning: {orgsWithConflicts.length} org(s) already have a package for this group/year
              </p>
            )}
          </div>
        )}

        {/* Training Materials */}
        {workforceGroup && (
          <div className="space-y-3">
            <Label>Training Materials</Label>
            {filteredMaterials.length === 0 ? (
              <p className="text-sm text-muted-foreground">No materials for this group</p>
            ) : (
              <div className="grid gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {filteredMaterials.map((material) => (
                  <div key={material.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`material-${material.id}`}
                      checked={selectedMaterials.includes(material.id)}
                      onCheckedChange={() => handleMaterialToggle(material.id)}
                    />
                    <Label
                      htmlFor={`material-${material.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        #{material.sequence_number}
                      </span>
                      {material.title}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Release Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this release..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Summary */}
        {selectedOrgs.length > 0 && (selectedPackage || selectedMaterials.length > 0) && (
          <div className="rounded-md bg-muted p-3 space-y-2">
            <p className="text-sm font-medium">Release Summary</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>{selectedOrgs.length}</strong> organization(s) selected
              </p>
              {selectedPackage && (
                <p className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  1 question package
                </p>
              )}
              {selectedMaterials.length > 0 && (
                <p className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {selectedMaterials.length} training material(s)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={
            saving ||
            selectedOrgs.length === 0 ||
            !workforceGroup ||
            (!selectedPackage && selectedMaterials.length === 0)
          }
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {saving ? "Releasing..." : "Release Content"}
        </Button>
      </DialogFooter>
    </form>
  );
}
