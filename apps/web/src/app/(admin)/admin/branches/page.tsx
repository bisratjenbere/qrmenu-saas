"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { BranchResponse } from "@qrmenu/shared";
import { useRouter } from "next/navigation";
export default function Branches() {
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const router = useRouter();
  const fetchBranches = async () => {
    try {
      const data = await apiClient.fetchBranches();
      setBranches(data);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    fetchBranches();
  }, []);
  const handleCreate = async () => {
    try {
      const branch = await apiClient.createBranch({
        name: newBranchName,
        slug: newBranchName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      });
      setIsModalOpen(false);
      setNewBranchName("");
      router.push(`/admin/onboarding/${branch.id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create branch");
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1>Branches</h1>
        <button
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          Create Branch
        </button>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: "400px" }}>
            <h2>Create Branch</h2>
            <input
              type="text"
              placeholder="Branch Name"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                marginBottom: "1rem",
                background: "var(--color-admin-bg)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button className="btn" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1rem",
        }}
      >
        {branches.map((branch) => (
          <div
            key={branch.id}
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <h2 style={{ margin: 0 }}>{branch.name}</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              /{branch.slug}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {branch.setupStep !== 7 && (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() =>
                    router.push(
                      (branch.setupStep ?? 0) < 2
                        ? `/admin/onboarding/${branch.id}`
                        : `/admin/setup/${branch.id}`,
                    )
                  }
                >
                  Set up
                </button>
              )}
              <button
                className="btn"
                style={{ flex: 1, border: "1px solid var(--color-border)" }}
                onClick={() => router.push(`/admin/menus/${branch.id}`)}
              >
                Menu
              </button>
              <button
                className="btn"
                style={{ flex: 1, border: "1px solid var(--color-border)" }}
                onClick={() => router.push(`/admin/branches/${branch.id}`)}
              >
                Profile
              </button>
              <button
                className="btn"
                style={{ flex: 1, border: "1px solid var(--color-border)" }}
                onClick={() => router.push(`/admin/tables/${branch.id}`)}
              >
                Tables
              </button>
              <button
                className="btn"
                style={{ flex: 1, border: "1px solid var(--color-border)" }}
                onClick={() => router.push(`/admin/qr/${branch.id}`)}
              >
                QR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
