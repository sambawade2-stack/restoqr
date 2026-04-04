import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { changePassword } from '../../api/auth'
import Modal from './Modal'

export default function ChangePasswordModal({ open, onClose }) {
  const [form, setForm]     = useState({ current_password: '', new_password: '', new_password_confirmation: '' })
  const [show, setShow]     = useState({ current: false, next: false })
  const [saving, setSaving] = useState(false)

  function handleClose() {
    setForm({ current_password: '', new_password: '', new_password_confirmation: '' })
    setShow({ current: false, next: false })
    onClose()
  }

  async function handleSubmit() {
    if (form.new_password !== form.new_password_confirmation) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    setSaving(true)
    try {
      await changePassword(form)
      toast.success('Mot de passe modifié.')
      handleClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Changer le mot de passe">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
          <div className="relative">
            <input className="input pr-10" type={show.current ? 'text' : 'password'}
              value={form.current_password}
              onChange={e => setForm({ ...form, current_password: e.target.value })} />
            <button type="button" onClick={() => setShow(s => ({ ...s, current: !s.current }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
          <div className="relative">
            <input className="input pr-10" type={show.next ? 'text' : 'password'}
              placeholder="Min. 8 caractères"
              value={form.new_password}
              onChange={e => setForm({ ...form, new_password: e.target.value })} />
            <button type="button" onClick={() => setShow(s => ({ ...s, next: !s.next }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
          <input className="input" type="password"
            value={form.new_password_confirmation}
            onChange={e => setForm({ ...form, new_password_confirmation: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleClose} className="btn-ghost flex-1">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? '…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
