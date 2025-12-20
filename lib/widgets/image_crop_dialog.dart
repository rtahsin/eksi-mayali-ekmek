// ignore_for_file: unused_field, unused_element, unused_local_variable

import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:crop_image/crop_image.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;

/// Modern görsel kırpma dialog widget'ı
/// Aspect ratio seçenekleri, zoom, döndürme ve önizleme ile
class ImageCropDialog extends StatefulWidget {
  final Uint8List imageBytes;
  final String? aspectRatioLabel;
  final double? initialAspectRatio;

  const ImageCropDialog({
    super.key,
    required this.imageBytes,
    this.aspectRatioLabel,
    this.initialAspectRatio,
  });

  @override
  State<ImageCropDialog> createState() => _ImageCropDialogState();
}

class _ImageCropDialogState extends State<ImageCropDialog> {
  late CropController _cropController;
  late img.Image _originalImage;
  bool _isProcessing = false;
  String _selectedRatio = 'Serbest';

  final Map<String, double?> _aspectRatios = {
    'Serbest': null,
    'Kare (1:1)': 1.0,
    'Ürün Kartı (3:4)': 3 / 4,
    'Yatay (16:9)': 16 / 9,
    'Blog (4:3)': 4 / 3,
    'Kategori (5:3)': 5 / 3,
  };

  @override
  void initState() {
    super.initState();
    _originalImage = img.decodeImage(widget.imageBytes)!;

    // Başlangıç aspect ratio'sunu ayarla
    if (widget.initialAspectRatio != null) {
      _selectedRatio = _aspectRatios.entries
          .firstWhere(
            (entry) => entry.value == widget.initialAspectRatio,
            orElse: () => _aspectRatios.entries.first,
          )
          .key;
    } else if (widget.aspectRatioLabel != null) {
      _selectedRatio = widget.aspectRatioLabel!;
    }

    _cropController = CropController(
      aspectRatio: _aspectRatios[_selectedRatio],
      defaultCrop: const Rect.fromLTRB(0.1, 0.1, 0.9, 0.9),
    );
  }

  @override
  void dispose() {
    _cropController.dispose();
    super.dispose();
  }

  Future<Uint8List?> _cropImage() async {
    setState(() => _isProcessing = true);

    try {
      // Kırpılmış bitmap al
      final bitmap = await _cropController.croppedBitmap();

      // ByteData'dan Uint8List'e çevir
      final byteData = await bitmap.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) return null;

      final pngBytes = byteData.buffer.asUint8List();

      // PNG'yi decode et ve JPEG'e çevir (daha küçük dosya)
      final decodedImage = img.decodeImage(pngBytes);
      if (decodedImage == null) return null;

      final jpegBytes = img.encodeJpg(decodedImage, quality: 90);

      return Uint8List.fromList(jpegBytes);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Görsel kırpma hatası: $e')),
        );
      }
      return null;
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  void _changeAspectRatio(String ratio) {
    setState(() {
      _selectedRatio = ratio;
      _cropController.aspectRatio = _aspectRatios[ratio];
      _cropController.crop = const Rect.fromLTRB(0.1, 0.1, 0.9, 0.9);
    });
  }

  void _rotate() {
    // CropRotation enum değerlerini kullan
    final rotations = [CropRotation.up, CropRotation.right, CropRotation.down, CropRotation.left];
    final currentIndex = rotations.indexOf(_cropController.rotation);
    final nextIndex = (currentIndex + 1) % rotations.length;
    _cropController.rotation = rotations[nextIndex];
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 600;

    return Dialog(
      backgroundColor: Colors.black87,
      insetPadding: EdgeInsets.all(isMobile ? 16 : 64),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: isMobile ? size.width * 0.9 : 800,
          maxHeight: size.height * 0.8,
        ),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade900,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(8),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.crop, color: Colors.white),
                  const SizedBox(width: 12),
                  const Text(
                    'Görseli Düzenle',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // Crop area
            Expanded(
              child: Container(
                color: Colors.black,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: CropImage(
                      controller: _cropController,
                      image: Image.memory(widget.imageBytes),
                      paddingSize: 20.0,
                      alwaysMove: true,
                      gridCornerSize: 30,
                      gridThinWidth: 2,
                      gridThickWidth: 4,
                      gridColor: Colors.white70,
                      minimumImageSize: 100,
                    ),
                  ),
                ),
              ),
            ),

            // Controls
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade900,
              ),
              child: Column(
                children: [
                  // Aspect ratio seçenekleri
                  if (!isMobile)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.center,
                      children: _aspectRatios.keys.map((ratio) {
                        final isSelected = ratio == _selectedRatio;
                        return InkWell(
                          onTap: () => _changeAspectRatio(ratio),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.blue : Colors.grey.shade800,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected ? Colors.blue.shade300 : Colors.transparent,
                              ),
                            ),
                            child: Text(
                              ratio,
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    )
                  else
                    // Mobil için dropdown
                    DropdownButton<String>(
                      value: _selectedRatio,
                      dropdownColor: Colors.grey.shade800,
                      style: const TextStyle(color: Colors.white),
                      underline: Container(),
                      items: _aspectRatios.keys.map((ratio) {
                        return DropdownMenuItem(
                          value: ratio,
                          child: Text(ratio),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) _changeAspectRatio(value);
                      },
                    ),

                  const SizedBox(height: 16),

                  // Action buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Döndür butonu
                      IconButton(
                        onPressed: _rotate,
                        icon: const Icon(Icons.rotate_90_degrees_ccw),
                        color: Colors.white,
                        tooltip: 'Döndür',
                        iconSize: 28,
                      ),
                      const SizedBox(width: 16),

                      // İptal butonu
                      OutlinedButton.icon(
                        onPressed: _isProcessing ? null : () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.cancel_outlined),
                        label: const Text('İptal'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white70,
                          side: const BorderSide(color: Colors.white38),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 12,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Uygula butonu
                      ElevatedButton.icon(
                        onPressed: _isProcessing
                            ? null
                            : () async {
                                final croppedBytes = await _cropImage();
                                if (croppedBytes != null && mounted) {
                                  Navigator.of(context).pop(croppedBytes);
                                }
                              },
                        icon: _isProcessing
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Icon(Icons.check),
                        label: Text(_isProcessing ? 'İşleniyor...' : 'Uygula'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 32,
                            vertical: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
