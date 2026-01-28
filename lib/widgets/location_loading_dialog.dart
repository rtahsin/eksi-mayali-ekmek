// ignore_for_file: prefer_const_constructors, use_build_context_synchronously

/*
 * Location Loading Dialog
 * 
 * PURPOSE: Konum alınırken gösterilen loading dialog
 * LAYER: UI Widget
 * DEPENDS ON: LocationService, flutter_spinkit
 * 
 * RULES:
 * - GPS kapalı kontrolü yap
 * - Loading state göster
 * - Hata durumlarını handle et
 * - Retry mekanizması ekle
 * 
 * LAST UPDATED: 28 Ocak 2026
 */

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:geolocator/geolocator.dart';

import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';

/// Konum alırken gösterilen loading dialog
/// 
/// GPS kontrolü, loading state ve hata yönetimi içerir
class LocationLoadingDialog extends StatefulWidget {
  final bool showRationale;

  const LocationLoadingDialog({
    Key? key,
    this.showRationale = false,
  }) : super(key: key);

  @override
  State<LocationLoadingDialog> createState() => _LocationLoadingDialogState();
}

class _LocationLoadingDialogState extends State<LocationLoadingDialog> {
  String _status = 'Konumunuz alınıyor...';
  String _substatus = 'Bu işlem birkaç saniye sürebilir';
  bool _hasError = false;
  String? _errorType; // 'gps_disabled', 'permission_denied', 'timeout', 'general'
  String? _errorMessage;
  bool _isRetrying = false;

  @override
  void initState() {
    super.initState();
    _getLocation();
  }

  Future<void> _getLocation() async {
    if (!mounted) return;

    setState(() {
      _hasError = false;
      _errorType = null;
      _errorMessage = null;
      _status = 'Konumunuz alınıyor...';
      _substatus = 'GPS sinyali bekleniyor...';
      _isRetrying = false;
    });

    try {
      // GPS açık mı kontrol et
      setState(() => _substatus = 'GPS kontrol ediliyor...');
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();

      if (!serviceEnabled) {
        if (!mounted) return;
        setState(() {
          _hasError = true;
          _errorType = 'gps_disabled';
          _status = 'GPS Kapalı';
          _errorMessage = 'Teslimat için GPS açık olmalıdır';
        });
        return;
      }

      // Konum al
      setState(() => _substatus = 'Konumunuz belirleniyor...');
      final position = await LocationService.getCurrentLocation(
        context: context,
        showRationale: widget.showRationale,
      );

      if (position != null && mounted) {
        // Accuracy kontrolü
        final accuracy = LocationService.getAccuracyLevel(position.accuracy);
        Logger.info('Konum accuracy: $accuracy (${position.accuracy}m)');

        Navigator.pop(context, position);
      } else if (mounted) {
        // Kullanıcı izin vermedi
        setState(() {
          _hasError = true;
          _errorType = 'permission_denied';
          _status = 'İzin Gerekli';
          _errorMessage = 'Konum izni olmadan teslimat yapamayız';
        });
      }
    } on GpsDisabledException catch (e) {
      if (!mounted) return;
      setState(() {
        _hasError = true;
        _errorType = 'gps_disabled';
        _status = 'GPS Kapalı';
        _errorMessage = e.message;
      });
    } on TimeoutException catch (e) {
      if (!mounted) return;
      Logger.error('Timeout: $e');
      setState(() {
        _hasError = true;
        _errorType = 'timeout';
        _status = 'Zaman Aşımı';
        _errorMessage = 'Konum alınamadı. Lütfen tekrar deneyin.';
      });
    } catch (e) {
      if (!mounted) return;
      Logger.error('Location loading error: $e');
      setState(() {
        _hasError = true;
        _errorType = 'general';
        _status = 'Konum Alınamadı';
        _errorMessage = e.toString().contains('kalıcı')
            ? 'Uygulama ayarlarından konum iznini açın'
            : 'Beklenmeyen bir hata oluştu';
      });
    }
  }

  Future<void> _retry() async {
    setState(() => _isRetrying = true);
    await _getLocation();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _hasError, // Sadece hata varsa geri çıkılabilir
      child: AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        contentPadding: EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!_hasError) ...[
              // Loading state
              SpinKitFadingCircle(
                color: AppTheme.primaryColor,
                size: 60,
              ),
              SizedBox(height: 24),
              Text(
                _status,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[800],
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 8),
              Text(
                _substatus,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
            ] else ...[
              // Error state
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _getErrorColor().withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _getErrorIcon(),
                  size: 48,
                  color: _getErrorColor(),
                ),
              ),
              SizedBox(height: 20),
              Text(
                _status,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 8),
              Text(
                _errorMessage ?? '',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 20),
              
              // Action buttons
              if (_errorType == 'gps_disabled') ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await LocationService.openLocationSettings();
                      if (mounted) {
                        Navigator.pop(context);
                      }
                    },
                    icon: Icon(Icons.settings),
                    label: Text('GPS Ayarlarını Aç'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ] else if (_errorType == 'permission_denied') ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isRetrying ? null : _retry,
                    icon: _isRetrying
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : Icon(Icons.refresh),
                    label: Text(_isRetrying ? 'Tekrar Deneniyor...' : 'Tekrar İzin İste'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ] else if (_errorType == 'timeout' || _errorType == 'general') ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isRetrying ? null : _retry,
                    icon: _isRetrying
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : Icon(Icons.refresh),
                    label: Text(_isRetrying ? 'Deneniyor...' : 'Tekrar Dene'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ],
              
              SizedBox(height: 12),
              
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('İptal'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.grey[600],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getErrorColor() {
    switch (_errorType) {
      case 'gps_disabled':
        return Colors.orange;
      case 'permission_denied':
        return Colors.blue;
      case 'timeout':
        return Colors.amber;
      default:
        return Colors.red;
    }
  }

  IconData _getErrorIcon() {
    switch (_errorType) {
      case 'gps_disabled':
        return Icons.location_off;
      case 'permission_denied':
        return Icons.location_disabled;
      case 'timeout':
        return Icons.timer_off;
      default:
        return Icons.error_outline;
    }
  }
}
