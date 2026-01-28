// ignore_for_file: prefer_const_constructors, use_build_context_synchronously

/*
 * Satış Kayıtları Ekranı
 * 
 * PURPOSE: Ürün satışlarını kaydetme ve listeleme
 * LAYER: UI (Admin)
 * 
 * LAST UPDATED: 2025-12-12
 */

import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:intl/intl.dart';

import '../../admin/widgets/admin_drawer.dart';
import '../../models/product.dart';
import '../../models/sale.dart';
import '../../services/inventory_service.dart';
import '../../services/product_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

class AdminSalesScreen extends StatefulWidget {
  const AdminSalesScreen({Key? key}) : super(key: key);

  @override
  State<AdminSalesScreen> createState() => _AdminSalesScreenState();
}

class _AdminSalesScreenState extends State<AdminSalesScreen> {
  final InventoryService _inventoryService = InventoryService();
  final ProductService _productService = GetIt.I<ProductService>();

  List<Sale> _sales = [];
  List<Product> _products = [];
  bool _isLoading = true;
  DateTime _filterStartDate = DateTime.now().subtract(Duration(days: 30));
  DateTime _filterEndDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final sales = await _inventoryService.getAllSales(
        startDate: _filterStartDate,
        endDate: _filterEndDate,
      );

      // ProductService zaten yüklü, products listesini al
      final products = _productService.products;

      if (mounted) {
        setState(() {
          _sales = sales;
          _products = products;
          _isLoading = false;
        });
      }
    } catch (e) {
      Logger.error('Satış verileri yüklenirken hata: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddSaleDialog() {
    String? selectedProductId;
    String selectedProductName = '';
    final quantityController = TextEditingController();
    final unitPriceController = TextEditingController();
    final customerNameController = TextEditingController();
    final customerPhoneController = TextEditingController();
    final notesController = TextEditingController();
    DateTime selectedDate = DateTime.now();
    String paymentMethod = 'nakit';

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Yeni Satış Kaydı'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Ürün seçimi
                DropdownButtonFormField<String>(
                  value: selectedProductId,
                  decoration: InputDecoration(
                    labelText: 'Ürün *',
                    border: OutlineInputBorder(),
                  ),
                  items: _products.map((product) {
                    return DropdownMenuItem(
                      value: product.id,
                      child: Text('${product.name} (₺${product.price})'),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setDialogState(() {
                      selectedProductId = value;
                      final product = _products.firstWhere((p) => p.id == value);
                      selectedProductName = product.name;
                      unitPriceController.text = product.price.toString();
                    });
                  },
                ),
                SizedBox(height: 16),

                // Adet
                TextField(
                  controller: quantityController,
                  decoration: InputDecoration(
                    labelText: 'Adet *',
                    border: OutlineInputBorder(),
                    suffixText: 'adet',
                  ),
                  keyboardType: TextInputType.number,
                  onChanged: (value) {
                    // Toplam tutarı otomatik hesapla
                    setDialogState(() {});
                  },
                ),
                SizedBox(height: 16),

                // Birim fiyat
                TextField(
                  controller: unitPriceController,
                  decoration: InputDecoration(
                    labelText: 'Birim Fiyat *',
                    border: OutlineInputBorder(),
                    suffixText: 'TL',
                  ),
                  keyboardType: TextInputType.numberWithOptions(decimal: true),
                  onChanged: (value) {
                    setDialogState(() {});
                  },
                ),
                SizedBox(height: 8),

                // Toplam tutar göster
                if (quantityController.text.isNotEmpty && unitPriceController.text.isNotEmpty)
                  Container(
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'TOPLAM: ${((int.tryParse(quantityController.text) ?? 0) * (double.tryParse(unitPriceController.text) ?? 0)).toStringAsFixed(2)} TL',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.green[800],
                      ),
                    ),
                  ),
                SizedBox(height: 16),

                // Ödeme yöntemi
                DropdownButtonFormField<String>(
                  value: paymentMethod,
                  decoration: InputDecoration(
                    labelText: 'Ödeme Yöntemi *',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    DropdownMenuItem(value: 'nakit', child: Text('💵 Nakit')),
                    DropdownMenuItem(value: 'kart', child: Text('💳 Kredi Kartı')),
                    DropdownMenuItem(value: 'havale', child: Text('🏦 Havale/EFT')),
                  ],
                  onChanged: (value) {
                    setDialogState(() => paymentMethod = value!);
                  },
                ),
                SizedBox(height: 16),

                // Müşteri adı
                TextField(
                  controller: customerNameController,
                  decoration: InputDecoration(
                    labelText: 'Müşteri Adı',
                    border: OutlineInputBorder(),
                  ),
                ),
                SizedBox(height: 16),

                // Müşteri telefonu
                TextField(
                  controller: customerPhoneController,
                  decoration: InputDecoration(
                    labelText: 'Müşteri Telefonu',
                    border: OutlineInputBorder(),
                    prefixText: '+90 ',
                  ),
                  keyboardType: TextInputType.phone,
                ),
                SizedBox(height: 16),

                // Satış tarihi
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Satış Tarihi'),
                  subtitle: Text(DateFormat('dd/MM/yyyy').format(selectedDate)),
                  trailing: Icon(Icons.calendar_today),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now(),
                    );
                    if (date != null) {
                      setDialogState(() => selectedDate = date);
                    }
                  },
                ),
                SizedBox(height: 16),

                // Notlar
                TextField(
                  controller: notesController,
                  decoration: InputDecoration(
                    labelText: 'Notlar',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('İptal'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (selectedProductId == null ||
                    quantityController.text.isEmpty ||
                    unitPriceController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Lütfen zorunlu alanları doldurun')),
                  );
                  return;
                }

                final quantity = int.tryParse(quantityController.text);
                final unitPrice = double.tryParse(unitPriceController.text);

                if (quantity == null || quantity <= 0 || unitPrice == null || unitPrice < 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Geçersiz adet veya fiyat')),
                  );
                  return;
                }

                final sale = Sale(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  productId: selectedProductId!,
                  productName: selectedProductName,
                  quantity: quantity,
                  unitPrice: unitPrice,
                  totalPrice: quantity * unitPrice,
                  paymentMethod: paymentMethod,
                  customerName:
                      customerNameController.text.isEmpty ? null : customerNameController.text,
                  customerPhone:
                      customerPhoneController.text.isEmpty ? null : customerPhoneController.text,
                  saleDate: selectedDate,
                  notes: notesController.text.isEmpty ? null : notesController.text,
                  createdAt: DateTime.now(),
                );

                try {
                  await _inventoryService.addSale(sale);
                  if (!context.mounted) return;
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('✅ Satış kaydı eklendi ve stok güncellendi')),
                  );
                  _loadData();
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('❌ Hata: $e')),
                  );
                }
              },
              child: Text('Satışı Kaydet'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Scaffold(
      appBar: AppBar(
        title: Text('Satış Kayıtları'),
        actions: [
          IconButton(
            icon: Icon(Icons.filter_list),
            onPressed: () async {
              final picked = await showDateRangePicker(
                context: context,
                firstDate: DateTime(2020),
                lastDate: DateTime.now(),
                initialDateRange: DateTimeRange(start: _filterStartDate, end: _filterEndDate),
              );
              if (picked != null) {
                setState(() {
                  _filterStartDate = picked.start;
                  _filterEndDate = picked.end;
                });
                _loadData();
              }
            },
          ),
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      drawer: AdminDrawer(currentIndex: 8),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _sales.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.point_of_sale, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'Henüz satış kaydı yok',
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                      SizedBox(height: 8),
                      Text(
                        '${DateFormat('dd/MM/yyyy').format(_filterStartDate)} - ${DateFormat('dd/MM/yyyy').format(_filterEndDate)}',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Modern İstatistikler - Responsive
                    Container(
                      padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.green[50]!, Colors.green[100]!],
                        ),
                      ),
                      child: isSmallScreen
                          ? Column(
                              children: [
                                _buildModernStatCard(
                                  'Toplam Satış',
                                  _sales.fold<int>(0, (sum, s) => sum + s.quantity).toString(),
                                  Icons.shopping_cart_rounded,
                                  isSmallScreen,
                                ),
                                SizedBox(height: 8),
                                _buildModernStatCard(
                                  'Toplam Gelir',
                                  '₺${_sales.fold<double>(0, (sum, s) => sum + s.totalPrice).toStringAsFixed(0)}',
                                  Icons.monetization_on_rounded,
                                  isSmallScreen,
                                  color: Colors.green[700],
                                ),
                              ],
                            )
                          : Row(
                              children: [
                                Expanded(
                                  child: _buildModernStatCard(
                                    'Toplam Satış',
                                    _sales.fold<int>(0, (sum, s) => sum + s.quantity).toString(),
                                    Icons.shopping_cart_rounded,
                                    isSmallScreen,
                                  ),
                                ),
                                SizedBox(width: 12),
                                Expanded(
                                  child: _buildModernStatCard(
                                    'Toplam Gelir',
                                    '₺${_sales.fold<double>(0, (sum, s) => sum + s.totalPrice).toStringAsFixed(0)}',
                                    Icons.monetization_on_rounded,
                                    isSmallScreen,
                                    color: Colors.green[700],
                                  ),
                                ),
                                SizedBox(width: 12),
                                Expanded(
                                  child: _buildModernStatCard(
                                    'Kayıt',
                                    _sales.length.toString(),
                                    Icons.receipt_long_rounded,
                                    isSmallScreen,
                                  ),
                                ),
                              ],
                            ),
                    ),

                    // Liste
                    Expanded(
                      child: ListView.builder(
                        padding: EdgeInsets.all(isSmallScreen ? 8 : 16),
                        itemCount: _sales.length,
                        itemBuilder: (context, index) {
                          final sale = _sales[index];
                          return Card(
                            margin: EdgeInsets.only(bottom: isSmallScreen ? 8 : 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.green,
                                child: Icon(Icons.sell_rounded, color: Colors.white),
                              ),
                              title: Text(
                                sale.productName,
                                style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: isSmallScreen ? 14 : 16),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                      '📦 ${sale.quantity} adet x ₺${sale.unitPrice.toStringAsFixed(2)}',
                                      style: TextStyle(fontSize: isSmallScreen ? 12 : 14)),
                                  Text(
                                    '💰 ${sale.totalPrice.toStringAsFixed(2)} TL',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.green[700],
                                      fontSize: isSmallScreen ? 13 : 15,
                                    ),
                                  ),
                                  Text(
                                      '💳 ${_getPaymentMethodIcon(sale.paymentMethod)} ${sale.paymentMethod}',
                                      style: TextStyle(fontSize: isSmallScreen ? 12 : 13)),
                                  if (sale.customerName != null)
                                    Text('👤 ${sale.customerName}',
                                        style: TextStyle(fontSize: isSmallScreen ? 11 : 12)),
                                  Text('📅 ${DateFormat('dd/MM/yyyy HH:mm').format(sale.saleDate)}',
                                      style: TextStyle(fontSize: isSmallScreen ? 11 : 12)),
                                ],
                              ),
                              trailing: IconButton(
                                icon: Icon(Icons.delete_rounded, color: Colors.red),
                                onPressed: () async {
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (context) => AlertDialog(
                                      title: Text('Sil?'),
                                      content:
                                          Text('Bu satış kaydı silinecek ve stok geri alınacak.'),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.pop(context, false),
                                          child: Text('İptal'),
                                        ),
                                        ElevatedButton(
                                          onPressed: () => Navigator.pop(context, true),
                                          style:
                                              ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                          child: Text('Sil'),
                                        ),
                                      ],
                                    ),
                                  );

                                  if (confirm == true) {
                                    try {
                                      await _inventoryService.deleteSale(
                                        sale.id,
                                        sale.productId,
                                        sale.quantity,
                                      );
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('✅ Satış kaydı silindi')),
                                      );
                                      _loadData();
                                    } catch (e) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('❌ Hata: $e')),
                                      );
                                    }
                                  }
                                },
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
      floatingActionButton: isSmallScreen
          ? FloatingActionButton(
              onPressed: _showAddSaleDialog,
              backgroundColor: Colors.green,
              child: Icon(Icons.add_rounded),
            )
          : FloatingActionButton.extended(
              onPressed: _showAddSaleDialog,
              icon: Icon(Icons.add_rounded),
              label: Text('Satış Ekle'),
              backgroundColor: Colors.green,
            ),
    );
  }

  Widget _buildModernStatCard(String title, String value, IconData icon, bool isSmall,
      {Color? color}) {
    final cardColor = color ?? AppTheme.primaryColor;
    return Container(
      padding: EdgeInsets.all(isSmall ? 12 : 16),
      decoration: BoxDecoration(
        color: cardColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardColor.withValues(alpha: 0.3), width: 1.5),
      ),
      child: Row(
        children: [
          Icon(icon, color: cardColor, size: isSmall ? 28 : 32),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    fontSize: isSmall ? 18 : 22,
                    fontWeight: FontWeight.bold,
                    color: cardColor,
                  ),
                ),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: isSmall ? 11 : 13,
                    color: Colors.grey[700],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getPaymentMethodIcon(String method) {
    switch (method) {
      case 'nakit':
        return '💵';
      case 'kart':
        return '💳';
      case 'havale':
        return '🏦';
      default:
        return '💰';
    }
  }
}
