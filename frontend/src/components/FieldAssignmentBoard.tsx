import { useEffect, useState } from 'react';
import { getFields, saveAssignments, type FieldDefinition } from '../api/fieldsApi';
import type { ManagedUser } from '../types/user';
import { formatApiError } from '../utils/apiError';

export default function FieldAssignmentBoard({ users, onSaved }: { users: ManagedUser[]; onSaved: () => Promise<void> }) {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const staff = users.filter((user) => user.role === 'staff' && user.isActive !== false);
  const id = (user: ManagedUser) => user._id || user.id;
  useEffect(() => {
    void getFields().then((data) => {
      setFields(data);
      setOwners(Object.fromEntries(data.map((field) => [field.code, field.owners.length === 1 ? field.owners[0].id : ''])));
    }).catch((err) => setError(formatApiError(err, 'Không tải được phân công.')));
  }, [users]);
  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      await saveAssignments(staff.map((user) => ({ userId: id(user), fieldCodes: fields.filter((field) => owners[field.code] === id(user)).map((field) => field.code) })));
      await onSaved(); setMessage('Đã lưu phân công cho tất cả chuyên viên.');
    } catch (err) { setError(formatApiError(err, 'Không lưu được phân công.')); }
    finally { setBusy(false); }
  }
  return <section className="mb-6 space-y-4 rounded-xl border border-outline-variant bg-white p-4 md:p-5">
    <h2 className="font-semibold">Phân công 8 lĩnh vực</h2>
    <p className="text-sm text-on-surface-variant">Mỗi chuyên viên có ít nhất một lĩnh vực. Điều chỉnh người phụ trách rồi lưu toàn bộ để chuyển giao đồng thời.</p>
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => <div key={field.code} className="min-w-0 space-y-2">
        <label htmlFor={`owner-${field.code}`} className="block text-sm font-medium">{field.code} — {field.title}</label>
        {field.owners.length > 1 && <p className="text-sm text-error">Đang trùng: {field.owners.map((owner) => owner.fullName).join(', ')}</p>}
        <select id={`owner-${field.code}`} aria-label={`Phụ trách ${field.code}`} value={owners[field.code] || ''} disabled={busy}
          onChange={(event) => setOwners((current) => ({ ...current, [field.code]: event.target.value }))} className="w-full rounded-lg border border-outline-variant bg-white p-2 text-sm">
          <option value="">Chưa phân công</option>
          {staff.map((user) => <option key={id(user)} value={id(user)}>{user.fullName} ({user.username})</option>)}
        </select>
      </div>)}
    </div>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">Lưu toàn bộ phân công</button>
  </section>;
}
