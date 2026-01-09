import { useState, useEffect } from "react";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { CredentialEmailTemplate } from "@/components/CredentialEmailTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Building2, 
  Users, 
  Search,
  TrendingUp,
  FileQuestion,
  BookOpen,
  ExternalLink,
  Package,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Mail,
  KeyRound,
  UserX,
  Pencil,
  Shield,
  ShieldOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface OrgStats {
  orgId: string;
  userCount: number;
  quizReleases: number;
  materialReleases: number;
  packageReleases: number;
}

interface OrgAdmin {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  mfaEnabled: boolean;
  organizationId: string;
}

interface CreatedCredentials {
  organizationName: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  password: string;
}

// Form schema
const addOrgSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  adminEmail: z.string().email("Please enter a valid email address"),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
});

type AddOrgFormValues = z.infer<typeof addOrgSchema>;

// Edit admin schema
const editAdminSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
});

type EditAdminFormValues = z.infer<typeof editAdminSchema>;

// Generate a secure password
function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const allChars = uppercase + lowercase + numbers + special;
  
  const array = new Uint32Array(16);
  crypto.getRandomValues(array);
  
  let password = "";
  // Ensure at least one of each type
  password += uppercase[array[0] % uppercase.length];
  password += lowercase[array[1] % lowercase.length];
  password += numbers[array[2] % numbers.length];
  password += special[array[3] % special.length];
  
  // Fill the rest
  for (let i = 4; i < 16; i++) {
    password += allChars[array[i] % allChars.length];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}


export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgStats, setOrgStats] = useState<Map<string, OrgStats>>(new Map());
  const [orgAdmins, setOrgAdmins] = useState<Map<string, OrgAdmin[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Admin management states
  const [editAdminDialogOpen, setEditAdminDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<OrgAdmin | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [newPasswordCredentials, setNewPasswordCredentials] = useState<{ email: string; password: string } | null>(null);

  const form = useForm<AddOrgFormValues>({
    resolver: zodResolver(addOrgSchema),
    defaultValues: {
      organizationName: "",
      adminEmail: "",
      adminFirstName: "",
      adminLastName: "",
    },
  });

  const editForm = useForm<EditAdminFormValues>({
    resolver: zodResolver(editAdminSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [orgsRes, profilesRes, releasesRes, packageReleasesRes, rolesRes] = await Promise.all([
        supabase.from("organizations").select("*").order("name"),
        supabase.from("profiles").select("*"),
        supabase.from("content_releases").select("organization_id, content_type"),
        supabase.from("package_releases").select("organization_id"),
        supabase.from("user_roles").select("user_id, role, organization_id"),
      ]);

      if (orgsRes.error) throw orgsRes.error;

      setOrganizations(orgsRes.data || []);

      // Calculate stats per org
      const statsMap = new Map<string, OrgStats>();
      const adminsMap = new Map<string, OrgAdmin[]>();
      
      // Get admin user IDs
      const adminRoles = (rolesRes.data || []).filter(r => r.role === 'org_admin');
      
      for (const org of orgsRes.data || []) {
        const orgProfiles = (profilesRes.data || []).filter(
          (p) => p.organization_id === org.id
        );
        
        const releases = (releasesRes.data || []).filter(
          (r) => r.organization_id === org.id
        );

        const pkgReleases = (packageReleasesRes.data || []).filter(
          (r) => r.organization_id === org.id
        );
        
        statsMap.set(org.id, {
          orgId: org.id,
          userCount: orgProfiles.length,
          quizReleases: releases.filter((r) => r.content_type === "quiz").length,
          materialReleases: releases.filter((r) => r.content_type === "training_material").length,
          packageReleases: pkgReleases.length,
        });

        // Find admins for this org
        const orgAdminRoles = adminRoles.filter(r => r.organization_id === org.id);
        const orgAdminsList: OrgAdmin[] = [];
        
        for (const adminRole of orgAdminRoles) {
          const profile = orgProfiles.find(p => p.user_id === adminRole.user_id);
          if (profile) {
            orgAdminsList.push({
              userId: profile.user_id,
              email: profile.email,
              firstName: profile.first_name,
              lastName: profile.last_name,
              status: profile.status,
              mfaEnabled: profile.mfa_enabled,
              organizationId: org.id,
            });
          }
        }
        
        adminsMap.set(org.id, orgAdminsList);
      }
      
      setOrgStats(statsMap);
      setOrgAdmins(adminsMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }

  function toggleOrgExpanded(orgId: string) {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  }

  function openEditAdminDialog(admin: OrgAdmin) {
    setSelectedAdmin(admin);
    editForm.reset({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
    });
    setEditAdminDialogOpen(true);
  }

  async function handleEditAdmin(values: EditAdminFormValues) {
    if (!selectedAdmin) return;
    
    setAdminActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      // Use edge function to update BOTH auth.users AND profiles
      const response = await supabase.functions.invoke("update-admin-account", {
        body: {
          userId: selectedAdmin.userId,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to update admin");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success("Admin details updated");
      setEditAdminDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error updating admin:", error);
      toast.error(error.message || "Failed to update admin");
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!selectedAdmin) return;
    
    setAdminActionLoading(true);
    try {
      const newPassword = generateSecurePassword();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const response = await supabase.functions.invoke("reset-admin-password", {
        body: {
          userId: selectedAdmin.userId,
          newPassword: newPassword,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to reset password");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setNewPasswordCredentials({
        email: selectedAdmin.email,
        password: newPassword,
      });
      setResetPasswordDialogOpen(false);
      toast.success("Password reset successfully");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleDeactivateAdmin() {
    if (!selectedAdmin) return;
    
    setAdminActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const response = await supabase.functions.invoke("deactivate-admin", {
        body: {
          userId: selectedAdmin.userId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to deactivate admin");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success("Admin account deactivated");
      setDeactivateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error deactivating admin:", error);
      toast.error(error.message || "Failed to deactivate admin");
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function onSubmit(values: AddOrgFormValues) {
    setIsSubmitting(true);
    
    try {
      const password = generateSecurePassword();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to create organizations");
        return;
      }

      const response = await supabase.functions.invoke("create-organization", {
        body: {
          organizationName: values.organizationName,
          adminEmail: values.adminEmail,
          adminFirstName: values.adminFirstName,
          adminLastName: values.adminLastName,
          adminPassword: password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create organization");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Success - store credentials and show success dialog
      setCreatedCredentials({
        organizationName: values.organizationName,
        adminEmail: values.adminEmail,
        adminFirstName: values.adminFirstName,
        adminLastName: values.adminLastName,
        password: password,
      });

      setAddDialogOpen(false);
      setSuccessDialogOpen(true);
      form.reset();
      fetchData();
      
      toast.success("Organization created successfully");
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(error.message || "Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyToClipboard(text: string, fieldName: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  }

  function copyAllCredentials() {
    if (!createdCredentials) return;
    
    const loginUrl = `${window.location.origin}/login`;
    const text = `HIPAA Learning Hub - Admin Account Credentials
================================================
Organization: ${createdCredentials.organizationName}
Login URL: ${loginUrl}

Email: ${createdCredentials.adminEmail}
Temporary Password: ${createdCredentials.password}

Please change your password after first login.`;
    
    copyToClipboard(text, "all");
  }

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = Array.from(orgStats.values()).reduce((sum, stats) => sum + stats.userCount, 0);

  return (
    <PlatformOwnerLayout userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Organizations</h2>
            <p className="text-muted-foreground">
              View and manage all customer organizations on the platform.
            </p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Organization</DialogTitle>
                <DialogDescription>
                  Create a new customer organization and admin account. Credentials will be generated automatically.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Healthcare" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="adminFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adminLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@acmehealthcare.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          This person will receive login credentials and manage their organization.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Organization"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Success Dialog - Credential Display */}
        <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <Check className="h-5 w-5" />
                Organization Created Successfully
              </DialogTitle>
              <DialogDescription>
                Save these credentials now. The password will not be shown again.
              </DialogDescription>
            </DialogHeader>
            
            {createdCredentials && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">Organization</Label>
                      <p className="font-medium">{createdCredentials.organizationName}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <Label className="text-xs text-muted-foreground">Admin</Label>
                    <p className="font-medium">{createdCredentials.adminFirstName} {createdCredentials.adminLastName}</p>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="font-medium font-mono">{createdCredentials.adminEmail}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdCredentials.adminEmail, "email")}
                      >
                        {copiedField === "email" ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                        <p className="font-medium font-mono text-lg">{createdCredentials.password}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdCredentials.password, "password")}
                      >
                        {copiedField === "password" ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">Send these credentials securely</p>
                    <p className="text-muted-foreground">
                      Copy the credentials and send them to the organization admin through a secure channel. 
                      The password will not be displayed again.
                    </p>
                  </div>
                </div>

                {/* Email Template */}
                <div className="border-t pt-4">
                  <CredentialEmailTemplate
                    recipientName={createdCredentials.adminFirstName}
                    email={createdCredentials.adminEmail}
                    password={createdCredentials.password}
                    organizationName={createdCredentials.organizationName}
                    isPasswordReset={false}
                  />
                </div>
              </div>
            )}
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={copyAllCredentials}
                className="w-full sm:w-auto"
              >
                {copiedField === "all" ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Credentials
                  </>
                )}
              </Button>
              <Button onClick={() => setSuccessDialogOpen(false)} className="w-full sm:w-auto">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{organizations.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Organizations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{totalUsers}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {organizations.length > 0 ? Math.round(totalUsers / organizations.length) : 0}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Avg. Users/Org</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {Array.from(orgStats.values()).reduce(
                    (sum, stats) => sum + stats.quizReleases + stats.materialReleases,
                    0
                  )}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Releases</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Organizations Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Packages</TableHead>
                  <TableHead>Quizzes</TableHead>
                  <TableHead>Materials</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading organizations...
                    </TableCell>
                  </TableRow>
                ) : filteredOrgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrgs.map((org) => {
                    const stats = orgStats.get(org.id);
                    const admins = orgAdmins.get(org.id) || [];
                    const isExpanded = expandedOrgs.has(org.id);
                    
                    return (
                      <>
                        <TableRow 
                          key={org.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleOrgExpanded(org.id)}
                        >
                          <TableCell className="w-8">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{org.name}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{stats?.userCount || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-primary" />
                              <span>{stats?.packageReleases || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <FileQuestion className="h-4 w-4 text-info" />
                              <span>{stats?.quizReleases || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-4 w-4 text-success" />
                              <span>{stats?.materialReleases || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {format(new Date(org.created_at), "MMM d, yyyy")}
                            </span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/platform/releases?org=${org.id}`}>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Admin Row */}
                        {isExpanded && (
                          <TableRow key={`${org.id}-admins`} className="bg-muted/30">
                            <TableCell colSpan={8} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">Admin Accounts</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {admins.length} admin{admins.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                
                                {admins.length === 0 ? (
                                  <p className="text-sm text-muted-foreground pl-6">
                                    No admin accounts found for this organization.
                                  </p>
                                ) : (
                                  <div className="pl-6 space-y-2">
                                    {admins.map((admin) => (
                                      <div 
                                        key={admin.userId}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-background"
                                      >
                                        <div className="flex items-center gap-4">
                                          <div>
                                            <p className="font-medium">
                                              {admin.firstName} {admin.lastName}
                                            </p>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                              <Mail className="h-3 w-3" />
                                              {admin.email}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge 
                                              variant={admin.status === 'active' ? 'default' : 'secondary'}
                                              className="text-xs"
                                            >
                                              {admin.status}
                                            </Badge>
                                            {admin.mfaEnabled ? (
                                              <Badge variant="outline" className="text-xs text-success border-success">
                                                <Shield className="h-3 w-3 mr-1" />
                                                MFA
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-xs text-warning border-warning">
                                                <ShieldOff className="h-3 w-3 mr-1" />
                                                No MFA
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditAdminDialog(admin);
                                            }}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedAdmin(admin);
                                              setResetPasswordDialogOpen(true);
                                            }}
                                          >
                                            <KeyRound className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedAdmin(admin);
                                              setDeactivateDialogOpen(true);
                                            }}
                                          >
                                            <UserX className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Admin Dialog */}
        <Dialog open={editAdminDialogOpen} onOpenChange={setEditAdminDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Edit Admin Details</DialogTitle>
              <DialogDescription>
                Update the admin's profile information.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditAdmin)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditAdminDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={adminActionLoading}>
                    {adminActionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Reset Password Confirmation */}
        <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Admin Password</AlertDialogTitle>
              <AlertDialogDescription>
                This will generate a new temporary password for {selectedAdmin?.firstName} {selectedAdmin?.lastName} ({selectedAdmin?.email}). 
                You will need to send them the new credentials securely.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={adminActionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetPassword} disabled={adminActionLoading}>
                {adminActionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Deactivate Confirmation */}
        <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Deactivate Admin Account</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the admin account for {selectedAdmin?.firstName} {selectedAdmin?.lastName} ({selectedAdmin?.email}). 
                They will no longer be able to log in or manage their organization. This action can be reversed by reactivating the account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={adminActionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeactivateAdmin} 
                disabled={adminActionLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {adminActionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  "Deactivate Account"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Password Display Dialog */}
        <Dialog open={!!newPasswordCredentials} onOpenChange={() => setNewPasswordCredentials(null)}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <Check className="h-5 w-5" />
                Password Reset Successfully
              </DialogTitle>
              <DialogDescription>
                Save these credentials now. The password will not be shown again.
              </DialogDescription>
            </DialogHeader>
            
            {newPasswordCredentials && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="font-medium font-mono">{newPasswordCredentials.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(newPasswordCredentials.email, "reset-email")}
                    >
                      {copiedField === "reset-email" ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs text-muted-foreground">New Temporary Password</Label>
                        <p className="font-medium font-mono text-lg">{newPasswordCredentials.password}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(newPasswordCredentials.password, "reset-password")}
                      >
                        {copiedField === "reset-password" ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">Send securely</p>
                    <p className="text-muted-foreground">
                      Send the new password to the admin through a secure channel.
                    </p>
                  </div>
                </div>

                {/* Email Template */}
                <div className="border-t pt-4">
                  <CredentialEmailTemplate
                    recipientName={selectedAdmin?.firstName || newPasswordCredentials.email.split('@')[0]}
                    email={newPasswordCredentials.email}
                    password={newPasswordCredentials.password}
                    isPasswordReset={true}
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={() => setNewPasswordCredentials(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlatformOwnerLayout>
  );
}
