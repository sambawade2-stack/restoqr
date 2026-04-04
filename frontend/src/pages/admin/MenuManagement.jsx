import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Image, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCategories, createCategory, updateCategory, deleteCategory,
         getProducts, createProduct, updateProduct, deleteProduct } from '../../api/menu'
import { formatCurrency } from '../../utils/format'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import clsx from 'clsx'

export default function MenuManagement() {
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState(null) // category id filter

  // Modals
  const [catModal, setCatModal] = useState(false)
  const [prodModal, setProdModal] = useState(false)
  const [editingCat, setEditingCat]   = useState(null)
  const [editingProd, setEditingProd] = useState(null)

  const [catForm, setCatForm]   = useState({ name: '', description: '', sort_order: 0 })
  const [prodForm, setProdForm] = useState({
    category_id: '', name: '', description: '', price: '', is_available: true, is_featured: false, sort_order: 0
  })
  const [imageFile, setImageFile] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [catsRes, prodsRes] = await Promise.all([getCategories(), getProducts()])
      setCategories(catsRes.data)
      setProducts(prodsRes.data)
      if (!activeTab && catsRes.data.length > 0) setActiveTab(catsRes.data[0].id)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // ── Category CRUD ─────────────────────────────────────────────────────────

  function openCatCreate() {
    setEditingCat(null)
    setCatForm({ name: '', description: '', sort_order: categories.length })
    setCatModal(true)
  }

  function openCatEdit(cat) {
    setEditingCat(cat)
    setCatForm({ name: cat.name, description: cat.description || '', sort_order: cat.sort_order })
    setCatModal(true)
  }

  async function saveCat() {
    setSaving(true)
    try {
      if (editingCat) await updateCategory(editingCat.id, catForm)
      else             await createCategory(catForm)
      toast.success(editingCat ? 'Catégorie modifiée.' : 'Catégorie créée.')
      setCatModal(false)
      await load()
    } catch (err) {
      toast.error(Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Erreur.')
    } finally { setSaving(false) }
  }

  async function deleteCat(cat) {
    if (!confirm(`Supprimer "${cat.name}" et tous ses produits ?`)) return
    try {
      await deleteCategory(cat.id)
      toast.success('Catégorie supprimée.')
      await load()
    } catch { toast.error('Erreur.') }
  }

  // ── Product CRUD ──────────────────────────────────────────────────────────

  function openProdCreate() {
    setEditingProd(null)
    setImageFile(null)
    setProdForm({
      category_id: activeTab || '', name: '', description: '',
      price: '', is_available: true, is_featured: false, sort_order: 0,
    })
    setProdModal(true)
  }

  function openProdEdit(prod) {
    setEditingProd(prod)
    setImageFile(null)
    setProdForm({
      category_id: prod.category_id, name: prod.name, description: prod.description || '',
      price: prod.price, is_available: prod.is_available, is_featured: prod.is_featured,
      sort_order: prod.sort_order,
    })
    setProdModal(true)
  }

  async function saveProd() {
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(prodForm).forEach(([k, v]) => {
        if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
        else fd.append(k, v)
      })
      if (imageFile) fd.append('image', imageFile)

      if (editingProd) await updateProduct(editingProd.id, fd)
      else              await createProduct(fd)
      toast.success(editingProd ? 'Produit modifié.' : 'Produit créé.')
      setProdModal(false)
      await load()
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) toast.error(Object.values(errors)[0]?.[0])
      else toast.error('Erreur.')
    } finally { setSaving(false) }
  }

  async function deleteProd(prod) {
    if (!confirm(`Supprimer "${prod.name}" ?`)) return
    try {
      await deleteProduct(prod.id)
      toast.success('Produit supprimé.')
      await load()
    } catch { toast.error('Erreur.') }
  }

  async function toggleAvailable(prod) {
    try {
      const fd = new FormData()
      fd.append('category_id',  prod.category_id)
      fd.append('name',         prod.name)
      fd.append('price',        prod.price)
      fd.append('is_available', prod.is_available ? '0' : '1')
      fd.append('is_featured',  prod.is_featured  ? '1' : '0')
      fd.append('sort_order',   prod.sort_order ?? 0)
      if (prod.description) fd.append('description', prod.description)
      await updateProduct(prod.id, fd)
      await load()
    } catch {}
  }

  const filteredProducts = activeTab ? products.filter(p => p.category_id === activeTab) : products

  if (loading) return <LoadingSpinner size="lg" className="py-20" />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Menu</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} produits · {categories.length} catégories</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openCatCreate} className="btn-ghost flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Catégorie
          </button>
          <button onClick={openProdCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Produit
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab(cat.id)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                activeTab === cat.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.name} ({cat.all_products_count ?? 0})
            </button>
            <button onClick={() => openCatEdit(cat)} className="p-1 hover:bg-gray-100 rounded-full">
              <Pencil className="w-3 h-3 text-gray-400" />
            </button>
            <button onClick={() => deleteCat(cat)} className="p-1 hover:bg-gray-100 rounded-full">
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map(prod => (
          <div key={prod.id} className={clsx('card overflow-hidden', !prod.is_available && 'opacity-60')}>
            <div className="relative">
              {prod.image ? (
                <img src={prod.image} alt={prod.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                  <Image className="w-10 h-10 text-gray-300" />
                </div>
              )}
              {prod.is_featured && (
                <span className="absolute top-2 left-2 bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  ⭐ Vedette
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="font-bold text-gray-900 truncate">{prod.name}</p>
              {prod.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{prod.description}</p>
              )}
              <p className="text-primary-500 font-bold mt-2">{formatCurrency(prod.price)}</p>

              <div className="flex items-center justify-between mt-3">
                <button onClick={() => toggleAvailable(prod)} className="flex items-center gap-1.5 text-xs text-gray-500">
                  {prod.is_available
                    ? <ToggleRight className="w-5 h-5 text-green-600" />
                    : <ToggleLeft  className="w-5 h-5 text-gray-400" />}
                  {prod.is_available ? 'Disponible' : 'Indisponible'}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => openProdEdit(prod)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                  <button onClick={() => deleteProd(prod)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title={editingCat ? 'Modifier catégorie' : 'Nouvelle catégorie'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input className="input" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input className="input" value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setCatModal(false)} className="btn-ghost flex-1">Annuler</button>
            <button onClick={saveCat} disabled={saving} className="btn-primary flex-1">{saving ? '…' : 'Enregistrer'}</button>
          </div>
        </div>
      </Modal>

      {/* Product modal */}
      <Modal open={prodModal} onClose={() => setProdModal(false)} title={editingProd ? 'Modifier produit' : 'Nouveau produit'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input className="input" value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select className="input" value={prodForm.category_id} onChange={e => setProdForm({...prodForm, category_id: +e.target.value})}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
              <input type="number" className="input" min={0} value={prodForm.price} onChange={e => setProdForm({...prodForm, price: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input resize-none" rows={2} value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
              <input type="file" accept="image/*" className="input text-sm"
                onChange={e => setImageFile(e.target.files[0])} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="avail" checked={prodForm.is_available}
                onChange={e => setProdForm({...prodForm, is_available: e.target.checked})} className="w-4 h-4 rounded" />
              <label htmlFor="avail" className="text-sm font-medium text-gray-700">Disponible</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="feat" checked={prodForm.is_featured}
                onChange={e => setProdForm({...prodForm, is_featured: e.target.checked})} className="w-4 h-4 rounded" />
              <label htmlFor="feat" className="text-sm font-medium text-gray-700">Produit vedette ⭐</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setProdModal(false)} className="btn-ghost flex-1">Annuler</button>
            <button onClick={saveProd} disabled={saving} className="btn-primary flex-1">{saving ? '…' : 'Enregistrer'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
