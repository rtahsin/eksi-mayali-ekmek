import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';

import '../services/feedback_service.dart';
import '../theme/app_theme.dart';

class FeedbackChatOverlay extends StatefulWidget {
  const FeedbackChatOverlay({super.key, required this.child});

  final Widget child;

  @override
  State<FeedbackChatOverlay> createState() => _FeedbackChatOverlayState();
}

class _FeedbackChatOverlayState extends State<FeedbackChatOverlay>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _messageController = TextEditingController();
  final _emailController = TextEditingController();
  bool _isOpen = false;
  bool _isSending = false;
  bool _showSuccess = false;
  String? _errorMessage;

  @override
  void dispose() {
    _messageController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSending = true);
    final loc = Localizations.localeOf(context);

    try {
      await GetIt.I<FeedbackService>().submitFeedback(
        email: _emailController.text.trim().isEmpty
            ? null
            : _emailController.text.trim(),
        message: _messageController.text.trim(),
        locale: loc.languageCode,
      );
      if (!mounted) return;
      _messageController.clear();
      setState(() {
        _showSuccess = true;
        _errorMessage = null;
      });
      await Future<void>.delayed(const Duration(seconds: 2));
      if (mounted) {
        setState(() => _showSuccess = false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Geri bildirim gönderilemedi. Lütfen tekrar deneyin.';
      });
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);

    return Stack(
      children: [
        widget.child,
        PositionedDirectional(
          bottom: AppTheme.space2xl,
          end: AppTheme.space2xl,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (_isOpen)
                _ChatCard(
                  formKey: _formKey,
                  emailController: _emailController,
                  messageController: _messageController,
                  isSending: _isSending,
                  showSuccess: _showSuccess,
                  errorMessage: _errorMessage,
                  maxWidth: mediaQuery.size.width < 500
                      ? mediaQuery.size.width * 0.9
                      : 360,
                  onSubmit: _submit,
                ),
              const SizedBox(height: 12),
              _FeedbackToggleButton(
                isOpen: _isOpen,
                onPressed: () {
                  setState(() => _isOpen = !_isOpen);
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ChatCard extends StatelessWidget {
  const _ChatCard({
    required this.formKey,
    required this.emailController,
    required this.messageController,
    required this.isSending,
    required this.showSuccess,
    required this.errorMessage,
    required this.maxWidth,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailController;
  final TextEditingController messageController;
  final bool isSending;
  final bool showSuccess;
  final String? errorMessage;
  final double maxWidth;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      elevation: 12,
      borderRadius: BorderRadius.circular(AppTheme.radius2xl),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Container(
          color: theme.colorScheme.surface,
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Geri Bildirim',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Düşüncelerinizi bizimle paylaşın',
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: emailController,
                  decoration: const InputDecoration(
                    labelText: 'E-posta (isteğe bağlı)',
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: messageController,
                  minLines: 3,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    labelText: 'Mesajınız',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Lütfen bir mesaj girin';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                if (showSuccess)
                  Row(
                    children: [
                      Icon(Icons.check_circle,
                          color: theme.colorScheme.primary, size: 18),
                      const SizedBox(width: 6),
                      Text(
                        'Geri bildiriminiz gönderildi. Teşekkürler!',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                if (errorMessage != null) ...[
                  Row(
                    children: [
                      Icon(Icons.error_outline,
                          color: theme.colorScheme.error, size: 18),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          errorMessage!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: isSending ? null : onSubmit,
                      icon: isSending
                          ? SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send),
                      label: const Text('Gönder'),
                    ),
                  ],
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FeedbackToggleButton extends StatelessWidget {
  const _FeedbackToggleButton({
    required this.isOpen,
    required this.onPressed,
  });

  final bool isOpen;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(isOpen ? Icons.close : Icons.chat_bubble_outline),
      label: Text(isOpen ? 'Kapat' : 'Geri Bildirim'),
      style: ElevatedButton.styleFrom(
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg + 2, vertical: AppTheme.spaceMd),
        elevation: 4,
      ),
    );
  }
}
