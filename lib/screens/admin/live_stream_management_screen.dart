import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../services/youtube_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/loading_indicator.dart';

class LiveStreamManagementScreen extends StatefulWidget {
  static const routeName = '/admin/live-stream-management';

  const LiveStreamManagementScreen({Key? key}) : super(key: key);

  @override
  State<LiveStreamManagementScreen> createState() =>
      _LiveStreamManagementScreenState();
}

class _LiveStreamManagementScreenState extends State<LiveStreamManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  DateTime _scheduledDateTime = DateTime.now().add(const Duration(days: 1));
  bool _isCreatingStream = false;
  bool _isSchedulingStream = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    // YouTube servisini başlat
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final youtubeService =
          Provider.of<YouTubeService>(context, listen: false);
      youtubeService.fetchLiveStreams();
      youtubeService.fetchVideos();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _startLiveStream() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isCreatingStream = true;
    });

    try {
      final youtubeService =
          Provider.of<YouTubeService>(context, listen: false);

      // Önce canlı yayın oluştur
      final newStream = await youtubeService.createLiveStream(
        _titleController.text,
        _descriptionController.text,
        DateTime.now(),
      );

      if (newStream.isNotEmpty) {
        // Sonra canlı yayını başlat
        final result = await youtubeService.startLiveStream(newStream['id']);

        if (mounted) {
          if (result) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Canlı yayın başlatıldı'),
                backgroundColor: Colors.green,
              ),
            );
            _titleController.clear();
            _descriptionController.clear();

            // Aktif yayınlar sekmesine geç
            _tabController.animateTo(0);
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                    'Canlı yayın başlatılırken bir hata oluştu: ${youtubeService.error}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Canlı yayın oluşturulamadı'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Canlı yayın başlatılırken bir hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCreatingStream = false;
        });
      }
    }
  }

  Future<void> _scheduleLiveStream() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSchedulingStream = true;
    });

    try {
      final youtubeService =
          Provider.of<YouTubeService>(context, listen: false);
      final result = await youtubeService.createLiveStream(
        _titleController.text,
        _descriptionController.text,
        _scheduledDateTime,
      );

      if (mounted) {
        if (result.isNotEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Canlı yayın programlandı'),
              backgroundColor: Colors.green,
            ),
          );
          _titleController.clear();
          _descriptionController.clear();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  'Canlı yayın programlanırken bir hata oluştu: ${youtubeService.error}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Canlı yayın programlanırken bir hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSchedulingStream = false;
        });
      }
    }
  }

  Future<void> _endLiveStream(String streamId) async {
    try {
      final youtubeService =
          Provider.of<YouTubeService>(context, listen: false);
      final result = await youtubeService.endLiveStream(streamId);

      if (mounted) {
        if (result) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Canlı yayın sonlandırıldı'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  'Canlı yayın sonlandırılırken bir hata oluştu: ${youtubeService.error}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Canlı yayın sonlandırılırken bir hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _selectDateTime(BuildContext context) async {
    final DateTime? pickedDate = await showDatePicker(
      context: context,
      initialDate: _scheduledDateTime,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (pickedDate != null) {
      final TimeOfDay? pickedTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_scheduledDateTime),
      );

      if (pickedTime != null) {
        setState(() {
          _scheduledDateTime = DateTime(
            pickedDate.year,
            pickedDate.month,
            pickedDate.day,
            pickedTime.hour,
            pickedTime.minute,
          );
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Canlı Yayın Yönetimi'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Aktif Yayınlar'),
            Tab(text: 'Yeni Yayın'),
            Tab(text: 'Programlı Yayınlar'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildActiveStreamsTab(),
          _buildNewStreamTab(),
          _buildScheduledStreamsTab(),
        ],
      ),
    );
  }

  Widget _buildActiveStreamsTab() {
    return Consumer<YouTubeService>(
      builder: (context, youtubeService, child) {
        if (youtubeService.isLoading) {
          return const Center(child: LoadingIndicator());
        }

        final liveStreams = youtubeService.liveStreams;
        if (liveStreams.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.live_tv, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'Şu anda aktif bir canlı yayın bulunmuyor',
                  style: TextStyle(fontSize: 16),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => youtubeService.fetchLiveStreams(),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Yenile'),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => youtubeService.fetchLiveStreams(),
          child: ListView.builder(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            itemCount: liveStreams.length,
            itemBuilder: (context, index) {
              final stream = liveStreams[index];
              return Card(
                margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Yayın Thumbnail
                    AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Stack(
                        children: [
                          Image.network(
                            stream['thumbnailUrl'],
                            fit: BoxFit.cover,
                            width: double.infinity,
                          ),
                          Positioned(
                            top: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: AppTheme.spaceXs, vertical: AppTheme.spaceXxs),
                              decoration: BoxDecoration(
                                color: Colors.red,
                                borderRadius: BorderRadius.circular(AppTheme.radiusXxs),
                              ),
                              child: const Text(
                                'CANLI',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(AppTheme.spaceMd),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            stream['title'],
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            stream['description'],
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[700],
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Başlangıç: ${_formatDateTime(stream['publishedAt'])}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              OutlinedButton.icon(
                                onPressed: () {
                                  // Yayın detaylarını göster
                                  _showStreamDetails(stream);
                                },
                                icon: const Icon(Icons.info_outline),
                                label: const Text('Detaylar'),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton.icon(
                                onPressed: () {
                                  // Yayını sonlandır
                                  showDialog(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      title:
                                          const Text('Canlı Yayını Sonlandır'),
                                      content: const Text(
                                          'Bu canlı yayını sonlandırmak istediğinize emin misiniz?'),
                                      actions: [
                                        TextButton(
                                          onPressed: () {
                                            Navigator.of(ctx).pop();
                                          },
                                          child: const Text('İptal'),
                                        ),
                                        TextButton(
                                          onPressed: () {
                                            Navigator.of(ctx).pop();
                                            _endLiveStream(stream['id']);
                                          },
                                          style: TextButton.styleFrom(
                                            foregroundColor: Colors.red,
                                          ),
                                          child: const Text('Sonlandır'),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.stop_circle),
                                label: const Text('Yayını Sonlandır'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.red,
                                  foregroundColor: Colors.white,
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
        );
      },
    );
  }

  Widget _buildNewStreamTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Yeni Canlı Yayın Başlat',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Yayın Başlığı',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.title),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Lütfen bir başlık girin';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Yayın Açıklaması',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.description),
              ),
              maxLines: 3,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Lütfen bir açıklama girin';
                }
                return null;
              },
            ),
            const SizedBox(height: 24),
            const Text(
              'Yayın Ayarları',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.spaceLg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Yayın Bilgileri',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Canlı yayın başlatıldığında, YouTube hesabınızda bir canlı yayın oluşturulacak ve yayın bilgileri burada görüntülenecektir.',
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Yayın Ayarları',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Çözünürlük: 1080p (HD)',
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Ses: Stereo',
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Yayın Gecikmesi: Düşük (5-10 saniye)',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _isCreatingStream ? null : _startLiveStream,
                icon: _isCreatingStream
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.live_tv),
                label: Text(_isCreatingStream
                    ? 'Yayın Başlatılıyor...'
                    : 'Canlı Yayını Başlat'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),
            const Text(
              'Canlı Yayın Programla',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            InkWell(
              onTap: () => _selectDateTime(context),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Yayın Tarihi ve Saati',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.calendar_today),
                ),
                child: Text(
                  DateFormat('dd MMMM yyyy, HH:mm', 'tr_TR')
                      .format(_scheduledDateTime),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _isSchedulingStream ? null : _scheduleLiveStream,
                icon: _isSchedulingStream
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.schedule),
                label: Text(_isSchedulingStream
                    ? 'Programlanıyor...'
                    : 'Yayını Programla'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduledStreamsTab() {
    return Consumer<YouTubeService>(
      builder: (context, youtubeService, child) {
        // Gerçek uygulamada, burada programlanmış yayınları getiren bir API çağrısı yapılır
        // Şimdilik sadece bir örnek gösteriyoruz
        final scheduledStreams = [
          {
            'id': 'scheduled1',
            'title': 'Ekşi Mayalı Ekmek Yapımı - Canlı Workshop',
            'description':
                'Ekşi maya ile evde ekmek yapımının tüm inceliklerini öğreneceğimiz bir workshop.',
            'thumbnailUrl': 'https://via.placeholder.com/480x360',
            'scheduledStartTime':
                DateTime.now().add(const Duration(days: 2)).toIso8601String(),
            'channelTitle': 'Ekşi Mayalı Ekmek',
          },
          {
            'id': 'scheduled2',
            'title': 'Farklı Un Çeşitleri ve Ekmek Tarifleri',
            'description':
                'Tam buğday, çavdar, yulaf ve diğer un çeşitleri ile yapabileceğiniz ekmek tarifleri.',
            'thumbnailUrl': 'https://via.placeholder.com/480x360',
            'scheduledStartTime':
                DateTime.now().add(const Duration(days: 5)).toIso8601String(),
            'channelTitle': 'Ekşi Mayalı Ekmek',
          },
        ];

        if (scheduledStreams.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.event_busy, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'Programlanmış bir canlı yayın bulunmuyor',
                  style: TextStyle(fontSize: 16),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    _tabController.animateTo(1); // Yeni yayın sekmesine geç
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Yeni Yayın Programla'),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          itemCount: scheduledStreams.length,
          itemBuilder: (context, index) {
            final stream = scheduledStreams[index];
            final scheduledDateTime =
                DateTime.parse(stream['scheduledStartTime'] as String);

            return Card(
              margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Yayın Thumbnail
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Stack(
                      children: [
                        Image.network(
                          stream['thumbnailUrl'] as String,
                          fit: BoxFit.cover,
                          width: double.infinity,
                        ),
                        Positioned(
                          top: 8,
                          left: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: AppTheme.spaceXs, vertical: AppTheme.spaceXxs),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor,
                              borderRadius: BorderRadius.circular(AppTheme.radiusXxs),
                            ),
                            child: const Text(
                              'PROGRAMLI',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(AppTheme.spaceMd),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stream['title'] as String,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          stream['description'] as String,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[700],
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Programlanan Tarih: ${DateFormat('dd MMMM yyyy, HH:mm', 'tr_TR').format(scheduledDateTime)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            OutlinedButton.icon(
                              onPressed: () {
                                // Yayın detaylarını düzenle
                              },
                              icon: const Icon(Icons.edit),
                              label: const Text('Düzenle'),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton.icon(
                              onPressed: () {
                                // Programlı yayını iptal et
                                showDialog(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title:
                                        const Text('Programlı Yayını İptal Et'),
                                    content: const Text(
                                        'Bu programlı yayını iptal etmek istediğinize emin misiniz?'),
                                    actions: [
                                      TextButton(
                                        onPressed: () {
                                          Navigator.of(ctx).pop();
                                        },
                                        child: const Text('Vazgeç'),
                                      ),
                                      TextButton(
                                        onPressed: () {
                                          Navigator.of(ctx).pop();
                                          // Programlı yayını iptal et
                                          ScaffoldMessenger.of(context)
                                              .showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                  'Programlı yayın iptal edildi'),
                                              backgroundColor: Colors.green,
                                            ),
                                          );
                                        },
                                        style: TextButton.styleFrom(
                                          foregroundColor: Colors.red,
                                        ),
                                        child: const Text('İptal Et'),
                                      ),
                                    ],
                                  ),
                                );
                              },
                              icon: const Icon(Icons.cancel),
                              label: const Text('İptal Et'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red,
                                foregroundColor: Colors.white,
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
        );
      },
    );
  }

  void _showStreamDetails(Map<String, dynamic> stream) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Canlı Yayın Detayları'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.network(
                stream['thumbnailUrl'],
                fit: BoxFit.cover,
                width: double.infinity,
              ),
              const SizedBox(height: 16),
              Text(
                stream['title'],
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                stream['description'],
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[700],
                ),
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              const Text(
                'Yayın Bilgileri',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text('Yayın ID: ${stream['id']}'),
              const SizedBox(height: 4),
              Text('Başlangıç: ${_formatDateTime(stream['publishedAt'])}'),
              const SizedBox(height: 4),
              Text('Kanal: ${stream['channelTitle']}'),
              const SizedBox(height: 16),
              if (stream.containsKey('streamUrl') &&
                  stream.containsKey('streamKey'))
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Yayın Bağlantı Bilgileri',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text('RTMP URL: ${stream['streamUrl']}'),
                    const SizedBox(height: 4),
                    Text('Yayın Anahtarı: ${stream['streamKey']}'),
                  ],
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
            },
            child: const Text('Kapat'),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(String dateTimeStr) {
    final dateTime = DateTime.parse(dateTimeStr);
    return DateFormat('dd MMMM yyyy, HH:mm', 'tr_TR').format(dateTime);
  }
}
