'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { TableResponse } from '@qrmenu/shared';
import { useParams } from 'next/navigation';

export default function TablesAdmin() {
  const params = useParams();
  const branchId = params.branchId as string;
  const [tables, setTables] = useState<TableResponse[]>([]);
  const [generateCount, setGenerateCount] = useState<number>(5);

  const fetchTables = async () => {
    try {
      const data = await apiClient.fetchTables(branchId);
      setTables(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [branchId]);

  const handleGenerate = async () => {
    try {
      await apiClient.generateTables(branchId, generateCount);
      fetchTables();
    } catch (e) {
      alert('Failed to generate tables');
    }
  };

  const handleDelete = async (tableId: string) => {
    try {
      await apiClient.deleteTable(branchId, tableId);
      fetchTables();
    } catch (e) {
      alert('Failed to delete table');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Tables Management</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="number" 
            value={generateCount} 
            onChange={e => setGenerateCount(parseInt(e.target.value) || 1)} 
            min="1"
            style={{ width: '80px', padding: '0.5rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          />
          <button className="btn btn-primary" onClick={handleGenerate}>Generate Tables</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {tables.map(table => (
          <div key={table.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', minWidth: '150px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>T{table.label}</div>
            <button className="btn" style={{ marginLeft: 'auto', color: 'var(--color-error)', border: '1px solid var(--color-border)' }} onClick={() => handleDelete(table.id)}>Delete</button>
          </div>
        ))}
        {tables.length === 0 && <p>No tables found. Generate some above.</p>}
      </div>
    </div>
  );
}
