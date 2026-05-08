import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, QrCode, Pencil, Trash2, RefreshCw, Printer, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import { getTables, createTable, updateTable, deleteTable, regenerateQr } from '../../api/tables'
import { useAuthStore } from '../../store/authStore'
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

// ── Carte QR ────────────────────────────────────────────────────────────────────
function QrCard({ table, restaurant, forPrint = false }) {
  const name    = restaurant?.name    ?? 'Restaurant'
  const address = restaurant?.address ?? null
  const phone   = restaurant?.phone   ?? null
  const logo    = restaurant?.logo    ?? null

  // Initiales de secours si pas de logo
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const cardStyle = forPrint
    ? { width: '85mm', pageBreakInside: 'avoid', display: 'inline-block', margin: '4mm', verticalAlign: 'top' }
    : { width: '280px', margin: '0 auto' }

  return (
    <div style={{ ...cardStyle, fontFamily: "'Segoe UI', Arial, sans-serif", borderRadius: '16px', overflow: 'hidden', boxShadow: forPrint ? 'none' : '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb', background: '#fff' }}>

      {/* ── Header gradient ─────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)', padding: '20px 20px 28px', textAlign: 'center', position: 'relative' }}>

        {/* Logo ou initiales */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          {logo ? (
            <img
              src={logo.startsWith('/') || logo.startsWith('http') ? logo : `/storage/${logo}`}
              alt={name}
              style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)', objectFit: 'cover', background: '#fff' }}
            />
          ) : (
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '20px', fontWeight: '700', letterSpacing: '1px' }}>{initials}</span>
            </div>
          )}
        </div>

        {/* Nom du restaurant */}
        <p style={{ color: '#fff', fontSize: '15px', fontWeight: '700', margin: '0 0 3px', letterSpacing: '0.3px', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>{name}</p>

        {/* Adresse */}
        {address && (
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px', margin: '2px 0 0', letterSpacing: '0.2px' }}>
            📍 {address.length > 40 ? address.substring(0, 40) + '…' : address}
          </p>
        )}
        {phone && !address && (
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px', margin: '2px 0 0' }}>📞 {phone}</p>
        )}
      </div>

      {/* ── QR Code flottant ────────────────────────── */}
      <div style={{ background: '#fff', padding: '0 20px 0', marginTop: '-18px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center' }}>
          <QRCode
            value={table.qr_url}
            size={forPrint ? 140 : 160}
            level="H"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      {/* ── Nom de la table ─────────────────────────── */}
      <div style={{ padding: '14px 20px 6px', textAlign: 'center' }}>
        <p style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: '0', letterSpacing: '-0.5px' }}>{table.name}</p>
        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '1px 0 0' }}>{table.capacity} place{table.capacity > 1 ? 's' : ''}</p>
      </div>

      {/* ── Instruction ─────────────────────────────── */}
      <div style={{ padding: '10px 20px 16px', textAlign: 'center' }}>
        <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '8px 12px', border: '1px solid #fed7aa' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#c2410c', margin: '0' }}>
            📱 Scannez pour commander
          </p>
          <p style={{ fontSize: '10px', color: '#9a3412', margin: '2px 0 0' }}>Sans application requise</p>
        </div>
      </div>

      {/* ── URL (discret) ───────────────────────────── */}
      <div style={{ padding: '0 16px 12px', borderTop: '1px dashed #f3f4f6', paddingTop: '10px' }}>
        <p style={{ fontSize: '8px', color: '#d1d5db', textAlign: 'center', margin: '0', wordBreak: 'break-all', lineHeight: '1.4' }}>
          {table.qr_url?.replace(/\?.*/, '')}
        </p>
      </div>
    </div>
  )
}

// ── Contenu modal QR ────────────────────────────────────────────────────────────
function QrModalContent({ table, onRegenerate }) {
  const user       = useAuthStore(s => s.user)
  const restaurant = user?.restaurant ?? {}
  const cardRef    = useRef(null)

  function handlePrint() {
    const card = cardRef.current
    if (!card) return
    const win = window.open('', '_blank', 'width=420,height=700')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>QR — ${table.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        @media print { @page { margin: 10mm; size: A6; } body { padding: 0; } }
      </style>
      </head><body>${card.outerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  return (
    <div className="space-y-5">
      <div ref={cardRef}>
        <QrCard table={table} restaurant={restaurant} />
      </div>
      <div className="flex gap-3">
        <button onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition-colors">
          <Printer className="w-4 h-4" /> Imprimer
        </button>
        <button onClick={() => onRegenerate(table)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          title="Régénérer le token (invalide l'ancien QR)">
          <RefreshCw className="w-4 h-4" /> Régénérer
        </button>
      </div>
    </div>
  )
}

// ── QR Code commande à distance (unique) ───────────────────────────────────────
function OrderQrSection({ restaurant, tables = [] }) {
  const cardRef = useRef(null)
  const name     = restaurant?.name    ?? 'Restaurant'
  const address  = restaurant?.address ?? null
  const logo     = restaurant?.logo    ?? null
  const slug     = restaurant?.slug    ?? ''
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  // Extraire l'origine depuis un QR de table existant (contient la bonne IP+port)
  // Sinon fallback sur order_qr_url du backend, sinon window.location.origin
  const baseOrigin = (() => {
    if (tables.length > 0 && tables[0].qr_url) {
      try { return new URL(tables[0].qr_url).origin } catch {}
    }
    if (restaurant?.order_qr_url) {
      try { return new URL(restaurant.order_qr_url).origin } catch {}
    }
    return window.location.origin
  })()
  const qrUrl = `${baseOrigin}/order/${slug}`

  function handlePrint() {
    const card = cardRef.current
    if (!card) return
    const win = window.open('', '_blank', 'width=420,height=680')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>QR Commande — ${name}</title>
      <style>* { margin:0; padding:0; box-sizing:border-box; } body { background:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; }
      @media print { @page { margin:10mm; size:A6; } body { padding:0; } }
      </style></head><body>${card.outerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Globe className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">QR Code — Commande à distance</p>
          <p className="text-xs text-gray-500">Livraison & à emporter · À afficher à l'entrée</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Carte */}
        <div ref={cardRef} style={{ fontFamily: "'Segoe UI', Arial, sans-serif", width: '260px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.10)', flexShrink: 0 }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '16px 16px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              {logo ? (
                <img src={logo.startsWith('/') || logo.startsWith('http') ? logo : `/storage/${logo}`} alt={name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)', objectFit: 'cover', background: '#fff' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>{initials}</span>
                </div>
              )}
            </div>
            <p style={{ color: '#fff', fontSize: '13px', fontWeight: '700', margin: '0 0 2px' }}>{name}</p>
            {address && <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '9px', margin: '1px 0 0' }}>📍 {address.length > 36 ? address.substring(0,36)+'…' : address}</p>}
          </div>
          {/* QR */}
          <div style={{ background: '#fff', padding: '0 16px', marginTop: '-14px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center' }}>
              <QRCode value={qrUrl} size={150} level="H" style={{ display: 'block' }} />
            </div>
          </div>
          {/* Labels */}
          <div style={{ padding: '12px 16px 4px', textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: '800', color: '#111827', margin: '0' }}>🛍️ Commander</p>
            <p style={{ fontSize: '10px', color: '#9ca3af', margin: '3px 0 0' }}>Livraison & à emporter</p>
          </div>
          <div style={{ padding: '8px 16px 14px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '7px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#334155', margin: '0' }}>📱 Scannez pour commander</p>
              <p style={{ fontSize: '9px', color: '#64748b', margin: '2px 0 0' }}>Sans application requise</p>
            </div>
          </div>
          <div style={{ borderTop: '1px dashed #f3f4f6', margin: '0 12px', padding: '7px 4px' }}>
            <p style={{ fontSize: '7px', color: '#d1d5db', textAlign: 'center', margin: '0', wordBreak: 'break-all', lineHeight: '1.4' }}>{qrUrl}</p>
          </div>
        </div>

        {/* Infos + bouton */}
        <div className="space-y-3 flex-1">
          <p className="text-sm text-gray-600">Ce QR code unique permet aux clients de passer des commandes <strong>à emporter</strong> ou en <strong>livraison</strong> depuis leur téléphone.</p>
          <p className="text-xs text-gray-400">À imprimer et afficher à l'entrée, sur les flyers, ou sur les réseaux sociaux.</p>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Printer className="w-4 h-4" /> Imprimer ce QR code
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ─────────────────────────────────────────────────────────
export default function TableManagement() {
  const [tables, setTables]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [qrModal, setQrModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState({ number: '', name: '', capacity: 4 })
  const [saving, setSaving]   = useState(false)

  const user       = useAuthStore(s => s.user)
  const restaurant = user?.restaurant ?? {}

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
      setQrModal(null)
      await fetch()
    } catch { toast.error('Erreur.') }
  }

  // ── Impression de tous les QR ──────────────────────────────────────────────
  function handlePrintAll() {
    const win = window.open('', '_blank', 'width=900,height=700')
    const name    = restaurant?.name    ?? 'Restaurant'
    const logo    = restaurant?.logo    ?? null
    const address = restaurant?.address ?? null
    const phone   = restaurant?.phone   ?? null
    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

    const logoHtml = logo
      ? `<img src="${logo.startsWith('/') || logo.startsWith('http') ? logo : '/storage/' + logo}" style="width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,255,255,0.6);object-fit:cover;background:#fff;" />`
      : `<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:20px;font-weight:700;">${initials}</span></div>`

    const cardsHtml = tables.map(table => {
      const svgId = `qr-${table.id}`
      return `
        <div class="qr-card">
          <div class="card-header">
            <div class="logo-wrap">${logoHtml}</div>
            <p class="resto-name">${name}</p>
            ${address ? `<p class="resto-sub">📍 ${address.length > 38 ? address.substring(0,38)+'…' : address}</p>` : ''}
            ${phone && !address ? `<p class="resto-sub">📞 ${phone}</p>` : ''}
          </div>
          <div class="qr-wrap">
            <div class="qr-box" id="${svgId}"></div>
          </div>
          <div class="table-name">${table.name}</div>
          <p class="table-cap">${table.capacity} place${table.capacity > 1 ? 's' : ''}</p>
          <div class="scan-box">
            <p class="scan-title">📱 Scannez pour commander</p>
            <p class="scan-sub">Sans application requise</p>
          </div>
          <div class="url-bar">
            <p class="url-text">${(table.qr_url || '').replace(/\?.*/, '')}</p>
          </div>
          <script>
            (function() {
              var qr = new QRCode(document.getElementById('${svgId}'), {
                text: ${JSON.stringify(table.qr_url)},
                width: 150, height: 150, correctLevel: QRCode.CorrectLevel.H
              });
            })();
          <\/script>
        </div>
      `
    }).join('')

    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>QR Codes — ${name}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif; background:#f9fafb; padding:10mm; }
        .grid { display:flex; flex-wrap:wrap; gap:6mm; justify-content:center; }
        .qr-card { width:85mm; border-radius:14px; overflow:hidden; border:1px solid #e5e7eb; background:#fff; page-break-inside:avoid; display:inline-block; }
        .card-header { background:linear-gradient(135deg,#f97316 0%,#ea580c 50%,#c2410c 100%); padding:16px 16px 24px; text-align:center; }
        .logo-wrap { display:flex; justify-content:center; margin-bottom:8px; }
        .logo-wrap img, .logo-wrap div { display:block; }
        .resto-name { color:#fff; font-size:13px; font-weight:700; margin:0 0 2px; }
        .resto-sub { color:rgba(255,255,255,0.8); font-size:9px; margin:1px 0 0; }
        .qr-wrap { background:#fff; padding:0 16px; margin-top:-14px; }
        .qr-box { background:#fff; border-radius:12px; padding:12px; box-shadow:0 4px 16px rgba(0,0,0,0.08); border:1px solid #f3f4f6; display:flex; justify-content:center; align-items:center; }
        .qr-box img { display:block !important; }
        .table-name { text-align:center; font-size:20px; font-weight:800; color:#111827; padding:10px 16px 2px; }
        .table-cap { text-align:center; font-size:10px; color:#9ca3af; padding:0 16px 4px; }
        .scan-box { margin:8px 16px; background:#fff7ed; border-radius:8px; padding:7px 10px; border:1px solid #fed7aa; text-align:center; }
        .scan-title { font-size:11px; font-weight:600; color:#c2410c; }
        .scan-sub { font-size:9px; color:#9a3412; margin-top:1px; }
        .url-bar { border-top:1px dashed #f3f4f6; margin:0 12px; padding:7px 4px; }
        .url-text { font-size:7px; color:#d1d5db; text-align:center; word-break:break-all; line-height:1.4; }
        @media print {
          @page { margin:8mm; size:A4; }
          body { background:#fff; padding:0; }
          .grid { gap:5mm; }
        }
      </style>
    </head><body>
      <div class="grid">${cardsHtml}</div>
      <script>setTimeout(function(){ window.print(); }, 1200);<\/script>
    </body></html>`)
    win.document.close()
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
        <div className="flex gap-2">
          {tables.length > 0 && (
            <button onClick={handlePrintAll}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">
              <Printer className="w-4 h-4" /> Tout imprimer
            </button>
          )}
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* ── Section QR commandes à distance ──────────────────────── */}
      <OrderQrSection restaurant={restaurant} tables={tables} />

      {loading ? <LoadingSpinner size="lg" className="py-20" /> : tables.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune table pour l'instant</p>
          <p className="text-sm mt-1">Créez votre première table pour générer son QR code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map(table => (
            <div key={table.id} className={clsx(
              'relative rounded-2xl border-2 p-4 transition-all hover:shadow-md',
              TABLE_STATUS_COLORS[table.status]
            )}>
              <div className={clsx('absolute top-3 right-3 w-2.5 h-2.5 rounded-full', TABLE_STATUS_DOT[table.status])} />

              <p className="font-bold text-gray-900 text-lg">{table.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{table.capacity} places</p>
              <p className="text-xs font-medium mt-2"
                style={{ color: table.status === 'available' ? '#16a34a' : table.status === 'occupied' ? '#dc2626' : '#d97706' }}>
                {TABLE_STATUS_LABELS[table.status]}
              </p>

              {table.active_order && (
                <div className="mt-2 bg-white/60 rounded-lg p-2 text-xs">
                  <p className="font-semibold text-gray-700 truncate">{table.active_order.order_number}</p>
                </div>
              )}

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

      {/* Modal Créer/Modifier */}
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
            <input className="input" placeholder="ex: Table 1, Terrasse, Salon VIP…"
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

      {/* Modal QR */}
      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title={`QR Code — ${qrModal?.name}`}>
        {qrModal && <QrModalContent table={qrModal} onRegenerate={handleRegenerateQr} />}
      </Modal>
    </div>
  )
}
