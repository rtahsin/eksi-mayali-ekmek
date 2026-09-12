const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canManageOrdersRole,
  selectOrderStaffAdminUids,
  formatAmountTr,
  buildAdminNewOrderNotification,
  dedupeNotificationTargets,
} = require('../src/admin_order_notify_helpers');

test('canManageOrdersRole accepts superadmin/admin/support only', () => {
  assert.equal(canManageOrdersRole('superadmin'), true);
  assert.equal(canManageOrdersRole('admin'), true);
  assert.equal(canManageOrdersRole('support'), true);
  assert.equal(canManageOrdersRole('editor'), false);
  assert.equal(canManageOrdersRole('user'), false);
  assert.equal(canManageOrdersRole(''), false);
  assert.equal(canManageOrdersRole(null), false);
});

test('selectOrderStaffAdminUids filters inactive and non-order roles', () => {
  const uids = selectOrderStaffAdminUids([
    { id: 'a1', data: { isActive: true, role: 'superadmin' } },
    { id: 'a2', data: { isActive: true, role: 'editor' } },
    { id: 'a3', data: { isActive: false, role: 'admin' } },
    { id: 'a4', data: { isActive: true, role: 'support' } },
  ]);
  assert.deepEqual(uids, ['a1', 'a4']);
});

test('formatAmountTr formats finite numbers', () => {
  assert.equal(formatAmountTr(120), '120.00 ₺');
  assert.equal(formatAmountTr('45.5'), '45.50 ₺');
  assert.equal(formatAmountTr(null), null);
  assert.equal(formatAmountTr('x'), null);
});

test('buildAdminNewOrderNotification builds title/body/data', () => {
  const msg = buildAdminNewOrderNotification({
    orderId: 'abcdef12xyz',
    orderData: {
      customerName: 'Ayşe',
      amount: 250,
      orderNumber: 'EL-99',
    },
    formatShortOrderNumber: (id) => id.substring(0, 4).toUpperCase(),
  });

  assert.equal(msg.title, 'Yeni sipariş');
  assert.equal(msg.body, 'Ayşe · 250.00 ₺ · #EL-99');
  assert.equal(msg.data.type, 'order');
  assert.equal(msg.data.actionType, 'NEW_ADMIN_ORDER');
  assert.equal(msg.data.navigationRoute, '/admin/orders');
  assert.equal(msg.data.orderId, 'abcdef12xyz');
});

test('buildAdminNewOrderNotification falls back to short id', () => {
  const msg = buildAdminNewOrderNotification({
    orderId: 'deadbeef99',
    orderData: { customerName: '  ' },
    formatShortOrderNumber: (id) => id.substring(0, 8).toUpperCase(),
  });
  assert.equal(msg.body, 'Müşteri · #DEADBEEF');
});

test('dedupeNotificationTargets keeps unique tokens', () => {
  const result = dedupeNotificationTargets([
    { token: 't1', userId: 'u1' },
    { token: 't1', userId: 'u2' },
    { token: 't2', userId: 'u3' },
    { token: '', userId: 'u4' },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].token, 't1');
  assert.equal(result[1].token, 't2');
});
