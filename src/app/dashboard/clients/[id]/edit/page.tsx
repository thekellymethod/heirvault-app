'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Client {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  dateOfBirth?: string
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [formData, setFormData] = useState<Client>({
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fetch client data
  useEffect(() => {
    async function fetchClient() {
      try {
        const response = await fetch(`/api/clients/${id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch client')
        }
        const data = await response.json()
        
        // Format dateOfBirth for input field (YYYY-MM-DD)
        // Use local date formatting to avoid timezone issues
        const formattedDate = data.dateOfBirth
          ? (() => {
              const date = new Date(data.dateOfBirth);
              // Get local date components to avoid timezone shift
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            })()
          : ''

        setFormData({
          id: data.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          dateOfBirth: formattedDate,
        })
      } catch (err: any) {
        setError(err.message || 'Failed to load client data')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchClient()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update client')
      }

      // Redirect back to client detail page
      router.push(`/dashboard/clients/${id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to update client')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="p-8 max-w-2xl mx-auto">
        <div className="text-slateui-600">Loading client data...</div>
      </main>
    )
  }

  return (
    <main className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/clients/${id}`}
          className="text-slateui-600 hover:text-ink-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Edit Client</h1>
          <p className="text-sm text-slateui-600">Update client information</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slateui-200 bg-white p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-900 mb-1">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-slateui-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-slateui-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="client@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-ink-900 mb-1">
                First Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full rounded-lg border border-slateui-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-slateui-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="John"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-ink-900 mb-1">
                Last Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full rounded-lg border border-slateui-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-slateui-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-ink-900 mb-1">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-slateui-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-slateui-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-ink-900 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full rounded-lg border border-slateui-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-slateui-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href={`/dashboard/clients/${id}`}
            className="btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </main>
  )
}

