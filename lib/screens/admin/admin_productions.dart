// ignore_for_file: prefer_const_constructors, use_build_context_synchronously

/*
 * Üretim Yönetimi Ekranı
 * 
 * PURPOSE: Ekmek üretimlerini kaydetme ve listeleme
 * LAYER: UI (Admin)
 * DEPENDS ON: InventoryService, Production model
 * 
 * LAST UPDATED: 2025-12-12
 */

import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:intl/intl.dart';

import '../../admin/widgets/admin_drawer.dart';
import '../../models/product.dart';
import '../../models/production.dart';
import '../../services/inventory_service.dart';
import '../../services/product_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

class AdminProductionsScreen extends StatefulWidget {
  const AdminProductionsScreen({Key? key}) : super(key: key);

  @override
  State<AdminProductionsScreen> createState() => _AdminProductionsScreenState();
}

class _AdminProductionsScreenState extends State<AdminProductionsScreen> {
  final InventoryService _inventoryService = InventoryService();
  final ProductService _productService = GetIt.I<ProductService>();

  List<Production> _productions = [];
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
      final productions = await _inventoryService.getAllProductions(
        startDate: _filterStartDate,
        endDate: _filterEndDate,
      );

      // ProductService zaten yüklü, products listesini al
      final products = _productService.products;

      if (mounted) {
        setState(() {
          _productions = productions;
          _products = products;
          _isLoading = false;
        });
      }
    } catch (e) {
      Logger.error('Üretim verileri yüklenirken hata: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddProductionDialog() {
    String? selectedProductId;
    String selectedProductName = '';
    final quantityController = TextEditingController();
    final notesController = TextEditingController();
    DateTime selectedDate = DateTime.now();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Yeni Üretim Kaydı'),
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
                      child: Text(product.name),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setDialogState(() {
                      selectedProductId = value;
                      selectedProductName = _products.firstWhere((p) => p.id == value).name;
                    });
                  },
                ),
                SizedBox(height: 16),

                // Adet
                TextField(
                  controller: quantityController,
                  decoration: InputDecoration(
                    labelText: 'Üretilen Adet *',
                    border: OutlineInputBorder(),
                    suffixText: 'adet',
                    helperText: 'Kaç adet ürettiniz?',
                  ),
                  keyboardType: TextInputType.number,
                ),
                SizedBox(height: 16),

                // Üretim tarihi
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Üretim Tarihi'),
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
                if (selectedProductId == null || quantityController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Lütfen zorunlu alanları doldurun')),
                  );
                  return;
                }

                final quantity = int.tryParse(quantityController.text);

                if (quantity == null || quantity <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Geçersiz adet')),
                  );
                  return;
                }

                final production = Production(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  productId: selectedProductId!,
                  productName: selectedProductName,
                  quantity: quantity,
                  productionDate: selectedDate,
                  notes: notesController.text.isEmpty ? null : notesController.text,
                  createdAt: DateTime.now(),
                );

                try {
                  await _inventoryService.addProduction(production);
                  if (!context.mounted) return;
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('✅ Üretim kaydı eklendi ve stok güncellendi')),
                  );
                  _loadData();
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('❌ Hata: $e')),
                  );
                }
              },
              child: Text('Kaydet'),
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
        title: Text(isSmallScreen ? 'Üretim' : 'Üretim Kayıtları'),
        actions: [
          // Tarih filtresi
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
      drawer: AdminDrawer(currentIndex: 6),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _productions.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.factory, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'Henüz üretim kaydı yok',
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
                    // İstatistikler
                    Container(
                      padding: EdgeInsets.all(isSmallScreen ? AppTheme.spaceMd : AppTheme.spaceLg),
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      child: isSmallScreen
                          ? Column(
                              children: [
                                _buildStatCard(
                                  'Toplam Üretim',
                                  '${_productions.fold<int>(0, (sum, p) => sum + p.quantity)} adet',
                                  Icons.factory,
                                ),
                                SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                                  children: [
                                    _buildStatCard(
                                      'Ürün Çeşidi',
                                      _productions
                                          .map((p) => p.productName)
                                          .toSet()
                                          .length
                                          .toString(),
                                      Icons.category,
                                    ),
                                    _buildStatCard(
                                      'Kayıt Sayısı',
                                      _productions.length.toString(),
                                      Icons.list,
                                    ),
                                  ],
                                ),
                              ],
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _buildStatCard(
                                  'Toplam Üretim',
                                  '${_productions.fold<int>(0, (sum, p) => sum + p.quantity)} adet',
                                  Icons.factory,
                                ),
                                _buildStatCard(
                                  'Ürün Çeşidi',
                                  _productions.map((p) => p.productName).toSet().length.toString(),
                                  Icons.category,
                                ),
                                _buildStatCard(
                                  'Kayıt Sayısı',
                                  _productions.length.toString(),
                                  Icons.list,
                                ),
                              ],
                            ),
                    ),

                    // Liste
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.all(AppTheme.spaceLg),
                        itemCount: _productions.length,
                        itemBuilder: (context, index) {
                          final production = _productions[index];
                          return Card(
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: AppTheme.primaryColor,
                                child: Icon(Icons.bakery_dining, color: Colors.white),
                              ),
                              title: Text(
                                production.productName,
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '📦 ${production.quantity} adet',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                      '📅 ${DateFormat('dd/MM/yyyy').format(production.productionDate)}'),
                                  if (production.notes != null)
                                    Text('📝 ${production.notes}',
                                        style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                ],
                              ),
                              trailing: IconButton(
                                icon: Icon(Icons.delete, color: Colors.red),
                                onPressed: () async {
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (context) => AlertDialog(
                                      title: Text('Sil?'),
                                      content:
                                          Text('Bu üretim kaydı silinecek ve stok güncellenecek.'),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.pop(context, false),
                                          child: Text('İptal'),
                                        ),
                                        ElevatedButton(
                                          onPressed: () => Navigator.pop(context, true),
                                          child: Text('Sil'),
                                        ),
                                      ],
                                    ),
                                  );

                                  if (confirm == true) {
                                    try {
                                      await _inventoryService.deleteProduction(
                                        production.id,
                                        production.productId,
                                        production.quantity,
                                      );
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('✅ Üretim kaydı silindi')),
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
              onPressed: _showAddProductionDialog,
              child: Icon(Icons.add),
              backgroundColor: AppTheme.primaryColor,
            )
          : FloatingActionButton.extended(
              onPressed: _showAddProductionDialog,
              icon: Icon(Icons.add),
              label: Text('Üretim Ekle'),
              backgroundColor: AppTheme.primaryColor,
            ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.primaryColor),
        SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
          ),
        ),
        Text(
          title,
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
      ],
    );
  }
}
