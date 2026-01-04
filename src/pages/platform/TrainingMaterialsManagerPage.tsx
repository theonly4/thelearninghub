import { useState, useEffect } from "react";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  BookOpen,
  Clock,
  FileText,
  Eye,
  X
} from "lucide-react";
import { TrainingMaterialReader } from "@/components/training/TrainingMaterialReader";
import { supabase } from "@/integrations/supabase/client";
import { WORKFORCE_GROUP_LABELS, type WorkforceGroup } from "@/types/hipaa";
import { HipaaLink } from "@/components/HipaaLink";
import { toast } from "sonner";

interface TrainingMaterial {
  id: string;
  title: string;
  description: string;
  workforce_groups: WorkforceGroup[];
  sequence_number: number;
  estimated_minutes: number;
  hipaa_citations: string[];
  version: number;
  content: { title: string; content: string; hipaa_citations: string[] }[];
}

const workforceGroupOptions: WorkforceGroup[] = [
  "all_staff",
  "clinical",
  "administrative",
  "management",
  "it",
];

export default function TrainingMaterialsManagerPage() {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<TrainingMaterial | null>(null);
  const [previewSectionIndex, setPreviewSectionIndex] = useState(0);

  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("training_materials")
        .select("*")
        .order("sequence_number");

      if (error) throw error;

      // Type assertion for content
      const typedMaterials = (data || []).map(m => ({
        ...m,
        workforce_groups: m.workforce_groups as WorkforceGroup[],
        content: m.content as { title: string; content: string; hipaa_citations: string[] }[]
      }));

      setMaterials(typedMaterials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      toast.error("Failed to load training materials");
    } finally {
      setLoading(false);
    }
  }

  const filteredMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleDeleteMaterial(materialId: string) {
    if (!confirm("Are you sure you want to delete this training material?")) return;

    try {
      const { error } = await supabase
        .from("training_materials")
        .delete()
        .eq("id", materialId);

      if (error) throw error;
      
      setMaterials(materials.filter((m) => m.id !== materialId));
      toast.success("Training material deleted successfully");
    } catch (error) {
      console.error("Error deleting material:", error);
      toast.error("Failed to delete training material");
    }
  }

  return (
    <PlatformOwnerLayout userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Training Materials</h2>
            <p className="text-muted-foreground">
              Create and manage training content for all workforce groups.
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <MaterialForm
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  fetchMaterials();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{materials.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Materials</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {materials.reduce((sum, m) => sum + m.estimated_minutes, 0)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Minutes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {materials.reduce((sum, m) => sum + (m.content?.length || 0), 0)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Sections</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Materials Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Seq</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Workforce Groups</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>HIPAA Citations</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading materials...
                    </TableCell>
                  </TableRow>
                ) : filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No training materials found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-mono text-sm">
                        {material.sequence_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {material.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {material.workforce_groups.slice(0, 2).map((group) => (
                            <Badge key={group} variant="secondary" className="text-xs">
                              {WORKFORCE_GROUP_LABELS[group]}
                            </Badge>
                          ))}
                          {material.workforce_groups.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{material.workforce_groups.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{material.estimated_minutes} min</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {material.hipaa_citations.slice(0, 2).map((citation, idx) => (
                            <HipaaLink key={idx} section={citation} />
                          ))}
                          {material.hipaa_citations.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{material.hipaa_citations.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{material.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPreviewMaterial(material);
                              setPreviewSectionIndex(0);
                            }}
                            title="Preview as Employee"
                          >
                            <Eye className="h-4 w-4 text-accent" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMaterial(material)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMaterial(material.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {editingMaterial && (
              <MaterialForm
                material={editingMaterial}
                onSuccess={() => {
                  setEditingMaterial(null);
                  fetchMaterials();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewMaterial} onOpenChange={(open) => !open && setPreviewMaterial(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-accent" />
                    Employee Preview
                  </DialogTitle>
                  <DialogDescription>
                    This is how "{previewMaterial?.title}" appears to employees.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {previewMaterial && previewMaterial.content && (
              <TrainingMaterialReader
                title={previewMaterial.title}
                sections={previewMaterial.content as any}
                currentSectionIndex={previewSectionIndex}
                onSectionChange={setPreviewSectionIndex}
                onComplete={() => {
                  toast.success("Preview complete - this is where an employee would mark the material as finished.");
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PlatformOwnerLayout>
  );
}

interface MaterialFormProps {
  material?: TrainingMaterial;
  onSuccess: () => void;
}

function MaterialForm({ material, onSuccess }: MaterialFormProps) {
  const [formData, setFormData] = useState({
    title: material?.title || "",
    description: material?.description || "",
    sequence_number: material?.sequence_number || 1,
    estimated_minutes: material?.estimated_minutes || 15,
    hipaa_citations: material?.hipaa_citations?.join(", ") || "",
    workforce_groups: material?.workforce_groups || [] as WorkforceGroup[],
    version: material?.version || 1,
  });
  const [sections, setSections] = useState(
    material?.content || [{ title: "", content: "", hipaa_citations: [] }]
  );
  const [saving, setSaving] = useState(false);

  function handleWorkforceGroupChange(group: WorkforceGroup, checked: boolean) {
    if (checked) {
      setFormData({
        ...formData,
        workforce_groups: [...formData.workforce_groups, group],
      });
    } else {
      setFormData({
        ...formData,
        workforce_groups: formData.workforce_groups.filter((g) => g !== group),
      });
    }
  }

  function addSection() {
    setSections([...sections, { title: "", content: "", hipaa_citations: [] }]);
  }

  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index));
  }

  function updateSection(index: number, field: string, value: string | string[]) {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const materialData = {
        title: formData.title,
        description: formData.description,
        sequence_number: formData.sequence_number,
        estimated_minutes: formData.estimated_minutes,
        hipaa_citations: formData.hipaa_citations.split(",").map((c) => c.trim()).filter(Boolean),
        workforce_groups: formData.workforce_groups,
        version: material ? material.version + 1 : 1,
        content: sections,
      };

      if (material) {
        const { error } = await supabase
          .from("training_materials")
          .update(materialData)
          .eq("id", material.id);
        if (error) throw error;
        toast.success("Training material updated successfully");
      } else {
        const { error } = await supabase
          .from("training_materials")
          .insert(materialData);
        if (error) throw error;
        toast.success("Training material created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving material:", error);
      toast.error("Failed to save training material");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{material ? "Edit Training Material" : "Add Training Material"}</DialogTitle>
        <DialogDescription>
          {material ? "Update the training material details." : "Create new training content."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sequence">Sequence</Label>
              <Input
                id="sequence"
                type="number"
                min={1}
                value={formData.sequence_number}
                onChange={(e) =>
                  setFormData({ ...formData, sequence_number: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={formData.estimated_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_minutes: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={material ? `v${material.version + 1}` : "v1"}
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="citations">HIPAA Citations (comma-separated)</Label>
            <Input
              id="citations"
              placeholder="e.g., 164.502(a), 164.530(c)"
              value={formData.hipaa_citations}
              onChange={(e) => setFormData({ ...formData, hipaa_citations: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Workforce Groups</Label>
            <div className="flex flex-wrap gap-4">
              {workforceGroupOptions.map((group) => (
                <div key={group} className="flex items-center space-x-2">
                  <Checkbox
                    id={group}
                    checked={formData.workforce_groups.includes(group)}
                    onCheckedChange={(checked) =>
                      handleWorkforceGroupChange(group, checked as boolean)
                    }
                  />
                  <Label htmlFor={group} className="text-sm font-normal">
                    {WORKFORCE_GROUP_LABELS[group]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Content Sections</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSection}>
              <Plus className="h-4 w-4 mr-1" />
              Add Section
            </Button>
          </div>

          {sections.map((section, index) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Section {index + 1}</Label>
                  {sections.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSection(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Section title"
                  value={section.title}
                  onChange={(e) => updateSection(index, "title", e.target.value)}
                />
                <Textarea
                  placeholder="Section content..."
                  value={section.content}
                  onChange={(e) => updateSection(index, "content", e.target.value)}
                  rows={4}
                />
                <Input
                  placeholder="HIPAA citations for this section (comma-separated)"
                  value={section.hipaa_citations?.join(", ") || ""}
                  onChange={(e) =>
                    updateSection(
                      index,
                      "hipaa_citations",
                      e.target.value.split(",").map((c) => c.trim())
                    )
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : material ? "Update Material" : "Create Material"}
        </Button>
      </DialogFooter>
    </form>
  );
}
