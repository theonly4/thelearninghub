import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock users data
const mockUsers: User[] = [
  {
    id: "1",
    organization_id: "org-1",
    email: "john.doe@demo.com",
    first_name: "John",
    last_name: "Doe",
    role: "workforce_user",
    workforce_group: "clinical",
    status: "active",
    mfa_enabled: true,
    is_contractor: false,
    created_at: "2024-11-01T10:00:00Z",
    updated_at: "2024-12-15T14:30:00Z",
  },
  {
    id: "2",
    organization_id: "org-1",
    email: "jane.smith@demo.com",
    first_name: "Jane",
    last_name: "Smith",
    role: "workforce_user",
    workforce_group: "administrative",
    status: "active",
    mfa_enabled: true,
    is_contractor: false,
    created_at: "2024-10-15T09:00:00Z",
    updated_at: "2024-12-10T11:20:00Z",
  },
  {
    id: "3",
    organization_id: "org-1",
    email: "bob.wilson@demo.com",
    first_name: "Bob",
    last_name: "Wilson",
    role: "workforce_user",
    workforce_group: null,
    status: "pending_assignment",
    mfa_enabled: false,
    is_contractor: true,
    created_at: "2024-12-20T08:00:00Z",
    updated_at: "2024-12-20T08:00:00Z",
  },
  {
    id: "4",
    organization_id: "org-1",
    email: "sarah.johnson@demo.com",
    first_name: "Sarah",
    last_name: "Johnson",
    role: "org_admin",
    workforce_group: "management",
    status: "active",
    mfa_enabled: true,
    is_contractor: false,
    created_at: "2024-09-01T10:00:00Z",
    updated_at: "2024-12-01T16:00:00Z",
  },
  {
    id: "5",
    organization_id: "org-1",
    email: "mike.tech@demo.com",
    first_name: "Mike",
    last_name: "Chen",
    role: "workforce_user",
    workforce_group: "it",
    status: "active",
    mfa_enabled: true,
    is_contractor: false,
    created_at: "2024-11-15T09:00:00Z",
    updated_at: "2024-12-18T10:00:00Z",
  },
];

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<UserStatus | "all">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // New user form state
  const [newUser, setNewUser] = useState({
    email: "",
    first_name: "",
    last_name: "",
    workforce_group: "" as WorkforceGroup | "",
    is_contractor: false,
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = users.filter((u) => u.status === "pending_assignment").length;

  const handleAddUser = () => {
    if (!newUser.email || !newUser.first_name || !newUser.last_name || !newUser.workforce_group) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields including workforce group.",
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
      workforce_group: newUser.workforce_group as WorkforceGroup,
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
      workforce_group: "",
      is_contractor: false,
    });

    toast({
      title: "User Added",
      description: `${newUserData.first_name} ${newUserData.last_name} has been added with workforce group: ${WORKFORCE_GROUP_LABELS[newUserData.workforce_group!]}.`,
    });
  };

  const handleAssignWorkforce = (workforceGroup: WorkforceGroup) => {
    if (!selectedUser) return;

    setUsers(
      users.map((u) =>
        u.id === selectedUser.id
          ? { ...u, workforce_group: workforceGroup, status: "active" as UserStatus }
          : u
      )
    );

    setIsAssignDialogOpen(false);
    toast({
      title: "Workforce Group Assigned",
      description: `${selectedUser.first_name} ${selectedUser.last_name} has been assigned to ${WORKFORCE_GROUP_LABELS[workforceGroup]}.`,
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
                  <Label htmlFor="workforce_group">Workforce Group *</Label>
                  <Select
                    value={newUser.workforce_group}
                    onValueChange={(value) =>
                      setNewUser({ ...newUser, workforce_group: value as WorkforceGroup })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select workforce group" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(WORKFORCE_GROUP_LABELS) as WorkforceGroup[]).map(
                        (group) => (
                          <SelectItem key={group} value={group}>
                            {WORKFORCE_GROUP_LABELS[group]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Determines which training materials and quizzes apply to this user.
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
              {filteredUsers.map((user) => (
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
                    {user.workforce_group ? (
                      <WorkforceGroupBadge group={user.workforce_group} size="sm" />
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
              ))}
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

      {/* Assign Workforce Group Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Workforce Group</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Assign a workforce group to{" "}
                  <strong>
                    {selectedUser.first_name} {selectedUser.last_name}
                  </strong>
                  . This determines their training path and quiz requirements.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {(Object.keys(WORKFORCE_GROUP_LABELS) as WorkforceGroup[]).map((group) => (
              <button
                key={group}
                onClick={() => handleAssignWorkforce(group)}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent/5"
              >
                <WorkforceGroupBadge group={group} />
                <span className="text-sm text-muted-foreground flex-1">
                  {group === "all_staff" && "Core HIPAA training for all workforce members"}
                  {group === "clinical" && "Healthcare providers handling patient care"}
                  {group === "administrative" && "Billing and administrative personnel"}
                  {group === "management" && "Leadership and compliance oversight"}
                  {group === "it" && "IT and security professionals"}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
