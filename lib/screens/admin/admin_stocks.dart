// ignore_for_file: prefer_const_constructors

/*
 * Stok Yönetimi Ekranı
 * 
 * PURPOSE: Ürün stoklarını görüntüleme
 * LAYER: UI (Admin)
 * 
 * LAST UPDATED: 2025-12-12
 */

import 'package:flutter/material.dart';

import '../../admin/widgets/admin_drawer.dart';
import '../../models/stock.dart';
import '../../services/inventory_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

class AdminStocksScreen extends StatefulWidget {
  const AdminStocksScreen({Key? key}) : super(key: key);

  @override
  State<AdminStocksScreen> createState() => _AdminStocksScreenState();
}

class _AdminStocksScreenState extends State<AdminStocksScreen> {
  final InventoryService _inventoryService = InventoryService();
  
  List<Stock> _stocks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    try {
      final stocks = await _inventoryService.getAllStocks();
      
      if (mounted) {
        setState(() {
          _stocks = stocks;
          _isLoading = false;
        });
      }
    } catch (e) {
      Logger.error('Stok verileri yüklenirken hata: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;
    final lowStocks = _stocks.where((s) => s.isLowStock).toList();
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Stok Durumu'),
        actions: [
          if (lowStocks.isNotEmpty)
            Padding(
              padding: EdgeInsets.only(right: 8),
              child: Chip(
                avatar: Icon(Icons.warning, color: Colors.white, size: 16),
                label: Text('${lowStocks.length} Düşük'),
                backgroundColor: Colors.red,
                labelStyle: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          IconButton(
            icon: Icon(Icons.refresh_rounded),
            onPressed: _loadData,
          ),
        ],
      ),
      drawer: AdminDrawer(currentIndex: 7),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _stocks.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.store_rounded, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'Henüz stok kaydı yok',
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Üretim veya satış yapınca stoklar güncellenecek',
                        style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Özet
                    if (lowStocks.isNotEmpty)
                      Container(
                        width: double.infinity,
                        padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.red[100]!, Colors.red[200]!],
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.warning_rounded, color: Colors.red[800], size: isSmallScreen ? 28 : 32),
                            SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'DİKKAT: Düşük Stok!',
                                    style: TextStyle(
                                      fontSize: isSmallScreen ? 14 : 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.red[900],
                                    ),
                                  ),
                                  Text(
                                    '${lowStocks.length} ürünün stoğu azalmış durumda',
                                    style: TextStyle(
                                      fontSize: isSmallScreen ? 12 : 13,
                                      color: Colors.red[800],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    
                    // Liste
                    Expanded(
                      child: ListView.builder(
                        padding: EdgeInsets.all(isSmallScreen ? 8 : 16),
                        itemCount: _stocks.length,
                        itemBuilder: (context, index) {
                          final stock = _stocks[index];
                          final isLowStock = stock.isLowStock;
                          
                          return Card(
                            margin: EdgeInsets.only(bottom: isSmallScreen ? 8 : 12),
                            elevation: isLowStock ? 4 : 1,
                            color: isLowStock ? Colors.red[50] : null,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: isLowStock
                                  ? BorderSide(color: Colors.red[300]!, width: 2)
                                  : BorderSide.none,
                            ),
                            child: ListTile(
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: isSmallScreen ? 12 : 16,
                                vertical: isSmallScreen ? 8 : 12,
                              ),
                              leading: Container(
                                padding: EdgeInsets.all(isSmallScreen ? 8 : 10),
                                decoration: BoxDecoration(
                                  color: isLowStock ? Colors.red : AppTheme.primaryColor,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  isLowStock ? Icons.warning_rounded : Icons.inventory_2_rounded,
                                  color: Colors.white,
                                  size: isSmallScreen ? 20 : 24,
                                ),
                              ),
                              title: Text(
                                stock.productName,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: isSmallScreen ? 14 : 16,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SizedBox(height: 4),
                                  Text(
                                    '📦 Mevcut: ${stock.quantity} adet',
                                    style: TextStyle(
                                      fontSize: isSmallScreen ? 14 : 16,
                                      fontWeight: FontWeight.bold,
                                      color: isLowStock ? Colors.red[700] : Colors.green[700],
                                    ),
                                  ),
                                  Text(
                                    '⚠️ Minimum: ${stock.minQuantity} adet',
                                    style: TextStyle(fontSize: isSmallScreen ? 12 : 13),
                                  ),
                                  if (isLowStock)
                                    Padding(
                                      padding: EdgeInsets.only(top: 4),
                                      child: Text(
                                        '🔔 Stok tamamlanmalı!',
                                        style: TextStyle(
                                          color: Colors.red[700],
                                          fontWeight: FontWeight.bold,
                                          fontSize: isSmallScreen ? 11 : 12,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              trailing: isLowStock
                                  ? Container(
                                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.red,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        'DÜŞÜK',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: isSmallScreen ? 10 : 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    )
                                  : Icon(
                                      Icons.check_circle_rounded,
                                      color: Colors.green,
                                      size: isSmallScreen ? 24 : 28,
                                    ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
    );
  }
}
