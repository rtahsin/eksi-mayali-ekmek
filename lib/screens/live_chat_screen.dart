// ignore_for_file: prefer_const_constructors, use_build_context_synchronously

/*
 * Live Chat Screen
 * 
 * PURPOSE: Ollama LLM ile canlı destek chat ekranı
 * LAYER: UI (Screen)
 * DEPENDS ON: LiveChatService, ChatMessage model
 * 
 * FEATURES:
 *   - AI destekli canlı destek
 *   - Real-time mesajlaşma
 *   - Typing indicator
 *   - Chat geçmişi
 * 
 * LAST UPDATED: 2025-12-16
 */

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/live_chat_service.dart';
import '../theme/app_theme.dart';

class LiveChatScreen extends StatefulWidget {
  static const routeName = '/live-chat';

  const LiveChatScreen({Key? key}) : super(key: key);

  @override
  State<LiveChatScreen> createState() => _LiveChatScreenState();
}

/// Dialog i\u00e7in kullan\u0131lacak widget
class LiveChatDialogContent extends StatefulWidget {
  const LiveChatDialogContent({Key? key}) : super(key: key);

  @override
  State<LiveChatDialogContent> createState() => _LiveChatDialogContentState();
}

class _LiveChatDialogContentState extends State<LiveChatDialogContent> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();

    // Oturum ba\u015flat
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authService = context.read<AuthService>();
      final userId = authService.currentUser?.id;

      context.read<LiveChatService>().startNewSession(userId: userId);
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    context.read<LiveChatService>().sendMessage(message);
    _messageController.clear();

    // Scroll to bottom
    Future.delayed(Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        Container(
          padding: EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Row(
            children: [
              Icon(Icons.support_agent, color: Colors.white, size: 24),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Canl\u0131 Destek',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'EkmekLab AI Asistan',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: Icon(Icons.close, color: Colors.white),
              ),
            ],
          ),
        ),

        // Messages
        Expanded(
          child: Container(
            color: Colors.grey[50],
            child: Consumer<LiveChatService>(
              builder: (context, chatService, child) {
                if (chatService.isLoading) {
                  return Center(child: CircularProgressIndicator());
                }

                return ListView.builder(
                  controller: _scrollController,
                  padding: EdgeInsets.all(16),
                  itemCount: chatService.messages.length + (chatService.isTyping ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == chatService.messages.length) {
                      return _buildTypingIndicator();
                    }

                    final message = chatService.messages[index];
                    return _buildMessageBubble(message);
                  },
                );
              },
            ),
          ),
        ),

        // Input
        Container(
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 5,
                offset: Offset(0, -2),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    style: TextStyle(color: Colors.black87, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Mesaj\u0131n\u0131z\u0131 yaz\u0131n...',
                      hintStyle: TextStyle(color: Colors.grey[600]),
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
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                SizedBox(width: 8),
                Consumer<LiveChatService>(
                  builder: (context, chatService, child) {
                    return Material(
                      color: chatService.isTyping ? Colors.grey[300] : AppTheme.primaryColor,
                      borderRadius: BorderRadius.circular(24),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(24),
                        onTap: chatService.isTyping ? null : _sendMessage,
                        child: Container(
                          padding: EdgeInsets.all(12),
                          child: Icon(
                            Icons.send,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMessageBubble(dynamic message) {
    final isUser = message.isUser;
    final timestamp = message.timestamp;
    final formattedTime = DateFormat('HH:mm').format(timestamp);

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(maxWidth: 300),
        child: Column(
          crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Container(
              padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser ? AppTheme.primaryColor : Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 3,
                    offset: Offset(0, 1),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!isUser)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.smart_toy, size: 12, color: AppTheme.primaryColor),
                        SizedBox(width: 4),
                        Text(
                          'AI',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                  if (!isUser) SizedBox(height: 4),
                  Text(
                    message.message,
                    style: TextStyle(
                      color: isUser ? Colors.white : Colors.black87,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 2),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                formattedTime,
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.grey[500],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(bottom: 12),
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(4),
            bottomRight: Radius.circular(16),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildTypingDot(0),
            SizedBox(width: 4),
            _buildTypingDot(1),
            SizedBox(width: 4),
            _buildTypingDot(2),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingDot(int index) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 600),
      builder: (context, value, child) {
        final delay = index * 0.2;
        final animValue = ((value + delay) % 1.0);
        return Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            color: Colors.grey[600]!.withValues(alpha: 0.3 + (animValue * 0.7)),
            shape: BoxShape.circle,
          ),
        );
      },
      onEnd: () {
        if (mounted) setState(() {});
      },
    );
  }
}

// Eski tam ekran versiyonu (geriye uyumluluk i\u00e7in)
class _LiveChatScreenState extends State<LiveChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();

    // Oturum başlat
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authService = context.read<AuthService>();
      final userId = authService.currentUser?.id;

      context.read<LiveChatService>().startNewSession(userId: userId);
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    final authService = context.read<AuthService>();
    final userId = authService.currentUser?.id;

    context.read<LiveChatService>().sendMessage(message, userId: userId);
    _messageController.clear();

    // Scroll to bottom
    Future.delayed(Duration(milliseconds: 300), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.support_agent, size: 20),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Canlı Destek',
                    style: TextStyle(
                      fontSize: isSmallScreen ? 16 : 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'AI Destekli Müşteri Hizmetleri',
                    style: TextStyle(
                      fontSize: isSmallScreen ? 11 : 12,
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.primaryColor,
        elevation: 2,
      ),
      body: Column(
        children: [
          // Bilgi banner
          Container(
            padding: EdgeInsets.all(12),
            color: Colors.blue[50],
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'AI destekli destek sistemimiz size 7/24 yardımcı olmaya hazır!',
                    style: TextStyle(
                      fontSize: isSmallScreen ? 12 : 13,
                      color: Colors.blue[900],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Chat mesajları
          Expanded(
            child: Consumer<LiveChatService>(
              builder: (context, chatService, child) {
                if (chatService.isLoading) {
                  return Center(child: CircularProgressIndicator());
                }

                return ListView.builder(
                  controller: _scrollController,
                  padding: EdgeInsets.all(16),
                  itemCount: chatService.messages.length + (chatService.isTyping ? 1 : 0),
                  itemBuilder: (context, index) {
                    // Typing indicator
                    if (index == chatService.messages.length && chatService.isTyping) {
                      return _buildTypingIndicator();
                    }

                    final message = chatService.messages[index];
                    return _buildMessageBubble(message, isSmallScreen);
                  },
                );
              },
            ),
          ),

          // Mesaj input alanı
          Container(
            padding: EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: Offset(0, -3),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        hintText: 'Mesajınızı yazın...',
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
                        contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        filled: true,
                        fillColor: Colors.grey[50],
                      ),
                      maxLines: null,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  SizedBox(width: 8),
                  Consumer<LiveChatService>(
                    builder: (context, chatService, child) {
                      return Material(
                        color: chatService.isTyping ? Colors.grey[300] : AppTheme.primaryColor,
                        borderRadius: BorderRadius.circular(24),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: chatService.isTyping ? null : _sendMessage,
                          child: Container(
                            padding: EdgeInsets.all(12),
                            child: Icon(
                              Icons.send,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(dynamic message, bool isSmallScreen) {
    final isUser = message.isUser;
    final timestamp = message.timestamp;
    final formattedTime = DateFormat('HH:mm').format(timestamp);

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(
          bottom: 12,
          left: isUser ? 60 : 0,
          right: isUser ? 0 : 60,
        ),
        child: Column(
          crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Container(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isUser ? AppTheme.primaryColor : Colors.grey[200],
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                  bottomLeft: Radius.circular(isUser ? 20 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 20),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 5,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!isUser)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.smart_toy, size: 14, color: AppTheme.primaryColor),
                        SizedBox(width: 4),
                        Text(
                          'EkmekLab AI',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                  if (!isUser) SizedBox(height: 4),
                  Text(
                    message.message,
                    style: TextStyle(
                      color: isUser ? Colors.white : Colors.black87,
                      fontSize: isSmallScreen ? 14 : 15,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 4),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                formattedTime,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[600],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(bottom: 12, right: 60),
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
            bottomLeft: Radius.circular(4),
            bottomRight: Radius.circular(20),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildTypingDot(0),
            SizedBox(width: 4),
            _buildTypingDot(1),
            SizedBox(width: 4),
            _buildTypingDot(2),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingDot(int index) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 600),
      builder: (context, value, child) {
        final delay = index * 0.2;
        final animValue = ((value + delay) % 1.0);
        return Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: Colors.grey[600]!.withValues(alpha: 0.3 + (animValue * 0.7)),
            shape: BoxShape.circle,
          ),
        );
      },
      onEnd: () {
        if (mounted) setState(() {});
      },
    );
  }
}
