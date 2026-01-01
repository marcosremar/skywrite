"use client";

import { useState, useEffect, useCallback } from "react";

export interface Rule {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: string;
  pattern: string;
  section: string | null;
  severity: string;
  weight: number;
  isEnabled: boolean;
  isBuiltIn: boolean;
  referenceFile?: {
    id: string;
    name: string;
    originalName: string;
  } | null;
}

export interface ReferenceFile {
  id: string;
  name: string;
  originalName: string;
  status: string;
  processedAt: string | null;
  rules: Array<{
    id: string;
    name: string;
    isEnabled: boolean;
  }>;
  _count: {
    rules: number;
  };
}

interface UseRulesOptions {
  projectId?: string;
  category?: string;
  type?: string;
}

export function useRules(options: UseRulesOptions = {}) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.projectId) params.append("projectId", options.projectId);
      if (options.category) params.append("category", options.category);
      if (options.type) params.append("type", options.type);

      const response = await fetch(`/api/rules?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch rules");

      const data = await response.json();
      setRules(data.rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [options.projectId, options.category, options.type]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const createRule = async (rule: Omit<Rule, "id" | "isBuiltIn" | "type">) => {
    try {
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, projectId: options.projectId }),
      });

      if (!response.ok) throw new Error("Failed to create rule");

      const data = await response.json();
      setRules((prev) => [...prev, data.rule]);
      return data.rule;
    } catch (err) {
      throw err;
    }
  };

  const updateRule = async (id: string, updates: Partial<Rule>) => {
    try {
      const response = await fetch(`/api/rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update rule");

      const data = await response.json();
      setRules((prev) =>
        prev.map((r) => (r.id === id ? data.rule : r))
      );
      return data.rule;
    } catch (err) {
      throw err;
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const response = await fetch(`/api/rules/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete rule");

      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const toggleRule = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      await updateRule(id, { isEnabled: !rule.isEnabled });
    }
  };

  return {
    rules,
    loading,
    error,
    refetch: fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
}

export function useReferenceFiles(projectId?: string) {
  const [files, setFiles] = useState<ReferenceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);

      const response = await fetch(`/api/reference-files?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch reference files");

      const data = await response.json();
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      if (projectId) formData.append("projectId", projectId);

      const response = await fetch("/api/reference-files", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      setFiles((prev) => [data.file, ...prev]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    try {
      const response = await fetch(`/api/reference-files/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete file");

      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    files,
    loading,
    uploading,
    error,
    refetch: fetchFiles,
    uploadFile,
    deleteFile,
  };
}
