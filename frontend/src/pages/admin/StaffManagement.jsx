import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, UserCheck, UserX, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStaff, createStaff, updateStaff, deleteStaff } from '../../api/staff'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import clsx from 'clsx'

const ROLES = [
  { value: 'admin',   label: 'Admin',    color: 'bg-purple-100 text-purple-700' },
  { value: 'cashier', label: 'Caissier', color: 'bg-blue-100 text-blue-700' },
  { value: 'kitchen', label: 'Cuisine',  color: 'bg-orange-100 text-orange-700' },
]

const roleInfo = (value) => ROLES.find(r => r.value === value) ?? { label: value, color: 'bg-gray-100 text-gray-600' }

const EMPTY_FORM = { name: '', email: '', password: '', role: 'cashier', is_active: true }

export default function StaffManagement() {
  const [staff, setStaff]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const fetch = useCallback(async () => {
    try {
      const { data } = await getStaff()
      setStaff(data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowPwd(false)
    setModal(true)
  }

  function openEdit(member) {
    setEditing(member)
    setForm({ name: member.name, email: member.email, password: '', role: member.role, is_active: member.is_active })
    setShowPwd(false)
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      if (editing) {
        await updateStaff(editing.id, payload)
        toast.success('Utilisateur mis à jour.')
      } else {
        await createStaff(payload)
        toast.success('Utilisateur créé.')
      }
      setModal(false)
      await fetch()
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) toast.error(Object.values(errors)[0]?.[0])
      else toast.error('Erreur.')
    } finally { setSaving(false) }
  }

  async function handleToggleActive(member) {
    try {
      await updateStaff(member.id, { is_active: !member.is_active })
      toast.success(member.is_active ? 'Compte désactivé.' : 'Compte activé.')
      await fetch()
    } catch { toast.error('Erreur.') }
  }

  async function handleDelete(member) {
    if (!confirm(`Supprimer ${member.name} ?`)) return
    try {
      await deleteStaff(member.id)
      toast.success('Utilisateur supprimé.')
      await fetch()
    } catch { toast.error('Impossible de supprimer cet utilisateur.') }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">{staff.length} membre{staff.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {loading ? <LoadingSpinner size="lg" className="py-20" /> : staff.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Aucun membre dans l'équipe.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Nom</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Rôle</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map(member => {
                const role = roleInfo(member.role)
                return (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                    <td className="px-4 py-3 text-gray-500">{member.email}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', role.color)}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {member.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(member)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Modifier">
                          <Pencil className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => handleToggleActive(member)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title={member.is_active ? 'Désactiver' : 'Activer'}>
                          {member.is_active
                            ? <UserX className="w-4 h-4 text-amber-400" />
                            : <UserCheck className="w-4 h-4 text-green-500" />}
                        </button>
                        <button onClick={() => handleDelete(member)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input className="input" placeholder="Prénom Nom"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input" type="email" placeholder="exemple@email.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe {editing && <span className="text-gray-400 font-normal">(laisser vide pour ne pas changer)</span>}
            </label>
            <div className="relative">
              <input className="input pr-10" type={showPwd ? 'text' : 'password'}
                placeholder={editing ? '••••••••' : 'Min. 8 caractères'}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {editing && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary-500"
                checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <span className="text-sm text-gray-700">Compte actif</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-ghost flex-1">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? '…' : editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
