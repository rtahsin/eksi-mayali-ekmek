// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables

import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../widgets/admin_app_bar.dart';
import '../widgets/admin_drawer.dart';

class AdminAuditLogsPage extends StatefulWidget {
  const AdminAuditLogsPage({Key? key}) : super(key: key);

  @override
  State<AdminAuditLogsPage> createState() => _AdminAuditLogsPageState();
}

class _AdminAuditLogsPageState extends State<AdminAuditLogsPage> {
  String _actionQuery = '';
  String _emailQuery = '';
  DateTime? _fromDate;
  DateTime? _toDate;

  Stream<QuerySnapshot<Map<String, dynamic>>> _logsStream() {
    // Çekilen kayıtları istemci tarafında filtreleyeceğiz (action/email contains, tarih aralığı)
    return FirebaseFirestore.instance
        .collection('admin_logs')
        .orderBy('createdAt', descending: true)
        .limit(200)
        .snapshots();
  }

  Future<void> _pickFromDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _fromDate ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 1),
    );
    if (picked != null) {
      setState(() {
        _fromDate = DateTime(picked.year, picked.month, picked.day);
      });
    }
  }

  Future<void> _pickToDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _toDate ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 1),
    );
    if (picked != null) {
      setState(() {
        _toDate = DateTime(picked.year, picked.month, picked.day, 23, 59, 59);
      });
    }
  }

  bool _applyClientFilters(Map<String, dynamic> data) {
    final action = (data['action'] ?? '').toString().toLowerCase();
    final email = (data['adminEmail'] ?? '').toString().toLowerCase();
    final ts = data['createdAt'];
    DateTime? createdAt;
    if (ts is Timestamp) createdAt = ts.toDate();

    if (_actionQuery.isNotEmpty && !action.contains(_actionQuery.toLowerCase())) {
      return false;
    }
    if (_emailQuery.isNotEmpty && !email.contains(_emailQuery.toLowerCase())) {
      return false;
    }
    if (_fromDate != null && (createdAt == null || createdAt.isBefore(_fromDate!))) {
      return false;
    }
    if (_toDate != null && (createdAt == null || createdAt.isAfter(_toDate!))) {
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AdminAppBar(title: 'Denetim Kayıtları'),
      drawer: AdminDrawer(currentIndex: 7),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Audit Loglar',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                // Action query
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      labelText: 'İşlem Ara (action contains)',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (v) => setState(() => _actionQuery = v),
                  ),
                ),
                const SizedBox(width: 12),
                // Email query
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      labelText: 'E‑posta Ara (email contains)',
                      prefixIcon: Icon(Icons.alternate_email),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (v) => setState(() => _emailQuery = v),
                  ),
                ),
                const SizedBox(width: 12),
                // Tarih aralığı
                OutlinedButton.icon(
                  onPressed: _pickFromDate,
                  icon: Icon(Icons.date_range),
                  label: Text(_fromDate == null
                      ? 'Başlangıç Tarihi'
                      : '${_fromDate!.day}.${_fromDate!.month}.${_fromDate!.year}'),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _pickToDate,
                  icon: Icon(Icons.event),
                  label: Text(_toDate == null
                      ? 'Bitiş Tarihi'
                      : '${_toDate!.day}.${_toDate!.month}.${_toDate!.year}'),
                ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'Filtreleri temizle',
                  onPressed: () => setState(() {
                    _actionQuery = '';
                    _emailQuery = '';
                    _fromDate = null;
                    _toDate = null;
                  }),
                  icon: Icon(Icons.clear_all),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                stream: _logsStream(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('Loglar yüklenirken hata oluştu'));
                  }
                  final docs = snapshot.data?.docs ?? [];
                  final filtered = docs.where((d) => _applyClientFilters(d.data())).toList();

                  if (filtered.isEmpty) {
                    return Center(child: Text('Kayıt bulunamadı'));
                  }

                  return ListView.separated(
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => Divider(height: 1),
                    itemBuilder: (context, index) {
                      final data = filtered[index].data();
                      final action = (data['action'] ?? '').toString();
                      final email = (data['adminEmail'] ?? '').toString();
                      final ts = data['createdAt'];
                      DateTime? createdAt;
                      if (ts is Timestamp) createdAt = ts.toDate();
                      final createdText = createdAt != null
                          ? '${createdAt.day}.${createdAt.month}.${createdAt.year} ${createdAt.hour.toString().padLeft(2, '0')}:${createdAt.minute.toString().padLeft(2, '0')}'
                          : '-';

                      final payload = data['data'];
                      final jsonStr = const JsonEncoder.withIndent('  ').convert(payload);

                      return ExpansionTile(
                        title: Text(action, style: TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text('$email  •  $createdText'),
                        children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            color: Colors.grey.shade50,
                            child: SelectableText(
                              jsonStr,
                              style: TextStyle(fontFamily: 'monospace', fontSize: 12),
                            ),
                          ),
                          OverflowBar(
                            alignment: MainAxisAlignment.end,
                            children: [
                              TextButton.icon(
                                onPressed: () async {
                                  await Clipboard.setData(ClipboardData(text: jsonStr));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('JSON kopyalandı')),
                                  );
                                },
                                icon: Icon(Icons.copy),
                                label: Text('JSON Kopyala'),
                              ),
                            ],
                          )
                        ],
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
