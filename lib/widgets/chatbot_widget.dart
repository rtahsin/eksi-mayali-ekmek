// ignore_for_file: prefer_const_constructors, use_super_parameters

/*
 * ChatBot Widget
 * 
 * PURPOSE: Modern, temaya uygun, yönlendirmeli chatbot widget'ı
 * LAYER: Widget
 * DEPENDS ON: ChatBotService, ChatBotMessage, AppTheme
 * 
 * LAST UPDATED: 2025-12-09
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../models/chatbot_message.dart';
import '../services/chatbot_service.dart';
import '../services/ollama_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';

class ChatBotWidget extends StatefulWidget {
  const ChatBotWidget({Key? key}) : super(key: key);

  @override
  State<ChatBotWidget> createState() => _ChatBotWidgetState();
}

class _ChatBotWidgetState extends State<ChatBotWidget> with SingleTickerProviderStateMixin {
  final ChatBotService _chatBotService = ChatBotService();
  final OllamaService _ollamaService = OllamaService();
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<Offset> _slideAnimation;

  bool _isExpanded = false;
  bool _isLoading = true;
  bool _isAIMode = false; // AI Mode toggle
  bool _isAITyping = false; // AI yanıt yazıyor mu?
  final TextEditingController _messageController = TextEditingController();
  ChatBotSettings? _settings;
  List<_ChatMessage> _chatHistory = [];
  ChatBotMessage? _currentMessage;

  @override
  void initState() {
    super.initState();
    Logger.info('ChatBot widget initialize edildi');

    _animationController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 300),
    );

    _scaleAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );

    _slideAnimation = Tween<Offset>(
      begin: Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    ));

    _loadChatBot();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadChatBot() async {
    Logger.info('🔄 ChatBot loading başladı...');

    try {
      final settings = await _chatBotService.getSettings();
      final greetingMessage = await _chatBotService.getGreetingMessage();

      Logger.info(
          '📦 Firestore verileri: settings=${settings != null}, greeting=${greetingMessage != null}');

      if (settings != null && settings.isEnabled && greetingMessage != null) {
        Logger.info('✅ Firestore verisi var, normal mode');
        if (mounted) {
          setState(() {
            _settings = settings;
            _currentMessage = greetingMessage;
            _chatHistory.add(_ChatMessage(
              message: greetingMessage.message,
              isBot: true,
              timestamp: DateTime.now(),
            ));
            _isLoading = false;
          });
        }
      } else {
        Logger.warning('⚠️ Firestore verisi yok, demo mode aktif');
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      Logger.error('❌ ChatBot yüklenirken hata: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _toggleChat() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    });
  }

  Future<void> _handleOptionTap(ChatBotOption option) async {
    // Kullanıcı seçimini ekle
    setState(() {
      _chatHistory.add(_ChatMessage(
        message: option.text,
        isBot: false,
        timestamp: DateTime.now(),
      ));
    });

    // Aksiyon varsa çalıştır
    if (option.action != null && option.action!.isNotEmpty) {
      await _handleAction(option.action!, option.actionValue ?? '');
    }

    // Sonraki mesajı yükle
    if (option.nextMessageId != null && option.nextMessageId.isNotEmpty) {
      final nextMessage = await _chatBotService.getMessageById(option.nextMessageId);
      if (nextMessage != null) {
        setState(() {
          _currentMessage = nextMessage;
          _chatHistory.add(_ChatMessage(
            message: nextMessage.message,
            isBot: true,
            timestamp: DateTime.now(),
          ));
        });
      }
    }
  }

  Future<void> _handleAction(String action, String value) async {
    try {
      switch (action) {
        case 'link':
          await Helpers.launchURL(value);
          break;
        case 'email':
          await Helpers.launchURL('mailto:$value');
          break;
        case 'phone':
          await Helpers.launchURL('tel:$value');
          break;
        case 'whatsapp':
          await Helpers.launchURL('https://wa.me/$value');
          break;
      }
    } catch (e) {
      Logger.error('ChatBot aksiyonu işlenirken hata: $e');
    }
  }

  void _restartChat() {
    setState(() {
      _chatHistory.clear();
      _isAIMode = false;
      _messageController.clear();
      _loadChatBot();
    });
  }

  Future<void> _sendAIMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty || _isAITyping) return;

    // Kullanıcı mesajını ekle
    setState(() {
      _chatHistory.add(_ChatMessage(
        message: message,
        isBot: false,
        timestamp: DateTime.now(),
      ));
      _messageController.clear();
      _isAITyping = true;
    });

    try {
      // Önceki sohbet geçmişini context olarak hazırla
      final context = _chatHistory
          .take(_chatHistory.length - 1) // Son mesajı (yeni eklenen) hariç tut
          .map((msg) => '${msg.isBot ? "Bot" : "Kullanıcı"}: ${msg.message}')
          .join('\n');

      Logger.info('🤖 AI\'ya gönderiliyor: $message');
      Logger.info('📝 Context: $context');

      // Ollama'dan yanıt al (model: qwen3:8b)
      final response = await _ollamaService.chat(
        message: message,
        context: context.isNotEmpty ? context : null,
        model: 'qwen3:8b',
      );

      Logger.info('✅ AI yanıtı alındı: $response');

      if (mounted && response != null && response.isNotEmpty) {
        setState(() {
          _chatHistory.add(_ChatMessage(
            message: response,
            isBot: true,
            timestamp: DateTime.now(),
          ));
          _isAITyping = false;
        });
      } else if (mounted) {
        setState(() {
          _chatHistory.add(_ChatMessage(
            message: 'Üzgünüm, yanıt alınamadı. Lütfen tekrar deneyin.',
            isBot: true,
            timestamp: DateTime.now(),
          ));
          _isAITyping = false;
        });
      }
    } catch (e) {
      Logger.error('❌ AI yanıtı alınamadı: $e');

      if (mounted) {
        setState(() {
          _chatHistory.add(_ChatMessage(
            message:
                'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin veya menü moduna geçerek devam edin. 🙏',
            isBot: true,
            timestamp: DateTime.now(),
          ));
          _isAITyping = false;
        });

        // Hata mesajını kullanıcıya göster
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('AI bağlantısı kurulamadı. Backend server çalışıyor mu?'),
            backgroundColor: Colors.orange,
            action: SnackBarAction(
              label: 'Tamam',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Loading state - ama 5 saniyeden fazla loading olmasın
    if (_isLoading) {
      // 5 saniye sonra otomatik demo mode'a geç
      Future.delayed(Duration(seconds: 5), () {
        if (_isLoading && mounted) {
          Logger.warning('ChatBot loading timeout - demo mode aktif');
          setState(() => _isLoading = false);
        }
      });
      return SizedBox.shrink();
    }

    // Ayarlar yoksa varsayılan değerlerle oluştur
    _settings ??= ChatBotSettings(
      id: 'default',
      welcomeMessage: 'Merhaba! EkmekLab\'a hoş geldiniz.',
      botName: 'EkmekLab Asistan',
      isEnabled: true,
      primaryColor: '#8B4513',
      position: 'bottom-right',
      updatedAt: DateTime.now(),
    );

    // Mesaj yoksa demo mesaj oluştur
    if (_currentMessage == null) {
      _currentMessage = ChatBotMessage(
        id: 'demo_1',
        message:
            'Merhaba! EkmekLab\'a hoş geldiniz. ChatBot henüz yapılandırılmadı. Admin panelden mesajları ekleyebilirsiniz.',
        category: 'greeting',
        isActive: true,
        order: 0,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        options: [
          ChatBotOption(
            id: 'opt_demo_1',
            text: '📞 WhatsApp ile iletişime geç',
            nextMessageId: '',
            action: 'whatsapp',
            actionValue: '905010126653',
          ),
        ],
      );
      if (_chatHistory.isEmpty) {
        _chatHistory.add(_ChatMessage(
          message: _currentMessage!.message,
          isBot: true,
          timestamp: DateTime.now(),
        ));
      }
    }

    final isSmallScreen = MediaQuery.of(context).size.width < 600;
    final position = _settings!.position;

    return Stack(
      children: [
        // Chat Window
        if (_isExpanded)
          Positioned(
            bottom: 90,
            right: position == 'bottom-right' ? 20 : null,
            left: position == 'bottom-left' ? 20 : null,
            child: SlideTransition(
              position: _slideAnimation,
              child: Material(
                elevation: 8,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: isSmallScreen ? MediaQuery.of(context).size.width - 40 : 380,
                  height: isSmallScreen ? 500 : 600,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      _buildChatHeader(),
                      Expanded(child: _buildChatBody()),
                      if (_currentMessage?.options.isNotEmpty == true) _buildOptionsPanel(),
                    ],
                  ),
                ),
              ),
            ),
          ),

        // Floating Button - BASİT VERSİYON (Çalıştığını biliyoruz)
        Positioned(
          bottom: 20,
          right: position == 'bottom-right' ? 20 : null,
          left: position == 'bottom-left' ? 20 : null,
          child: Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black26,
                  blurRadius: 8,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _toggleChat,
                customBorder: CircleBorder(),
                child: Center(
                  child: Icon(
                    _isExpanded ? Icons.close : Icons.chat_bubble,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildChatHeader() {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(16),
          topRight: Radius.circular(16),
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Colors.white,
            child: Icon(_isAIMode ? Icons.psychology : Icons.support_agent,
                color: AppTheme.primaryColor),
          ),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _settings!.botName,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  _isAIMode ? 'AI Mode 🤖' : 'Online',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // AI Mode Toggle Button
          IconButton(
            icon: Icon(
              _isAIMode ? Icons.psychology : Icons.smart_toy,
              color: Colors.white,
            ),
            tooltip: _isAIMode ? 'Menü Moduna Geç' : 'AI Moduna Geç',
            onPressed: () {
              setState(() {
                _isAIMode = !_isAIMode;
                if (!_isAIMode) {
                  _messageController.clear();
                }
              });
            },
          ),
          IconButton(
            icon: Icon(Icons.refresh, color: Colors.white),
            onPressed: _restartChat,
          ),
        ],
      ),
    );
  }

  Widget _buildChatBody() {
    return Container(
      color: Colors.grey[100],
      child: ListView.builder(
        padding: EdgeInsets.all(16),
        itemCount: _chatHistory.length,
        itemBuilder: (context, index) {
          return _buildMessageBubble(_chatHistory[index]);
        },
      ),
    );
  }

  Widget _buildMessageBubble(_ChatMessage message) {
    final isBot = message.isBot;

    return Align(
      alignment: isBot ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: EdgeInsets.only(bottom: 8),
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(maxWidth: 280),
        decoration: BoxDecoration(
          color: isBot ? Colors.white : AppTheme.primaryColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 4,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Text(
          message.message,
          style: TextStyle(
            color: isBot ? Colors.black87 : Colors.white,
            fontSize: 14,
          ),
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideX(begin: isBot ? -0.2 : 0.2);
  }

  Widget _buildOptionsPanel() {
    // AI Mode: Text input göster
    if (_isAIMode) {
      return Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Colors.grey[300]!)),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                enabled: !_isAITyping,
                decoration: InputDecoration(
                  hintText: _isAITyping ? 'AI yazıyor...' : 'Mesajınızı yazın...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
                  ),
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  filled: true,
                  fillColor: Colors.grey[50],
                ),
                maxLines: null,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendAIMessage(),
              ),
            ),
            SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(
                  _isAITyping ? Icons.hourglass_empty : Icons.send,
                  color: Colors.white,
                ),
                onPressed: _isAITyping ? null : _sendAIMessage,
              ),
            ),
          ],
        ),
      );
    }

    // Menu Mode: Options göster
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[300]!)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _currentMessage!.options.map((option) {
          return Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: OutlinedButton(
              onPressed: () => _handleOptionTap(option),
              style: OutlinedButton.styleFrom(
                padding: EdgeInsets.symmetric(vertical: 12),
                side: BorderSide(color: AppTheme.primaryColor),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                option.text,
                style: TextStyle(color: AppTheme.primaryColor),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ChatMessage {
  final String message;
  final bool isBot;
  final DateTime timestamp;

  _ChatMessage({
    required this.message,
    required this.isBot,
    required this.timestamp,
  });
}
