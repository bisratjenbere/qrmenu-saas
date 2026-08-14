'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { TenantInvoiceResponse, TenantResponse } from '@qrmenu/shared';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  Printer,
  DollarSign,
  FileCheck
} from 'lucide-react';

export default function SuperAdminBillingPage() {
  const [invoices, setInvoices] = useState<TenantInvoiceResponse[]>([]);
  const [tenants, setTenants] = useState<TenantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('2500');
  const [currency, setCurrency] = useState('ETB');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'TELEBIRR' | 'WIRE' | 'CASH'>('BANK_TRANSFER');
  const [submitting, setSubmitting] = useState(false);

  // New state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [invList, tenantList] = await Promise.all([
        apiClient.fetchInvoices(),
        apiClient.fetchTenants(),
      ]);
      setInvoices(invList);
      setTenants(tenantList);
      if (tenantList.length > 0 && !companyId) setCompanyId(tenantList[0].id);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetFormState = useCallback(() => {
    if (tenants.length > 0) setCompanyId(tenants[0].id);
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
    setAmount('2500');
    setCurrency('ETB');
    setPaymentMethod('BANK_TRANSFER');
  }, [tenants]);

  const openModal = () => {
    resetFormState();
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetFormState();
  }, [resetFormState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.createInvoice({
        companyId,
        invoiceNumber,
        amount: parseFloat(amount),
        currency,
        paymentMethod,
      });
      closeModal();
      loadData();
      showToast('Invoice created successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setMarkingPaidId(id);
    try {
      await apiClient.markInvoicePaid(id);
      loadData();
      showToast('Invoice marked as paid');
    } catch (err: any) {
      showToast(err.message || 'Failed to mark invoice as paid', 'error');
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handlePrint = (inv: TenantInvoiceResponse) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${inv.invoiceNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: #0f172a; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 1.5rem; margin-bottom: 2rem; }
            h1 { margin: 0 0 0.5rem 0; color: #0f172a; }
            h2 { margin: 0; color: #475569; font-size: 1.25rem; }
            p { margin: 0.25rem 0; color: #64748b; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; background: #f8fafc; padding: 1.5rem; border-radius: 0.5rem; }
            h3 { margin-top: 0; color: #334155; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
            .total-box { text-align: right; }
            .total { font-size: 1.5rem; font-weight: bold; color: #0f172a; margin-top: 0.5rem; }
            .status { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: ${inv.status === 'PAID' ? '#d1fae5' : '#fee2e2'}; color: ${inv.status === 'PAID' ? '#065f46' : '#dc2626'}; margin-top: 0.5rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>INVOICE</h1>
              <p style="font-weight: 600; color: #0f172a; font-size: 1.125rem;">${inv.companyName}</p>
            </div>
            <div style="text-align: right;">
              <h2>${inv.invoiceNumber}</h2>
              <p>Date: ${new Date().toLocaleDateString()}</p>
              <p>Due: ${new Date(inv.dueDate).toLocaleDateString()}</p>
            </div>
          </div>
          <div class="details">
            <div>
              <h3>Payment Info</h3>
              <p>Method: <strong>${inv.paymentMethod.replace('_', ' ')}</strong></p>
              <div class="status">${inv.status}</div>
            </div>
            <div class="total-box">
              <h3>Amount Due</h3>
              <div class="total">${inv.currency} ${inv.amount.toFixed(2)}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filteredInvoices = invoices.filter(
    inv =>
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            color: '#fff',
            background: toastType === 'success' ? '#10b981' : '#ef4444',
            zIndex: 9999,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontWeight: 500,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Invoicing & Local Payment Collector
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage manual bank transfer receipts (CBE, Telebirr, Awash Bank), generate invoices, and log subscription payments.
          </p>
        </div>
        <button
          onClick={openModal}
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.625rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
          }}
        >
          <Plus size={18} />
          Generate New Invoice
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ position: 'relative', width: '320px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            placeholder="Search invoice number or tenant..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: '1rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '0.5rem',
              color: '#0f172a',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>
        <button
          onClick={loadData}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <RefreshCw size={16} />
          Refresh Invoices
        </button>
      </div>

      {/* Invoices Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Invoice #</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Tenant Restaurant</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Amount</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Payment Method</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Due Date</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading tenant invoices...
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No billing invoices found.
                </td>
              </tr>
            ) : (
              filteredInvoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a' }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '1rem', color: '#0284c7', fontWeight: 600 }}>{inv.companyName}</td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    {inv.currency} {inv.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem', color: '#334155' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                      {inv.paymentMethod}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: inv.status === 'PAID' ? '#d1fae5' : '#fee2e2',
                        color: inv.status === 'PAID' ? '#065f46' : '#dc2626',
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.75rem' }}>
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {inv.status !== 'PAID' && (
                        <button
                          onClick={() => handleMarkPaid(inv.id)}
                          disabled={markingPaidId === inv.id}
                          style={{
                            background: markingPaidId === inv.id ? '#e2e8f0' : '#d1fae5',
                            color: markingPaidId === inv.id ? '#94a3b8' : '#059669',
                            border: 'none',
                            borderRadius: '0.375rem',
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: markingPaidId === inv.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {markingPaidId === inv.id ? 'Marking...' : 'Mark as Paid'}
                        </button>
                      )}
                      <button
                        onClick={() => handlePrint(inv)}
                        title="Print PDF Invoice"
                        style={{
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          padding: '0.375rem 0.5rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '1rem', width: '100%', maxWidth: '480px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: '0.5rem' }}>
              Generate Tenant Subscription Invoice
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Issue a manual invoice for local bank transfer or wire payments.
            </p>

            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Select Tenant Restaurant
                </label>
                <select
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem' }}
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Invoice Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-2026-001"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Amount
                  </label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem' }}
                  >
                    <option value="ETB">ETB (Ethiopian Birr)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Payment Channel / Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  style={{ width: '100%', padding: '0.625rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem' }}
                >
                  <option value="BANK_TRANSFER">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="TELEBIRR">Telebirr Merchant Payment</option>
                  <option value="WIRE">Awash / Zemen Bank Wire</option>
                  <option value="CASH">Direct Cash Receipt</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Generating...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
