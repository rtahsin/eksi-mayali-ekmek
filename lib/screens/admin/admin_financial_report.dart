// ignore_for_file: prefer_const_constructors

/*
 * Finansal Rapor Ekranı
 * 
 * PURPOSE: Gelir-gider dengesi ve kar/zarar analizi
 * LAYER: UI (Admin)
 * 
 * LAST UPDATED: 2025-12-12
 */

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../admin/widgets/admin_drawer.dart';
import '../../services/inventory_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

class AdminFinancialReportScreen extends StatefulWidget {
  const AdminFinancialReportScreen({Key? key}) : super(key: key);

  @override
  State<AdminFinancialReportScreen> createState() => _AdminFinancialReportScreenState();
}

class _AdminFinancialReportScreenState extends State<AdminFinancialReportScreen> {
  final InventoryService _inventoryService = InventoryService();

  Map<String, dynamic>? _report;
  bool _isLoading = true;
  DateTime _startDate = DateTime.now().subtract(Duration(days: 30));
  DateTime _endDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadReport();
  }

  Future<void> _loadReport() async {
    setState(() => _isLoading = true);

    try {
      final report = await _inventoryService.getFinancialReport(
        startDate: _startDate,
        endDate: _endDate,
      );

      if (mounted) {
        setState(() {
          _report = report;
          _isLoading = false;
        });
      }
    } catch (e) {
      Logger.error('Finansal rapor yüklenirken hata: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profit = _report?['profit'] ?? 0.0;
    final isProfit = profit >= 0;

    return Scaffold(
      appBar: AppBar(
        title: Text('Finansal Rapor'),
        actions: [
          IconButton(
            icon: Icon(Icons.filter_list),
            onPressed: () async {
              final picked = await showDateRangePicker(
                context: context,
                firstDate: DateTime(2020),
                lastDate: DateTime.now(),
                initialDateRange: DateTimeRange(start: _startDate, end: _endDate),
              );
              if (picked != null) {
                setState(() {
                  _startDate = picked.start;
                  _endDate = picked.end;
                });
                _loadReport();
              }
            },
          ),
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadReport,
          ),
        ],
      ),
      drawer: AdminDrawer(currentIndex: 10),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _report == null
              ? Center(child: Text('Rapor yüklenemedi'))
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final isMobile = constraints.maxWidth < 600;

                    return SingleChildScrollView(
                      padding: EdgeInsets.all(isMobile ? AppTheme.spaceMd : AppTheme.spaceLg),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Tarih aralığı
                          Card(
                            color: AppTheme.primaryColor.withValues(alpha: 0.1),
                            child: Padding(
                              padding:
                                  EdgeInsets.all(isMobile ? AppTheme.spaceMd : AppTheme.spaceLg),
                              child: isMobile
                                  ? Column(
                                      children: [
                                        Icon(Icons.calendar_today,
                                            color: AppTheme.primaryColor, size: 20),
                                        SizedBox(height: 8),
                                        Text(
                                          '${DateFormat('dd/MM/yyyy').format(_startDate)}\n${DateFormat('dd/MM/yyyy').format(_endDate)}',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.primaryColor,
                                          ),
                                        ),
                                      ],
                                    )
                                  : Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.calendar_today, color: AppTheme.primaryColor),
                                        SizedBox(width: 8),
                                        Text(
                                          '${DateFormat('dd/MM/yyyy').format(_startDate)} - ${DateFormat('dd/MM/yyyy').format(_endDate)}',
                                          style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.primaryColor,
                                          ),
                                        ),
                                      ],
                                    ),
                            ),
                          ),
                          SizedBox(height: isMobile ? 16 : 24),

                          // KAR/ZARAR (En büyük kart)
                          Card(
                            elevation: 8,
                            color: isProfit ? Colors.green[50] : Colors.red[50],
                            child: Padding(
                              padding:
                                  EdgeInsets.all(isMobile ? AppTheme.spaceLg : AppTheme.spaceXl),
                              child: Column(
                                children: [
                                  Icon(
                                    isProfit ? Icons.trending_up : Icons.trending_down,
                                    size: isMobile ? 36 : 48,
                                    color: isProfit ? Colors.green[700] : Colors.red[700],
                                  ),
                                  SizedBox(height: isMobile ? 8 : 12),
                                  Text(
                                    isProfit ? 'NET KAR' : 'NET ZARAR',
                                    style: TextStyle(
                                      fontSize: isMobile ? 16 : 20,
                                      fontWeight: FontWeight.bold,
                                      color: isProfit ? Colors.green[900] : Colors.red[900],
                                    ),
                                  ),
                                  SizedBox(height: isMobile ? 6 : 8),
                                  Text(
                                    '${isProfit ? '' : '-'}${profit.abs().toStringAsFixed(2)} TL',
                                    style: TextStyle(
                                      fontSize: isMobile ? 28 : 36,
                                      fontWeight: FontWeight.bold,
                                      color: isProfit ? Colors.green[700] : Colors.red[700],
                                    ),
                                  ),
                                  SizedBox(height: isMobile ? 6 : 8),
                                  Text(
                                    'Kar Marjı: ${_report!['profitMargin'].toStringAsFixed(1)}%',
                                    style: TextStyle(
                                      fontSize: isMobile ? 14 : 16,
                                      color: Colors.grey[700],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          SizedBox(height: isMobile ? 16 : 24),

                          // GELİR
                          Card(
                            color: Colors.green[50],
                            child: Padding(
                              padding:
                                  EdgeInsets.all(isMobile ? AppTheme.spaceMd : AppTheme.spaceLg),
                              child: Column(
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.arrow_upward,
                                          color: Colors.green[700], size: isMobile ? 20 : 24),
                                      SizedBox(width: 8),
                                      Text(
                                        'TOPLAM GELİR',
                                        style: TextStyle(
                                          fontSize: isMobile ? 16 : 18,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.green[900],
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Satış Geliri:',
                                        style: TextStyle(fontSize: isMobile ? 14 : 16),
                                      ),
                                      Text(
                                        '${_report!['totalRevenue'].toStringAsFixed(2)} TL',
                                        style: TextStyle(
                                          fontSize: isMobile ? 16 : 18,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.green[700],
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Satış Sayısı:',
                                          style: TextStyle(fontSize: isMobile ? 12 : 14)),
                                      Text(
                                        '${_report!['salesCount']} adet',
                                        style: TextStyle(
                                            fontSize: isMobile ? 12 : 14, color: Colors.grey[700]),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          SizedBox(height: 16),

                          // GİDER
                          Card(
                            color: Colors.red[50],
                            child: Padding(
                              padding:
                                  EdgeInsets.all(isMobile ? AppTheme.spaceMd : AppTheme.spaceLg),
                              child: Column(
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.arrow_downward,
                                          color: Colors.red[700], size: isMobile ? 20 : 24),
                                      SizedBox(width: 8),
                                      Text(
                                        'TOPLAM GİDER',
                                        style: TextStyle(
                                          fontSize: isMobile ? 16 : 18,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.red[900],
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Giderler:',
                                        style: TextStyle(
                                          fontSize: isMobile ? 14 : 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        '${_report!['totalExpenses'].toStringAsFixed(2)} TL',
                                        style: TextStyle(
                                          fontSize: isMobile ? 16 : 18,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.red[700],
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Gider Kayıt Sayısı:',
                                          style: TextStyle(fontSize: isMobile ? 12 : 14)),
                                      Text(
                                        '${_report!['expensesCount']} adet',
                                        style: TextStyle(
                                            fontSize: isMobile ? 12 : 14, color: Colors.grey[700]),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          SizedBox(height: 16),

                          // ÜRETİM BİLGİSİ (Sadece bilgilendirme)
                          Card(
                            color: Colors.blue[50],
                            child: Padding(
                              padding:
                                  EdgeInsets.all(isMobile ? AppTheme.spaceMd : AppTheme.spaceLg),
                              child: Column(
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.factory,
                                          color: Colors.blue[700], size: isMobile ? 20 : 24),
                                      SizedBox(width: 8),
                                      Text(
                                        'ÜRETİM BİLGİSİ',
                                        style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.blue[900],
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Toplam Üretim:', style: TextStyle(fontSize: 14)),
                                      Text(
                                        '${_report!['totalProductionQuantity']} adet',
                                        style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.blue[700]),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 4),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Üretim Kayıt Sayısı:', style: TextStyle(fontSize: 14)),
                                      Text(
                                        '${_report!['productionsCount']} adet',
                                        style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          SizedBox(height: 24),

                          // Formül açıklaması
                          Card(
                            color: Colors.blue[50],
                            child: Padding(
                              padding: const EdgeInsets.all(AppTheme.spaceLg),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.calculate, color: Colors.blue[700]),
                                      SizedBox(width: 8),
                                      Text(
                                        'HESAPLAMA FORMÜLÜ',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.blue[900],
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 12),
                                  Text(
                                    'Toplam Gelir = Satış Tutarları',
                                    style: TextStyle(fontSize: 14),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Toplam Gider = Hammadde + Enerji + Diğer Giderler',
                                    style: TextStyle(fontSize: 14),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Net Kar/Zarar = Toplam Gelir - Toplam Gider',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.blue[900],
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Kar Marjı % = (Net Kar / Toplam Gelir) x 100',
                                    style: TextStyle(fontSize: 14),
                                  ),
                                  SizedBox(height: 8),
                                  Divider(),
                                  Text(
                                    '💡 Üretim kayıtları sadece stok takibi içindir, maliyete dahil edilmez.',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                        fontStyle: FontStyle.italic),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          SizedBox(height: 24),

                          // Hızlı filtre butonları
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _QuickFilterButton(
                                label: 'Bugün',
                                onPressed: () {
                                  setState(() {
                                    _startDate = DateTime.now();
                                    _endDate = DateTime.now();
                                  });
                                  _loadReport();
                                },
                              ),
                              _QuickFilterButton(
                                label: 'Bu Hafta',
                                onPressed: () {
                                  setState(() {
                                    _startDate = DateTime.now().subtract(Duration(days: 7));
                                    _endDate = DateTime.now();
                                  });
                                  _loadReport();
                                },
                              ),
                              _QuickFilterButton(
                                label: 'Bu Ay',
                                onPressed: () {
                                  final now = DateTime.now();
                                  setState(() {
                                    _startDate = DateTime(now.year, now.month, 1);
                                    _endDate = now;
                                  });
                                  _loadReport();
                                },
                              ),
                              _QuickFilterButton(
                                label: 'Son 3 Ay',
                                onPressed: () {
                                  setState(() {
                                    _startDate = DateTime.now().subtract(Duration(days: 90));
                                    _endDate = DateTime.now();
                                  });
                                  _loadReport();
                                },
                              ),
                              _QuickFilterButton(
                                label: 'Bu Yıl',
                                onPressed: () {
                                  final now = DateTime.now();
                                  setState(() {
                                    _startDate = DateTime(now.year, 1, 1);
                                    _endDate = now;
                                  });
                                  _loadReport();
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}

class _QuickFilterButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;

  const _QuickFilterButton({
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        side: BorderSide(color: AppTheme.primaryColor),
      ),
      child: Text(label),
    );
  }
}
