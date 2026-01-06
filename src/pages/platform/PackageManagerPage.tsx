import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Package, Plus, Building2, Calendar, Send, Eye, Shuffle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { WORKFORCE_GROUP_LABELS, WorkforceGroup } from "@/types/hipaa";

interface QuestionPackage {
  id: string;
  name: string;
  workforce_group: WorkforceGroup;
  sequence_number: number;
  description: string | null;
  created_at: string;
  question_count?: number;
}

interface PackageQuestion {
  id: string;
  package_id: string;
  question_id: string;
  question?: {
    question_text: string;
    question_number: number;
    hipaa_section: string;
  };
}

interface PackageRelease {
  id: string;
  package_id: string;
  organization_id: string;
  workforce_group: WorkforceGroup;
  training_year: number;
  released_at: string;
  notes: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_number: number;
  hipaa_section: string;
  workforce_groups: string[];
}

const WORKFORCE_GROUPS: WorkforceGroup[] = ["all_staff", "clinical", "administrative", "management", "it"];

export default function PackageManagerPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  usePageMeta({
    title: "Question Packages | Platform Owner",
    description:
      "Create and manage 25-question HIPAA training question packages by workforce group, and release them to organizations.",
    canonicalPath: "/platform/packages",
  });

  const [packages, setPackages] = useState<QuestionPackage[]>([]);
  const [packageQuestions, setPackageQuestions] = useState<Record<string, PackageQuestion[]>>({});
  const [releases, setReleases] = useState<PackageRelease[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create package dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedWorkforceGroup, setSelectedWorkforceGroup] = useState<WorkforceGroup | "">("");
  const [packageName, setPackageName] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [creating, setCreating] = useState(false);
  
  // Release dialog state
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<QuestionPackage | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [trainingYear, setTrainingYear] = useState<number>(new Date().getFullYear());
  const [releaseNotes, setReleaseNotes] = useState("");
  const [releasing, setReleasing] = useState(false);
  
  // View package dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingPackage, setViewingPackage] = useState<QuestionPackage | null>(null);

  useEffect(() => {
    const ensureAuthAndLoad = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to manage question packages.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
        return;
      }

      await fetchData();
    };

    void ensureAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [packagesRes, releasesRes, orgsRes, questionsRes] = await Promise.all([
        supabase.from("question_packages").select("*").order("workforce_group").order("sequence_number"),
        supabase.from("package_releases").select("*").order("released_at", { ascending: false }),
        supabase.from("organizations").select("*").neq("slug", "platform-owner"),
        supabase.from("quiz_questions").select("id, question_text, question_number, hipaa_section, workforce_groups")
      ]);

      if (packagesRes.data) {
        // Get question counts for each package
        const packagesWithCounts = await Promise.all(
          packagesRes.data.map(async (pkg) => {
            const { count } = await supabase
              .from("package_questions")
              .select("*", { count: "exact", head: true })
              .eq("package_id", pkg.id);
            return { ...pkg, question_count: count || 0 } as QuestionPackage;
          })
        );
        setPackages(packagesWithCounts);
      }
      
      if (releasesRes.data) setReleases(releasesRes.data as PackageRelease[]);
      if (orgsRes.data) setOrganizations(orgsRes.data);
      if (questionsRes.data) setQuestions(questionsRes.data as QuizQuestion[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionsAlreadyInPackages = (workforceGroup: WorkforceGroup): string[] => {
    const packageIds = packages
      .filter(p => p.workforce_group === workforceGroup)
      .map(p => p.id);
    
    const questionIds: string[] = [];
    packageIds.forEach(pkgId => {
      const pqs = packageQuestions[pkgId] || [];
      pqs.forEach(pq => questionIds.push(pq.question_id));
    });
    return questionIds;
  };

  const getAvailableQuestionsForGroup = (workforceGroup: WorkforceGroup): QuizQuestion[] => {
    const usedQuestionIds = getQuestionsAlreadyInPackages(workforceGroup);
    return questions.filter(q => 
      q.workforce_groups.includes(workforceGroup) && 
      !usedQuestionIds.includes(q.id)
    );
  };

  const getNextSequenceNumber = (workforceGroup: WorkforceGroup): number => {
    const groupPackages = packages.filter(p => p.workforce_group === workforceGroup);
    if (groupPackages.length === 0) return 1;
    return Math.max(...groupPackages.map(p => p.sequence_number)) + 1;
  };

  const handleCreatePackage = async () => {
    if (!selectedWorkforceGroup || !packageName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a workforce group and enter a package name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to create question packages.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
        return;
      }

      // Fetch used question IDs for this workforce group
      const { data: existingPackages, error: existingPackagesError } = await supabase
        .from("question_packages")
        .select("id")
        .eq("workforce_group", selectedWorkforceGroup);

      if (existingPackagesError) throw existingPackagesError;

      let usedQuestionIds: string[] = [];
      if (existingPackages && existingPackages.length > 0) {
        const { data: usedQuestions, error: usedQuestionsError } = await supabase
          .from("package_questions")
          .select("question_id")
          .in(
            "package_id",
            existingPackages.map((p) => p.id)
          );

        if (usedQuestionsError) throw usedQuestionsError;

        usedQuestionIds = usedQuestions?.map((q) => q.question_id) || [];
      }

      const availableQuestions = questions.filter(
        (q) => q.workforce_groups.includes(selectedWorkforceGroup) && !usedQuestionIds.includes(q.id)
      );

      if (availableQuestions.length < 25) {
        toast({
          title: "Not Enough Questions",
          description: `Only ${availableQuestions.length} questions available for ${WORKFORCE_GROUP_LABELS[selectedWorkforceGroup]}. Need 25.`,
          variant: "destructive",
        });
        return;
      }

      setCreating(true);

      // Randomly select 25 questions
      const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, 25);

      const sequenceNumber = getNextSequenceNumber(selectedWorkforceGroup);

      // Create the package
      const { data: newPackage, error: packageError } = await supabase
        .from("question_packages")
        .insert({
          name: packageName.trim(),
          workforce_group: selectedWorkforceGroup,
          sequence_number: sequenceNumber,
          description: packageDescription.trim() || null,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // Insert the questions into the package
      const packageQuestionsToInsert = selectedQuestions.map((q) => ({
        package_id: newPackage.id,
        question_id: q.id,
      }));

      const { error: questionsError } = await supabase
        .from("package_questions")
        .insert(packageQuestionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: "Package Created",
        description: `Created "${packageName}" with 25 randomly selected questions.`,
      });

      setCreateDialogOpen(false);
      setSelectedWorkforceGroup("");
      setPackageName("");
      setPackageDescription("");
      fetchData();
    } catch (error: any) {
      console.error("Error creating package:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create package.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleReleasePackage = async () => {
    if (!selectedPackage || !selectedOrg || !trainingYear) {
      toast({
        title: "Validation Error",
        description: "Please select an organization and training year.",
        variant: "destructive"
      });
      return;
    }

    setReleasing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("package_releases").insert({
        package_id: selectedPackage.id,
        organization_id: selectedOrg,
        workforce_group: selectedPackage.workforce_group,
        training_year: trainingYear,
        released_by: userData.user.id,
        notes: releaseNotes.trim() || null
      });

      if (error) {
        if (error.message.includes("duplicate") || error.code === "23505") {
          toast({
            title: "Already Released",
            description: "This package has already been released to this organization, or this org already has a package for this workforce group and year.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Package Released",
        description: `Released "${selectedPackage.name}" to ${organizations.find(o => o.id === selectedOrg)?.name}.`
      });

      setReleaseDialogOpen(false);
      setSelectedPackage(null);
      setSelectedOrg("");
      setReleaseNotes("");
      fetchData();
    } catch (error: any) {
      console.error("Error releasing package:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to release package.",
        variant: "destructive"
      });
    } finally {
      setReleasing(false);
    }
  };

  const handleViewPackage = async (pkg: QuestionPackage) => {
    setViewingPackage(pkg);
    
    // Fetch questions for this package
    const { data } = await supabase
      .from("package_questions")
      .select(`
        id,
        package_id,
        question_id,
        quiz_questions (
          question_text,
          question_number,
          hipaa_section
        )
      `)
      .eq("package_id", pkg.id);
    
    if (data) {
      const formattedQuestions = data.map(pq => ({
        id: pq.id,
        package_id: pq.package_id,
        question_id: pq.question_id,
        question: pq.quiz_questions as any
      }));
      setPackageQuestions(prev => ({ ...prev, [pkg.id]: formattedQuestions }));
    }
    
    setViewDialogOpen(true);
  };

  const getOrgName = (orgId: string) => organizations.find(o => o.id === orgId)?.name || "Unknown";
  const getPackageName = (pkgId: string) => packages.find(p => p.id === pkgId)?.name || "Unknown";

  const getPackageReleaseCount = (pkgId: string) => releases.filter(r => r.package_id === pkgId).length;

  const isPackageReleasedToOrg = (pkgId: string, orgId: string) => 
    releases.some(r => r.package_id === pkgId && r.organization_id === orgId);

  const getAvailablePackagesForOrg = (orgId: string, workforceGroup?: WorkforceGroup) => {
    return packages.filter(pkg => {
      if (workforceGroup && pkg.workforce_group !== workforceGroup) return false;
      return !isPackageReleasedToOrg(pkg.id, orgId);
    });
  };

  return (
    <PlatformOwnerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Question Packages</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage 25-question packages for workforce groups
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Package
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Question Package</DialogTitle>
                <DialogDescription>
                  Randomly select 25 questions for a workforce group. Questions already in packages for this group will be excluded.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Workforce Group</Label>
                  <Select 
                    value={selectedWorkforceGroup} 
                    onValueChange={(val) => {
                      const group = val as WorkforceGroup;
                      setSelectedWorkforceGroup(group);
                      // Auto-populate package name if empty
                      if (!packageName.trim()) {
                        const nextSeq = getNextSequenceNumber(group);
                        setPackageName(`${WORKFORCE_GROUP_LABELS[group]} - Set ${nextSeq}`);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select workforce group..." />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFORCE_GROUPS.map(group => {
                        const available = getAvailableQuestionsForGroup(group);
                        return (
                          <SelectItem key={group} value={group}>
                            {WORKFORCE_GROUP_LABELS[group]} ({available.length} questions available)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Package Name</Label>
                  <Input
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder={selectedWorkforceGroup ? `${WORKFORCE_GROUP_LABELS[selectedWorkforceGroup]} - Set ${getNextSequenceNumber(selectedWorkforceGroup)}` : "Enter package name..."}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={packageDescription}
                    onChange={(e) => setPackageDescription(e.target.value)}
                    placeholder="Add description..."
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Shuffle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    25 questions will be randomly selected from available questions
                  </span>
                </div>

                <Button 
                  onClick={handleCreatePackage} 
                  disabled={creating || !selectedWorkforceGroup || !packageName.trim()}
                  className="w-full"
                >
                  {creating ? "Creating..." : "Create Package with 25 Random Questions"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="packages">
          <TabsList>
            <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger>
            <TabsTrigger value="releases">Release History ({releases.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="space-y-4">
            {/* Package summary by workforce group */}
            <div className="grid gap-4 md:grid-cols-5">
              {WORKFORCE_GROUPS.map(group => {
                const groupPackages = packages.filter(p => p.workforce_group === group);
                const available = getAvailableQuestionsForGroup(group);
                return (
                  <Card key={group}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{WORKFORCE_GROUP_LABELS[group]}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{groupPackages.length}</div>
                      <p className="text-xs text-muted-foreground">
                        packages ({available.length} questions left)
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Packages table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  All Packages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : packages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No packages created yet. Create your first package above.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Workforce Group</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Released To</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.map(pkg => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium">{pkg.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {WORKFORCE_GROUP_LABELS[pkg.workforce_group]}
                            </Badge>
                          </TableCell>
                          <TableCell>{pkg.question_count || 0}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getPackageReleaseCount(pkg.id)} orgs
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(pkg.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewPackage(pkg)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedPackage(pkg);
                                setReleaseDialogOpen(true);
                              }}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="releases">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Release History
                </CardTitle>
                <CardDescription>
                  Track which packages were released to which organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {releases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No releases yet. Release a package to an organization to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Package</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Workforce Group</TableHead>
                        <TableHead>Training Year</TableHead>
                        <TableHead>Released</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {releases.map(release => (
                        <TableRow key={release.id}>
                          <TableCell className="font-medium">
                            {getPackageName(release.package_id)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {getOrgName(release.organization_id)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {WORKFORCE_GROUP_LABELS[release.workforce_group]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge>{release.training_year}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(release.released_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {release.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Release Package Dialog */}
        <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Release Package to Organization</DialogTitle>
              <DialogDescription>
                {selectedPackage && `Release "${selectedPackage.name}" to an organization for a training year.`}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPackage && (
              <div className="space-y-4 pt-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedPackage.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {WORKFORCE_GROUP_LABELS[selectedPackage.workforce_group]} • {selectedPackage.question_count || 25} questions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => {
                        const alreadyReleased = isPackageReleasedToOrg(selectedPackage.id, org.id);
                        return (
                          <SelectItem 
                            key={org.id} 
                            value={org.id}
                            disabled={alreadyReleased}
                          >
                            {org.name} {alreadyReleased && "(already released)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Training Year</Label>
                  <Select 
                    value={trainingYear.toString()} 
                    onValueChange={(val) => setTrainingYear(parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027, 2028].map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={releaseNotes}
                    onChange={(e) => setReleaseNotes(e.target.value)}
                    placeholder="Add release notes..."
                  />
                </div>

                <Button 
                  onClick={handleReleasePackage} 
                  disabled={releasing || !selectedOrg}
                  className="w-full"
                >
                  {releasing ? "Releasing..." : "Release Package"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Package Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{viewingPackage?.name}</DialogTitle>
              <DialogDescription>
                {viewingPackage && `${WORKFORCE_GROUP_LABELS[viewingPackage.workforce_group]} • ${viewingPackage.question_count || 25} questions`}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[500px] pr-4">
              {viewingPackage && packageQuestions[viewingPackage.id] ? (
                <div className="space-y-2">
                  {packageQuestions[viewingPackage.id].map((pq, index) => (
                    <div key={pq.id} className="p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0">
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{pq.question?.question_text || "Question not found"}</p>
                          {pq.question?.hipaa_section && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {pq.question.hipaa_section}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </PlatformOwnerLayout>
  );
}
