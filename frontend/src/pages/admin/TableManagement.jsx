import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, QrCode, Pencil, Trash2, RefreshCw, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import { getTables, createTable, updateTable, deleteTable, regenerateQr } from '../../api/tables'
import { useAuthStore } from '../../store/authStore'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import clsx from 'clsx'

const TABLE_STATUS_COLORS = {
  available: 'bg-green-50 border-green-200',
  occupied:  'bg-red-50 border-red-200',
  reserved:  'bg-amber-50 border-amber-200',
}
const TABLE_STATUS_LABELS = {
  available: 'Libre',
  occupied:  'Occupée',
  reserved:  'Réservée',
}
const TABLE_STATUS_DOT = {
  available: 'bg-green-500',
  occupied:  'bg-red-500',
  reserved:  'bg-amber-500',
}

function QrModalContent({ table, onRegenerate }) {
  const user = useAuthStore(s => s.user)
  const restaurantName = user?.restaurant?.name ?? 'Restaurant'
  const cardRef = useRef(null)

  function handlePrint() {
    const card = cardRef.current
    if (!card) return
    const win = window.open('', '_blank', 'width=500,height=650')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>QR — ${table.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Segoe UI', sans-serif; }
        @media print { @page { margin: 0; } body { padding: 0; } }
      </style>
      </head><body>${card.outerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <div className="space-y-5">
      {/* Carte imprimable */}
      <div ref={cardRef} style={{ fontFamily: "'Segoe UI', sans-serif" }}
        className="mx-auto w-72 rounded-3xl overflow-hidden shadow-xl border border-gray-100">
        {/* Header orange */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 pt-6 pb-8 text-center text-white">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-80 mb-1">{restaurantName}</p>
          <h2 className="text-3xl font-bold tracking-tight">{table.name}</h2>
          <p className="text-sm opacity-75 mt-1">Capacité : {table.capacity} pers.</p>
        </div>

        {/* QR Code flottant */}
        <div className="flex justify-center -mt-8 px-6">
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
            <QRCode value={table.qr_url} size={180} level="H" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pt-4 pb-6 text-center bg-white">
          <p className="text-sm font-semibold text-gray-700 mt-1">Scannez pour commander</p>
          <p className="text-xs text-gray-400 mt-1">Pas d'application requise</p>
          <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
            <p className="text-[10px] text-gray-300 break-all leading-relaxed">{table.qr_url}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          <Printer className="w-4 h-4" /> Imprimer
        </button>
        <button
          onClick={() => onRegenerate(table)}
          className="flex items-center justify-center gap-2 btn-ghost px-4"
          title="Régénérer le token (invalide l'ancien QR)"
        >
          <RefreshCw className="w-4 h-4" /> Régénérer
        </button>
      </div>
    </div>
  )
}

export default function TableManagement() {
  const [tables, setTables]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [qrModal, setQrModal]   = useState(null) // table for QR view
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({ number: '', name: '', capacity: 4 })
  const [saving, setSaving]     = useState(false)

  const fetch = useCallback(async () => {
    try {
      const { data } = await getTables()
      setTables(data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ number: tables.length + 1, name: `Table ${tables.length + 1}`, capacity: 4 })
    setModal(true)
  }

  function openEdit(table) {
    setEditing(table)
    setForm({ number: table.number, name: table.name, capacity: table.capacity })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) {
        await updateTable(editing.id, form)
        toast.success('Table mise à jour.')
      } else {
        await createTable(form)
        toast.success('Table créée.')
      }
      setModal(false)
      await fetch()
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) toast.error(Object.values(errors)[0]?.[0])
      else toast.error('Erreur.')
    } finally { setSaving(false) }
  }

  async function handleDelete(table) {
    if (!confirm(`Supprimer ${table.name} ?`)) return
    try {
      await deleteTable(table.id)
      toast.success('Table supprimée.')
      await fetch()
    } catch { toast.error('Impossible de supprimer cette table.') }
  }

  async function handleRegenerateQr(table) {
    try {
      await regenerateQr(table.id)
      toast.success('QR code régénéré.')
      await fetch()
    } catch { toast.error('Erreur.') }
  }

  const available = tables.filter(t => t.status === 'available').length
  const occupied  = tables.filter(t => t.status === 'occupied').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Tables</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {available} libre{available > 1 ? 's' : ''} · {occupied} occupée{occupied > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {loading ? <LoadingSpinner size="lg" className="py-20" /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map(table => (
            <div key={table.id} className={clsx(
              'relative rounded-2xl border-2 p-4 transition-all hover:shadow-md',
              TABLE_STATUS_COLORS[table.status]
            )}>
              {/* Status dot */}
              <div className={clsx('absolute top-3 right-3 w-2.5 h-2.5 rounded-full', TABLE_STATUS_DOT[table.status])} />

              <p className="font-bold text-gray-900 text-lg">{table.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{table.capacity} places</p>
              <p className="text-xs font-medium mt-2"
                style={{ color: table.status === 'available' ? '#16a34a' : table.status === 'occupied' ? '#dc2626' : '#d97706' }}>
                {TABLE_STATUS_LABELS[table.status]}
              </p>

              {/* Active order badge */}
              {table.active_order && (
                <div className="mt-2 bg-white/60 rounded-lg p-2 text-xs">
                  <p className="font-semibold text-gray-700 truncate">
                    {table.active_order.order_number}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 mt-3">
                <button onClick={() => setQrModal(table)}
                  className="p-1.5 hover:bg-white/70 rounded-lg transition-colors" title="Voir QR">
                  <QrCode className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => openEdit(table)}
                  className="p-1.5 hover:bg-white/70 rounded-lg transition-colors">
                  <Pencil className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => handleDelete(table)}
                  className="p-1.5 hover:bg-white/70 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la table' : 'Nouvelle table'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N°</label>
              <input type="number" className="input" min={1} max={999}
                value={form.number} onChange={e => setForm({...form, number: +e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacité</label>
              <input type="number" className="input" min={1} max={50}
                value={form.capacity} onChange={e => setForm({...form, capacity: +e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input className="input" placeholder="ex: Table 1, Terrasse..."
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-ghost flex-1">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? '…' : editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* QR Modal */}
      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title={`QR Code — ${qrModal?.name}`}>
        {qrModal && <QrModalContent table={qrModal} onRegenerate={handleRegenerateQr} />}
      </Modal>
    </div>
  )
}
