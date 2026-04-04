import { useRef } from 'react'
import { Printer } from 'lucide-react'
import { formatCurrency } from '../../utils/format'

const METHOD_LABELS = {
  cash:   'Espèces',
  card:   'Carte bancaire',
  mobile: 'Mobile Money',
}

const TYPE_CONFIG = {
  dine_in:  { label: '🪑 Sur place',   header: null },
  takeaway: { label: '🥡 À emporter',  header: '*** À EMPORTER ***' },
  delivery: { label: '🛵 Livraison',   header: '*** LIVRAISON ***' },
}

export default function PrintReceipt({ order, restaurant }) {
  const ref = useRef(null)

  function handlePrint() {
    const content = ref.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank', 'width=400,height=700')
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Reçu ${order.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      padding: 8px;
      width: 80mm;
    }
    .center    { text-align: center; }
    .bold      { font-weight: bold; }
    .small     { font-size: 10px; }
    .big       { font-size: 16px; font-weight: bold; }
    .divider   { border-top: 1px dashed #000; margin: 6px 0; }
    .row       { display: flex; justify-content: space-between; margin: 2px 0; }
    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 4px; }
    .type-banner {
      text-align: center; font-weight: bold; font-size: 13px;
      border: 2px solid #000; padding: 4px; margin: 6px 0; letter-spacing: 1px;
    }
    .delivery-box {
      border: 1px solid #000; padding: 6px; margin: 4px 0;
      font-size: 11px; line-height: 1.6;
    }
    @media print {
      body { width: 80mm; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style>
</head>
<body>
${content}
<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }<\/script>
</body>
</html>`)
    win.document.close()
  }

  const typeConf = TYPE_CONFIG[order.type] ?? { label: order.type, header: null }
  const now      = new Date()
  const dateStr  = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr  = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* ── Ticket caché (rendu en HTML pour impression) ───────────────────── */}
      <div ref={ref} style={{ display: 'none' }}>

        {/* En-tête restaurant */}
        <div className="center" style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}>
            {restaurant?.name ?? 'Restaurant'}
          </div>
          {restaurant?.address && <div className="small" style={{ marginTop: 2 }}>{restaurant.address}</div>}
          {restaurant?.phone   && <div className="small">{restaurant.phone}</div>}
          {restaurant?.email   && <div className="small">{restaurant.email}</div>}
        </div>

        {/* Bandeau type commande */}
        {typeConf.header && (
          <div className="type-banner">{typeConf.header}</div>
        )}

        <div className="divider" />

        {/* Infos commande */}
        <div className="row">
          <span>Reçu N°</span>
          <span className="bold">{order.order_number}</span>
        </div>
        <div className="row">
          <span>Date / Heure</span>
          <span>{dateStr} {timeStr}</span>
        </div>
        <div className="row">
          <span>Type</span>
          <span>{typeConf.label}</span>
        </div>

        {/* ── Sur place : table ─────────────────────────────────────────── */}
        {order.type === 'dine_in' && order.table?.name && (
          <div className="row bold">
            <span>Table</span>
            <span>{order.table.name}</span>
          </div>
        )}

        {/* ── À emporter : client ───────────────────────────────────────── */}
        {order.type === 'takeaway' && (
          <>
            {order.customer_name && (
              <div className="row">
                <span>Client</span>
                <span className="bold">{order.customer_name}</span>
              </div>
            )}
            {order.customer_phone && (
              <div className="row">
                <span>Téléphone</span>
                <span>{order.customer_phone}</span>
              </div>
            )}
          </>
        )}

        {/* ── Livraison : adresse complète ──────────────────────────────── */}
        {order.type === 'delivery' && (
          <div className="delivery-box">
            <div className="bold" style={{ marginBottom: 3 }}>Informations de livraison</div>
            {order.customer_name  && <div>👤 {order.customer_name}</div>}
            {order.customer_phone && <div>📞 {order.customer_phone}</div>}
            {order.delivery_address && (
              <div style={{ marginTop: 2 }}>📍 {order.delivery_address}</div>
            )}
          </div>
        )}

        {/* Notes commande */}
        {order.notes && (
          <div style={{ fontSize: 10, margin: '4px 0', fontStyle: 'italic' }}>
            Note : {order.notes}
          </div>
        )}

        <div className="divider" />

        {/* Articles */}
        <div className="bold" style={{ marginBottom: 4 }}>Articles commandés</div>
        {order.items?.map(item => (
          <div key={item.id} className="row" style={{ alignItems: 'flex-start' }}>
            <span style={{ flex: 1, paddingRight: 4 }}>
              {item.quantity}x {item.product?.name}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>
              {formatCurrency(item.total_price ?? item.unit_price * item.quantity)}
            </span>
          </div>
        ))}

        <div className="divider" />

        {/* Totaux */}
        {Number(order.tax) > 0 && (
          <>
            <div className="row">
              <span>Sous-total</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="row">
              <span>TVA</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
          </>
        )}
        <div className="total-row">
          <span>TOTAL</span>
          <span>{formatCurrency(order.total)}</span>
        </div>

        {order.payment?.method && (
          <div className="row small" style={{ marginTop: 4 }}>
            <span>Règlement</span>
            <span className="bold">{METHOD_LABELS[order.payment.method] ?? order.payment.method}</span>
          </div>
        )}

        <div className="divider" />

        {/* Pied de page */}
        <div className="center small" style={{ marginTop: 6, lineHeight: 1.8 }}>
          {order.type === 'dine_in'  && <>Merci de votre visite !<br /></>}
          {order.type === 'takeaway' && <>Merci, bonne dégustation !<br /></>}
          {order.type === 'delivery' && <>Merci pour votre commande !<br /></>}
          {restaurant?.name}<br />
          <span style={{ fontSize: 9 }}>Propulsé par RestoQR</span>
        </div>

      </div>

      {/* Bouton visible */}
      <button
        onClick={handlePrint}
        className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Printer className="w-4 h-4" />
        Imprimer le reçu
      </button>
    </>
  )
}
