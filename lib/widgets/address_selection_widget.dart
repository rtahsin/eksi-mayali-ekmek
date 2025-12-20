import 'package:flutter/material.dart';

import '../core/di/service_locator.dart';
import '../services/address_service.dart';
import '../utils/logger.dart';

class AddressSelectionWidget extends StatefulWidget {
  final Function(String) onAddressSelected;
  final String? initialAddress;

  const AddressSelectionWidget({
    Key? key,
    required this.onAddressSelected,
    this.initialAddress,
  }) : super(key: key);

  @override
  _AddressSelectionWidgetState createState() => _AddressSelectionWidgetState();
}

class _AddressSelectionWidgetState extends State<AddressSelectionWidget> {
  final AddressService _addressService = ServiceLocator.getIt<AddressService>();

  List<String> _neighborhoods = [];
  List<String> _streets = [];

  String? _selectedNeighborhood;
  String? _selectedStreet;

  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNeighborhoods();

    // Eğer başlangıç adresi varsa, parsing işlemi yapabilirsiniz
    if (widget.initialAddress != null && widget.initialAddress!.isNotEmpty) {
      _parseInitialAddress(widget.initialAddress!);
    }
  }

  void _parseInitialAddress(String address) {
    try {
      final parts = address.split(',');
      if (parts.length >= 4) {
        // Format: "İstanbul, Beylikdüzü, Adnan Kahveci Mah., Gardenya Sokak"
        final neighborhood = parts[2].trim();
        final street = parts[3].trim();

        setState(() {
          _selectedNeighborhood = neighborhood;
          _selectedStreet = street;
        });

        // Sokakları yükle
        if (_selectedNeighborhood != null) {
          _loadStreets(_selectedNeighborhood!);
        }
      }
    } catch (e) {
      Logger.error('Adres ayrıştırma hatası: $e');
    }
  }

  Future<void> _loadNeighborhoods() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final neighborhoods = await _addressService.getNeighborhoods();
      setState(() {
        _neighborhoods = neighborhoods;
        _isLoading = false;
      });

      // Eğer mahalle seçiliyse ve sokaklar yüklenmemişse, sokakları yükle
      if (_selectedNeighborhood != null && _streets.isEmpty) {
        _loadStreets(_selectedNeighborhood!);
      }
    } catch (e) {
      Logger.error('Mahalleler yüklenirken hata: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadStreets(String neighborhood) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final streets = await _addressService.getStreets(neighborhood);
      setState(() {
        _streets = streets;
        _isLoading = false;
      });
    } catch (e) {
      Logger.error('Sokaklar yüklenirken hata: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _updateAddress() {
    if (_selectedNeighborhood != null && _selectedStreet != null) {
      final address =
          'İstanbul, Beylikdüzü, $_selectedNeighborhood, $_selectedStreet';
      widget.onAddressSelected(address);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Sabit il ve ilçe bilgileri
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
          child: Text(
            'İl: İstanbul',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(height: 4),
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
          child: Text(
            'İlçe: Beylikdüzü',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(height: 16),

        // Mahalle seçimi
        DropdownButtonFormField<String>(
          value: _selectedNeighborhood,
          decoration: const InputDecoration(
            labelText: 'Mahalle',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
          isExpanded: true,
          hint: const Text('Mahalle seçiniz'),
          items: _neighborhoods.map((String value) {
            return DropdownMenuItem<String>(
              value: value,
              child: Text(value),
            );
          }).toList(),
          onChanged: _isLoading
              ? null
              : (newValue) {
                  setState(() {
                    _selectedNeighborhood = newValue;
                    _selectedStreet = null;
                    _streets = [];
                  });

                  if (newValue != null) {
                    _loadStreets(newValue);
                  }
                },
        ),
        const SizedBox(height: 16),

        // Sokak seçimi
        DropdownButtonFormField<String>(
          value: _selectedStreet,
          decoration: const InputDecoration(
            labelText: 'Sokak',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
          isExpanded: true,
          hint: const Text('Sokak seçiniz'),
          items: _streets.map((String value) {
            return DropdownMenuItem<String>(
              value: value,
              child: Text(value),
            );
          }).toList(),
          onChanged: _isLoading || _streets.isEmpty
              ? null
              : (newValue) {
                  setState(() {
                    _selectedStreet = newValue;
                  });
                  if (newValue != null) {
                    _updateAddress();
                  }
                },
        ),

        if (_isLoading) ...[
          const SizedBox(height: 16),
          const Center(
            child: CircularProgressIndicator(),
          ),
        ],
      ],
    );
  }
}
