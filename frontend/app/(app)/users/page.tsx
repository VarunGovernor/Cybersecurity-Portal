"use client";
import { useEffect, useState, useCallback } from "react";
import { UserPlus, Trash2, Shield, Eye, Edit2, X } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { usersApi } from "@/lib/api";
import { User, UserRole } from "@/types";
import { fmtDate, fmtRelative } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

function RoleBadge({ role }: { role: UserRole }) {
  const cls = {
    admin:   "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
    analyst: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    viewer:  "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  }[role];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border uppercase tracking-wide ${cls}`}>
      {role === "admin" && <Shield size={10} />}
      {role}
    </span>
  );
}

interface CreateUserForm {
  email: string; full_name: string; password: string; role: UserRole;
}
const EMPTY_FORM: CreateUserForm = { email: "", full_name: "", password: "", role: "analyst" };

export default function UsersPage() {
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<CreateUserForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { user: currentUser } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await usersApi.list()); }
    catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersApi.create(form);
      toast.success(`User ${form.email} created`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to create user");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) { toast.error("Cannot delete your own account"); return; }
    if (!confirm(`Delete ${user.email}?`)) return;
    try {
      await usersApi.delete(user.id);
      toast.success("User deleted");
      load();
    } catch { toast.error("Failed to delete user"); }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? "deactivated" : "activated"}`);
      load();
    } catch { toast.error("Update failed"); }
  };

  return (
    <div className="min-h-full">
      <Navbar
        title="User Management"
        subtitle={`${users.length} users`}
        onRefresh={load}
        refreshing={loading}
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <UserPlus size={13} />
            New User
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Create form */}
        {showForm && (
          <div className="bg-card border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Create New User</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "full_name", label: "Full Name", type: "text", placeholder: "Jane Smith" },
                { name: "email",     label: "Email",     type: "email", placeholder: "jane@company.com" },
                { name: "password",  label: "Password",  type: "password", placeholder: "••••••••" },
              ].map(({ name, label, type, placeholder }) => (
                <div key={name} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    required
                    value={(form as any)[name]}
                    onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                    className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="data-table w-full">
            <thead className="bg-muted/30">
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-muted animate-pulse rounded w-full max-w-[100px]" /></td>
                  ))}
                </tr>
              ))}
              {!loading && users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {user.full_name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><RoleBadge role={user.role} /></td>
                  <td>
                    <span className={`text-xs font-medium ${user.is_active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-muted-foreground">
                      {user.last_login ? fmtRelative(user.last_login) : "Never"}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-muted-foreground">{fmtDate(user.created_at)}</span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleActive(user)}
                        title={user.is_active ? "Deactivate" : "Activate"}
                        className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        disabled={user.id === currentUser?.id}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        title="Delete user"
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        disabled={user.id === currentUser?.id}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
