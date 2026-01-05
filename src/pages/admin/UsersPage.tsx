import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  WorkforceGroup,
  UserStatus,
  WORKFORCE_GROUP_LABELS,
  USER_STATUS_LABELS,
} from "@/types/hipaa";
import {
  Search,
  Plus,
  UserPlus,
  Shield,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
  Loader2,
} from "lucide-react";
import { TrainingAssignmentDialog } from "@/components/admin/TrainingAssignmentDialog";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<UserStatus | "all">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // New user form state
  const [newUser, setNewUser] = useState({
    email: "",
    first_name: "",
    last_name: "",
    workforce_groups: [] as WorkforceGroup[],
    is_contractor: false,
  });
  
  // Selected workforce groups for assignment dialog
  const [selectedWorkforceGroups, setSelectedWorkforceGroups] = useState<WorkforceGroup[]>([]);

  // Fetch users from database
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      
      // Fetch profiles with user roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user_id to role
      const roleMap = new Map(userRoles?.map(r => [r.user_id, r.role]) || []);

      // Transform profiles to User type
      const transformedUsers: User[] = (profiles || []).map((profile) => ({
        id: profile.id,
        organization_id: profile.organization_id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: roleMap.get(profile.user_id) || 'workforce_user',
        workforce_groups: (profile.workforce_groups || []) as WorkforceGroup[],
        status: profile.status as UserStatus,
        mfa_enabled: profile.mfa_enabled,
        is_contractor: profile.is_contractor,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      }));

      setUsers(transformedUsers);
    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message || "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = users.filter((u) => u.status === "pending_assignment").length;

  const handleAddUser = () => {
    if (!newUser.email || !newUser.first_name || !newUser.last_name || newUser.workforce_groups.length === 0) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields including at least one workforce group.",
        variant: "destructive",
      });
      return;
    }

    const newUserData: User = {
      id: `user-${Date.now()}`,
      organization_id: "org-1",
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      role: "workforce_user",
      workforce_groups: newUser.workforce_groups,
      status: "active",
      mfa_enabled: false,
      is_contractor: newUser.is_contractor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUsers([...users, newUserData]);
    setIsAddDialogOpen(false);
    setNewUser({
      email: "",
      first_name: "",
      last_name: "",
      workforce_groups: [],
      is_contractor: false,
    });

    toast({
      title: "User Added",
      description: `${newUserData.first_name} ${newUserData.last_name} has been added with ${newUserData.workforce_groups.length} workforce group(s).`,
    });
  };

  const handleAssignWorkforce = (groups: WorkforceGroup[]) => {
    if (!selectedUser || groups.length === 0) return;

    setUsers(
      users.map((u) =>
        u.id === selectedUser.id
          ? { ...u, workforce_groups: groups, status: "active" as UserStatus }
          : u
      )
    );

    setIsAssignDialogOpen(false);
    setSelectedWorkforceGroups([]);
    toast({
      title: "Workforce Groups Assigned",
      description: `${selectedUser.first_name} ${selectedUser.last_name} has been assigned to ${groups.length} workforce group(s).`,
    });
    setSelectedUser(null);
  };

  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "pending_assignment":
        return <Clock className="h-4 w-4 text-warning" />;
      case "suspended":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <DashboardLayout userRole="org_admin" userName="Sarah Johnson">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage workforce members and assign training paths
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setIsTrainingDialogOpen(true)}
            >
              <BookOpen className="h-4 w-4" />
              Assign Training
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Add a workforce member and assign their training path. Workforce group is required per 45 CFR §164.530(b).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={newUser.first_name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, first_name: e.target.value })
                      }
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={newUser.last_name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, last_name: e.target.value })
                      }
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="john.doe@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Workforce Groups *</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                    {(Object.keys(WORKFORCE_GROUP_LABELS) as WorkforceGroup[]).map((group) => (
                      <label
                        key={group}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={newUser.workforce_groups.includes(group)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewUser({ ...newUser, workforce_groups: [...newUser.workforce_groups, group] });
                            } else {
                              setNewUser({ ...newUser, workforce_groups: newUser.workforce_groups.filter(g => g !== group) });
                            }
                          }}
                        />
                        <span className="text-sm">{WORKFORCE_GROUP_LABELS[group]}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select all applicable workforce groups. This determines which training materials and quizzes apply.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_contractor"
                    checked={newUser.is_contractor}
                    onCheckedChange={(checked) =>
                      setNewUser({ ...newUser, is_contractor: checked as boolean })
                    }
                  />
                  <Label htmlFor="is_contractor" className="text-sm font-normal">
                    This user is a contractor
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser}>Add User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Training Assignment Dialog */}
        <TrainingAssignmentDialog
          open={isTrainingDialogOpen}
          onOpenChange={setIsTrainingDialogOpen}
        />

        {/* Pending Assignment Alert */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <Clock className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="font-medium text-warning">
                {pendingCount} user{pendingCount > 1 ? "s" : ""} pending workforce assignment
              </p>
              <p className="text-sm text-muted-foreground">
                These users cannot access training until assigned to a workforce group.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-warning/30 text-warning hover:bg-warning/10"
              onClick={() => setFilterStatus("pending_assignment")}
            >
              View Pending
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value as UserStatus | "all")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {USER_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Workforce Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No users found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent font-medium">
                        {user.first_name.charAt(0)}
                        {user.last_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                          {user.is_contractor && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Contractor)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.workforce_groups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.workforce_groups.map((group) => (
                          <WorkforceGroupBadge key={group} group={group} size="sm" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Not assigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(user.status)}
                      <span
                        className={cn(
                          "text-sm",
                          user.status === "active" && "text-success",
                          user.status === "pending_assignment" && "text-warning",
                          user.status === "suspended" && "text-destructive"
                        )}
                      >
                        {USER_STATUS_LABELS[user.status]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-sm",
                        user.role === "org_admin" && "font-medium text-accent"
                      )}
                    >
                      {user.role === "org_admin" ? "Admin" : "User"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.mfa_enabled ? (
                      <Shield className="h-4 w-4 text-success" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Off</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.status === "pending_assignment" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsAssignDialogOpen(true);
                        }}
                      >
                        Assign Group
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* HIPAA Notice */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p>
            Workforce assignments are required per{" "}
            <a
              href="https://www.law.cornell.edu/cfr/text/45/164.308"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              45 CFR §164.308(a)(3)
            </a>{" "}
            to ensure appropriate access to PHI based on job function.
          </p>
        </div>
      </div>

      {/* Assign Workforce Groups Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
        setIsAssignDialogOpen(open);
        if (!open) setSelectedWorkforceGroups([]);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Workforce Groups</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Select one or more workforce groups for{" "}
                  <strong>
                    {selectedUser.first_name} {selectedUser.last_name}
                  </strong>
                  . This determines their training path and quiz requirements.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-80 overflow-y-auto">
            {(Object.keys(WORKFORCE_GROUP_LABELS) as WorkforceGroup[]).map((group) => (
              <label
                key={group}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border border-border p-4 cursor-pointer transition-colors",
                  selectedWorkforceGroups.includes(group) 
                    ? "border-accent/50 bg-accent/5" 
                    : "hover:border-muted-foreground/30 hover:bg-muted/50"
                )}
              >
                <Checkbox
                  checked={selectedWorkforceGroups.includes(group)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedWorkforceGroups([...selectedWorkforceGroups, group]);
                    } else {
                      setSelectedWorkforceGroups(selectedWorkforceGroups.filter(g => g !== group));
                    }
                  }}
                />
                <WorkforceGroupBadge group={group} />
                <span className="text-sm text-muted-foreground flex-1">
                  {group === "all_staff" && "Core HIPAA training for all workforce members"}
                  {group === "clinical" && "Healthcare providers handling patient care"}
                  {group === "administrative" && "Billing and administrative personnel"}
                  {group === "management" && "Leadership and compliance oversight"}
                  {group === "it" && "IT and security professionals"}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAssignDialogOpen(false);
              setSelectedWorkforceGroups([]);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleAssignWorkforce(selectedWorkforceGroups)}
              disabled={selectedWorkforceGroups.length === 0}
            >
              Assign {selectedWorkforceGroups.length > 0 && `(${selectedWorkforceGroups.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
