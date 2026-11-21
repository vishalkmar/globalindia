"use client";

import { Mail, Pencil, UserPlus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { DataTable } from "@/components/admin/DataTable";
import { FormBuilder, useZodForm } from "@/components/admin/FormBuilder";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Alert } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";

const ROLE_OPTIONS = [
  { value: "EDITOR", label: "Editor — edits pages, products and enquiries" },
  { value: "VIEWER", label: "Viewer — read only" },
  { value: "SUPER_ADMIN", label: "Super admin — everything, including users and security" },
];
const ROLE_SHORT = { SUPER_ADMIN: "Super admin", EDITOR: "Editor", VIEWER: "Viewer" };
const STATUS_TONE = { ACTIVE: "success", INVITED: "accent", DISABLED: "error" };

// Same rules as the server schema (src/lib/admin/users.js); the server validates again.
const inviteClientSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["SUPER_ADMIN", "EDITOR", "VIEWER"], { message: "Choose a role." }),
});
const editClientSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80),
  role: z.enum(["SUPER_ADMIN", "EDITOR", "VIEWER"]),
  status: z.enum(["ACTIVE", "DISABLED", "INVITED"]),
});

const when = (d) => (d ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d)) : "Never");

function InviteDialog({ open, onClose, onDone }) {
  const form = useZodForm(inviteClientSchema, { name: "", email: "", role: "EDITOR" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    const v = form.validate();
    if (!v.ok) return;
    setBusy(true);
    setError("");
    const res = await adminJson("/api/admin/users", { method: "POST", json: v.data });
    setBusy(false);
    if (!res.ok) {
      form.setErrors(res.data?.fields ?? {});
      return setError(res.data?.error ?? "Could not send the invite.");
    }
    onDone(res.data.user);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Invite a user" description="They get an email link to set a password, then add an authenticator app.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <FormBuilder
          form={form}
          columns={1}
          fields={[
            { name: "name", label: "Full name", required: true, autoComplete: "name" },
            { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
            { name: "role", label: "Role", type: "select", options: ROLE_OPTIONS },
          ]}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            <Mail aria-hidden="true" /> Send invite
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditDialog({ user, me, onClose, onDone }) {
  const form = useZodForm(editClientSchema, { name: user.name, role: user.role, status: user.status });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const self = user.id === me.id;

  async function submit(e) {
    e.preventDefault();
    const v = form.validate();
    if (!v.ok) return;
    const body = {};
    if (v.data.name !== user.name) body.name = v.data.name;
    if (!self && v.data.role !== user.role) body.role = v.data.role;
    if (!self && v.data.status !== user.status && v.data.status !== "INVITED") body.status = v.data.status;
    if (!Object.keys(body).length) return onClose();
    setBusy(true);
    setError("");
    const res = await adminJson(`/api/admin/users/${user.id}`, { method: "PATCH", json: body });
    setBusy(false);
    if (!res.ok) return setError(res.data?.error ?? "Could not save.");
    onDone(res.data.user);
  }

  async function resend() {
    setBusy(true);
    const res = await adminJson(`/api/admin/users/${user.id}/invite`, { method: "POST", json: {} });
    setBusy(false);
    if (!res.ok) return setError(res.data?.error ?? "Could not resend.");
    onDone(user, "Invite sent again.");
  }

  const statusOptions =
    user.status === "INVITED"
      ? [{ value: "INVITED", label: "Invited — waiting for password" }]
      : [
          { value: "ACTIVE", label: "Active" },
          { value: "DISABLED", label: "Disabled — cannot sign in" },
        ];

  return (
    <Dialog open onClose={onClose} title={`Edit ${user.email}`} description={self ? "You cannot change your own role or status." : "Role and status changes sign this user out everywhere."}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <FormBuilder
          form={form}
          columns={1}
          fields={[
            { name: "name", label: "Full name", required: true },
            { name: "role", label: "Role", type: "select", options: ROLE_OPTIONS, disabled: self },
            { name: "status", label: "Status", type: "select", options: statusOptions, disabled: self || user.status === "INVITED" },
          ]}
        />
        <div className="flex flex-wrap justify-between gap-2">
          {user.status === "INVITED" ? (
            <Button variant="secondary" onClick={resend} disabled={busy}>
              <Mail aria-hidden="true" /> Resend invite
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

export function UsersManager({ me }) {
  const toast = useToast();
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const columns = [
    {
      key: "email",
      label: "User",
      sortable: true,
      render: (u) => (
        <span className="flex flex-col">
          <span className="font-semibold text-ink">{u.name || "—"}</span>
          <span className="text-muted">{u.email}</span>
        </span>
      ),
    },
    { key: "role", label: "Role", sortable: true, render: (u) => ROLE_SHORT[u.role] },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (u) => (
        <span className="flex flex-wrap gap-1">
          <Badge tone={STATUS_TONE[u.status]}>{u.status.charAt(0) + u.status.slice(1).toLowerCase()}</Badge>
          {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? <Badge tone="error">Locked</Badge> : null}
        </span>
      ),
    },
    {
      key: "mfa",
      label: "Sign-in",
      render: (u) => (u.mfaSetupAt ? [u.totpEnabled && "App", u.emailOtpEnabled && "Email"].filter(Boolean).join(" + ") : <span className="text-muted">Setup pending</span>),
    },
    { key: "lastLoginAt", label: "Last sign-in", sortable: true, render: (u) => <span className="text-muted">{when(u.lastLoginAt)}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (u) => (
        <Button size="sm" variant="ghost" onClick={() => setEditing(u)} aria-label={`Edit ${u.email}`}>
          <Pencil aria-hidden="true" /> Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setInviting(true)}>
          <UserPlus aria-hidden="true" /> Invite user
        </Button>
      </div>
      <DataTable
        caption="Admin users"
        endpoint="/api/admin/users"
        columns={columns}
        reloadKey={reloadKey}
        searchPlaceholder="Search by name or email"
        filters={[
          { key: "role", label: "Roles", options: Object.entries(ROLE_SHORT).map(([value, label]) => ({ value, label })) },
          {
            key: "status",
            label: "Statuses",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "INVITED", label: "Invited" },
              { value: "DISABLED", label: "Disabled" },
            ],
          },
        ]}
        empty={{ title: "No users yet" }}
      />
      {inviting ? (
        <InviteDialog
          open
          onClose={() => setInviting(false)}
          onDone={(u) => {
            setInviting(false);
            setReloadKey((k) => k + 1);
            toast.success(`Invite sent to ${u.email}.`);
          }}
        />
      ) : null}
      {editing ? (
        <EditDialog
          user={editing}
          me={me}
          onClose={() => setEditing(null)}
          onDone={(u, msg) => {
            setEditing(null);
            setReloadKey((k) => k + 1);
            toast.success(msg ?? `Saved changes for ${u.email}.`);
          }}
        />
      ) : null}
    </div>
  );
}
