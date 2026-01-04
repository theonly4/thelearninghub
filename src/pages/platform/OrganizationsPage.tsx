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
  Building2, 
  Users, 
  Search,
  TrendingUp,
  FileQuestion,
  BookOpen,
  ExternalLink,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

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

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgStats, setOrgStats] = useState<Map<string, OrgStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [orgsRes, profilesRes, releasesRes, packageReleasesRes] = await Promise.all([
        supabase.from("organizations").select("*").order("name"),
        supabase.from("profiles").select("organization_id"),
        supabase.from("content_releases").select("organization_id, content_type"),
        supabase.from("package_releases").select("organization_id"),
      ]);

      if (orgsRes.error) throw orgsRes.error;

      setOrganizations(orgsRes.data || []);

      // Calculate stats per org
      const statsMap = new Map<string, OrgStats>();
      
      for (const org of orgsRes.data || []) {
        const userCount = (profilesRes.data || []).filter(
          (p) => p.organization_id === org.id
        ).length;
        
        const releases = (releasesRes.data || []).filter(
          (r) => r.organization_id === org.id
        );

        const pkgReleases = (packageReleasesRes.data || []).filter(
          (r) => r.organization_id === org.id
        );
        
        statsMap.set(org.id, {
          orgId: org.id,
          userCount,
          quizReleases: releases.filter((r) => r.content_type === "quiz").length,
          materialReleases: releases.filter((r) => r.content_type === "training_material").length,
          packageReleases: pkgReleases.length,
        });
      }
      
      setOrgStats(statsMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = Array.from(orgStats.values()).reduce((sum, stats) => sum + stats.userCount, 0);

  return (
    <PlatformOwnerLayout userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Organizations</h2>
          <p className="text-muted-foreground">
            View and manage all customer organizations on the platform.
          </p>
        </div>

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
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading organizations...
                    </TableCell>
                  </TableRow>
                ) : filteredOrgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrgs.map((org) => {
                    const stats = orgStats.get(org.id);
                    return (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">/{org.slug}</p>
                          </div>
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
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/platform/releases?org=${org.id}`}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PlatformOwnerLayout>
  );
}
