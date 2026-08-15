"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { BranchResponse } from "@qrmenu/shared";

type FormKey =
  | "name"
  | "tagline"
  | "description"
  | "phone"
  | "address"
  | "mapUrl"
  | "wifiSsid"
  | "wifiPassword"
  | "instagramUrl"
  | "facebookUrl"
  | "whatsappNumber";
type ProfileForm = Record<FormKey, string>;

const emptyForm: ProfileForm = {
  name: "",
  tagline: "",
  description: "",
  phone: "",
  address: "",
  mapUrl: "",
  wifiSsid: "",
  wifiPassword: "",
  instagramUrl: "",
  facebookUrl: "",
  whatsappNumber: "",
};

export default function BranchProfilePage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiClient
      .fetchBranches()
      .then((branches) => {
        const branch = branches.find(
          (item: BranchResponse) => item.id === branchId,
        );
        if (!branch) return;
        setForm({
          name: branch.name,
          tagline: branch.tagline || "",
          description: branch.description || "",
          phone: branch.phone || "",
          address: branch.address || "",
          mapUrl: branch.mapUrl || "",
          wifiSsid: branch.wifiSsid || "",
          wifiPassword: branch.wifiPassword || "",
          instagramUrl: branch.instagramUrl || "",
          facebookUrl: branch.facebookUrl || "",
          whatsappNumber: branch.whatsappNumber || "",
        });
      })
      .catch(() => setMessage("Unable to load branch profile."))
      .finally(() => setLoading(false));
  }, [branchId]);

  const setValue = (key: FormKey, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          key === "name" ? value.trim() : value.trim() || null,
        ]),
      );
      await apiClient.updateBranch(branchId, { ...payload, setupStep: 5 });
      setMessage("Public profile saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div style={{ padding: "2rem" }}>Loading branch profile...</div>;
  return (
    <form onSubmit={save} style={{ maxWidth: "760px" }}>
      <button
        type="button"
        className="btn"
        onClick={() => router.push("/admin/branches")}
      >
        Back to branches
      </button>
      <h1>Public branch profile</h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Information shown on the public menu, share link, and QR landing page.
      </p>
      {message && <p role="status">{message}</p>}
      <div style={{ display: "grid", gap: "1rem" }}>
        {(
          [
            ["name", "Branch name"],
            ["tagline", "Short tagline"],
            ["phone", "Phone number"],
            ["whatsappNumber", "WhatsApp number"],
            ["address", "Address"],
            ["mapUrl", "Google Maps URL"],
            ["wifiSsid", "Wi-Fi network name"],
            ["wifiPassword", "Wi-Fi password"],
            ["instagramUrl", "Instagram URL"],
            ["facebookUrl", "Facebook URL"],
          ] as [FormKey, string][]
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              className="input"
              value={form[key]}
              onChange={(event) => setValue(key, event.target.value)}
            />
          </label>
        ))}
        <label>
          About this branch
          <textarea
            className="input"
            rows={5}
            value={form.description}
            onChange={(event) => setValue("description", event.target.value)}
          />
        </label>
      </div>
      <button
        className="btn btn-primary"
        disabled={saving}
        style={{ marginTop: "1.5rem" }}
      >
        {saving ? "Saving..." : "Save public profile"}
      </button>
    </form>
  );
}
