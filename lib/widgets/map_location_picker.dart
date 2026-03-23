// ignore_for_file: prefer_const_constructors, use_build_context_synchronously

/*
 * Map Location Picker
 * 
 * PURPOSE: Google Maps ile manuel konum seçimi
 * LAYER: UI Widget
 * DEPENDS ON: google_maps_flutter, LocationService
 * 
 * RULES:
 * - Tap to select location
 * - Show address preview
 * - Animated marker
 * - Confirm button
 * 
 * LAST UPDATED: 28 Ocak 2026
 */

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';

/// Google Maps ile konum seçici
///
/// Kullanıcı haritada istediği yere tıklayarak konum seçebilir
class MapLocationPicker extends StatefulWidget {
  /// Başlangıç konumu (varsa)
  final double? initialLatitude;
  final double? initialLongitude;

  const MapLocationPicker({
    Key? key,
    this.initialLatitude,
    this.initialLongitude,
  }) : super(key: key);

  @override
  State<MapLocationPicker> createState() => _MapLocationPickerState();
}

class _MapLocationPickerState extends State<MapLocationPicker> {
  GoogleMapController? _mapController;
  LatLng? _selectedLocation;
  String? _selectedAddress;
  bool _isLoadingAddress = false;
  bool _isLoadingCurrentLocation = false;
  Set<Marker> _markers = {};

  // Default: İstanbul (eğer başlangıç konumu yoksa)
  static const LatLng _defaultLocation = LatLng(41.0082, 28.9784);
  static const String _darkMapStyle = '''
        [
          {
            "elementType": "geometry",
            "stylers": [{"color": "#242f3e"}]
          },
          {
            "elementType": "labels.text.stroke",
            "stylers": [{"color": "#242f3e"}]
          },
          {
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#746855"}]
          }
        ]
      ''';

  @override
  void initState() {
    super.initState();
    _initializeLocation();
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  /// Başlangıç konumunu ayarla
  Future<void> _initializeLocation() async {
    if (widget.initialLatitude != null && widget.initialLongitude != null) {
      final location = LatLng(widget.initialLatitude!, widget.initialLongitude!);
      setState(() => _selectedLocation = location);
      await _updateAddress(location);
      _addMarker(location);
    }
  }

  /// Harita hazır olduğunda çağrılır
  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;

    // Başlangıç konumuna zoom yap
    if (_selectedLocation != null) {
      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(_selectedLocation!, 15),
      );
    }
  }

  /// Haritada tıklanan yere marker ekle
  Future<void> _onMapTap(LatLng position) async {
    Logger.info('Haritada seçilen konum: ${position.latitude}, ${position.longitude}');

    setState(() {
      _selectedLocation = position;
      _selectedAddress = null; // Adres yüklenene kadar null
    });

    _addMarker(position);
    await _updateAddress(position);

    // Kameraya yumuşak geçiş
    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(position, 16),
    );
  }

  /// Marker ekle/güncelle
  void _addMarker(LatLng position) {
    setState(() {
      _markers = {
        Marker(
          markerId: MarkerId('selected_location'),
          position: position,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          infoWindow: InfoWindow(
            title: 'Seçilen Konum',
            snippet: _selectedAddress ?? 'Adres yükleniyor...',
          ),
        ),
      };
    });
  }

  /// Adres bilgisini al (Reverse Geocoding)
  Future<void> _updateAddress(LatLng position) async {
    setState(() => _isLoadingAddress = true);

    try {
      final address = await LocationService.getAddressFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (mounted) {
        setState(() {
          _selectedAddress = address ?? 'Adres bulunamadı';
          _isLoadingAddress = false;
        });

        // Marker'ı güncelle (adres ile)
        _addMarker(position);
      }
    } catch (e) {
      Logger.error('Adres alma hatası: $e');
      if (mounted) {
        setState(() {
          _selectedAddress = 'Adres alınamadı';
          _isLoadingAddress = false;
        });
      }
    }
  }

  /// Mevcut konumu al (GPS)
  Future<void> _getCurrentLocation() async {
    setState(() => _isLoadingCurrentLocation = true);

    try {
      final position = await LocationService.getCurrentLocation(
        context: context,
        showRationale: false, // Haritada rationale göstermeye gerek yok
      );

      if (position != null && mounted) {
        final location = LatLng(position.latitude, position.longitude);

        setState(() {
          _selectedLocation = location;
          _isLoadingCurrentLocation = false;
        });

        _addMarker(location);
        await _updateAddress(location);

        // Konuma zoom yap
        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(location, 16),
        );
      } else {
        setState(() => _isLoadingCurrentLocation = false);
      }
    } catch (e) {
      Logger.error('Mevcut konum alma hatası: $e');
      if (mounted) {
        setState(() => _isLoadingCurrentLocation = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Konum alınamadı: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Konumu onayla ve geri dön
  void _confirmLocation() {
    if (_selectedLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Lütfen haritadan bir konum seçin'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    Navigator.pop(context, {
      'latitude': _selectedLocation!.latitude,
      'longitude': _selectedLocation!.longitude,
      'address': _selectedAddress,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Konum Seç'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          // Yardım butonu
          IconButton(
            icon: Icon(Icons.help_outline),
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.blue),
                      SizedBox(width: 8),
                      Text('Nasıl Kullanılır?'),
                    ],
                  ),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHelpItem('1️⃣', 'Haritada istediğiniz yere dokunun'),
                      _buildHelpItem('2️⃣', 'Kırmızı marker konumunuzu işaretler'),
                      _buildHelpItem('3️⃣', 'Adres otomatik olarak gösterilir'),
                      _buildHelpItem('4️⃣', '"Bu Konumu Kullan" ile onaylayın'),
                      SizedBox(height: 12),
                      Container(
                        padding: EdgeInsets.all(AppTheme.spaceXs),
                        decoration: BoxDecoration(
                          color: Colors.blue[50],
                          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.my_location, size: 16, color: Colors.blue),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Sağ alttaki butona basarak mevcut konumunuzu kullanabilirsiniz',
                                style: TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: Text('ANLADIM'),
                    ),
                  ],
                ),
              );
            },
            tooltip: 'Yardım',
          ),
        ],
      ),
      body: Stack(
        children: [
          // Google Maps
          GoogleMap(
            onMapCreated: _onMapCreated,
            style: Theme.of(context).brightness == Brightness.dark ? _darkMapStyle : null,
            initialCameraPosition: CameraPosition(
              target: widget.initialLatitude != null && widget.initialLongitude != null
                  ? LatLng(widget.initialLatitude!, widget.initialLongitude!)
                  : _defaultLocation,
              zoom: 12,
            ),
            onTap: _onMapTap,
            markers: _markers,
            myLocationEnabled: true,
            myLocationButtonEnabled: false, // Kendi butonumuzu kullanacağız
            zoomControlsEnabled: true,
            mapToolbarEnabled: false,
            compassEnabled: true,
            mapType: MapType.normal,
          ),

          // Adres önizleme kartı (üstte)
          if (_selectedLocation != null)
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: _buildAddressPreview(),
            ),

          // Mevcut konum butonu (sağ altta)
          Positioned(
            bottom: 100,
            right: 16,
            child: FloatingActionButton(
              heroTag: 'current_location',
              onPressed: _isLoadingCurrentLocation ? null : _getCurrentLocation,
              backgroundColor: Colors.white,
              child: _isLoadingCurrentLocation
                  ? SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(AppTheme.primaryColor),
                      ),
                    )
                  : Icon(
                      Icons.my_location,
                      color: AppTheme.primaryColor,
                    ),
              tooltip: 'Mevcut Konumum',
            ),
          ),

          // Onay butonu (altta)
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: _buildConfirmButton(),
          ),
        ],
      ),
    );
  }

  /// Adres önizleme kartı
  Widget _buildAddressPreview() {
    return Container(
      padding: EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                Icons.location_on,
                color: AppTheme.primaryColor,
                size: 20,
              ),
              SizedBox(width: 8),
              Text(
                'Seçilen Konum',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          if (_isLoadingAddress)
            Row(
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 8),
                Text(
                  'Adres yükleniyor...',
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
              ],
            )
          else
            Text(
              _selectedAddress ?? 'Adres bulunamadı',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[700],
                height: 1.4,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          SizedBox(height: 6),
          Text(
            '${_selectedLocation!.latitude.toStringAsFixed(6)}, ${_selectedLocation!.longitude.toStringAsFixed(6)}',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey[500],
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: -0.2, end: 0);
  }

  /// Onay butonu
  Widget _buildConfirmButton() {
    final isDisabled = _selectedLocation == null || _isLoadingAddress;

    return ElevatedButton.icon(
      onPressed: isDisabled ? null : _confirmLocation,
      icon: Icon(Icons.check_circle),
      label: Text(
        'Bu Konumu Kullan',
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        disabledBackgroundColor: Colors.grey[300],
        disabledForegroundColor: Colors.grey[500],
        padding: EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
        elevation: 6,
      ),
    )
        .animate(
          onPlay: (controller) => controller.repeat(),
        )
        .shimmer(
          duration: 2000.ms,
          color: Colors.white.withValues(alpha: 0.3),
        );
  }

  /// Yardım item'ı
  Widget _buildHelpItem(String emoji, String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: AppTheme.spaceXs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: TextStyle(fontSize: 16)),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 13, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
