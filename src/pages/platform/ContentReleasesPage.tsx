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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Send, 
  Building2, 
  FileQuestion,
  BookOpen,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

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

interface Quiz {
  id: string;
  title: string;
  sequence_number: number;
}

interface TrainingMaterial {
  id: string;
  title: string;
  sequence_number: number;
}

export default function ContentReleasesPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [releases, setReleases] = useState<ContentRelease[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [orgsRes, releasesRes, quizzesRes, materialsRes] = await Promise.all([
        supabase.from("organizations").select("id, name, slug").order("name"),
        supabase.from("content_releases").select("*").order("released_at", { ascending: false }),
        supabase.from("quizzes").select("id, title, sequence_number").order("sequence_number"),
        supabase.from("training_materials").select("id, title, sequence_number").order("sequence_number"),
      ]);

      if (orgsRes.error) throw orgsRes.error;
      if (releasesRes.error) throw releasesRes.error;
      if (quizzesRes.error) throw quizzesRes.error;
      if (materialsRes.error) throw materialsRes.error;

      setOrganizations(orgsRes.data || []);
      setReleases((releasesRes.data || []) as ContentRelease[]);
      setQuizzes(quizzesRes.data || []);
      setMaterials(materialsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function getContentTitle(contentType: string, contentId: string) {
    if (contentType === "quiz") {
      return quizzes.find((q) => q.id === contentId)?.title || "Unknown Quiz";
    }
    return materials.find((m) => m.id === contentId)?.title || "Unknown Material";
  }

  function getOrgName(orgId: string) {
    return organizations.find((o) => o.id === orgId)?.name || "Unknown Organization";
  }

  function getOrgReleaseCount(orgId: string) {
    return releases.filter((r) => r.organization_id === orgId).length;
  }

  function getOrgQuizCount(orgId: string) {
    return releases.filter((r) => r.organization_id === orgId && r.content_type === "quiz").length;
  }

  function getOrgMaterialCount(orgId: string) {
    return releases.filter((r) => r.organization_id === orgId && r.content_type === "training_material").length;
  }

  return (
    <PlatformOwnerLayout userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Content Releases</h2>
            <p className="text-muted-foreground">
              Control which content is available to each organization.
            </p>
          </div>
          <Dialog open={isReleaseDialogOpen} onOpenChange={setIsReleaseDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Release Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <ReleaseForm
                organizations={organizations}
                quizzes={quizzes}
                materials={materials}
                existingReleases={releases}
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
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <FileQuestion className="h-4 w-4 text-info" />
                      <span className="text-sm font-medium">{getOrgQuizCount(org.id)}</span>
                      <span className="text-xs text-muted-foreground">quizzes</span>
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
                  <TableHead>Released</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases
                  .filter((r) => !selectedOrg || r.organization_id === selectedOrg)
                  .slice(0, 20)
                  .map((release) => (
                    <TableRow key={release.id}>
                      <TableCell className="font-medium">
                        {getContentTitle(release.content_type, release.content_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={release.content_type === "quiz" ? "default" : "secondary"}>
                          {release.content_type === "quiz" ? (
                            <><FileQuestion className="h-3 w-3 mr-1" /> Quiz</>
                          ) : (
                            <><BookOpen className="h-3 w-3 mr-1" /> Material</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{getOrgName(release.organization_id)}</TableCell>
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
                    </TableRow>
                  ))}
                {releases.filter((r) => !selectedOrg || r.organization_id === selectedOrg).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No releases found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PlatformOwnerLayout>
  );
}

interface ReleaseFormProps {
  organizations: Organization[];
  quizzes: Quiz[];
  materials: TrainingMaterial[];
  existingReleases: ContentRelease[];
  onSuccess: () => void;
}

function ReleaseForm({ organizations, quizzes, materials, existingReleases, onSuccess }: ReleaseFormProps) {
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [contentType, setContentType] = useState<"quiz" | "training_material">("quiz");
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const contentOptions = contentType === "quiz" ? quizzes : materials;

  function isAlreadyReleased(orgId: string, contentId: string) {
    return existingReleases.some(
      (r) => r.organization_id === orgId && r.content_id === contentId && r.content_type === contentType
    );
  }

  function handleOrgToggle(orgId: string) {
    setSelectedOrgs((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  }

  function handleContentToggle(contentId: string) {
    setSelectedContent((prev) =>
      prev.includes(contentId) ? prev.filter((id) => id !== contentId) : [...prev, contentId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedOrgs.length === 0 || selectedContent.length === 0) {
      toast.error("Please select at least one organization and one content item");
      return;
    }

    setSaving(true);

    try {
      // Create releases for each org/content combination
      const releases = [];
      for (const orgId of selectedOrgs) {
        for (const contentId of selectedContent) {
          if (!isAlreadyReleased(orgId, contentId)) {
            releases.push({
              organization_id: orgId,
              content_type: contentType,
              content_id: contentId,
              notes: notes || null,
              released_by: "00000000-0000-0000-0000-000000000000", // Placeholder - should be current user
            });
          }
        }
      }

      if (releases.length === 0) {
        toast.info("All selected content is already released to selected organizations");
        return;
      }

      const { error } = await supabase.from("content_releases").insert(releases);

      if (error) throw error;

      toast.success(`Released ${releases.length} content item(s) successfully`);
      onSuccess();
    } catch (error) {
      console.error("Error releasing content:", error);
      toast.error("Failed to release content");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Release Content to Organizations</DialogTitle>
        <DialogDescription>
          Select organizations and content to release. Content already released will be skipped.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Organizations */}
        <div className="space-y-3">
          <Label>Select Organizations</Label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
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

        {/* Content Type */}
        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={(v) => {
            setContentType(v as "quiz" | "training_material");
            setSelectedContent([]);
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quiz">
                <div className="flex items-center gap-2">
                  <FileQuestion className="h-4 w-4" />
                  Quizzes
                </div>
              </SelectItem>
              <SelectItem value="training_material">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Training Materials
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Selection */}
        <div className="space-y-3">
          <Label>Select Content to Release</Label>
          <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
            {contentOptions.map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`content-${item.id}`}
                  checked={selectedContent.includes(item.id)}
                  onCheckedChange={() => handleContentToggle(item.id)}
                />
                <Label htmlFor={`content-${item.id}`} className="text-sm font-normal cursor-pointer flex-1">
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    #{item.sequence_number}
                  </span>
                  {item.title}
                </Label>
              </div>
            ))}
          </div>
        </div>

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
        {selectedOrgs.length > 0 && selectedContent.length > 0 && (
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm">
              <span className="font-medium">{selectedContent.length}</span> {contentType === "quiz" ? "quiz(zes)" : "material(s)"} will be released to{" "}
              <span className="font-medium">{selectedOrgs.length}</span> organization(s).
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={saving || selectedOrgs.length === 0 || selectedContent.length === 0}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {saving ? "Releasing..." : "Release Content"}
        </Button>
      </DialogFooter>
    </form>
  );
}
