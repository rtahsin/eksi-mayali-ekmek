import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/youtube_service.dart';
import '../theme/app_theme.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/loading_indicator.dart';

/// Canlı yayın ekranı.
/// YouTube üzerinden canlı yayınları ve geçmiş yayınları görüntülemeyi,
/// yorum yapmayı ve yayınları kaydetmeyi sağlar.
class LiveStreamScreen extends StatefulWidget {
  static const routeName = '/live-stream';

  final String? videoId;

  const LiveStreamScreen({Key? key, this.videoId}) : super(key: key);

  @override
  State<LiveStreamScreen> createState() => _LiveStreamScreenState();
}

class _LiveStreamScreenState extends State<LiveStreamScreen>
    with AutomaticKeepAliveClientMixin {
  Map<String, dynamic>? _videoData;
  bool _isLoading = true;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();

    // web'de build sırasında notifyListeners çağrılmasını önlemek için
    // Future.microtask kullanarak asenkron işlemi sonraya bırakıyoruz
    Future.microtask(_loadVideoInfo);
  }

  @override
  void dispose() {
    // YouTube controller'ı kaldırdığımız için dispose etmeye gerek kalmadı
    // if (!kIsWeb && _controller != null) {
    //   _controller!.dispose();
    // }
    super.dispose();
  }

  Future<void> _loadVideoInfo() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final youtubeService =
          Provider.of<YouTubeService>(context, listen: false);

      // Widget'a bir videoId gönderilmişse, o videoyu yükle
      if (widget.videoId != null) {
        final videoInfo = await youtubeService.getVideoDetails(widget.videoId!);
        setState(() {
          _videoData = videoInfo;
          _isLoading = false;
        });
        return;
      }

      // En son canlı yayını yükle
      final liveStream = youtubeService.currentLiveStream;
      if (liveStream != null) {
        setState(() {
          _videoData = liveStream;
          _isLoading = false;
        });
        return;
      }

      // Canlı yayın yoksa en son videoyu yükle
      final videos = youtubeService.videos;
      if (videos.isNotEmpty) {
        setState(() {
          _videoData = videos.first;
          _isLoading = false;
        });
        return;
      }

      setState(() {
        _error = 'Görüntülenecek video bulunamadı';
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Video yüklenirken bir hata oluştu: $e';
          _isLoading = false;
        });
      }
    }
  }

  // YouTube linkini aç
  Future<void> _launchYouTubeUrl(String videoId) async {
    final url = Uri.parse('https://www.youtube.com/watch?v=$videoId');
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('YouTube bağlantısı açılamadı'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    return Scaffold(
      appBar: CustomAppBar(
        title: _videoData != null ? _videoData!['title'] : 'Video İzle',
        showBackButton: true,
      ),
      body: _isLoading
          ? const LoadingIndicator()
          : _error != null
              ? _buildErrorWidget()
              : _buildVideoScreenContent(),
    );
  }

  Widget _buildVideoScreenContent() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Video oynatıcı veya önizleme
          _buildPlayer(),

          // Video detayları
          Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Video başlığı
                Text(
                  _videoData!['title'] ?? 'Video Başlığı',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Colors.white
                        : Colors.black87,
                  ),
                ),
                const SizedBox(height: 8),

                // İzlenme ve tarih bilgileri
                Row(
                  children: [
                    Icon(Icons.visibility, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      '${_videoData!['viewCount'] ?? '0'} görüntülenme',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      _formatDate(_videoData!['publishedAt'] ?? ''),
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Video açıklaması
                Text(
                  'Açıklama',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _videoData!['description'] ??
                      'Bu video için açıklama bulunmuyor.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[700],
                  ),
                ),
                const SizedBox(height: 24),

                // YouTube'da izle butonu
                Center(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      _launchYouTubeUrl(_videoData!['id']);
                    },
                    icon: Icon(Icons.play_arrow),
                    label: Text('YouTube\'da İzle'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.space2xl, vertical: AppTheme.spaceMd),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 16),
                Divider(),
                const SizedBox(height: 16),

                // Yorumlar bölümü
                _buildCommentsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlayer() {
    if (_videoData == null) {
      return Container(
        height: 200,
        color: Colors.black,
        child: const Center(
          child: Text(
            'Video yüklenemedi',
            style: TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    final videoId = _videoData!['id'];
    final thumbnailUrl = _videoData!['thumbnailUrl'] ??
        'https://i.ytimg.com/vi/$videoId/maxresdefault.jpg';

    // Web'de iframe kullanmak yerine sadece önizleme gösterip
    // kullanıcıya YouTube'da izleme seçeneği sunuyoruz
    return Container(
      height: 250,
      width: double.infinity,
      color: Colors.black,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Thumbnail
          Image.network(
            thumbnailUrl,
            width: double.infinity,
            height: 250,
            fit: BoxFit.cover,
            errorBuilder: (ctx, err, _) => Container(
              color: Colors.grey[800],
              child: Icon(Icons.image_not_supported,
                  size: 48, color: Colors.white),
            ),
          ),

          // Play button overlay
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.red.withValues(alpha: 0.8),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.play_arrow, size: 50, color: Colors.white),
          ),

          // Video title overlay
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(AppTheme.spaceLg),
              color: Colors.black.withValues(alpha: 0.7),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _videoData!['title'] ?? 'Video Başlığı',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 4),
                  Text(
                    'YouTube\'da izlemek için tıklayın',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),

          // Make the entire area clickable
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () {
                _launchYouTubeUrl(videoId);
              },
              child: SizedBox(
                width: double.infinity,
                height: double.infinity,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spaceLg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red[300],
            ),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Bir hata oluştu',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.refresh),
              label: const Text('Tekrar Dene'),
              onPressed: _loadVideoInfo,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommentsTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.comment_outlined,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'Yorumlar YouTube üzerinden görüntülenebilir',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[700],
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            icon: const Icon(Icons.open_in_new),
            label: const Text('YouTube\'da Görüntüle'),
            onPressed: () {
              if (_videoData != null) {
                final videoId = _videoData!['id'];
                _launchYouTubeUrl(videoId);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXl, vertical: AppTheme.spaceMd),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String isoDate) {
    if (isoDate.isEmpty) return 'Tarih bilinmiyor';

    try {
      final date = DateTime.parse(isoDate);
      return DateFormat('dd MMMM yyyy, HH:mm', 'tr_TR').format(date);
    } catch (e) {
      return 'Tarih bilinmiyor';
    }
  }
}
