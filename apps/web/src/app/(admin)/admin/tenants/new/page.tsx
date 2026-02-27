'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { tenantsApi } from '@/lib/api';

export default function NewTenantPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim(),
      );
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setError('');
    setSaving(true);

    try {
      const res = await tenantsApi.create(accessToken, { name: name.trim(), slug: slug.trim() });
      router.push(`/admin/tenants/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => router.push('/admin/tenants')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Organizations
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">New Organization</span>
      </div>

      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Create Organization</h1>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Organization Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input-field"
                placeholder="e.g. Acme Security Corp"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="slug" className="label">
                Slug (URL identifier)
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setSlug(e.target.value);
                }}
                className="input-field font-mono text-sm"
                placeholder="e.g. acme-security"
                required
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
              />
              <p className="text-xs text-gray-400 mt-1">
                Lowercase letters, numbers, and hyphens only. Must be unique.
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Creating...' : 'Create Organization'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/tenants')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
