import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Basit admin audit log servisi.
/// Admin işlemleri için bir belge ekler: action, data, adminId, adminEmail, createdAt (server time).
class AuditLogService {
  AuditLogService._();
  static final AuditLogService instance = AuditLogService._();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Bir admin işlemini kaydeder. Hata durumunda sessizce yutulur.
  Future<void> log(String action, {Map<String, dynamic>? data}) async {
    try {
      final user = _auth.currentUser;
      await _firestore.collection('admin_logs').add({
        'action': action,
        'data': _sanitizeData(data),
        'adminId': user?.uid ?? 'anonymous',
        'adminEmail': user?.email ?? '',
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (_) {
      // Sessiz geç - log hatası uygulamayı bozmasın.
    }
  }

  Map<String, dynamic>? _sanitizeData(Map<String, dynamic>? data) {
    if (data == null) return null;
    // İç içe referanslar veya büyük binary verileri filtrelemek için basit bir kopya.
    return Map<String, dynamic>.from(data);
  }
}
