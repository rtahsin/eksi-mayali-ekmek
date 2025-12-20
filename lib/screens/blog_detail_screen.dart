// ignore_for_file: prefer_const_constructors, use_super_parameters, deprecated_member_use, unused_local_variable

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/blog_post.dart';
import '../models/comment.dart';
import '../theme/app_theme.dart';
import '../utils/constants.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';
import '../widgets/app_loading_indicator.dart';

class BlogDetailScreen extends StatefulWidget {
  static const routeName = '/blog-detail';

  final BlogPost post;

  const BlogDetailScreen({Key? key, required this.post}) : super(key: key);

  @override
  State<BlogDetailScreen> createState() => _BlogDetailScreenState();
}

class _BlogDetailScreenState extends State<BlogDetailScreen> {
  late ScrollController _scrollController;
  bool _isScrolled = false;
  bool _isLoadingComments = true;
  List<Comment> _comments = [];
  TextEditingController _commentController = TextEditingController();
  bool _isPostingComment = false;
  User? _currentUser = FirebaseAuth.instance.currentUser;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _scrollController.addListener(_onScroll);
    _loadComments();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  void _onScroll() {
    setState(() {
      _isScrolled = _scrollController.offset > 100;
    });
  }

  Future<void> _loadComments() async {
    setState(() {
      _isLoadingComments = true;
    });

    try {
      final snapshot = await FirebaseFirestore.instance
          .collection(FirestoreCollections.blogs)
          .doc(widget.post.id)
          .collection('comments')
          .orderBy('createdAt', descending: true)
          .get();

      final comments = snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return Comment.fromJson(data);
      }).toList();

      setState(() {
        _comments = comments;
        _isLoadingComments = false;
      });
    } catch (e) {
      Logger.error('Yorumlar yüklenirken hata: $e');
      setState(() {
        _isLoadingComments = false;
      });
    }
  }

  Future<void> _postComment() async {
    if (_commentController.text.trim().isEmpty) {
      return;
    }

    if (_currentUser == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yorum yapmak için giriş yapmalısınız')),
      );
      return;
    }

    setState(() {
      _isPostingComment = true;
    });

    try {
      final commentData = {
        'text': _commentController.text.trim(),
        'userId': _currentUser!.uid,
        'userName': _currentUser!.displayName ?? 'Misafir',
        'userPhoto': _currentUser!.photoURL,
        'createdAt': DateTime.now().toIso8601String(),
      };

      await FirebaseFirestore.instance
          .collection(FirestoreCollections.blogs)
          .doc(widget.post.id)
          .collection('comments')
          .add(commentData);

      _commentController.clear();
      _loadComments();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yorumunuz paylaşıldı')),
      );
    } catch (e) {
      Logger.error('Yorum paylaşılırken hata: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yorum paylaşılırken bir hata oluştu')),
      );
    } finally {
      setState(() {
        _isPostingComment = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;
    final horizontalPadding =
        isDesktop ? MediaQuery.of(context).size.width * 0.15 : (isTablet ? 48.0 : 16.0);

    return Scaffold(
      body: CustomScrollView(
        controller: _scrollController,
        slivers: [
          _buildAppBar(context),
          SliverList(
            delegate: SliverChildListDelegate([
              Padding(
                padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),

                    // Kategori ve tarih
                    Row(
                      children: [
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: Text(
                            widget.post.category,
                            style: TextStyle(
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Icon(
                          Icons.calendar_today,
                          size: 14,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          DateFormat('dd MMMM yyyy', 'tr_TR').format(widget.post.date),
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Başlık
                    Text(
                      widget.post.title,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 16),

                    // Yazar
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                          child: Text(
                            widget.post.author.substring(0, 1),
                            style: TextStyle(
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          widget.post.author,
                          style: TextStyle(
                            fontWeight: FontWeight.w500,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // İçerik
                    MarkdownBody(
                      data: widget.post.content,
                      styleSheet: MarkdownStyleSheet(
                        h1: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                            ),
                        h2: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor.withValues(alpha: 0.9),
                            ),
                        h3: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                        p: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              height: 1.7,
                            ),
                        strong: TextStyle(fontWeight: FontWeight.bold),
                        blockquote: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              fontStyle: FontStyle.italic,
                              color: Colors.grey[700],
                              decoration: TextDecoration.none,
                            ),
                        blockquoteDecoration: BoxDecoration(
                          border: Border(
                            left: BorderSide(
                              color: AppTheme.primaryColor,
                              width: 4,
                            ),
                          ),
                          color: Colors.grey[100],
                        ),
                        tableBody: Theme.of(context).textTheme.bodyMedium,
                        tableHead: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      onTapLink: (text, href, title) {
                        if (href != null) {
                          launchUrl(Uri.parse(href));
                        }
                      },
                    ),
                    const SizedBox(height: 32),

                    // Etiketler
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: widget.post.tags.map((tag) {
                        return Container(
                          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: Text(
                            '#$tag',
                            style: TextStyle(
                              color: Colors.grey[800],
                              fontSize: 14,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 48),

                    // Yorumlar bölümü
                    Text(
                      'Yorumlar (${_comments.length})',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 16),

                    // Yorum yazma kutusu
                    Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Yorum Ekle',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _commentController,
                              decoration: InputDecoration(
                                hintText: 'Düşüncelerinizi paylaşın...',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                contentPadding: EdgeInsets.all(12),
                              ),
                              maxLines: 3,
                            ),
                            const SizedBox(height: 16),
                            Align(
                              alignment: Alignment.centerRight,
                              child: ElevatedButton(
                                onPressed: _isPostingComment ? null : _postComment,
                                style: ElevatedButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  backgroundColor: AppTheme.primaryColor,
                                  padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(30),
                                  ),
                                ),
                                child: _isPostingComment
                                    ? SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : Text('Yorum Yap'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Yorumlar listesi
                    _isLoadingComments
                        ? Center(child: AppLoadingIndicator())
                        : _comments.isEmpty
                            ? Center(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 24),
                                  child: Column(
                                    children: [
                                      Icon(
                                        Icons.chat_bubble_outline,
                                        size: 48,
                                        color: Colors.grey[400],
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'Henüz yorum yapılmamış',
                                        style: TextStyle(
                                          fontSize: 16,
                                          color: Colors.grey[700],
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'İlk yorumu siz yapın!',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            : ListView.separated(
                                shrinkWrap: true,
                                physics: NeverScrollableScrollPhysics(),
                                itemCount: _comments.length,
                                separatorBuilder: (context, index) => Divider(),
                                itemBuilder: (context, index) {
                                  final comment = _comments[index];
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        CircleAvatar(
                                          backgroundColor: comment.userPhoto == null
                                              ? AppTheme.primaryColor.withValues(alpha: 0.2)
                                              : null,
                                          backgroundImage: comment.userPhoto != null
                                              ? NetworkImage(comment.userPhoto!)
                                              : null,
                                          child: comment.userPhoto == null
                                              ? Text(
                                                  comment.userName.substring(0, 1),
                                                  style: TextStyle(
                                                    color: AppTheme.primaryColor,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                )
                                              : null,
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Text(
                                                    comment.userName,
                                                    style: TextStyle(
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Text(
                                                    Helpers.timeAgo(
                                                        DateTime.parse(comment.createdAt)),
                                                    style: TextStyle(
                                                      fontSize: 12,
                                                      color: Colors.grey[600],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                comment.text,
                                                style: TextStyle(
                                                  height: 1.4,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ]),
          ),
        ],
      ),
      floatingActionButton: _isScrolled
          ? FloatingActionButton(
              mini: true,
              onPressed: () {
                _scrollController.animateTo(
                  0,
                  duration: Duration(milliseconds: 500),
                  curve: Curves.easeInOut,
                );
              },
              child: Icon(Icons.arrow_upward, size: 20),
              backgroundColor: AppTheme.primaryColor,
            )
          : null,
    );
  }

  SliverAppBar _buildAppBar(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 300,
      pinned: true,
      backgroundColor: _isScrolled ? AppTheme.primaryColor : Colors.transparent,
      flexibleSpace: FlexibleSpaceBar(
        background: Hero(
          tag: 'blog_image_${widget.post.id}',
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(
                widget.post.imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Colors.grey[300],
                    child: Center(
                      child: Icon(
                        Icons.image_not_supported,
                        size: 64,
                        color: Colors.grey[500],
                      ),
                    ),
                  );
                },
              ),
              // Görüntü üzerine koyulan gradient
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.4),
                      Colors.black.withValues(alpha: 0.7),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        title: _isScrolled
            ? Text(
                widget.post.title,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              )
            : null,
      ),
      leading: IconButton(
        icon: Icon(
          Icons.arrow_back,
          color: Colors.white,
        ),
        onPressed: () => Navigator.of(context).pop(),
      ),
      actions: [
        IconButton(
          icon: Icon(
            Icons.share,
            color: Colors.white,
          ),
          onPressed: () {
            // Paylaşım fonksiyonu
          },
        ),
      ],
    );
  }
}
