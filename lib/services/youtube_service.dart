import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/logger.dart';

/// YouTube canlı yayınları ve videoları yöneten servis
class YouTubeService with ChangeNotifier {
  static const String _baseUrl = 'https://www.googleapis.com/youtube/v3';

  // API anahtarı ve kanal ID'si artık doğru değerlerle ayarlanmış durumda
  static const String _apiKey = 'AIzaSyB9nCY16fBjLO6jMZ_j60rpUQcKJiIRqQ4';
  static const String _channelId = 'UCp7-2_1QdIOX2CyeS4ea8Og';

  bool _isLoading = false;
  List<Map<String, dynamic>> _liveStreams = [];
  List<Map<String, dynamic>> _videos = [];
  Map<String, dynamic>? _currentLiveStream;
  String? _error;

  YouTubeService() {
    _initService();
  }

  bool get isLoading => _isLoading;
  List<Map<String, dynamic>> get liveStreams => _liveStreams;
  List<Map<String, dynamic>> get videos => _videos;
  Map<String, dynamic>? get currentLiveStream => _currentLiveStream;
  String? get error => _error;

  /// Servisi başlat
  Future<void> _initService() async {
    await _loadCachedData();
    await fetchLiveStreams();
    await fetchVideos();
  }

  /// Önbelleğe alınmış verileri yükle
  Future<void> _loadCachedData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedLiveStreams = prefs.getString('cached_live_streams');
      final cachedVideos = prefs.getString('cached_videos');

      if (cachedLiveStreams != null) {
        final List<dynamic> decodedLiveStreams = json.decode(cachedLiveStreams);
        _liveStreams = decodedLiveStreams.cast<Map<String, dynamic>>();
      }

      if (cachedVideos != null) {
        final List<dynamic> decodedVideos = json.decode(cachedVideos);
        _videos = decodedVideos.cast<Map<String, dynamic>>();
      }
    } catch (e) {
      Logger.error('Önbellek verileri yüklenirken hata: $e');
    }
  }

  /// Verileri önbelleğe kaydet
  Future<void> _cacheData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cached_live_streams', json.encode(_liveStreams));
      await prefs.setString('cached_videos', json.encode(_videos));
    } catch (e) {
      Logger.error('Veriler önbelleğe kaydedilirken hata: $e');
    }
  }

  /// Canlı yayınları getir
  Future<List<Map<String, dynamic>>> fetchLiveStreams() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      // Aktif canlı yayınları getir
      final response = await http.get(
        Uri.parse(
          '$_baseUrl/search?part=snippet&channelId=$_channelId&eventType=live&type=video&key=$_apiKey',
        ),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> items = data['items'] ?? [];

        _liveStreams = [];
        for (var item in items) {
          final videoId = item['id']['videoId'];
          final videoDetails = await getVideoDetails(videoId);
          if (videoDetails.isNotEmpty) {
            _liveStreams.add(videoDetails);
          }
        }

        // Eğer aktif bir canlı yayın varsa, ilkini mevcut yayın olarak ayarla
        _currentLiveStream = _liveStreams.isNotEmpty ? _liveStreams.first : null;

        await _cacheData();
      } else {
        throw Exception('Canlı yayınlar yüklenirken hata: ${response.statusCode}');
      }

      _isLoading = false;
      notifyListeners();
      return _liveStreams;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return [];
    }
  }

  /// Videoları getir
  Future<List<Map<String, dynamic>>> fetchVideos({int maxResults = 10}) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      // Kanalın videolarını getir
      final response = await http.get(
        Uri.parse(
          '$_baseUrl/search?part=snippet&channelId=$_channelId&maxResults=$maxResults&order=date&type=video&key=$_apiKey',
        ),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> items = data['items'] ?? [];

        _videos = [];
        for (var item in items) {
          final videoId = item['id']['videoId'];
          final videoDetails = await getVideoDetails(videoId);
          if (videoDetails.isNotEmpty) {
            _videos.add(videoDetails);
          }
        }

        await _cacheData();
      } else {
        throw Exception('Videolar yüklenirken hata: ${response.statusCode}');
      }

      _isLoading = false;
      notifyListeners();
      return _videos;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return [];
    }
  }

  /// Video detaylarını getir
  Future<Map<String, dynamic>> getVideoDetails(String videoId) async {
    try {
      final response = await http.get(
        Uri.parse(
          '$_baseUrl/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=$videoId&key=$_apiKey',
        ),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> items = data['items'] ?? [];

        if (items.isNotEmpty) {
          final item = items.first;
          final snippet = item['snippet'];
          final statistics = item['statistics'];
          final liveStreamingDetails = item['liveStreamingDetails'];

          return {
            'id': videoId,
            'title': snippet['title'],
            'description': snippet['description'],
            'publishedAt': snippet['publishedAt'],
            'thumbnailUrl': snippet['thumbnails']['high']['url'],
            'viewCount': statistics['viewCount'] ?? '0',
            'likeCount': statistics['likeCount'] ?? '0',
            'commentCount': statistics['commentCount'] ?? '0',
            'isLive': liveStreamingDetails != null,
            'concurrentViewers': liveStreamingDetails != null
                ? liveStreamingDetails['concurrentViewers'] ?? '0'
                : '0',
            'scheduledStartTime':
                liveStreamingDetails != null ? liveStreamingDetails['scheduledStartTime'] : null,
            'actualStartTime':
                liveStreamingDetails != null ? liveStreamingDetails['actualStartTime'] : null,
          };
        }
      }
      return {};
    } catch (e) {
      Logger.error('Video detayları alınırken hata: $e');
      return {};
    }
  }

  /// Canlı yayın yorumlarını getir
  Future<List<Map<String, dynamic>>> getLiveStreamComments(String videoId) async {
    try {
      final response = await http.get(
        Uri.parse(
          '$_baseUrl/commentThreads?part=snippet&videoId=$videoId&maxResults=50&order=time&key=$_apiKey',
        ),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> items = data['items'] ?? [];

        final comments = <Map<String, dynamic>>[];
        for (var item in items) {
          final snippet = item['snippet']['topLevelComment']['snippet'];
          comments.add({
            'id': item['id'],
            'authorName': snippet['authorDisplayName'],
            'authorProfileImageUrl': snippet['authorProfileImageUrl'],
            'message': snippet['textDisplay'],
            'publishedAt': snippet['publishedAt'],
            'likeCount': snippet['likeCount'],
          });
        }

        return comments;
      } else {
        throw Exception('Yorumlar yüklenirken hata: ${response.statusCode}');
      }
    } catch (e) {
      Logger.error('Yorumlar alınırken hata: $e');
      return [];
    }
  }

  /// Yeni bir canlı yayın oluştur (Admin için)
  Future<Map<String, dynamic>> createLiveStream(
      String title, String description, DateTime scheduledStartTime) async {
    // Bu fonksiyon gerçek bir YouTube API entegrasyonu gerektirir
    // Şu anda sadece bir simülasyon yapıyoruz
    try {
      // Gerçek uygulamada, burada YouTube API'ye bir istek gönderilir
      // Şimdilik sadece bir simülasyon yapıyoruz
      await Future.delayed(const Duration(seconds: 2));

      final newLiveStream = {
        'id': 'simulated_live_${DateTime.now().millisecondsSinceEpoch}',
        'title': title,
        'description': description,
        'publishedAt': DateTime.now().toIso8601String(),
        'thumbnailUrl': 'https://via.placeholder.com/1280x720',
        'viewCount': '0',
        'likeCount': '0',
        'commentCount': '0',
        'isLive': false,
        'concurrentViewers': '0',
        'scheduledStartTime': scheduledStartTime.toIso8601String(),
        'actualStartTime': null,
      };

      return newLiveStream;
    } catch (e) {
      Logger.error('Canlı yayın oluşturulurken hata: $e');
      return {};
    }
  }

  /// Canlı yayını başlat (Admin için)
  Future<bool> startLiveStream(String liveStreamId) async {
    // Bu fonksiyon gerçek bir YouTube API entegrasyonu gerektirir
    // Şu anda sadece bir simülasyon yapıyoruz
    try {
      // Gerçek uygulamada, burada YouTube API'ye bir istek gönderilir
      // Şimdilik sadece bir simülasyon yapıyoruz
      await Future.delayed(const Duration(seconds: 2));
      return true;
    } catch (e) {
      Logger.error('Canlı yayın başlatılırken hata: $e');
      return false;
    }
  }

  /// Canlı yayını sonlandır (Admin için)
  Future<bool> endLiveStream(String liveStreamId) async {
    // Bu fonksiyon gerçek bir YouTube API entegrasyonu gerektirir
    // Şu anda sadece bir simülasyon yapıyoruz
    try {
      // Gerçek uygulamada, burada YouTube API'ye bir istek gönderilir
      // Şimdilik sadece bir simülasyon yapıyoruz
      await Future.delayed(const Duration(seconds: 2));
      return true;
    } catch (e) {
      Logger.error('Canlı yayın sonlandırılırken hata: $e');
      return false;
    }
  }
}
