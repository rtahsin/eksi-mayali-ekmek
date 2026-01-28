// ignore_for_file: prefer_const_constructors, use_super_parameters

/*
 * Admin ChatBot Management Screen
 * 
 * PURPOSE: ChatBot mesajlarını ve ayarlarını yönetmek için admin paneli
 * LAYER: UI -> Admin Panel
 * DEPENDS ON: 
 *   - ChatBotService
 *   - ChatBotMessage model
 *   - AppTheme
 * 
 * RULES:
 *   - Admin yetkisi kontrolü
 *   - Loading/error states
 *   - Logger kullan
 *   - Responsive design
 * 
 * FEATURES:
 *   - Mesaj listesi
 *   - Mesaj ekleme/düzenleme/silme
 *   - Ayarlar yönetimi
 *   - Seçenek ekleme
 * 
 * LAST UPDATED: 2025-12-08
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../models/chatbot_message.dart';
import '../../services/chatbot_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';
import '../../widgets/app_loading_indicator.dart';

class AdminChatBotScreen extends StatefulWidget {
  const AdminChatBotScreen({Key? key}) : super(key: key);

  @override
  State<AdminChatBotScreen> createState() => _AdminChatBotScreenState();
}

class _AdminChatBotScreenState extends State<AdminChatBotScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ChatBotService _chatBotService = ChatBotService();

  List<ChatBotMessage> _messages = [];
  ChatBotSettings? _settings;
  bool _isLoading = true;
  // ignore: unused_field
  String _errorMessage = '';

  // Form controllers
  final _formKey = GlobalKey<FormState>();
  final _messageController = TextEditingController();
  final _categoryController = TextEditingController();
  final _orderController = TextEditingController();

  // Settings controllers
  final _welcomeMessageController = TextEditingController();
  final _botNameController = TextEditingController();

  List<ChatBotOption> _currentOptions = [];
  ChatBotMessage? _selectedMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _messageController.dispose();
    _categoryController.dispose();
    _orderController.dispose();
    _welcomeMessageController.dispose();
    _botNameController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final messages = await _chatBotService.getAllMessages();
      final settings = await _chatBotService.getSettings();

      setState(() {
        _messages = messages;
        _settings = settings;
        _isLoading = false;

        if (_settings != null) {
          _welcomeMessageController.text = _settings!.welcomeMessage;
          _botNameController.text = _settings!.botName;
        }
      });
    } catch (e) {
      Logger.error('ChatBot verileri yüklenirken hata: $e');
      setState(() {
        _errorMessage = 'Veriler yüklenirken bir hata oluştu.';
        _isLoading = false;
      });
    }
  }

  void _resetForm() {
    _messageController.clear();
    _categoryController.clear();
    _orderController.clear();
    _currentOptions = [];
    _selectedMessage = null;
  }

  void _editMessage(ChatBotMessage message) {
    setState(() {
      _selectedMessage = message;
      _messageController.text = message.message;
      _categoryController.text = message.category;
      _orderController.text = message.order.toString();
      _currentOptions = List.from(message.options);
    });
    _tabController.animateTo(1);
  }

  Future<void> _saveMessage() async {
    Logger.info('💾 Admin ChatBot - Form kaydetme başladı');

    if (!_formKey.currentState!.validate()) {
      Logger.warning('⚠️ Form validasyonu başarısız');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final messageData = ChatBotMessage(
        id: _selectedMessage?.id ?? '',
        message: _messageController.text,
        category: _categoryController.text,
        order: int.tryParse(_orderController.text) ?? 0,
        options: _currentOptions,
        isActive: true,
        createdAt: _selectedMessage?.createdAt ?? DateTime.now(),
        updatedAt: DateTime.now(),
      );

      Logger.info('📝 Mesaj verisi hazırlandı: ${messageData.message}');

      bool success;
      if (_selectedMessage != null) {
        Logger.info('🔄 Mevcut mesaj güncelleniyor: ${_selectedMessage!.id}');
        success = await _chatBotService.updateMessage(
          _selectedMessage!.id,
          messageData,
        );
      } else {
        Logger.info('➕ Yeni mesaj ekleniyor');
        final id = await _chatBotService.addMessage(messageData);
        success = id != null;
        Logger.info('✅ Yeni mesaj ID: $id');
      }

      if (success && mounted) {
        Logger.info('✅ Mesaj başarıyla kaydedildi');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_selectedMessage != null ? 'Mesaj güncellendi' : 'Mesaj eklendi'),
          ),
        );
        _resetForm();
        _loadData();
        _tabController.animateTo(0);
      } else {
        Logger.error('❌ Mesaj kaydedilemedi, success: $success');
      }
    } catch (e) {
      Logger.error('❌ Mesaj kaydedilirken hata: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Bir hata oluştu: $e')),
        );
      }
    }

    setState(() => _isLoading = false);
  }

  Future<void> _deleteMessage(ChatBotMessage message) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Mesajı Sil'),
        content: Text('Bu mesajı silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('Sil'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _chatBotService.deleteMessage(message.id);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Mesaj silindi')),
        );
        _loadData();
      }
    }
  }

  // ignore: unused_element
  Future<void> _saveSettings() async {
    if (_settings == null) return;

    setState(() => _isLoading = true);

    try {
      final updatedSettings = ChatBotSettings(
        id: _settings!.id,
        welcomeMessage: _welcomeMessageController.text,
        botName: _botNameController.text,
        botAvatar: _settings!.botAvatar,
        isEnabled: _settings!.isEnabled,
        primaryColor: _settings!.primaryColor,
        position: _settings!.position,
        updatedAt: DateTime.now(),
      );

      final success = await _chatBotService.updateSettings(updatedSettings);

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ayarlar kaydedildi')),
        );
        _loadData();
      }
    } catch (e) {
      Logger.error('Ayarlar kaydedilirken hata: $e');
    }

    setState(() => _isLoading = false);
  }

  void _addOption() {
    showDialog(
      context: context,
      builder: (context) {
        final textController = TextEditingController();
        final nextIdController = TextEditingController();

        return AlertDialog(
          title: Text('Seçenek Ekle'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: textController,
                decoration: InputDecoration(labelText: 'Seçenek Metni'),
              ),
              SizedBox(height: 16),
              TextField(
                controller: nextIdController,
                decoration: InputDecoration(
                  labelText: 'Sonraki Mesaj ID',
                  hintText: 'örn: product_info',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('İptal'),
            ),
            ElevatedButton(
              onPressed: () {
                if (textController.text.isNotEmpty) {
                  setState(() {
                    _currentOptions.add(
                      ChatBotOption(
                        id: 'opt_${DateTime.now().millisecondsSinceEpoch}',
                        text: textController.text,
                        nextMessageId: nextIdController.text,
                      ),
                    );
                  });
                  Navigator.pop(context);
                }
              },
              child: Text('Ekle'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Scaffold(
      appBar: AppBar(
        title: Text('ChatBot Yönetimi'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'Mesajlar'),
            Tab(text: _selectedMessage != null ? 'Mesajı Düzenle' : 'Yeni Mesaj'),
          ],
          indicatorColor: Colors.white,
          labelColor: Colors.white,
        ),
      ),
      body: _isLoading
          ? Center(child: AppLoadingIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildMessagesTab(isSmallScreen),
                _buildFormTab(isSmallScreen),
              ],
            ),
    );
  }

  Widget _buildMessagesTab(bool isSmallScreen) {
    if (_messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('Henüz mesaj eklenmemiş'),
            SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => _tabController.animateTo(1),
              child: Text('İlk Mesajı Ekle'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        return Card(
          margin: EdgeInsets.only(bottom: 12),
          child: ListTile(
            title: Text(
              message.message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: 4),
                Text('Kategori: ${message.category}'),
                Text('Seçenekler: ${message.options.length}'),
              ],
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: Icon(Icons.edit, color: AppTheme.primaryColor),
                  onPressed: () => _editMessage(message),
                ),
                IconButton(
                  icon: Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _deleteMessage(message),
                ),
              ],
            ),
          ),
        ).animate().fadeIn(duration: 300.ms).slideX(begin: -0.1);
      },
    );
  }

  Widget _buildFormTab(bool isSmallScreen) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: _messageController,
              decoration: InputDecoration(
                labelText: 'Mesaj Metni *',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              validator: (value) => value?.isEmpty == true ? 'Mesaj gerekli' : null,
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _categoryController,
              decoration: InputDecoration(
                labelText: 'Kategori *',
                hintText: 'greeting, product, order, delivery, general',
                border: OutlineInputBorder(),
              ),
              validator: (value) => value?.isEmpty == true ? 'Kategori gerekli' : null,
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _orderController,
              decoration: InputDecoration(
                labelText: 'Sıra',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Seçenekler (${_currentOptions.length})',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                ElevatedButton.icon(
                  onPressed: _addOption,
                  icon: Icon(Icons.add),
                  label: Text('Seçenek Ekle'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            ..._currentOptions.map((option) => Card(
                  child: ListTile(
                    title: Text(option.text),
                    subtitle: Text('Sonraki: ${option.nextMessageId}'),
                    trailing: IconButton(
                      icon: Icon(Icons.delete, color: Colors.red),
                      onPressed: () {
                        setState(() => _currentOptions.remove(option));
                      },
                    ),
                  ),
                )),
            SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _saveMessage,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: Text(_selectedMessage != null ? 'Güncelle' : 'Kaydet'),
                  ),
                ),
                if (_selectedMessage != null) ...[
                  SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _resetForm,
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                    ),
                    child: Text('İptal'),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
