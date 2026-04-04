import { useState, useEffect, useRef } from 'react'
import { Save, Upload, Clock, Store, Mail, Phone, MapPin, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSettings, updateSettings } from '../../api/settings'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const TIMEZONES = [
  'Africa/Dakar', 'Africa/Abidjan', 'Africa/Douala', 'Africa/Lagos',
  'Africa/Bamako', 'Africa/Conakry', 'Africa/Freetown', 'Europe/Paris',
]

const CURRENCIES = ['FCFA', 'EUR', 'USD', 'GNF', 'XOF', 'MAD', 'DZD']

export default function Settings() {
  const { user, setAuth, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const logoRef = useRef(null)

  const [form, setForm] = useState({
    name:             '',
    email:            '',
    phone:            '',
    address:          '',
    currency:         'FCFA',
    timezone:         'Africa/Dakar',
    shift_start_hour: 3,
    logo:             null,
  })

  useEffect(() => {
    getSettings()
      .then(({ data }) => {
        setForm(f => ({
          ...f,
          name:             data.name             ?? '',
          email:            data.email            ?? '',
          phone:            data.phone            ?? '',
          address:          data.address          ?? '',
          currency:         data.currency         ?? 'FCFA',
          timezone:         data.timezone         ?? 'Africa/Dakar',
          shift_start_hour: data.shift_start_hour ?? 3,
        }))
        if (data.logo) setLogoPreview(data.logo)
      })
      .catch(() => toast.error('Impossible de charger les paramètres'))
      .finally(() => setLoading(false))
  }, [])

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setForm(f => ({ ...f, logo: file }))
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v)
      })

      const { data } = await updateSettings(fd)
      toast.success('Paramètres enregistrés !')

      // Mettre à jour le store avec le nouveau nom/infos du restaurant
      if (user) {
        setAuth({ ...user, restaurant: { ...user.restaurant, ...data.restaurant } }, token)
      }
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        Object.values(errors).flat().forEach(msg => toast.error(msg))
      } else {
        toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde')
      }
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner size="lg" className="py-32" />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres du restaurant</h1>
        <p className="text-gray-500 text-sm mt-1">Ces informations apparaissent sur vos tickets et factures.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Logo */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Store className="w-4 h-4 text-primary-500" /> Logo & Identité
          </h2>
          <div className="flex items-center gap-5">
            <div
              onClick={() => logoRef.current?.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary-400 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-50 transition-colors shrink-0"
            >
              {logoPreview
                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                : <Upload className="w-7 h-7 text-gray-300" />
              }
            </div>
            <div className="flex-1">
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <button type="button" onClick={() => logoRef.current?.click()}
                className="text-sm text-primary-600 font-semibold hover:underline">
                Changer le logo
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG · Max 2 Mo · Recommandé : 200×200px</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du restaurant *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              placeholder="Chez Mamie"
            />
          </div>
        </div>

        {/* Coordonnées */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary-500" /> Coordonnées
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder="contact@restaurant.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Téléphone
              </label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder="+221 77 000 00 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Adresse
              </label>
              <textarea
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                placeholder="12 Rue des Fleurs, Dakar"
              />
            </div>
          </div>
        </div>

        {/* Localisation & Opérationnel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-500" /> Localisation & Opérationnel
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Devise</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fuseau horaire</label>
              <select
                value={form.timezone}
                onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Heure de début de journée (coupure de caisse)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min="0" max="8" step="1"
                value={form.shift_start_hour}
                onChange={e => setForm(f => ({ ...f, shift_start_hour: Number(e.target.value) }))}
                className="flex-1 accent-primary-500"
              />
              <span className="text-lg font-bold text-primary-600 w-14 text-center">
                {String(form.shift_start_hour).padStart(2, '0')}h00
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Les stats de caisse se réinitialisent à <strong>{String(form.shift_start_hour).padStart(2, '0')}h00</strong> du matin.
              Idéal si votre restaurant ferme après minuit.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-lg"
        >
          {saving
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Save className="w-5 h-5" /> Enregistrer les paramètres</>
          }
        </button>
      </form>
    </div>
  )
}
