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
  late AnimationController _animationController;
  // ignore: unused_field
  late Animation<double> _scaleAnimation;
  late Animation<Offset> _slideAnimation;

  bool _isExpanded = false;
  bool _isLoading = true;
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
            _isLoading = false;
          });
          _setBotMessage(
            greetingMessage.message,
            [...greetingMessage.options, ..._buildBackToMainOptions()],
          );
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

        case 'show_categories':
          final categories = await _chatBotService.getProductCategories();
          if (categories.isEmpty) {
            _setBotMessage(
              'Ürün kategorileri bulunamadı. Lütfen daha sonra tekrar deneyin.',
              _buildBackToMainOptions(),
            );
            return;
          }

          _setBotMessage(
            'Hangi kategori ile ilgileniyorsunuz? Seçiniz:',
            [
              ...categories.map((cat) => ChatBotOption(
                    id: 'category_$cat',
                    text: cat,
                    nextMessageId: '',
                    action: 'show_products_by_category',
                    actionValue: cat,
                  )),
              ..._buildBackToMainOptions(),
            ],
          );
          break;

        case 'show_products_by_category':
          final response = await _chatBotService.getProductsByCategory(value);
          _setBotMessage(response, _buildBackToMainOptions());
          break;

        case 'show_products':
          final response = await _chatBotService.getProductCatalogText();
          _setBotMessage(response, _buildBackToMainOptions());
          break;

        case 'order_steps':
          _setBotMessage(
            'Sipariş süreci:\n1) Ürünleri seçin\n2) Sepete ekleyin\n3) Adres bilgilerini girin\n4) Ödeme yapın\n\nDetaylı bilgi için lütfen iletişime geçin.',
            _buildBackToMainOptions(),
          );
          break;

        case 'contact_info':
          _setBotMessage(
            '📞 WhatsApp: https://wa.me/905010126653\n☎️ Telefon: 0312 345 6789\n✉️ Email: ekmeklab@gmail.com',
            _buildBackToMainOptions(),
          );
          break;

        case 'go_home':
          _restartChat();
          break;

        default:
          Logger.warning('Bilinmeyen action: $action');
          break;
      }
    } catch (e) {
      Logger.error('ChatBot aksiyonu işlenirken hata: $e');
    }
  }

  List<ChatBotOption> _buildBackToMainOptions() {
    return [
      ChatBotOption(
        id: 'opt_back_home',
        text: '🏠 Ana Menüye Dön',
        nextMessageId: '',
        action: 'go_home',
      ),
    ];
  }

  void _setBotMessage(String message, List<ChatBotOption> options) {
    setState(() {
      _chatHistory.add(_ChatMessage(
        message: message,
        isBot: true,
        timestamp: DateTime.now(),
      ));

      _currentMessage = ChatBotMessage(
        id: 'dynamic_${DateTime.now().millisecondsSinceEpoch}',
        message: message,
        options: options,
        category: 'dynamic',
        isActive: true,
        order: 0,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
    });
  }

  void _restartChat() {
    setState(() {
      _chatHistory.clear();
      _loadChatBot();
    });
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
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                child: Container(
                  width: isSmallScreen ? MediaQuery.of(context).size.width - 40 : 380,
                  height: isSmallScreen ? 500 : 600,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppTheme.radiusXl),
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
      padding: EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(AppTheme.radiusXl),
          topRight: Radius.circular(AppTheme.radiusXl),
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Colors.white,
            child: Icon(Icons.support_agent, color: AppTheme.primaryColor),
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
                  'Online',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
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
        padding: EdgeInsets.all(AppTheme.spaceLg),
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
        margin: EdgeInsets.only(bottom: AppTheme.spaceXs),
        padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceMd),
        constraints: BoxConstraints(maxWidth: 280),
        decoration: BoxDecoration(
          color: isBot ? Colors.white : AppTheme.primaryColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
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
    return Container(
      padding: EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[300]!)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _currentMessage!.options.map((option) {
          return Padding(
            padding: EdgeInsets.only(bottom: AppTheme.spaceXs),
            child: OutlinedButton(
              onPressed: () => _handleOptionTap(option),
              style: OutlinedButton.styleFrom(
                padding: EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                side: BorderSide(color: AppTheme.primaryColor),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
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
