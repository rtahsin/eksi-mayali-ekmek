// ignore_for_file: prefer_const_constructors, use_build_context_synchronously

/*
 * Gider Yönetimi Ekranı
 * 
 * PURPOSE: Hammadde ve diğer giderleri kaydetme
 * LAYER: UI (Admin)
 * 
 * LAST UPDATED: 2025-12-12
 */

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../admin/widgets/admin_drawer.dart';
import '../../models/expense.dart';
import '../../services/inventory_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

class AdminExpensesScreen extends StatefulWidget {
  const AdminExpensesScreen({Key? key}) : super(key: key);

  @override
  State<AdminExpensesScreen> createState() => _AdminExpensesScreenState();
}

class _AdminExpensesScreenState extends State<AdminExpensesScreen> {
  final InventoryService _inventoryService = InventoryService();

  List<Expense> _expenses = [];
  bool _isLoading = true;
  DateTime _filterStartDate = DateTime.now().subtract(Duration(days: 30));
  DateTime _filterEndDate = DateTime.now();

  // Gider kategorileri
  final List<String> _categories = [
    'Hammadde',
    'Enerji',
    'Kira',
    'Maaş',
    'Ulaşım',
    'Pazarlama',
    'Bakım-Onarım',
    'Diğer',
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final expenses = await _inventoryService.getAllExpenses(
        startDate: _filterStartDate,
        endDate: _filterEndDate,
      );

      if (mounted) {
        setState(() {
          _expenses = expenses;
          _isLoading = false;
        });
      }
    } catch (e) {
      Logger.error('Gider verileri yüklenirken hata: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddExpenseDialog() {
    String selectedCategory = 'Hammadde';
    final nameController = TextEditingController();
    final amountController = TextEditingController();
    final supplierController = TextEditingController();
    final invoiceController = TextEditingController();
    final notesController = TextEditingController();
    DateTime selectedDate = DateTime.now();
    String paymentMethod = 'nakit';

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Yeni Gider Kaydı'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Kategori
                DropdownButtonFormField<String>(
                  value: selectedCategory,
                  decoration: InputDecoration(
                    labelText: 'Kategori *',
                    border: OutlineInputBorder(),
                  ),
                  items: _categories.map((cat) {
                    return DropdownMenuItem(
                      value: cat,
                      child: Text('${_getCategoryIcon(cat)} $cat'),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setDialogState(() => selectedCategory = value!);
                  },
                ),
                SizedBox(height: 16),

                // Gider adı
                TextField(
                  controller: nameController,
                  decoration: InputDecoration(
                    labelText: 'Gider Adı *',
                    border: OutlineInputBorder(),
                    hintText: 'Örn: Buğday Unu, Elektrik Faturası',
                  ),
                ),
                SizedBox(height: 16),

                // Tutar
                TextField(
                  controller: amountController,
                  decoration: InputDecoration(
                    labelText: 'Tutar *',
                    border: OutlineInputBorder(),
                    suffixText: 'TL',
                  ),
                  keyboardType: TextInputType.numberWithOptions(decimal: true),
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

                // Tedarikçi
                TextField(
                  controller: supplierController,
                  decoration: InputDecoration(
                    labelText: 'Tedarikçi',
                    border: OutlineInputBorder(),
                  ),
                ),
                SizedBox(height: 16),

                // Fatura no
                TextField(
                  controller: invoiceController,
                  decoration: InputDecoration(
                    labelText: 'Fatura No',
                    border: OutlineInputBorder(),
                  ),
                ),
                SizedBox(height: 16),

                // Gider tarihi
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Gider Tarihi'),
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
                if (nameController.text.isEmpty || amountController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Lütfen zorunlu alanları doldurun')),
                  );
                  return;
                }

                final amount = double.tryParse(amountController.text);

                if (amount == null || amount <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Geçersiz tutar')),
                  );
                  return;
                }

                final expense = Expense(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  category: selectedCategory,
                  name: nameController.text,
                  amount: amount,
                  paymentMethod: paymentMethod,
                  expenseDate: selectedDate,
                  supplier: supplierController.text.isEmpty ? null : supplierController.text,
                  invoiceNumber: invoiceController.text.isEmpty ? null : invoiceController.text,
                  notes: notesController.text.isEmpty ? null : notesController.text,
                  createdAt: DateTime.now(),
                );

                try {
                  await _inventoryService.addExpense(expense);
                  if (!context.mounted) return;
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('✅ Gider kaydı eklendi')),
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

  String _getCategoryIcon(String category) {
    switch (category) {
      case 'Hammadde':
        return '🌾';
      case 'Enerji':
        return '⚡';
      case 'Kira':
        return '🏠';
      case 'Maaş':
        return '👨‍💼';
      case 'Ulaşım':
        return '🚚';
      case 'Pazarlama':
        return '📢';
      case 'Bakım-Onarım':
        return '🔧';
      default:
        return '📝';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Gider Kayıtları'),
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
      drawer: AdminDrawer(currentIndex: 9),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _expenses.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.receipt_long, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'Henüz gider kaydı yok',
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
                      padding: EdgeInsets.all(16),
                      color: Colors.red[50],
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildStatCard(
                            'Toplam Gider',
                            '${_expenses.fold<double>(0, (sum, e) => sum + e.amount).toStringAsFixed(2)} TL',
                            Icons.money_off,
                            Colors.red,
                          ),
                          _buildStatCard(
                            'Kayıt Sayısı',
                            _expenses.length.toString(),
                            Icons.receipt,
                          ),
                          _buildStatCard(
                            'Kategori',
                            _expenses.map((e) => e.category).toSet().length.toString(),
                            Icons.category,
                          ),
                        ],
                      ),
                    ),

                    // Liste
                    Expanded(
                      child: ListView.builder(
                        padding: EdgeInsets.all(16),
                        itemCount: _expenses.length,
                        itemBuilder: (context, index) {
                          final expense = _expenses[index];
                          return Card(
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.red,
                                child: Text(_getCategoryIcon(expense.category),
                                    style: TextStyle(fontSize: 20)),
                              ),
                              title: Text(
                                expense.name,
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '💰 ${expense.amount.toStringAsFixed(2)} TL',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.red[700],
                                      fontSize: 16,
                                    ),
                                  ),
                                  Text('📁 ${expense.category}'),
                                  if (expense.supplier != null) Text('🏢 ${expense.supplier}'),
                                  if (expense.invoiceNumber != null)
                                    Text('📄 Fatura: ${expense.invoiceNumber}'),
                                  Text(
                                      '📅 ${DateFormat('dd/MM/yyyy').format(expense.expenseDate)}'),
                                ],
                              ),
                              trailing: IconButton(
                                icon: Icon(Icons.delete, color: Colors.red),
                                onPressed: () async {
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (context) => AlertDialog(
                                      title: Text('Sil?'),
                                      content: Text('Bu gider kaydı silinecek.'),
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
                                      await _inventoryService.deleteExpense(expense.id);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('✅ Gider kaydı silindi')),
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddExpenseDialog,
        icon: Icon(Icons.add),
        label: Text('Gider Ekle'),
        backgroundColor: Colors.red,
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, [Color? color]) {
    return Column(
      children: [
        Icon(icon, color: color ?? AppTheme.primaryColor),
        SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color ?? AppTheme.primaryColor,
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
