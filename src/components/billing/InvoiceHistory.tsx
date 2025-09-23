'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react'

interface Invoice {
  id: string
  number: string | null
  status: string | null
  amount: number
  currency: string
  created: string
  description: string
  pdfUrl: string | null
  hostedUrl: string | null
  paid: boolean
  periodStart: string | null
  periodEnd: string | null
}

export function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/stripe/invoices')
      if (!response.ok) {
        throw new Error('Failed to fetch invoices')
      }
      const data = await response.json()
      setInvoices(data.invoices)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string | null, paid: boolean) => {
    if (paid) {
      return <Badge variant="success" size="sm">Paid</Badge>
    }
    switch (status) {
      case 'open':
        return <Badge variant="warning" size="sm">Open</Badge>
      case 'void':
        return <Badge variant="gray" size="sm">Void</Badge>
      case 'uncollectible':
        return <Badge variant="error" size="sm">Uncollectible</Badge>
      default:
        return <Badge variant="gray" size="sm">{status || 'Unknown'}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Invoice History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
          </div>
        ) : error ? (
          <div className="text-sm text-error-600 py-4">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="text-sm text-text-secondary py-4">
            No invoices found. Invoices will appear here after your first payment.
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-background-alt-hover transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">
                      {invoice.number || invoice.id.slice(-8).toUpperCase()}
                    </span>
                    {getStatusBadge(invoice.status, invoice.paid)}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    {formatDate(invoice.created)}
                    {invoice.periodStart && invoice.periodEnd && (
                      <span className="ml-2">
                        ({formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">
                    ${invoice.amount.toFixed(2)} {invoice.currency}
                  </span>
                  <div className="flex items-center gap-2">
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-secondary hover:text-text-primary transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    {invoice.hostedUrl && (
                      <a
                        href={invoice.hostedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-secondary hover:text-text-primary transition-colors"
                        title="View Invoice"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}