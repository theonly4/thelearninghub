import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { CredentialEmailTemplate } from "@/components/CredentialEmailTemplate";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import {
  WorkforceGroup,
  UserStatus,
  WORKFORCE_GROUP_LABELS,
} from "@/types/hipaa";
import {
  Search,
  UserPlus,
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  KeyRound,
  Trash2,
  Copy,
  BookOpen,
  Upload,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SingleEmployeeAssignmentDialog } from "@/components/admin/SingleEmployeeAssignmentDialog";

interface Employee {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  workforce_groups: WorkforceGroup[];
  status: UserStatus;
  mfa_enabled: boolean;
  is_contractor: boolean;
}

interface CSVEmployee {
  first_name: string;
  last_name: string;
  email: string;
  workforce_group?: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCSVDialogOpen, setIsCSVDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  
  // CSV import state
  const [csvData, setCsvData] = useState<CSVEmployee[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResults, setCsvResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    firstName: "",
    lastName: "",
    workforceGroups: [] as WorkforceGroup[],
    isContractor: false,
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      
      // Get current user's org
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Fetch employees in org (exclude current user)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .neq('user_id', user.id);

      if (error) throw error;

      const employeeList: Employee[] = (profiles || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        email: p.email,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        workforce_groups: (p.workforce_groups || []) as WorkforceGroup[],
        status: p.status as UserStatus,
        mfa_enabled: p.mfa_enabled || false,
        is_contractor: p.is_contractor || false,
      }));

      setEmployees(employeeList);
    } catch (error: any) {
      toast({
        title: "Error loading employees",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddEmployee = async () => {
    if (!newEmployee.email || !newEmployee.firstName || !newEmployee.lastName) {
      toast({
        title: "Missing Fields",
        description: "Please fill in email, first name, and last name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('manage-employee', {
        body: {
          action: 'create',
          email: newEmployee.email,
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          workforceGroups: newEmployee.workforceGroups,
          isContractor: newEmployee.isContractor,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      // Show credentials
      setCredentials({
        email: newEmployee.email,
        password: response.data.temporaryPassword,
      });
      setIsAddDialogOpen(false);
      setIsCredentialsDialogOpen(true);
      
      // Reset form
      setNewEmployee({
        email: "",
        firstName: "",
        lastName: "",
        workforceGroups: [],
        isContractor: false,
      });
      
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: "Failed to add employee",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (emp: Employee) => {
    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke('manage-employee', {
        body: {
          action: 'reset_password',
          employeeUserId: emp.user_id,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setCredentials({
        email: emp.email,
        password: response.data.newPassword,
      });
      setIsCredentialsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    
    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke('manage-employee', {
        body: {
          action: 'delete',
          employeeUserId: selectedEmployee.user_id,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: "Employee deleted",
        description: `${selectedEmployee.first_name} ${selectedEmployee.last_name} has been removed.`,
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: "Failed to delete employee",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
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

  // CSV Import handlers
  const handleCSVFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData: CSVEmployee[] = results.data.map((row: any) => ({
          first_name: row.first_name || row.firstName || row['First Name'] || '',
          last_name: row.last_name || row.lastName || row['Last Name'] || '',
          email: row.email || row.Email || '',
          workforce_group: row.workforce_group || row.workforceGroup || row['Workforce Group'] || '',
        })).filter((emp: CSVEmployee) => emp.email && emp.first_name && emp.last_name);

        if (parsedData.length === 0) {
          toast({
            title: "Invalid CSV",
            description: "No valid employee records found. Ensure columns: first_name, last_name, email",
            variant: "destructive",
          });
          return;
        }

        setCsvData(parsedData);
        setIsCSVDialogOpen(true);
        setCsvResults({ success: 0, failed: 0, errors: [] });
      },
      error: (error) => {
        toast({
          title: "CSV Parse Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCSVImport = async () => {
    setCsvImporting(true);
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const emp of csvData) {
      try {
        // Map workforce group string to enum value
        let workforceGroups: WorkforceGroup[] = [];
        if (emp.workforce_group) {
          const groupKey = Object.entries(WORKFORCE_GROUP_LABELS).find(
            ([key, label]) => label.toLowerCase() === emp.workforce_group?.toLowerCase() || key === emp.workforce_group?.toLowerCase()
          )?.[0] as WorkforceGroup | undefined;
          if (groupKey) {
            workforceGroups = [groupKey];
          }
        }

        const response = await supabase.functions.invoke('manage-employee', {
          body: {
            action: 'create',
            email: emp.email,
            firstName: emp.first_name,
            lastName: emp.last_name,
            workforceGroups,
            isContractor: false,
          },
        });

        if (response.error || response.data?.error) {
          results.failed++;
          results.errors.push(`${emp.email}: ${response.data?.error || response.error?.message}`);
        } else {
          results.success++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${emp.email}: ${error.message}`);
      }
    }

    setCsvResults(results);
    setCsvImporting(false);

    if (results.success > 0) {
      fetchEmployees();
      toast({
        title: "Import Complete",
        description: `Successfully imported ${results.success} employee(s). ${results.failed > 0 ? `${results.failed} failed.` : ''}`,
      });
    }
  };

  return (
    <DashboardLayout userRole="org_admin" userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-muted-foreground">Manage your organization's workforce</p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleCSVFileSelect}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Workforce Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {employees.length === 0 ? "No employees yet. Add your first employee above." : "No employees match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent font-medium">
                          {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">
                            {emp.first_name} {emp.last_name}
                            {emp.is_contractor && <span className="ml-2 text-xs text-muted-foreground">(Contractor)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {emp.workforce_groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {emp.workforce_groups.map((g) => (
                            <WorkforceGroupBadge key={g} group={g} size="sm" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(emp.status)}
                        <span className={cn(
                          "text-sm",
                          emp.status === "active" && "text-success",
                          emp.status === "pending_assignment" && "text-warning",
                          emp.status === "suspended" && "text-destructive"
                        )}>
                          {emp.status === "active" ? "Active" : emp.status === "pending_assignment" ? "Pending" : "Suspended"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {emp.mfa_enabled ? (
                        <Shield className="h-4 w-4 text-success" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Off</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Assign Training"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsAssignDialogOpen(true);
                          }}
                          disabled={emp.workforce_groups.length === 0}
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset Password"
                          onClick={() => handleResetPassword(emp)}
                          disabled={isSubmitting}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Employee"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Create an account for a new employee. You'll receive their temporary password to share with them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={newEmployee.firstName}
                  onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={newEmployee.lastName}
                  onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                placeholder="john.doe@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Workforce Groups</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {(Object.keys(WORKFORCE_GROUP_LABELS) as WorkforceGroup[]).map((group) => (
                  <label key={group} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={newEmployee.workforceGroups.includes(group)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewEmployee({ ...newEmployee, workforceGroups: [...newEmployee.workforceGroups, group] });
                        } else {
                          setNewEmployee({ ...newEmployee, workforceGroups: newEmployee.workforceGroups.filter(g => g !== group) });
                        }
                      }}
                    />
                    <span className="text-sm">{WORKFORCE_GROUP_LABELS[group]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="contractor"
                checked={newEmployee.isContractor}
                onCheckedChange={(checked) => setNewEmployee({ ...newEmployee, isContractor: !!checked })}
              />
              <Label htmlFor="contractor" className="font-normal">This employee is a contractor</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEmployee} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Employee Credentials</DialogTitle>
            <DialogDescription>
              Share these credentials with the employee. They should change their password after first login.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex gap-2">
                  <Input value={credentials.email} readOnly className="bg-muted" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(credentials.email)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex gap-2">
                  <Input value={credentials.password} readOnly className="bg-muted font-mono" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(credentials.password)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                ⚠️ Save these credentials now. The password cannot be retrieved later.
              </div>
              
              {/* Email Template */}
              <div className="border-t pt-4">
                <CredentialEmailTemplate
                  recipientName={newEmployee.firstName || credentials.email.split('@')[0]}
                  email={credentials.email}
                  password={credentials.password}
                  isPasswordReset={!newEmployee.firstName}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => {
              setIsCredentialsDialogOpen(false);
              setCredentials(null);
            }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedEmployee?.first_name} {selectedEmployee?.last_name}'s account and all their training records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Training Assignment Dialog */}
      <SingleEmployeeAssignmentDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        employee={selectedEmployee}
      />

      {/* CSV Import Dialog */}
      <Dialog open={isCSVDialogOpen} onOpenChange={setIsCSVDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import Employees from CSV
            </DialogTitle>
            <DialogDescription>
              Review the parsed data before importing. {csvData.length} employee(s) found.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Preview Table */}
            <div className="max-h-64 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Workforce Group</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.map((emp, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{emp.first_name}</TableCell>
                      <TableCell>{emp.last_name}</TableCell>
                      <TableCell className="font-mono text-sm">{emp.email}</TableCell>
                      <TableCell>
                        {emp.workforce_group ? (
                          <span className="text-sm">{emp.workforce_group}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Not specified</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Import Results */}
            {csvResults.success > 0 || csvResults.failed > 0 ? (
              <div className="space-y-2">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>{csvResults.success} imported successfully</span>
                  </div>
                  {csvResults.failed > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span>{csvResults.failed} failed</span>
                    </div>
                  )}
                </div>
                {csvResults.errors.length > 0 && (
                  <div className="max-h-24 overflow-auto rounded border bg-destructive/10 p-2 text-sm">
                    {csvResults.errors.map((err, idx) => (
                      <p key={idx} className="text-destructive">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* CSV Format Help */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-1">Expected CSV format:</p>
              <code className="text-xs">first_name,last_name,email,workforce_group</code>
              <p className="text-muted-foreground mt-1 text-xs">
                Workforce group values: all_staff, clinical, administrative, management, it
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCSVDialogOpen(false); setCsvData([]); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCSVImport} 
              disabled={csvImporting || csvData.length === 0}
              className="gap-2"
            >
              {csvImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {csvData.length} Employee(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
