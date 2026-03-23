import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class EmailVerificationScreen extends StatefulWidget {
  static const routeName = '/verify-email';
  final String email;
  final bool isPendingRegistration; // true: yeni kayıt, false: eski kullanıcı doğrulama

  const EmailVerificationScreen({
    super.key,
    required this.email,
    this.isPendingRegistration = true, // Varsayılan: yeni kayıt
  });

  @override
  State<EmailVerificationScreen> createState() => _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  final _codeController = TextEditingController();
  bool _isLoading = false;
  String? _error;
  int _failedAttempts = 0;
  bool _locked = false;
  int _cooldown = 0; // seconds
  Timer? _timer;

  @override
  void dispose() {
    _codeController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _verify() async {
    if (_locked) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final auth = Provider.of<AuthService>(context, listen: false);
      bool ok;

      if (widget.isPendingRegistration) {
        // YENİ KAYIT: completeRegistration çağır
        ok = await auth.completeRegistration(widget.email, _codeController.text.trim());
      } else {
        // ESKİ KULLANICI: verifyEmailOtp çağır (mevcut user için)
        ok = await auth.verifyEmailOtp(_codeController.text.trim());
      }

      if (!mounted) return;
      if (ok) {
        final message = widget.isPendingRegistration
            ? 'Kayıt tamamlandı! Hoş geldiniz.'
            : 'E-posta doğrulandı!';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
        // Ana sayfaya yönlendir
        Navigator.of(context).pushReplacementNamed('/');
      } else {
        _failedAttempts += 1;
        if (_failedAttempts >= 5) {
          _locked = true;
          _error = '5 başarısız deneme. Lütfen daha sonra tekrar deneyin.';
        } else {
          _error = 'Kod hatalı veya süresi dolmuş ($_failedAttempts/5)';
        }
        setState(() {});
      }
    } catch (e) {
      _failedAttempts += 1;
      if (_failedAttempts >= 5) {
        _locked = true;
      }
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _resend() async {
    if (_cooldown > 0) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final auth = Provider.of<AuthService>(context, listen: false);

      if (widget.isPendingRegistration) {
        // YENİ KAYIT: Pending registration için resend
        await auth.resendPendingOtp(widget.email);
      } else {
        // ESKİ KULLANICI: Mevcut user için requestEmailOtp
        final result = await auth.requestEmailOtp();
        if (!result.success) {
          if (result.cooldownSec != null) {
            _startCooldown(result.cooldownSec!);
            throw Exception('Çok sık istek. ${result.cooldownSec}s sonra tekrar deneyin.');
          }
          throw Exception(result.error ?? 'Kod gönderilemedi');
        }
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Kod yeniden gönderildi.')));
      _startCooldown(60);
    } catch (e) {
      if (!mounted) return;

      final errorMsg = e.toString().replaceAll('Exception: ', '');

      // Cooldown hatası için süreyi parse et
      final cooldownMatch = RegExp(r'(\d+)\s*s').firstMatch(errorMsg);
      if (cooldownMatch != null) {
        final seconds = int.tryParse(cooldownMatch.group(1) ?? '60') ?? 60;
        _startCooldown(seconds);
      }

      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMsg)));
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _startCooldown(int seconds) {
    setState(() {
      _cooldown = seconds;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_cooldown <= 1) {
        t.cancel();
        setState(() {
          _cooldown = 0;
        });
      } else {
        setState(() {
          _cooldown -= 1;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('E-posta Doğrulama')),
      body: Padding(
        padding: const EdgeInsets.all(AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Doğrulama kodu ${widget.email} adresine gönderildi.'),
            const SizedBox(height: 12),
            TextField(
              controller: _codeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: const InputDecoration(
                labelText: '6 haneli kod',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_isLoading || _locked) ? null : _verify,
                child: _isLoading ? const CircularProgressIndicator() : const Text('Doğrula'),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: (_cooldown > 0) ? null : _resend,
                    child:
                        Text(_cooldown > 0 ? 'Yeniden gönder (${_cooldown}s)' : 'Yeniden gönder'),
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
