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

import 'dart:js' as js;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  final TextEditingController _searchController = TextEditingController();
  List<SavedAddress> _addresses = [];
  List<SavedAddress> _filteredAddresses = [];
  bool _isLoading = true;
  String? _userId;

  // Address categories
  static const Map<String, Map<String, dynamic>> _categories = {
    'home': {'icon': '🏠', 'color': '#4CAF50', 'label': 'Ev'},
    'work': {'icon': '🏢', 'color': '#2196F3', 'label': 'İş'},
    'family': {'icon': '❤️', 'color': '#E91E63', 'label': 'Aile'},
    'friend': {'icon': '👥', 'color': '#FF9800', 'label': 'Arkadaş'},
    'other': {'icon': '📍', 'color': '#9E9E9E', 'label': 'Diğer'},
  };

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_filterAddresses);
    _loadAddresses();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterAddresses() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredAddresses = _addresses;
      } else {
        _filteredAddresses = _addresses.where((address) {
          return address.title.toLowerCase().contains(query) ||
              address.fullAddress.toLowerCase().contains(query);
        }).toList();
      }
    });
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
          _filteredAddresses = addresses;
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

  Widget _buildRecentAddressesSection() {
    // Get last 3 used addresses
    final recentAddresses = _addresses
        .where((a) => a.lastUsed != null)
        .toList()
      ..sort((a, b) => b.lastUsed!.compareTo(a.lastUsed!));
    
    final displayAddresses = recentAddresses.take(3).toList();
    
    if (displayAddresses.isEmpty) {
      return SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Row(
            children: [
              Icon(Icons.history, size: 18, color: Colors.grey[600]),
              SizedBox(width: 8),
              Text(
                'Son Kullanılanlar',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 90,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.symmetric(horizontal: 12),
            itemCount: displayAddresses.length,
            itemBuilder: (ctx, idx) {
              final address = displayAddresses[idx];
              final categoryData = address.category != null
                  ? _categories[address.category]
                  : null;
              final iconText = address.icon ?? categoryData?['icon'] ?? '📍';
              final colorHex = address.color ?? categoryData?['color'] ?? '#9E9E9E';
              final cardColor = Color(int.parse(colorHex.replaceFirst('#', '0xFF')));

              return GestureDetector(
                onTap: () async {
                  try {
                    await _addressService.updateSavedAddress(
                      address.copyWith(lastUsed: DateTime.now()),
                    );
                  } catch (e) {
                    Logger.error('lastUsed güncelleme hatası: $e');
                  }
                  
                  widget.onAddressSelected(address);
                  Navigator.pop(context);
                },
                child: Container(
                  width: 140,
                  margin: EdgeInsets.symmetric(horizontal: 4),
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: cardColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: cardColor.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        iconText,
                        style: TextStyle(fontSize: 24),
                      ),
                      SizedBox(height: 8),
                      Text(
                        address.title,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[800],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                      SizedBox(height: 4),
                      Text(
                        address.fullAddress,
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey[600],
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ).animate().fadeIn(duration: 300.ms, delay: (idx * 100).ms);
            },
          ),
        ),
        SizedBox(height: 8),
      ],
    );
  }

  Future<void> _setAsDefault(SavedAddress address) async {
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

  void _shareAddress(SavedAddress address) {
    final shareText = '''
${address.title}
📍 ${address.fullAddress}

🗺️ Harita: https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}
    '''.trim();

    // Web için basit çözüm - share API kullan
    if (kIsWeb) {
      // Web Share API (destekliyorsa)
      js.context.callMethod('eval', ['''
        if (navigator.share) {
          navigator.share({
            title: "${address.title}",
            text: "$shareText",
          }).catch((error) => console.log('Share failed:', error));
        } else {
          // Fallback: Metni kopyala
          navigator.clipboard.writeText("$shareText").then(() => {
            alert('Adres panoya kopyalandı!');
          });
        }
      ''']);
    } else {
      // Mobil için Share paketi kullanılabilir (şimdilik clipboard)
      Clipboard.setData(ClipboardData(text: shareText));
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Adres panoya kopyalandı!'),
          backgroundColor: Colors.blue,
          action: SnackBarAction(
            label: 'TAMAM',
            textColor: Colors.white,
            onPressed: () {},
          ),
        ),
      );
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

      // Kategori ve başlık seç
      String? selectedCategory;
      final titleController = TextEditingController();
      
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => StatefulBuilder(
          builder: (ctx, setDialogState) => AlertDialog(
            title: Text('Adres Detayları'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Kategori Seçin',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[800],
                    ),
                  ),
                  SizedBox(height: 12),
                  // Category chips
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _categories.entries.map((entry) {
                      final isSelected = selectedCategory == entry.key;
                      return FilterChip(
                        label: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              entry.value['icon'],
                              style: TextStyle(fontSize: 16),
                            ),
                            SizedBox(width: 4),
                            Text(entry.value['label']),
                          ],
                        ),
                        selected: isSelected,
                        onSelected: (selected) {
                          setDialogState(() {
                            selectedCategory = selected ? entry.key : null;
                            if (selected && titleController.text.isEmpty) {
                              titleController.text = entry.value['label'];
                            }
                          });
                        },
                        selectedColor: Color(
                          int.parse(
                            entry.value['color'].replaceFirst('#', '0xFF'),
                          ),
                        ).withValues(alpha: 0.3),
                        checkmarkColor: Color(
                          int.parse(
                            entry.value['color'].replaceFirst('#', '0xFF'),
                          ),
                        ),
                      );
                    }).toList(),
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
                  ),
                ],
              ),
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
        ),
      );

      if (confirmed == true && mounted) {
        try {
          final categoryData = selectedCategory != null
              ? _categories[selectedCategory]
              : null;

          final newAddress = SavedAddress(
            id: '', // Firestore otomatik oluşturacak
            userId: _userId!,
            title: titleController.text.trim(),
            fullAddress: address ?? 'Koordinat: $latitude, $longitude',
            latitude: latitude,
            longitude: longitude,
            isDefault: _addresses.isEmpty, // İlk adres default olsun
            category: selectedCategory,
            icon: categoryData?['icon'],
            color: categoryData?['color'],
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

          // Search bar
          if (!_isLoading && _addresses.isNotEmpty)
            Padding(
              padding: EdgeInsets.all(16),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Adres ara...',
                  prefixIcon: Icon(Icons.search, color: AppTheme.primaryColor),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: Icon(Icons.clear, size: 20),
                          onPressed: () {
                            _searchController.clear();
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
                  ),
                  filled: true,
                  fillColor: Colors.grey[50],
                  contentPadding: EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),

          // Recent addresses section
          if (!_isLoading && _addresses.isNotEmpty && _searchController.text.isEmpty)
            _buildRecentAddressesSection(),

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
              child: _filteredAddresses.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off, size: 64, color: Colors.grey[400]),
                          SizedBox(height: 16),
                          Text(
                            'Adres bulunamadı',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: _filteredAddresses.length,
                      separatorBuilder: (ctx, idx) => SizedBox(height: 12),
                      itemBuilder: (ctx, idx) {
                        final address = _filteredAddresses[idx];
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
    // Category data
    final categoryData = address.category != null
        ? _categories[address.category]
        : null;
    
    final iconText = address.icon ?? categoryData?['icon'] ?? '📍';
    final colorHex = address.color ?? categoryData?['color'] ?? '#9E9E9E';
    final cardColor = Color(int.parse(colorHex.replaceFirst('#', '0xFF')));

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () async {
          // Update lastUsed before selection
          try {
            await _addressService.updateSavedAddress(
              address.copyWith(lastUsed: DateTime.now()),
            );
          } catch (e) {
            Logger.error('lastUsed güncelleme hatası: $e');
          }
          
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
                      color: cardColor.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      iconText,
                      style: TextStyle(fontSize: 20),
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
                    onSelected: (value) async {
                      if (value == 'default') {
                        await _setAsDefault(address);
                      } else if (value == 'share') {
                        _shareAddress(address);
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
                        value: 'share',
                        child: Row(
                          children: [
                            Icon(Icons.share, size: 20, color: Colors.blue),
                            SizedBox(width: 8),
                            Text('Paylaş'),
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
