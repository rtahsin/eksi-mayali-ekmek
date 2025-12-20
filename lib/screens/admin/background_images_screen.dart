// ignore_for_file: use_build_context_synchronously, unused_field, unused_element, unused_local_variable

import 'dart:convert';
import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:file_picker/file_picker.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../services/audit_log_service.dart';
import '../../utils/logger.dart';
import '../../widgets/image_crop_dialog.dart';

class BackgroundImagesScreen extends StatefulWidget {
  const BackgroundImagesScreen({super.key});

  @override
  State<BackgroundImagesScreen> createState() => _BackgroundImagesScreenState();
}

class _BackgroundImagesScreenState extends State<BackgroundImagesScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;

  bool _isLoading = false;
  List<Map<String, dynamic>> _backgroundImages = [];

  @override
  void initState() {
    super.initState();
    _loadBackgroundImages();
  }

  Future<void> _loadBackgroundImages() async {
    Logger.info('🔄 [LOAD BANNERS] Yükleniyor...');
    setState(() => _isLoading = true);
    try {
      final doc = await _firestore.collection('settings').doc('background_images').get();
      Logger.info('📊 [LOAD BANNERS] Firestore document exists: ${doc.exists}');
      if (doc.exists) {
        final data = doc.data();
        if (data != null && data['images'] != null) {
          final list = List<Map<String, dynamic>>.from(data['images']);
          // Normalize missing fields
          for (var i = 0; i < list.length; i++) {
            list[i]['order'] ??= i;
            list[i]['isActive'] ??= true;
            list[i]['id'] ??= '${DateTime.now().microsecondsSinceEpoch}_$i';
          }
          list.sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));

          Logger.info('✅ [LOAD BANNERS] ${list.length} banner yüklendi:');
          for (var i = 0; i < list.length; i++) {
            Logger.info(
                '   [$i] ${list[i]['title']} - URL: ${list[i]['url']?.substring(0, 50) ?? 'BOŞ'}...');
            Logger.info('       Page: ${list[i]['page']}, Active: ${list[i]['isActive']}');
          }

          setState(() {
            _backgroundImages = list;
          });
        }
      }
    } catch (e) {
      _showError('Görseller yüklenemedi: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _ensureAdminClaim() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    final idToken = await user.getIdToken();
    final uri =
        Uri.parse('https://us-central1-eksimayaliekmekweb.cloudfunctions.net/ensureAdminClaim');
    try {
      final resp = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: jsonEncode({}),
      );
      if (resp.statusCode == 200) {
        // Claim güncellemeleri için token yenile
        await user.getIdToken(true);
      }
    } catch (_) {
      // Sessiz geç; storage rules başarısız olursa UI hata gösterecek
    }
  }

  Future<void> _pickAndUploadImage() async {
    try {
      await _ensureAdminClaim();

      // Hangi sayfa için banner seç
      final selectedPage = await showDialog<String>(
        context: context,
        builder: (context) => Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade700,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  ),
                  child: Row(
                    children: const [
                      Icon(Icons.pageview, color: Colors.white, size: 28),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Banner Hangi Sayfada Görünsün?',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildPageOption(
                        context,
                        icon: Icons.home,
                        title: 'Ana Sayfa',
                        subtitle: 'Carousel slider olarak görünür',
                        color: Colors.orange,
                        onTap: () => Navigator.pop(context, 'home'),
                      ),
                      const SizedBox(height: 8),
                      _buildPageOption(
                        context,
                        icon: Icons.shopping_bag,
                        title: 'Ürünler Sayfası',
                        subtitle: 'Ürünler sayfasının üstünde',
                        color: Colors.green,
                        onTap: () => Navigator.pop(context, 'products'),
                      ),
                      const SizedBox(height: 8),
                      _buildPageOption(
                        context,
                        icon: Icons.article,
                        title: 'Blog Sayfası',
                        subtitle: 'Blog listesinin üstünde',
                        color: Colors.blue,
                        onTap: () => Navigator.pop(context, 'blog'),
                      ),
                      const SizedBox(height: 8),
                      _buildPageOption(
                        context,
                        icon: Icons.info,
                        title: 'Hakkımızda Sayfası',
                        subtitle: 'Hakkımızda sayfasının üstünde',
                        color: Colors.purple,
                        onTap: () => Navigator.pop(context, 'about'),
                      ),
                      const SizedBox(height: 8),
                      _buildPageOption(
                        context,
                        icon: Icons.all_inclusive,
                        title: 'Tüm Sayfalarda',
                        subtitle: 'Her sayfada kullanılabilir',
                        color: Colors.teal,
                        onTap: () => Navigator.pop(context, 'all'),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('İptal'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );

      if (selectedPage == null) return;

      Logger.info('📤 [BANNER UPLOAD] Başlıyor - Sayfa: $selectedPage');

      // Dosya seç
      final picked = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        withData: true,
      );

      Logger.info('📁 [BANNER UPLOAD] Dosya seçildi: ${picked?.files.single.name}');

      if (picked == null || picked.files.isEmpty) return;

      final file = picked.files.single;
      var bytes = file.bytes;
      if (bytes == null) return;

      setState(() => _isLoading = true);

      // Kırpma dialog'unu göster (16:9 arka plan için)
      final croppedBytes = await showDialog<Uint8List>(
        context: context,
        barrierDismissible: false,
        builder: (context) => ImageCropDialog(
          imageBytes: bytes,
          aspectRatioLabel: 'Yatay (16:9)',
          initialAspectRatio: 16 / 9,
        ),
      );

      if (croppedBytes == null) {
        setState(() => _isLoading = false);
        return;
      }

      // Kırpılmış görseli kullan
      final Uint8List imageBytes = croppedBytes;

      // Firebase Storage'a yükle
      final String fileName = 'background_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final Reference ref = _storage.ref().child('backgrounds/$fileName');

      Logger.info('📁 [STORAGE] Path: ${ref.fullPath}');
      Logger.info('📊 [STORAGE] Görsel boyutu: ${imageBytes.length} bytes');

      final UploadTask uploadTask = ref.putData(
        imageBytes,
        SettableMetadata(contentType: 'image/jpeg'),
      );

      final TaskSnapshot snapshot = await uploadTask;
      Logger.info('✅ [STORAGE] Yükleme tamamlandı: ${snapshot.state}');

      final String downloadUrl = await snapshot.ref.getDownloadURL();
      Logger.info('🔗 [STORAGE] Download URL: $downloadUrl');

      // Önce metin ve ayarları al
      if (!mounted) return;
      final bannerData = await _showBannerEditDialog(
        title: 'Arka Plan Görseli',
        subtitle: 'Yeni yüklenen görsel',
        buttonText: 'Keşfet',
        linkTarget: '',
        isActive: true,
        page: selectedPage,
        previewUrl: downloadUrl,
      );

      if (bannerData == null) {
        // Kullanıcı iptal etti, yüklenen görseli sil
        await ref.delete();
        return;
      }

      // Firestore'a kaydet
      final newBanner = {
        'id': DateTime.now().microsecondsSinceEpoch.toString(),
        'url': downloadUrl,
        ...bannerData,
        'order': _backgroundImages.length,
        'uploadedAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      };

      Logger.info('💾 [FIRESTORE] Yeni banner verisi:');
      Logger.info('   - ID: ${newBanner['id']}');
      Logger.info('   - URL: ${newBanner['url']}');
      Logger.info('   - Title: ${newBanner['title']}');
      Logger.info('   - Page: ${newBanner['page']}');
      Logger.info('   - isActive: ${newBanner['isActive']}');

      _backgroundImages.add(newBanner);

      await _firestore.collection('settings').doc('background_images').set({
        'images': _backgroundImages,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      Logger.info('✅ [FIRESTORE] Kaydedildi. Toplam banner: ${_backgroundImages.length}');
      // Audit log
      await AuditLogService.instance.log('background_image_upload', data: {
        'url': downloadUrl,
        'count': _backgroundImages.length,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Görsel başarıyla yüklendi')),
        );
        _loadBackgroundImages();
      }
    } catch (e, stackTrace) {
      Logger.info('❌ [BANNER UPLOAD] HATA: $e');
      Logger.info('📚 [BANNER UPLOAD] Stack trace:');
      Logger.error(stackTrace.toString());
      _showError('Görsel yüklenemedi: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteImage(int index) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Görseli Sil'),
        content: const Text('Bu görseli silmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sil', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      // Storage'dan sil (URL'den dosya adını çıkar)
      final String imageUrl = _backgroundImages[index]['url'];
      if (imageUrl.contains('backgrounds/')) {
        try {
          final ref = _storage.refFromURL(imageUrl);
          await ref.delete();
        } catch (e) {
          // Dosya bulunamazsa devam et
        }
      }

      // Listeden kaldır ve Firestore'u güncelle
      _backgroundImages.removeAt(index);
      await _firestore.collection('settings').doc('background_images').set({
        'images': _backgroundImages,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      await AuditLogService.instance.log('background_image_delete', data: {
        'index': index,
        'remaining': _backgroundImages.length,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Görsel silindi')),
        );
        _loadBackgroundImages();
      }
    } catch (e) {
      _showError('Görsel silinemedi: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _editImageTexts(int index) async {
    final bannerData = await _showBannerEditDialog(
      title: _backgroundImages[index]['title'] ?? '',
      subtitle: _backgroundImages[index]['subtitle'] ?? '',
      buttonText: _backgroundImages[index]['buttonText'] ?? '',
      linkTarget: _backgroundImages[index]['linkTarget'] ?? '',
      isActive: _backgroundImages[index]['isActive'] == true,
      page: _backgroundImages[index]['page'] ?? 'home',
      previewUrl: _backgroundImages[index]['url'],
    );

    if (bannerData == null) return;

    setState(() => _isLoading = true);
    try {
      _backgroundImages[index]['title'] = bannerData['title'];
      _backgroundImages[index]['subtitle'] = bannerData['subtitle'];
      _backgroundImages[index]['buttonText'] = bannerData['buttonText'];
      _backgroundImages[index]['linkTarget'] = bannerData['linkTarget'];
      _backgroundImages[index]['isActive'] = bannerData['isActive'];
      _backgroundImages[index]['page'] = bannerData['page'];
      _backgroundImages[index]['updatedAt'] = DateTime.now().toIso8601String();

      await _firestore.collection('settings').doc('background_images').set({
        'images': _backgroundImages,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      await AuditLogService.instance.log('background_image_edit', data: {
        'index': index,
        'id': _backgroundImages[index]['id'],
        'isActive': _backgroundImages[index]['isActive'],
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Metinler güncellendi')),
        );
        _loadBackgroundImages();
      }
    } catch (e) {
      _showError('Güncelleme başarısız: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildStatChip(IconData icon, String label, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            '$label: $count',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPageOption(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 18, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }

  String _getPageLabel(String page) {
    switch (page) {
      case 'home':
        return 'Ana Sayfa';
      case 'products':
        return 'Ürünler';
      case 'blog':
        return 'Blog';
      case 'about':
        return 'Hakkımızda';
      case 'all':
        return 'Tüm Sayfalar';
      default:
        return page;
    }
  }

  Future<Map<String, dynamic>?> _showBannerEditDialog({
    required String title,
    required String subtitle,
    required String buttonText,
    required String linkTarget,
    required bool isActive,
    required String page,
    String? previewUrl,
  }) async {
    final titleController = TextEditingController(text: title);
    final subtitleController = TextEditingController(text: subtitle);
    final buttonTextController = TextEditingController(text: buttonText);
    final linkTargetController = TextEditingController(text: linkTarget);
    bool activeState = isActive;
    String selectedPage = page;

    return showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 900, maxHeight: 700),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                color: Colors.blue.shade700,
                child: Row(
                  children: [
                    const Icon(Icons.edit, color: Colors.white),
                    const SizedBox(width: 12),
                    Text(
                      previewUrl != null ? 'Banner Önizleme ve Ayarlar' : 'Banner Ayarları',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: Row(
                  children: [
                    // Preview (if URL provided)
                    if (previewUrl != null)
                      Expanded(
                        flex: 3,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.network(
                              previewUrl,
                              fit: BoxFit.cover,
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return const Center(child: CircularProgressIndicator());
                              },
                            ),
                            // Text overlay preview
                            Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.black.withValues(alpha: 0.3),
                                    Colors.black.withValues(alpha: 0.6),
                                  ],
                                ),
                              ),
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    titleController.text,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 36,
                                      fontWeight: FontWeight.bold,
                                      shadows: [
                                        Shadow(color: Colors.black54, blurRadius: 10),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    subtitleController.text,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 20,
                                      shadows: [
                                        Shadow(color: Colors.black54, blurRadius: 8),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  if (buttonTextController.text.isNotEmpty)
                                    ElevatedButton(
                                      onPressed: null,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.orange,
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 24,
                                          vertical: 12,
                                        ),
                                        disabledBackgroundColor: Colors.orange,
                                      ),
                                      child: Text(
                                        buttonTextController.text,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    // Form
                    Expanded(
                      flex: 2,
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: StatefulBuilder(
                          builder: (context, setDialogState) => Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              TextField(
                                controller: titleController,
                                decoration: const InputDecoration(
                                  labelText: 'Başlık',
                                  border: OutlineInputBorder(),
                                ),
                                onChanged: (value) => setDialogState(() {}),
                              ),
                              const SizedBox(height: 16),
                              TextField(
                                controller: subtitleController,
                                decoration: const InputDecoration(
                                  labelText: 'Alt Başlık',
                                  border: OutlineInputBorder(),
                                ),
                                maxLines: 2,
                                onChanged: (value) => setDialogState(() {}),
                              ),
                              const SizedBox(height: 16),
                              TextField(
                                controller: buttonTextController,
                                decoration: const InputDecoration(
                                  labelText: 'Buton Metni',
                                  border: OutlineInputBorder(),
                                ),
                                onChanged: (value) => setDialogState(() {}),
                              ),
                              const SizedBox(height: 16),
                              TextField(
                                controller: linkTargetController,
                                decoration: const InputDecoration(
                                  labelText: 'Link (örn: /urunler)',
                                  border: OutlineInputBorder(),
                                ),
                              ),
                              const SizedBox(height: 16),
                              DropdownButtonFormField<String>(
                                value: selectedPage,
                                decoration: const InputDecoration(
                                  labelText: 'Hangi Sayfada Gösterilsin?',
                                  border: OutlineInputBorder(),
                                ),
                                items: const [
                                  DropdownMenuItem(value: 'home', child: Text('Ana Sayfa')),
                                  DropdownMenuItem(value: 'products', child: Text('Ürünler')),
                                  DropdownMenuItem(value: 'blog', child: Text('Blog')),
                                  DropdownMenuItem(value: 'about', child: Text('Hakkımızda')),
                                  DropdownMenuItem(value: 'all', child: Text('Tüm Sayfalar')),
                                ],
                                onChanged: (value) {
                                  if (value != null) {
                                    setDialogState(() => selectedPage = value);
                                  }
                                },
                              ),
                              const SizedBox(height: 16),
                              SwitchListTile(
                                title: const Text('Aktif'),
                                subtitle: const Text('Banner görünürlüğü'),
                                value: activeState,
                                onChanged: (value) {
                                  setDialogState(() => activeState = value);
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Info + Actions
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  border: Border(top: BorderSide(color: Colors.grey.shade300)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline, size: 18, color: Colors.blue[700]),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Değişiklikleri önizlemede görebilirsiniz. Kaydetmek için "Yayınla" butonuna basın.',
                            style: TextStyle(color: Colors.grey[700], fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () => Navigator.of(context).pop(null),
                          icon: const Icon(Icons.cancel),
                          label: const Text('İptal'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 12,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).pop({
                              'title': titleController.text,
                              'subtitle': subtitleController.text,
                              'buttonText': buttonTextController.text,
                              'linkTarget': linkTargetController.text,
                              'isActive': activeState,
                              'page': selectedPage,
                            });
                          },
                          icon: const Icon(Icons.publish),
                          label: const Text('Yayınla'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 32,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _persistImages() async {
    await _firestore.collection('settings').doc('background_images').set({
      'images': _backgroundImages,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Banner Görselleri Yönetimi'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadBackgroundImages,
            tooltip: 'Yenile',
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: _isLoading ? null : _pickAndUploadImage,
            icon: const Icon(Icons.add_photo_alternate),
            label: const Text('Yeni Banner Ekle'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _backgroundImages.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.panorama, size: 80, color: Colors.grey[300]),
                      const SizedBox(height: 24),
                      Text(
                        'Henüz banner görseli yok',
                        style: TextStyle(
                          color: Colors.grey[700],
                          fontSize: 20,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Sayfalara özel banner görselleri ekleyebilirsiniz',
                        style: TextStyle(color: Colors.grey[500], fontSize: 14),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: _pickAndUploadImage,
                        icon: const Icon(Icons.add_photo_alternate, size: 24),
                        label: const Text('İlk Banner\'ı Ekle'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.blue.shade50, Colors.blue.shade100],
                        ),
                        border: Border(bottom: BorderSide(color: Colors.blue.shade200, width: 2)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade700,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child:
                                    const Icon(Icons.photo_library, color: Colors.white, size: 24),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Toplam ${_backgroundImages.length} Banner Görseli',
                                      style: TextStyle(
                                        color: Colors.blue[900],
                                        fontWeight: FontWeight.bold,
                                        fontSize: 18,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Her sayfa için ayrı banner ekleyip özelleştirebilirsiniz',
                                      style: TextStyle(
                                        color: Colors.blue[700],
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              _buildStatChip(
                                  Icons.visibility,
                                  'Aktif',
                                  _backgroundImages.where((img) => img['isActive'] == true).length,
                                  Colors.green),
                              const SizedBox(width: 8),
                              _buildStatChip(
                                  Icons.visibility_off,
                                  'Pasif',
                                  _backgroundImages.where((img) => img['isActive'] == false).length,
                                  Colors.red),
                              const SizedBox(width: 8),
                              _buildStatChip(
                                  Icons.home,
                                  'Ana Sayfa',
                                  _backgroundImages.where((img) => img['page'] == 'home').length,
                                  Colors.orange),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        itemCount: _backgroundImages.length,
                        itemBuilder: (context, index) {
                          final image = _backgroundImages[index];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 12),
                            elevation: 4,
                            shadowColor: Colors.black26,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: BorderSide(color: Colors.grey.shade200, width: 1),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Stack(
                                  children: [
                                    ClipRRect(
                                      borderRadius:
                                          const BorderRadius.vertical(top: Radius.circular(16)),
                                      child: AspectRatio(
                                        aspectRatio: 16 / 9,
                                        child: Image.network(
                                          image['url'],
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) {
                                            return Container(
                                              color: Colors.grey[300],
                                              child: const Icon(Icons.broken_image, size: 64),
                                            );
                                          },
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      right: 8,
                                      top: 8,
                                      child: Container(
                                        padding:
                                            const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: (image['isActive'] == true
                                                  ? Colors.green
                                                  : Colors.red)
                                              .withValues(alpha: 0.85),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          image['isActive'] == true ? 'Aktif' : 'Pasif',
                                          style: const TextStyle(color: Colors.white, fontSize: 12),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        image['title'] ?? 'Başlık yok',
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        image['subtitle'] ?? 'Alt başlık yok',
                                        style: TextStyle(color: Colors.grey[600]),
                                      ),
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 12,
                                        runSpacing: 4,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.blue.shade50,
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(color: Colors.blue.shade200),
                                            ),
                                            child: Text(
                                              _getPageLabel(image['page'] ?? 'home'),
                                              style: TextStyle(
                                                color: Colors.blue[900],
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                          Text(
                                            'Buton: ${image['buttonText'] ?? 'Yok'}',
                                            style: TextStyle(
                                              color: Colors.grey[700],
                                              fontStyle: FontStyle.italic,
                                            ),
                                          ),
                                          if ((image['linkTarget'] ?? '').toString().isNotEmpty)
                                            Text(
                                              'Link: ${image['linkTarget']}',
                                              style: TextStyle(
                                                color: Colors.blue[700],
                                                fontStyle: FontStyle.italic,
                                              ),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 16),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              onPressed: () => _editImageTexts(index),
                                              icon: const Icon(Icons.edit, size: 20),
                                              label: const Text('Düzenle'),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: Colors.blue,
                                                foregroundColor: Colors.white,
                                                padding: const EdgeInsets.symmetric(vertical: 14),
                                                textStyle: const TextStyle(
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: OutlinedButton.icon(
                                              onPressed: () => _deleteImage(index),
                                              icon: const Icon(Icons.delete,
                                                  color: Colors.red, size: 20),
                                              label: const Text(
                                                'Sil',
                                                style: TextStyle(
                                                  color: Colors.red,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                              style: OutlinedButton.styleFrom(
                                                side: const BorderSide(color: Colors.red, width: 2),
                                                padding: const EdgeInsets.symmetric(vertical: 14),
                                                textStyle: const TextStyle(fontSize: 15),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
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
