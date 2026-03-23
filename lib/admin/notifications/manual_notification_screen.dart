import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/notification_template.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';
import '../widgets/admin_app_bar.dart';
import '../widgets/admin_drawer.dart';

/// Manuel Push Notification Gönderme Ekranı (Admin)
///
/// Bu ekran admin'e manuel bildirim gönderme imkanı sağlar:
/// - 6 hazır şablon seçimi
/// - Hedef seçimi (tüm kullanıcılar, belirli kullanıcı, sipariş bazlı)
/// - Mesaj düzenleme ve önizleme
/// - Cloud Function ile toplu gönderim

class ManualNotificationScreen extends StatefulWidget {
  const ManualNotificationScreen({Key? key}) : super(key: key);

  @override
  State<ManualNotificationScreen> createState() => _ManualNotificationScreenState();
}

class _ManualNotificationScreenState extends State<ManualNotificationScreen> {
  NotificationTemplate _selectedTemplate = NotificationTemplate.custom;
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();

  String _targetType = 'all'; // all, user, order
  String? _selectedUserId;
  String? _selectedOrderId;
  Order? _selectedOrder;

  bool _isLoadingOrders = false;
  bool _isSending = false;
  List<Order> _recentOrders = [];

  @override
  void initState() {
    super.initState();
    _loadRecentOrders();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _loadRecentOrders() async {
    setState(() => _isLoadingOrders = true);

    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      final allOrders = await orderService.getAllOrders();

      // Son 50 siparişi al (pending, processing, ready)
      final recentOrders = allOrders
          .where((order) {
            return order.orderStatus == OrderStatus.pending ||
                order.orderStatus == OrderStatus.processing ||
                order.orderStatus == OrderStatus.ready;
          })
          .take(50)
          .toList();

      setState(() {
        _recentOrders = recentOrders;
        _isLoadingOrders = false;
      });

      Logger.info('${recentOrders.length} aktif sipariş yüklendi');
    } catch (e) {
      Logger.error('Siparişler yüklenirken hata: $e');
      setState(() => _isLoadingOrders = false);
    }
  }

  void _onTemplateSelected(NotificationTemplate template) {
    setState(() {
      _selectedTemplate = template;
    });

    // Şablon seçildiğinde default mesajları doldur
    if (template != NotificationTemplate.custom) {
      final notification = NotificationData.fromTemplate(
        template: template,
        customerName: _selectedOrder?.customerName ?? 'Değerli Müşterimiz',
        orderId: _selectedOrder?.id ?? '...',
        amount: _selectedOrder?.amount,
        date: _selectedOrder?.deliveryDate,
      );

      _titleController.text = notification.title;
      _bodyController.text = notification.body;
    } else {
      _titleController.text = '';
      _bodyController.text = '';
    }
  }

  void _onOrderSelected(Order order) {
    setState(() {
      _selectedOrder = order;
      _selectedOrderId = order.id;
      _selectedUserId = order.userId;
      _targetType = 'order';
    });

    // Sipariş seçildiğinde mesajları güncelle
    if (_selectedTemplate != NotificationTemplate.custom) {
      _onTemplateSelected(_selectedTemplate);
    }
  }

  Future<void> _sendNotification() async {
    // Validasyon
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Lütfen başlık girin'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_bodyController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Lütfen mesaj girin'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_targetType == 'order' && _selectedOrderId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Lütfen bir sipariş seçin'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Onay dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Bildirimi Gönder?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Hedef: ${_getTargetDescription()}',
                style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text('Başlık: ${_titleController.text}'),
            SizedBox(height: 8),
            Text('Mesaj: ${_bodyController.text}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: Text('Gönder'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isSending = true);

    try {
      // Cloud Function çağır
      final functions = FirebaseFunctions.instance;
      final callable = functions.httpsCallable('sendManualNotification');

      final result = await callable.call({
        'title': _titleController.text.trim(),
        'body': _bodyController.text.trim(),
        'template': _selectedTemplate.toString().split('.').last,
        'targetType': _targetType,
        'targetUserId': _selectedUserId,
        'targetOrderId': _selectedOrderId,
        'data': {
          'type': _selectedTemplate.toString().split('.').last,
          'orderId': _selectedOrderId ?? '',
        },
      });

      final data = result.data as Map<String, dynamic>;
      final success = data['success'] as bool? ?? false;
      final sentCount = data['sentCount'] as int? ?? 0;

      setState(() => _isSending = false);

      if (success) {
        Logger.info('✅ Bildirim gönderildi: $sentCount kullanıcı');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 12),
                  Text('$sentCount kullanıcıya bildirim gönderildi!'),
                ],
              ),
              backgroundColor: Colors.green,
            ),
          );
        }

        // Formu temizle
        _titleController.clear();
        _bodyController.clear();
        setState(() {
          _selectedTemplate = NotificationTemplate.custom;
          _targetType = 'all';
          _selectedUserId = null;
          _selectedOrderId = null;
          _selectedOrder = null;
        });
      } else {
        throw Exception(data['error'] ?? 'Bilinmeyen hata');
      }
    } catch (e) {
      Logger.error('Bildirim gönderim hatası: $e');
      setState(() => _isSending = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getTargetDescription() {
    switch (_targetType) {
      case 'all':
        return 'Tüm Kullanıcılar';
      case 'user':
        return 'Belirli Kullanıcı (${_selectedUserId ?? "Seçilmedi"})';
      case 'order':
        return 'Sipariş Bazlı (${_selectedOrder?.customerName ?? "Seçilmedi"})';
      default:
        return 'Bilinmiyor';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AdminAppBar(title: 'Manuel Bildirim Gönder'),
      drawer: AdminDrawer(currentIndex: -1),
      body: _isSending
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Bildirim gönderiliyor...', style: TextStyle(fontSize: 16)),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: EdgeInsets.all(AppTheme.spaceLg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(),
                  SizedBox(height: 24),
                  _buildTemplateSelection(),
                  SizedBox(height: 24),
                  _buildTargetSelection(),
                  SizedBox(height: 24),
                  _buildMessageEditor(),
                  SizedBox(height: 24),
                  _buildPreview(),
                  SizedBox(height: 24),
                  _buildSendButton(),
                ],
              ),
            ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.all(AppTheme.spaceXl),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.purple[700]!, Colors.purple[500]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
      ),
      child: Row(
        children: [
          Icon(Icons.notifications_active, color: Colors.white, size: 40),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Push Notification',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Müşterilere anlık bildirim gönderin',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTemplateSelection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Şablon Seçimi',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: NotificationTemplate.values.map((template) {
            final isSelected = _selectedTemplate == template;
            return ChoiceChip(
              label: Text('${template.icon} ${template.displayName}'),
              selected: isSelected,
              onSelected: (selected) {
                if (selected) _onTemplateSelected(template);
              },
              selectedColor: AppTheme.primaryColor.withValues(alpha: 0.2),
              backgroundColor: Colors.grey[200],
            );
          }).toList(),
        ),
        if (_selectedTemplate != NotificationTemplate.custom) ...[
          SizedBox(height: 8),
          Text(
            _selectedTemplate.description,
            style: TextStyle(color: Colors.grey[600], fontSize: 12),
          ),
        ],
      ],
    );
  }

  Widget _buildTargetSelection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hedef Seçimi',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 12),

        // Target type radio buttons
        RadioListTile<String>(
          title: Text('Tüm Kullanıcılar'),
          subtitle: Text('Kayıtlı tüm kullanıcılara gönder'),
          value: 'all',
          groupValue: _targetType,
          onChanged: (value) => setState(() => _targetType = value!),
        ),
        RadioListTile<String>(
          title: Text('Sipariş Bazlı'),
          subtitle: Text('Belirli bir siparişin sahibine gönder'),
          value: 'order',
          groupValue: _targetType,
          onChanged: (value) => setState(() => _targetType = value!),
        ),

        // Order selection (if order target)
        if (_targetType == 'order') ...[
          SizedBox(height: 12),
          _buildOrderSelection(),
        ],
      ],
    );
  }

  Widget _buildOrderSelection() {
    if (_isLoadingOrders) {
      return Center(child: CircularProgressIndicator());
    }

    if (_recentOrders.isEmpty) {
      return Container(
        padding: EdgeInsets.all(AppTheme.spaceLg),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
        child: Text(
          'Aktif sipariş bulunamadı',
          style: TextStyle(color: Colors.grey[600]),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Sipariş Seçin:',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 8),
        Container(
          constraints: BoxConstraints(maxHeight: 200),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: _recentOrders.length,
            separatorBuilder: (_, __) => Divider(height: 1),
            itemBuilder: (context, index) {
              final order = _recentOrders[index];
              final isSelected = _selectedOrderId == order.id;

              return ListTile(
                selected: isSelected,
                selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                leading: CircleAvatar(
                  backgroundColor: isSelected ? AppTheme.primaryColor : Colors.grey[400],
                  child: Text(
                    order.customerName[0].toUpperCase(),
                    style: TextStyle(color: Colors.white),
                  ),
                ),
                title: Text(
                  order.customerName,
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: Text(
                  '#${order.id.substring(0, 8)} - ${order.orderStatus.toString().split('.').last}',
                  style: TextStyle(fontSize: 12),
                ),
                trailing: Text(
                  '${(order.amount ?? 0).toStringAsFixed(2)} ₺',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                onTap: () => _onOrderSelected(order),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildMessageEditor() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Mesaj İçeriği',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 12),

        // Title
        TextField(
          controller: _titleController,
          decoration: InputDecoration(
            labelText: 'Başlık',
            hintText: 'Bildirim başlığı',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMd)),
            prefixIcon: Icon(Icons.title),
          ),
          maxLength: 50,
        ),
        SizedBox(height: 16),

        // Body
        TextField(
          controller: _bodyController,
          decoration: InputDecoration(
            labelText: 'Mesaj',
            hintText: 'Bildirim mesajı',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMd)),
            prefixIcon: Icon(Icons.message),
            alignLabelWithHint: true,
          ),
          maxLines: 4,
          maxLength: 200,
        ),
      ],
    );
  }

  Widget _buildPreview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Önizleme',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 12),
        Container(
          padding: EdgeInsets.all(AppTheme.spaceLg),
          decoration: BoxDecoration(
            color: Colors.grey[900],
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            boxShadow: [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 10,
                offset: Offset(0, 5),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.bakery_dining, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'EkmekLab',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
                  Spacer(),
                  Text(
                    'Şimdi',
                    style: TextStyle(
                      color: Colors.white54,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
              SizedBox(height: 8),
              Text(
                _titleController.text.isEmpty ? 'Başlık...' : _titleController.text,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 4),
              Text(
                _bodyController.text.isEmpty ? 'Mesaj içeriği...' : _bodyController.text,
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSendButton() {
    final isValid = _titleController.text.trim().isNotEmpty &&
        _bodyController.text.trim().isNotEmpty &&
        (_targetType != 'order' || _selectedOrderId != null);

    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton.icon(
        onPressed: isValid ? _sendNotification : null,
        icon: Icon(Icons.send, size: 24),
        label: Text(
          'Bildirimi Gönder',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.green,
          disabledBackgroundColor: Colors.grey[400],
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
        ),
      ),
    );
  }
}
