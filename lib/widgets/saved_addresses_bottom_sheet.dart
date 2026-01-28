// ignore_for_file: prefer_const_constructors, use_build_context_synchronously

/*
 * Saved Addresses Bottom Sheet
 * 
 * PURPOSE: Kullanıcının kayıtlı adreslerini göster ve yönet
 * LAYER: UI Widget
 * DEPENDS ON: AddressService, SavedAddress model
 * 
 * RULES:
 * - List, edit, delete, set default işlemleri
 * - Empty state göster
 * - Yeni adres ekleme ile entegre
 * 
 * LAST UPDATED: 28 Ocak 2026
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../models/saved_address.dart';
import '../services/address_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';
import '../widgets/empty_state.dart';
import 'map_location_picker.dart';

/// Kayıtlı adresler bottom sheet
class SavedAddressesBottomSheet extends StatefulWidget {
  final Function(SavedAddress) onAddressSelected;

  const SavedAddressesBottomSheet({
    Key? key,
    required this.onAddressSelected,
  }) : super(key: key);

  @override
  State<SavedAddressesBottomSheet> createState() =>
      _SavedAddressesBottomSheetState();
}

class _SavedAddressesBottomSheetState
    extends State<SavedAddressesBottomSheet> {
  final AddressService _addressService = AddressService();
  List<SavedAddress> _addresses = [];
  bool _isLoading = true;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() => _isLoading = true);

    try {
      _userId = AuthService.currentUser?.uid;
      if (_userId == null) {
        throw Exception('Kullanıcı oturumu bulunamadı');
      }

      final addresses = await _addressService.getUserSavedAddresses(_userId!);
      
      if (mounted) {
        setState(() {
          _addresses = addresses;
          _isLoading = false;
        });
      }
    } catch (e) {
      Logger.error('Adresler yüklenirken hata: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Adresler yüklenemedi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteAddress(SavedAddress address) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Adresi Sil'),
        content: Text('${address.title} adresini silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('İPTAL'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text('SİL'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _addressService.deleteSavedAddress(address.id);
        await _loadAddresses();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${address.title} silindi'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        Logger.error('Adres silme hatası: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Adres silinemedi: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _setDefaultAddress(SavedAddress address) async {
    try {
      await _addressService.setDefaultAddress(address.id, _userId!);
      await _loadAddresses();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${address.title} varsayılan adres olarak ayarlandı'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      Logger.error('Default adres ayarlama hatası: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _addNewAddress() async {
    // Haritadan konum seç
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (ctx) => MapLocationPicker(),
      ),
    );

    if (result != null) {
      final latitude = result['latitude'] as double;
      final longitude = result['longitude'] as double;
      final address = result['address'] as String?;

      // Başlık gir
      final titleController = TextEditingController();
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Adres Başlığı'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Bu adresi nasıl kaydetmek istersiniz?',
                style: TextStyle(fontSize: 14, color: Colors.grey[700]),
              ),
              SizedBox(height: 16),
              TextField(
                controller: titleController,
                decoration: InputDecoration(
                  labelText: 'Başlık',
                  hintText: 'Örn: Ev, İş, Annem',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.label),
                ),
                autofocus: true,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text('İPTAL'),
            ),
            ElevatedButton(
              onPressed: () {
                if (titleController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(content: Text('Lütfen bir başlık girin')),
                  );
                  return;
                }
                Navigator.pop(ctx, true);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
              child: Text('KAYDET'),
            ),
          ],
        ),
      );

      if (confirmed == true && mounted) {
        try {
          final newAddress = SavedAddress(
            id: '', // Firestore otomatik oluşturacak
            userId: _userId!,
            title: titleController.text.trim(),
            fullAddress: address ?? 'Koordinat: $latitude, $longitude',
            latitude: latitude,
            longitude: longitude,
            isDefault: _addresses.isEmpty, // İlk adres default olsun
            createdAt: DateTime.now(),
          );

          await _addressService.addSavedAddress(newAddress);
          await _loadAddresses();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('${newAddress.title} kaydedildi'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } catch (e) {
          Logger.error('Adres ekleme hatası: $e');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Adres eklenemedi: ${e.toString()}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(
              children: [
                Icon(Icons.bookmark, color: Colors.white),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Kayıtlı Adreslerim',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(Icons.close, color: Colors.white),
                ),
              ],
            ),
          ),

          // Content
          if (_isLoading)
            Expanded(
              child: Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation(AppTheme.primaryColor),
                ),
              ),
            )
          else if (_addresses.isEmpty)
            Expanded(
              child: EmptyState(
                icon: Icons.location_off,
                title: 'Kayıtlı Adres Yok',
                message: 'Henüz kayıtlı adresiniz bulunmuyor.\nİlk adresinizi ekleyin!',
                actionLabel: 'Yeni Adres Ekle',
                onAction: _addNewAddress,
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: EdgeInsets.all(16),
                itemCount: _addresses.length,
                separatorBuilder: (ctx, idx) => SizedBox(height: 12),
                itemBuilder: (ctx, idx) {
                  final address = _addresses[idx];
                  return _buildAddressCard(address);
                },
              ),
            ),

          // Add button (eğer adres varsa)
          if (!_isLoading && _addresses.isNotEmpty)
            Padding(
              padding: EdgeInsets.all(16),
              child: ElevatedButton.icon(
                onPressed: _addNewAddress,
                icon: Icon(Icons.add_location),
                label: Text('Yeni Adres Ekle'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  minimumSize: Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAddressCard(SavedAddress address) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () {
          widget.onAddressSelected(address);
          Navigator.pop(context);
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: address.isDefault
                          ? Colors.green[100]
                          : Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      address.isDefault ? Icons.home : Icons.location_on,
                      color: address.isDefault ? Colors.green : Colors.grey[700],
                      size: 20,
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              address.title,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (address.isDefault) ...[
                              SizedBox(width: 8),
                              Container(
                                padding: EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.green,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Varsayılan',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        SizedBox(height: 4),
                        Text(
                          address.fullAddress,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[700],
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'default') {
                        _setDefaultAddress(address);
                      } else if (value == 'delete') {
                        _deleteAddress(address);
                      }
                    },
                    itemBuilder: (ctx) => [
                      if (!address.isDefault)
                        PopupMenuItem(
                          value: 'default',
                          child: Row(
                            children: [
                              Icon(Icons.star, size: 20, color: Colors.orange),
                              SizedBox(width: 8),
                              Text('Varsayılan Yap'),
                            ],
                          ),
                        ),
                      PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete, size: 20, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Sil'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.2, end: 0);
  }
}
