// ignore_for_file: unused_field, unused_element, unused_local_variable

/*
 * Adres Yönetimi Ekranı (AddressManagementScreen)
 * 
 * Bu dosya, kullanıcının adres bilgilerini görüntüleyebileceği, ekleyebileceği,
 * düzenleyebileceği ve silebileceği bir arayüz sunar.
 * 
 * Özellikler:
 * - Kullanıcının kayıtlı adreslerini listeleme
 * - Yeni adres ekleme
 * - Mevcut adresleri düzenleme
 * - Adres silme
 * - Varsayılan adres seçme
 * 
 * Kullanılan servisler:
 * - AuthService: Kullanıcı oturumu ve adres yönetimi
 * 
 * Bağlantılı ekranlar:
 * - ProfileScreen: Kullanıcı profili
 */

// ignore_for_file: use_build_context_synchronously, library_private_types_in_public_api, prefer_const_constructors, use_super_parameters

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../models/address.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';

class AddressManagementScreen extends StatefulWidget {
  static const routeName = '/address-management';

  const AddressManagementScreen({Key? key}) : super(key: key);

  @override
  _AddressManagementScreenState createState() =>
      _AddressManagementScreenState();
}

class _AddressManagementScreenState extends State<AddressManagementScreen> {
  final _formKey = GlobalKey<FormState>();
  List<Address> _addresses = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  void _loadAddresses() {
    final authService = Provider.of<AuthService>(context, listen: false);
    setState(() {
      _addresses = authService.getUserAddresses();
    });
  }

  Future<void> _addNewAddress() async {
    final result = await showDialog<Address>(
      context: context,
      builder: (ctx) => AddressFormDialog(
        title: 'Yeni Adres Ekle',
        buttonText: 'Ekle',
      ),
    );

    if (result != null) {
      setState(() {
        _isLoading = true;
      });

      try {
        final authService = Provider.of<AuthService>(context, listen: false);
        await authService.addUserAddress(result);

        // Adresleri yeniden yükle
        _loadAddresses();

        Helpers.showSuccessSnackBar('Adres başarıyla eklendi');
      } catch (e) {
        Logger.error('Adres eklenirken hata: $e');
        Helpers.showErrorSnackBar('Adres eklenirken bir hata oluştu');
      } finally {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _editAddress(Address address) async {
    final result = await showDialog<Address>(
      context: context,
      builder: (ctx) => AddressFormDialog(
        title: 'Adresi Düzenle',
        buttonText: 'Güncelle',
        initialAddress: address,
      ),
    );

    if (result != null) {
      setState(() {
        _isLoading = true;
      });

      try {
        final authService = Provider.of<AuthService>(context, listen: false);
        await authService.updateUserAddress(result);

        // Adresleri yeniden yükle
        _loadAddresses();

        Helpers.showSuccessSnackBar('Adres başarıyla güncellendi');
      } catch (e) {
        Logger.error('Adres güncellenirken hata: $e');
        Helpers.showErrorSnackBar('Adres güncellenirken bir hata oluştu');
      } finally {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _deleteAddress(String addressId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Adresi Sil'),
        content: Text('Bu adresi silmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text('Sil'),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() {
        _isLoading = true;
      });

      try {
        final authService = Provider.of<AuthService>(context, listen: false);
        await authService.deleteUserAddress(addressId);

        // Adresleri yeniden yükle
        _loadAddresses();

        Helpers.showSuccessSnackBar('Adres başarıyla silindi');
      } catch (e) {
        Logger.error('Adres silinirken hata: $e');
        Helpers.showErrorSnackBar('Adres silinirken bir hata oluştu');
      } finally {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _setDefaultAddress(String addressId) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      await authService.setDefaultAddress(addressId);

      // Adresleri yeniden yükle
      _loadAddresses();

      Helpers.showSuccessSnackBar('Varsayılan adres güncellendi');
    } catch (e) {
      Logger.error('Varsayılan adres ayarlanırken hata: $e');
      Helpers.showErrorSnackBar(
          'Varsayılan adres ayarlanırken bir hata oluştu');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Adreslerim'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _addresses.isEmpty
              ? _buildEmptyState()
              : _buildAddressList(),
      floatingActionButton: FloatingActionButton(
        onPressed: _addNewAddress,
        backgroundColor: AppTheme.primaryColor,
        child: Icon(Icons.add),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.location_off,
            size: 72,
            color: Colors.grey,
          ),
          SizedBox(height: 16),
          Text(
            'Henüz adres eklemediniz',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Adres eklemek için aşağıdaki + butonuna tıklayın',
            style: TextStyle(
              color: Colors.grey[600],
            ),
          ),
          SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _addNewAddress,
            icon: Icon(Icons.add_location_alt),
            label: Text('Yeni Adres Ekle'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceSm),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressList() {
    return ListView.builder(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      itemCount: _addresses.length,
      itemBuilder: (ctx, index) {
        final address = _addresses[index];
        return Card(
          margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            side: address.isDefault
                ? BorderSide(color: AppTheme.primaryColor, width: 2)
                : BorderSide.none,
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.location_on,
                          color: AppTheme.primaryColor,
                        ),
                        SizedBox(width: 8),
                        Text(
                          address.fullName,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    if (address.isDefault)
                      Chip(
                        label: Text('Varsayılan'),
                        backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                        labelStyle: TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
                Divider(),
                SizedBox(height: 8),
                Text(
                  address.formattedAddress,
                  style: TextStyle(fontSize: 14),
                ),
                SizedBox(height: 8),
                Text(
                  'Telefon: ${address.phoneNumber}',
                  style: TextStyle(fontSize: 14),
                ),
                SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (!address.isDefault)
                      TextButton.icon(
                        onPressed: () => _setDefaultAddress(address.id),
                        icon: Icon(Icons.check_circle_outline),
                        label: Text('Varsayılan Yap'),
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                        ),
                      ),
                    TextButton.icon(
                      onPressed: () => _editAddress(address),
                      icon: Icon(Icons.edit),
                      label: Text('Düzenle'),
                    ),
                    TextButton.icon(
                      onPressed: () => _deleteAddress(address.id),
                      icon: Icon(Icons.delete),
                      label: Text('Sil'),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.red,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class AddressFormDialog extends StatefulWidget {
  final String title;
  final String buttonText;
  final Address? initialAddress;

  const AddressFormDialog({
    Key? key,
    required this.title,
    required this.buttonText,
    this.initialAddress,
  }) : super(key: key);

  @override
  _AddressFormDialogState createState() => _AddressFormDialogState();
}

class _AddressFormDialogState extends State<AddressFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _fullNameController;
  late TextEditingController _phoneController;
  late TextEditingController _addressLine1Controller;
  late TextEditingController _addressLine2Controller;
  late TextEditingController _cityController;
  late TextEditingController _districtController;
  late TextEditingController _postalCodeController;
  bool _isDefault = false;
  String _country = 'Türkiye';

  @override
  void initState() {
    super.initState();
    final address = widget.initialAddress;

    _fullNameController = TextEditingController(text: address?.fullName ?? '');
    _phoneController = TextEditingController(text: address?.phoneNumber ?? '');
    _addressLine1Controller =
        TextEditingController(text: address?.addressLine1 ?? '');
    _addressLine2Controller =
        TextEditingController(text: address?.addressLine2 ?? '');
    _cityController = TextEditingController(text: address?.city ?? '');
    _districtController = TextEditingController(text: address?.district ?? '');
    _postalCodeController =
        TextEditingController(text: address?.postalCode ?? '');
    _isDefault = address?.isDefault ?? false;
    _country = address?.country ?? 'Türkiye';
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _cityController.dispose();
    _districtController.dispose();
    _postalCodeController.dispose();
    super.dispose();
  }

  void _saveForm() {
    if (_formKey.currentState!.validate()) {
      final Address address = Address(
        id: widget.initialAddress?.id ?? Uuid().v4(),
        fullName: _fullNameController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        addressLine1: _addressLine1Controller.text.trim(),
        addressLine2: _addressLine2Controller.text.trim().isEmpty
            ? null
            : _addressLine2Controller.text.trim(),
        city: _cityController.text.trim(),
        district: _districtController.text.trim(),
        postalCode: _postalCodeController.text.trim(),
        country: _country,
        isDefault: _isDefault,
      );

      Navigator.of(context).pop(address);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _fullNameController,
                decoration: InputDecoration(
                  labelText: 'Adres Başlığı',
                  hintText: 'Ev, İş, vb.',
                  prefixIcon: Icon(Icons.title),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Adres başlığı gereklidir';
                  }
                  return null;
                },
              ),
              SizedBox(height: 12),
              TextFormField(
                controller: _phoneController,
                decoration: InputDecoration(
                  labelText: 'Telefon Numarası',
                  hintText: '0555 123 4567',
                  prefixIcon: Icon(Icons.phone),
                ),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Telefon numarası gereklidir';
                  }
                  return null;
                },
              ),
              SizedBox(height: 12),
              TextFormField(
                controller: _addressLine1Controller,
                decoration: InputDecoration(
                  labelText: 'Adres Satırı 1',
                  hintText: 'Sokak, Mahalle, Bina No, Daire No',
                  prefixIcon: Icon(Icons.location_on),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Adres gereklidir';
                  }
                  return null;
                },
              ),
              SizedBox(height: 12),
              TextFormField(
                controller: _addressLine2Controller,
                decoration: InputDecoration(
                  labelText: 'Adres Satırı 2 (İsteğe Bağlı)',
                  hintText: 'Ek açıklamalar',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _districtController,
                      decoration: InputDecoration(
                        labelText: 'İlçe',
                        prefixIcon: Icon(Icons.location_city),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'İlçe gereklidir';
                        }
                        return null;
                      },
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _cityController,
                      decoration: InputDecoration(
                        labelText: 'Şehir',
                        prefixIcon: Icon(Icons.location_city),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Şehir gereklidir';
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              SizedBox(height: 12),
              TextFormField(
                controller: _postalCodeController,
                decoration: InputDecoration(
                  labelText: 'Posta Kodu',
                  prefixIcon: Icon(Icons.markunread_mailbox),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Posta kodu gereklidir';
                  }
                  return null;
                },
              ),
              SizedBox(height: 16),
              CheckboxListTile(
                title: Text('Varsayılan adres olarak ayarla'),
                value: _isDefault,
                onChanged: (value) {
                  setState(() {
                    _isDefault = value ?? false;
                  });
                },
                activeColor: AppTheme.primaryColor,
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text('İptal'),
        ),
        ElevatedButton(
          onPressed: _saveForm,
          child: Text(widget.buttonText),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
          ),
        ),
      ],
    );
  }
}
