import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UtensilsCrossed, Eye, EyeOff, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { register } from '../api/auth'
import api from '../api/axios'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/format'

const TIMEZONES = [
  { value: 'Africa/Dakar',      label: 'Dakar (GMT+0)' },
  { value: 'Africa/Abidjan',    label: 'Abidjan (GMT+0)' },
  { value: 'Africa/Lagos',      label: 'Lagos (GMT+1)' },
  { value: 'Africa/Douala',     label: 'Douala (GMT+1)' },
  { value: 'Africa/Casablanca', label: 'Casablanca (GMT+1)' },
  { value: 'Europe/Paris',      label: 'Paris (GMT+1/2)' },
]

const CURRENCIES = ['FCFA', 'XOF', 'XAF', 'MAD', 'EUR', 'USD']
const STEPS = ['Votre restaurant', 'Votre compte', 'Récapitulatif']

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [step, setStep]         = useState(0)
  const [loading, setLoading]   = useState(false)
  const [showPwd, setShowPwd]   = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [pricing, setPricing]   = useState(null)

  const [form, setForm] = useState({
    restaurant_name: '', restaurant_email: '', restaurant_phone: '',
    restaurant_address: '', currency: 'FCFA', timezone: 'Africa/Dakar',
    admin_name: '', admin_email: '', admin_password: '', admin_password_confirmation: '',
  })

  useEffect(() => {
    api.get('/platform/pricing')
      .then(({ data }) => setPricing(data))
      .catch(() => {})
  }, [])

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  function validateStep() {
    if (step === 0) {
      if (!form.restaurant_name.trim())  { toast.error('Nom du restaurant requis.'); return false }
      if (!form.restaurant_email.trim()) { toast.error('Email du restaurant requis.'); return false }
    }
    if (step === 1) {
      if (!form.admin_name.trim())          { toast.error('Votre nom est requis.'); return false }
      if (!form.admin_email.trim())         { toast.error('Votre email est requis.'); return false }
      if (form.admin_password.length < 8)   { toast.error('Mot de passe minimum 8 caractères.'); return false }
      if (form.admin_password !== form.admin_password_confirmation) {
        toast.error('Les mots de passe ne correspondent pas.'); return false
      }
    }
    return true
  }

  function next() { if (validateStep()) setStep(s => s + 1) }

  async function handleSubmit() {
    setLoading(true)
    try {
      const { data } = await register(form)
      setAuth(data.user, data.token)
      toast.success(data.message)
      navigate('/admin')
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        toast.error(Object.values(errors)[0]?.[0] || "Erreur lors de l'inscription.")
      } else {
        toast.error(err.response?.data?.message || "Erreur lors de l'inscription.")
      }
    } finally { setLoading(false) }
  }

  const price    = pricing?.subscription_price ?? 0
  const currency = pricing?.subscription_currency ?? 'FCFA'
  const trial    = pricing?.trial_days ?? 30
  const name     = pricing?.platform_name ?? 'RestoQR'

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl mb-3 shadow-lg">
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <p className="text-gray-500 text-sm mt-1">Créez votre restaurant en 3 étapes</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center mb-6 gap-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                i < step   ? 'bg-green-100 text-green-700' :
                i === step  ? 'bg-primary-500 text-white' :
                              'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                {label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
            </div>
          ))}
        </div>

        <div className="card p-6 shadow-md">

          {/* Étape 0 — Restaurant */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Votre restaurant</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du restaurant *</label>
                <input className="input" placeholder="Ex: Chez Mamie" value={form.restaurant_name}
                  onChange={e => set('restaurant_name', e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input type="email" className="input" placeholder="contact@monresto.com" value={form.restaurant_email}
                  onChange={e => set('restaurant_email', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                  <input className="input" placeholder="+221 77 000 00 00" value={form.restaurant_phone}
                    onChange={e => set('restaurant_phone', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Devise</label>
                  <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
                <input className="input" placeholder="12 Rue des Fleurs, Dakar" value={form.restaurant_address}
                  onChange={e => set('restaurant_address', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fuseau horaire</label>
                <select className="input" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                  {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Étape 1 — Compte admin */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Votre compte administrateur</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
                <input className="input" placeholder="Mamie Diallo" value={form.admin_name}
                  onChange={e => set('admin_name', e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input type="email" className="input" placeholder="admin@monresto.com" value={form.admin_email}
                  onChange={e => set('admin_email', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe *</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="input pr-11"
                    placeholder="Minimum 8 caractères" value={form.admin_password}
                    onChange={e => set('admin_password', e.target.value)} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe *</label>
                <div className="relative">
                  <input type={showConf ? 'text' : 'password'} className="input pr-11"
                    placeholder="Répéter le mot de passe" value={form.admin_password_confirmation}
                    onChange={e => set('admin_password_confirmation', e.target.value)} />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Étape 2 — Récapitulatif */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Récapitulatif</h2>

              {/* Infos restaurant */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-sm">
                <p className="font-semibold text-gray-700 mb-2">Restaurant</p>
                <div className="flex justify-between"><span className="text-gray-500">Nom</span><span className="font-medium">{form.restaurant_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{form.restaurant_email}</span></div>
                {form.restaurant_phone && <div className="flex justify-between"><span className="text-gray-500">Tél.</span><span className="font-medium">{form.restaurant_phone}</span></div>}
              </div>

              {/* Infos admin */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-sm">
                <p className="font-semibold text-gray-700 mb-2">Compte admin</p>
                <div className="flex justify-between"><span className="text-gray-500">Nom</span><span className="font-medium">{form.admin_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{form.admin_email}</span></div>
              </div>

              {/* Plan & prix */}
              <div className="border-2 border-primary-400 bg-primary-50 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">Plan {name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {trial > 0 ? `${trial} jours d'essai inclus` : 'Accès immédiat'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary-500">
                      {price > 0 ? `${Number(price).toLocaleString('fr-FR')} ${currency}` : 'Gratuit'}
                    </p>
                    {price > 0 && <p className="text-xs text-gray-400">/mois</p>}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-primary-200 grid grid-cols-2 gap-1.5">
                  {['QR Code tables', 'Commandes illimitées', 'Tableau de bord', 'Gestion du personnel'].map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Check className="w-3 h-3 text-green-500 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
            )}
            {step < 2 ? (
              <button type="button" onClick={next}
                className="flex-1 flex items-center justify-center gap-2 btn-primary">
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 btn-primary">
                {loading
                  ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Check className="w-4 h-4" /> Créer mon restaurant</>
                }
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Déjà inscrit ?{' '}
          <Link to="/login" className="text-primary-500 font-semibold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
