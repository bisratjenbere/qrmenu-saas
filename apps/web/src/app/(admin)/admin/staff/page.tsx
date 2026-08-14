'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { StaffResponse, BranchResponse } from '@qrmenu/shared';

export default function StaffAdmin() {
  const [staffList, setStaffList] = useState<StaffResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '', email: '', password: '', role: 'STAFF', branchId: ''
  });

  const fetchData = async () => {
    try {
      const [staffData, branchData] = await Promise.all([
        apiClient.fetchStaff(),
        apiClient.fetchBranches()
      ]);
      setStaffList(staffData);
      setBranches(branchData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    try {
      await apiClient.createStaff({
        ...newStaff,
        branchId: newStaff.branchId || null
      });
      setIsModalOpen(false);
      setNewStaff({ name: '', email: '', password: '', role: 'STAFF', branchId: '' });
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Failed to create staff');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteStaff(id);
      fetchData();
    } catch (e) {
      alert('Failed to delete staff');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Staff Management</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Add Staff</button>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2>Create Staff</h2>
            <input 
              type="text" 
              placeholder="Name" 
              value={newStaff.name}
              onChange={e => setNewStaff({...newStaff, name: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={newStaff.email}
              onChange={e => setNewStaff({...newStaff, email: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={newStaff.password}
              onChange={e => setNewStaff({...newStaff, password: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <select 
              value={newStaff.role}
              onChange={e => setNewStaff({...newStaff, role: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              <option value="STAFF">STAFF</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            {newStaff.role === 'STAFF' && (
              <select 
                value={newStaff.branchId}
                onChange={e => setNewStaff({...newStaff, branchId: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              >
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {staffList.map(staff => (
          <div key={staff.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{staff.name}</h3>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>{staff.email} • {staff.role}</p>
            </div>
            <button className="btn" style={{ color: 'var(--color-error)', border: '1px solid var(--color-border)' }} onClick={() => handleDelete(staff.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
