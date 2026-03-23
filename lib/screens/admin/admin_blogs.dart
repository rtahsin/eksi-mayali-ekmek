import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';

import '../../models/blog_post.dart';
import '../../services/image_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../utils/logger.dart';
import '../../widgets/app_loading_indicator.dart';
import '../../widgets/image_crop_dialog.dart';

/// Blog yazılarını yönetmek için admin paneli ekranı
class AdminBlogs extends StatefulWidget {
  const AdminBlogs({Key? key}) : super(key: key);

  @override
  State<AdminBlogs> createState() => _AdminBlogsState();
}

class _AdminBlogsState extends State<AdminBlogs> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  List<BlogPost> _blogs = [];
  bool _isLoading = true;
  String _errorMessage = '';

  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _summaryController = TextEditingController();
  final _contentController = TextEditingController();
  final _imageUrlController = TextEditingController();
  final _authorController = TextEditingController();
  final _categoryController = TextEditingController();
  final _tagsController = TextEditingController();
  BlogPost? _selectedBlog;
  bool _uploadingImage = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadBlogs();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleController.dispose();
    _summaryController.dispose();
    _contentController.dispose();
    _imageUrlController.dispose();
    _authorController.dispose();
    _categoryController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  /// Blog yazılarını Firestore'dan yükle
  Future<void> _loadBlogs() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final snapshot = await _firestore
          .collection(FirestoreCollections.blogs)
          .orderBy('date', descending: true)
          .get();

      final blogs = snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return BlogPost.fromJson(data);
      }).toList();

      setState(() {
        _blogs = blogs;
        _isLoading = false;
      });
    } catch (e) {
      Logger.error('Blog yazıları yüklenirken hata: $e');
      setState(() {
        _errorMessage = 'Blog yazıları yüklenirken bir hata oluştu.';
        _isLoading = false;
      });
    }
  }

  Future<void> _pickAndUploadBlogImage() async {
    if (_uploadingImage) return;
    try {
      setState(() => _uploadingImage = true);
      final picked = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        withData: true,
      );
      if (picked == null || picked.files.isEmpty) {
        setState(() => _uploadingImage = false);
        return;
      }
      final file = picked.files.single;
      var bytes = file.bytes;
      if (bytes == null) {
        setState(() => _uploadingImage = false);
        return;
      }

      // Kırpma dialog'unu göster
      final croppedBytes = await showDialog<Uint8List>(
        context: context,
        barrierDismissible: false,
        builder: (context) => ImageCropDialog(
          imageBytes: bytes,
          aspectRatioLabel: 'Blog (4:3)',
          initialAspectRatio: 4 / 3,
        ),
      );

      if (croppedBytes == null) {
        setState(() => _uploadingImage = false);
        return;
      }

      final prefix = 'blog-images/${_selectedBlog?.id ?? 'new'}';
      final url = await ImageService.uploadBytesToStorage(
        pathPrefix: prefix,
        bytes: croppedBytes,
        originalName: file.name,
        audit: {'entity': 'blog', 'blogId': _selectedBlog?.id},
      );
      if (!mounted) return;
      setState(() => _imageUrlController.text = url);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Görsel yüklendi')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Yükleme hatası: $e')));
    } finally {
      if (mounted) setState(() => _uploadingImage = false);
    }
  }

  /// Blog yazısı ekle veya güncelle
  Future<void> _saveBlog() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final tagList = _tagsController.text
          .split(',')
          .map((tag) => tag.trim())
          .where((tag) => tag.isNotEmpty)
          .toList();

      final blogData = {
        'title': _titleController.text,
        'summary': _summaryController.text,
        'content': _contentController.text,
        'imageUrl': _imageUrlController.text,
        'author': _authorController.text,
        'category': _categoryController.text,
        'tags': tagList,
        'date': DateTime.now().toIso8601String(),
        'published': true,
      };

      if (_selectedBlog != null) {
        // Mevcut blog yazısını güncelle
        await _firestore
            .collection(FirestoreCollections.blogs)
            .doc(_selectedBlog!.id)
            .update(blogData);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Blog yazısı güncellendi.')),
        );
      } else {
        // Yeni blog yazısı ekle
        await _firestore.collection(FirestoreCollections.blogs).add(blogData);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Blog yazısı eklendi.')),
        );
      }

      _resetForm();
      _loadBlogs();
      _tabController.animateTo(0); // Liste görünümüne dön
    } catch (e) {
      Logger.error('Blog yazısı kaydedilirken hata: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Bir hata oluştu. Lütfen tekrar deneyin.')),
      );
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Blog yazısı sil
  Future<void> _deleteBlog(BlogPost blog) async {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Blog Yazısını Sil',
          style: TextStyle(
            fontSize: isSmallScreen ? 16 : 18,
          ),
        ),
        content: Text(
          '${blog.title} başlıklı yazıyı silmek istediğinize emin misiniz?',
          style: TextStyle(
            fontSize: isSmallScreen ? 14 : 16,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Sil'),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
          ),
        ],
        contentPadding: const EdgeInsets.fromLTRB(
          AppTheme.space2xl,
          AppTheme.spaceXl,
          AppTheme.space2xl,
          AppTheme.spaceZero,
        ),
        titlePadding: const EdgeInsets.fromLTRB(
          AppTheme.space2xl,
          AppTheme.space2xl,
          AppTheme.space2xl,
          AppTheme.spaceZero,
        ),
        actionsPadding: const EdgeInsets.fromLTRB(
          AppTheme.spaceSm,
          AppTheme.spaceSm,
          AppTheme.spaceLg,
          AppTheme.spaceLg,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        ),
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isLoading = true;
    });

    try {
      await _firestore.collection(FirestoreCollections.blogs).doc(blog.id).delete();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Blog yazısı silindi.'),
          behavior: SnackBarBehavior.floating,
          width: isSmallScreen ? null : 400,
          margin: isSmallScreen
              ? null
              : const EdgeInsets.symmetric(
                  horizontal: AppTheme.spaceXl,
                  vertical: AppTheme.spaceXl,
                ),
          shape: RoundedRectangleBorder(
            borderRadius:
                BorderRadius.circular(isSmallScreen ? 0 : AppTheme.radiusMd),
          ),
        ),
      );

      _loadBlogs();
    } catch (e) {
      Logger.error('Blog yazısı silinirken hata: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Bir hata oluştu. Lütfen tekrar deneyin.'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
          width: isSmallScreen ? null : 400,
          margin: isSmallScreen
              ? null
              : const EdgeInsets.symmetric(
                  horizontal: AppTheme.spaceXl,
                  vertical: AppTheme.spaceXl,
                ),
          shape: RoundedRectangleBorder(
            borderRadius:
                BorderRadius.circular(isSmallScreen ? 0 : AppTheme.radiusMd),
          ),
        ),
      );
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Blog yazısını düzenlemek için formu doldur
  void _editBlog(BlogPost blog) {
    setState(() {
      _selectedBlog = blog;
      _titleController.text = blog.title;
      _summaryController.text = blog.summary;
      _contentController.text = blog.content;
      _imageUrlController.text = blog.imageUrl;
      _authorController.text = blog.author;
      _categoryController.text = blog.category;
      _tagsController.text = blog.tags.join(', ');
    });

    _tabController.animateTo(1); // Form görünümüne geç
  }

  /// Formu sıfırla
  void _resetForm() {
    setState(() {
      _selectedBlog = null;
      _titleController.clear();
      _summaryController.clear();
      _contentController.clear();
      _imageUrlController.clear();
      _authorController.clear();
      _categoryController.clear();
      _tagsController.clear();
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Scaffold(
      appBar: AppBar(
        title: Text(Constants.adminBlogsTitle),
        backgroundColor: Colors.transparent,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primaryColor,
          tabs: [
            Tab(text: isSmallScreen ? 'Yazılar' : 'Blog Yazıları'),
            Tab(
                text: _selectedBlog != null
                    ? (isSmallScreen ? 'Düzenle' : 'Blog Yazısını Düzenle')
                    : (isSmallScreen ? 'Yeni' : 'Yeni Blog Yazısı')),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          _resetForm();
          _tabController.animateTo(1);
        },
        backgroundColor: AppTheme.primaryColor,
        child: Icon(Icons.add),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Blog yazıları listesi
          _buildBlogsList(),

          // Blog yazısı ekleme/düzenleme formu
          _buildBlogForm(),
        ],
      ),
    );
  }

  Widget _buildBlogsList() {
    if (_isLoading) {
      return Center(child: AppLoadingIndicator());
    }

    if (_errorMessage.isNotEmpty) {
      return Center(
        child: Text(
          _errorMessage,
          style: TextStyle(color: Colors.red),
        ),
      );
    }

    if (_blogs.isEmpty) {
      return Center(
        child: Text('Henüz blog yazısı bulunmuyor.'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      itemCount: _blogs.length,
      itemBuilder: (context, index) {
        final blog = _blogs[index];
        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          ),
          child: InkWell(
            onTap: () => _editBlog(blog),
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Blog resmi
                if (blog.imageUrl.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
                    child: Image.network(
                      blog.imageUrl,
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          height: 180,
                          width: double.infinity,
                          color: Colors.grey.shade200,
                          child: Center(
                            child: Icon(
                              Icons.image_not_supported,
                              color: Colors.grey,
                              size: 50,
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                Padding(
                  padding: const EdgeInsets.all(AppTheme.spaceLg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Başlık
                      Text(
                        blog.title,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 8),

                      // Tarih ve yazar
                      Wrap(
                        spacing: 16,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.person, size: 16, color: Colors.grey),
                              SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  blog.author,
                                  style: TextStyle(color: Colors.grey),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                              SizedBox(width: 4),
                              Text(
                                DateFormat('dd.MM.yyyy').format(blog.date),
                                style: TextStyle(color: Colors.grey),
                              ),
                            ],
                          ),
                        ],
                      ),
                      SizedBox(height: 8),

                      // Özet
                      Text(
                        blog.summary,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 14),
                      ),
                      SizedBox(height: 16),

                      // Etiketler
                      if (blog.tags.isNotEmpty)
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: blog.tags.map((tag) {
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppTheme.spaceMd,
                                vertical: AppTheme.spaceXxs,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                              ),
                              child: Text(
                                tag,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                            );
                          }).toList(),
                        ),

                      SizedBox(height: 16),

                      // İşlem butonları
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton.icon(
                            onPressed: () => _editBlog(blog),
                            icon: Icon(Icons.edit),
                            label: MediaQuery.of(context).size.width < 360
                                ? SizedBox.shrink()
                                : Text('Düzenle'),
                            style: TextButton.styleFrom(
                              foregroundColor: AppTheme.primaryColor,
                            ),
                          ),
                          SizedBox(width: 8),
                          TextButton.icon(
                            onPressed: () => _deleteBlog(blog),
                            icon: Icon(Icons.delete),
                            label: MediaQuery.of(context).size.width < 360
                                ? SizedBox.shrink()
                                : Text('Sil'),
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.red,
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
        ).animate().fadeIn(duration: 300.ms, delay: (50 * index).ms);
      },
    );
  }

  Widget _buildBlogForm() {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _selectedBlog != null ? 'Blog Yazısını Düzenle' : 'Yeni Blog Yazısı Ekle',
              style: TextStyle(
                fontSize: isSmallScreen ? 18 : 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 24),

            // Başlık alanı
            TextFormField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'Başlık',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.title),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Lütfen başlık girin';
                }
                return null;
              },
            ),
            SizedBox(height: 16),

            // Özet alanı
            TextFormField(
              controller: _summaryController,
              decoration: InputDecoration(
                labelText: 'Özet',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.summarize),
              ),
              maxLines: 3,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Lütfen özet girin';
                }
                return null;
              },
            ),
            SizedBox(height: 16),

            // İçerik alanı
            TextFormField(
              controller: _contentController,
              decoration: InputDecoration(
                labelText: 'İçerik (Markdown)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.article),
                helperText: 'Markdown formatında içerik girebilirsiniz.',
              ),
              maxLines: isSmallScreen ? 6 : 10,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Lütfen içerik girin';
                }
                return null;
              },
            ),
            SizedBox(height: 16),

            // Resim alanı (URL + Yükle)
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _imageUrlController,
                    decoration: const InputDecoration(
                      labelText: 'Resim',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.image),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Lütfen bir görsel seçin veya URL girin';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: AppTheme.spaceMd),
                ElevatedButton.icon(
                  onPressed: _uploadingImage ? null : _pickAndUploadBlogImage,
                  icon: const Icon(Icons.upload_file),
                  label: Text(_uploadingImage ? 'Yükleniyor...' : 'Yükle'),
                ),
              ],
            ),
            SizedBox(height: 16),

            // Yazar ve Kategori alanları - mobil için yan yana
            if (!isSmallScreen)
              Row(
                children: [
                  // Yazar alanı
                  Expanded(
                    child: TextFormField(
                      controller: _authorController,
                      decoration: InputDecoration(
                        labelText: 'Yazar',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.person),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Lütfen yazar adı girin';
                        }
                        return null;
                      },
                    ),
                  ),
                  SizedBox(width: 16),
                  // Kategori alanı
                  Expanded(
                    child: TextFormField(
                      controller: _categoryController,
                      decoration: InputDecoration(
                        labelText: 'Kategori',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.category),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Lütfen kategori girin';
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              )
            else
              Column(
                children: [
                  // Yazar alanı
                  TextFormField(
                    controller: _authorController,
                    decoration: InputDecoration(
                      labelText: 'Yazar',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.person),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Lütfen yazar adı girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 16),
                  // Kategori alanı
                  TextFormField(
                    controller: _categoryController,
                    decoration: InputDecoration(
                      labelText: 'Kategori',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.category),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Lütfen kategori girin';
                      }
                      return null;
                    },
                  ),
                ],
              ),
            SizedBox(height: 16),

            // Etiketler alanı
            TextFormField(
              controller: _tagsController,
              decoration: InputDecoration(
                labelText: 'Etiketler (virgülle ayırın)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.tag),
                helperText: isSmallScreen
                    ? null
                    : 'Etiketleri virgülle ayırarak girin. Örn: ekmek, ekşi maya, tarif',
              ),
            ),
            SizedBox(height: 32),

            // Kaydet ve İptal butonları
            isSmallScreen
                ? Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _isLoading ? null : _saveBlog,
                          icon: Icon(Icons.save),
                          label: Text(_selectedBlog != null ? 'Güncelle' : 'Kaydet'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                          ),
                        ),
                      ),
                      SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _isLoading
                              ? null
                              : () {
                                  _resetForm();
                                  _tabController.animateTo(0);
                                },
                          icon: Icon(Icons.cancel),
                          label: Text('İptal'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.grey,
                            side: BorderSide(color: Colors.grey),
                            padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                          ),
                        ),
                      ),
                    ],
                  )
                : Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isLoading ? null : _saveBlog,
                          icon: Icon(Icons.save),
                          label: Text(_selectedBlog != null ? 'Güncelle' : 'Kaydet'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                          ),
                        ),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _isLoading
                              ? null
                              : () {
                                  _resetForm();
                                  _tabController.animateTo(0);
                                },
                          icon: Icon(Icons.cancel),
                          label: Text('İptal'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.grey,
                            side: BorderSide(color: Colors.grey),
                            padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                          ),
                        ),
                      ),
                    ],
                  ),
          ],
        ),
      ),
    );
  }
}
