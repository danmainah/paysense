'use client';

import { useState } from 'react';
import type { Product } from '@/types';

type FormState = {
  name: string;
  price: string;
  category: string;
  description: string;
  inStock: boolean;
};

const EMPTY_FORM: FormState = { name: '', price: '', category: '', description: '', inStock: true };

export function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: String(p.price),
      category: p.category ?? '',
      description: p.description ?? '',
      inStock: p.inStock,
    });
    setStatus(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const price = Number(form.price);
    if (!form.name.trim()) return setStatus({ type: 'error', msg: 'Name is required.' });
    if (!Number.isInteger(price) || price <= 0)
      return setStatus({ type: 'error', msg: 'Price must be a positive whole number (KES).' });

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      price,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      inStock: form.inStock,
    };

    try {
      const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');

      if (editingId) {
        setProducts((prev) => prev.map((p) => (p.id === editingId ? (data as Product) : p)));
        setStatus({ type: 'success', msg: `Updated "${data.name}".` });
      } else {
        setProducts((prev) => [data as Product, ...prev]);
        setStatus({ type: 'success', msg: `Added "${data.name}".` });
      }
      resetForm();
    } catch (err: unknown) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Delete failed');
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) resetForm();
    } catch (err: unknown) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Delete failed' });
    }
  }

  async function toggleStock(p: Product) {
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock: !p.inStock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Update failed');
      setProducts((prev) => prev.map((x) => (x.id === p.id ? (data as Product) : x)));
    } catch (err: unknown) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Update failed' });
    }
  }

  return (
    <div className="space-y-8">
      {/* Create / edit form */}
      <form onSubmit={handleSubmit} className="bg-white border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">
          {editingId ? 'Edit product' : 'Add a product'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Samsung Galaxy A55"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Price (KES) *</label>
            <input
              type="number"
              min="1"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="42000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Phones"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
                className="rounded border-gray-300"
              />
              In stock
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="6.6-inch AMOLED, 256GB, 5000mAh battery…"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {status && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              status.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-100'
                : 'bg-red-50 text-red-800 border border-red-100'
            }`}
          >
            {status.type === 'success' ? '✅' : '❌'} {status.msg}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Product list */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Catalog ({products.length})</h2>
        {products.length === 0 ? (
          <p className="text-sm text-gray-400">No products yet. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-white border rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
                    {!p.inStock && (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                        Out of stock
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    KES {p.price.toLocaleString()}
                    {p.category ? ` · ${p.category}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleStock(p)}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title={p.inStock ? 'Mark out of stock' : 'Mark in stock'}
                  >
                    {p.inStock ? 'In stock' : 'Restock'}
                  </button>
                  <button
                    onClick={() => startEdit(p)}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProduct(p.id, p.name)}
                    className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
