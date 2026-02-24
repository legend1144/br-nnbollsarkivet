"use client";

import { useState } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: "member" | "referee" | "admin";
};

type Props = {
  initialUsers: UserRow[];
};

const roles: Array<UserRow["role"]> = ["member", "referee", "admin"];

export function UserRoleManager({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [status, setStatus] = useState("");

  async function updateRole(userId: string, role: UserRow["role"]) {
    setStatus("");
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      setStatus("Kunde inte uppdatera roll.");
      return;
    }
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
    setStatus("Roll uppdaterad.");
  }

  return (
    <section className="panel panel-row p-5">
      <h1 className="text-2xl font-bold">Anvandare och roller</h1>
      {status && <p className="mt-2 text-sm text-cyan-200">{status}</p>}
      <ul className="admin-list mt-4 space-y-2">
        {users.map((user) => (
          <li key={user.id} className="admin-row card-minimal rounded-sm border border-slate-700/80 p-3">
            <div>
              <p className="font-medium">{user.name ?? "Namn saknas"}</p>
              <p className="text-sm text-slate-300">{user.email}</p>
            </div>
            <select
              className="input w-auto min-w-36 admin-row__control"
              value={user.role}
              onChange={(event) => updateRole(user.id, event.target.value as UserRow["role"])}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}
