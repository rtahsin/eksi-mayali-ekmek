/**
 * Admin yeni-sipariş push yardımcıları (saf fonksiyonlar — unit test dostu).
 */

const ORDER_STAFF_ROLES = new Set(['superadmin', 'admin', 'support']);

function canManageOrdersRole(role) {
  if (!role || typeof role !== 'string') return false;
  return ORDER_STAFF_ROLES.has(role.trim().toLowerCase());
}

/**
 * Aktif adminler listesinden sipariş yetkisi olan uid'leri seç.
 * @param {Array<{id: string, data: object}>} adminDocs
 * @returns {string[]}
 */
function selectOrderStaffAdminUids(adminDocs) {
  const uids = [];
  for (const entry of adminDocs || []) {
    const data = entry.data || {};
    if (data.isActive !== true) continue;
    if (!canManageOrdersRole(data.role)) continue;
    if (entry.id) uids.push(entry.id);
  }
  return uids;
}

function formatAmountTr(amount) {
  if (amount === null || amount === undefined || amount === '') return null;
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(2)} ₺`;
}

/**
 * @param {{ orderId: string, orderData?: object, formatShortOrderNumber?: (id: string) => string }} args
 */
function buildAdminNewOrderNotification({ orderId, orderData = {}, formatShortOrderNumber }) {
  const customerName = (orderData.customerName || 'Müşteri').toString().trim() || 'Müşteri';
  const shortNumber =
    (orderData.orderNumber && String(orderData.orderNumber).trim()) ||
    (typeof formatShortOrderNumber === 'function'
      ? formatShortOrderNumber(orderId)
      : String(orderId || '').substring(0, 8).toUpperCase());

  const amountLabel = formatAmountTr(orderData.amount);
  const bodyParts = [customerName];
  if (amountLabel) bodyParts.push(amountLabel);
  bodyParts.push(`#${shortNumber}`);

  return {
    title: 'Yeni sipariş',
    body: bodyParts.join(' · '),
    data: {
      type: 'order',
      actionType: 'NEW_ADMIN_ORDER',
      orderId: String(orderId || ''),
      orderNumber: String(shortNumber),
      navigationRoute: '/admin/orders',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
  };
}

/**
 * Token listesini tekilleştir.
 * @param {Array<{token: string}>} targets
 */
function dedupeNotificationTargets(targets) {
  return Array.from(new Map((targets || []).map((t) => [t.token, t])).values()).filter(
    (t) => t && t.token
  );
}

module.exports = {
  ORDER_STAFF_ROLES,
  canManageOrdersRole,
  selectOrderStaffAdminUids,
  formatAmountTr,
  buildAdminNewOrderNotification,
  dedupeNotificationTargets,
};
