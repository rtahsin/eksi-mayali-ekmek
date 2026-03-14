// ignore_for_file: prefer_const_constructors

/*
 * Excel Export Helper
 * 
 * PURPOSE: Export data (orders, products, etc.) to Excel files
 * LAYER: Utils
 * DEPENDS ON: excel, models, intl
 * 
 * RULES:
 * - Web: Use web file download for browser
 * - Mobile: Use file picker for save location
 * - Türkçe column headers
 * - Proper date formatting
 * 
 * LAST UPDATED: 2025-01-27
 */

import 'package:excel/excel.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';

import '../models/order.dart';
import '../models/product.dart';
import '../utils/logger.dart';

class ExcelExportHelper {
  static final ExcelExportHelper _instance = ExcelExportHelper._internal();
  factory ExcelExportHelper() => _instance;
  ExcelExportHelper._internal();

  static ExcelExportHelper get instance => _instance;

  /// Export orders to Excel file
  Future<Uint8List?> exportOrdersToExcel(List<Order> orders) async {
    try {
      Logger.info('Excel export başlatılıyor: ${orders.length} sipariş');

      var excel = Excel.createExcel();
      Sheet sheet = excel['Siparişler'];

      // Header row (bold and colored)
      final headers = [
        'Sipariş No',
        'Müşteri Adı',
        'Telefon',
        'Email',
        'Tarih',
        'Durum',
        'Teslimat Türü',
        'Toplam Tutar',
        'Ödeme Yöntemi',
        'Adres',
        'Ürünler',
        'Not'
      ];

      for (var i = 0; i < headers.length; i++) {
        var cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: i, rowIndex: 0));
        cell.value = TextCellValue(headers[i]);
        cell.cellStyle = CellStyle(
          bold: true,
          backgroundColorHex: ExcelColor.fromHexString('#8B4513'), // EkmekLab brown
          fontColorHex: ExcelColor.white,
        );
      }

      // Data rows
      for (var i = 0; i < orders.length; i++) {
        final order = orders[i];
        final rowIndex = i + 1;

        // Format date
        final dateStr =
            order.orderDate != null ? DateFormat('dd.MM.yyyy HH:mm').format(order.orderDate) : '-';

        // Format status
        final statusMap = {
          'pending': 'Bekliyor',
          'processing': 'Hazırlanıyor',
          'ready': 'Hazır',
          'delivered': 'Teslim Edildi',
          'cancelled': 'İptal',
        };
        final status = order.orderStatus != null
            ? statusMap[order.orderStatus.toString().split('.').last] ??
                order.orderStatus.toString()
            : 'Bekliyor';

        // Format delivery type (not in Order model, use payment method as fallback)
        final deliveryType = order.paymentMethod ?? 'Elden Teslim';

        // Format address
        final address = order.shippingAddress ?? '-';

        // Format products
        final products = order.items.map((item) => '${item.name} (${item.quantity}x)').join(', ');

        // Row data
        final rowData = [
          order.id ?? 'N/A',
          order.customerName ?? '-',
          order.customerPhone ?? '-',
          order.customerEmail ?? '-',
          dateStr,
          status,
          deliveryType,
          '${order.amount?.toStringAsFixed(2) ?? '0'} ₺',
          order.paymentMethod ?? '-',
          address,
          products,
          order.notes ?? '-',
        ];

        for (var j = 0; j < rowData.length; j++) {
          var cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: j, rowIndex: rowIndex));
          cell.value = TextCellValue(rowData[j]);

          // Alternate row colors
          if (i % 2 == 0) {
            cell.cellStyle = CellStyle(
              backgroundColorHex: ExcelColor.fromHexString('#F5F5F5'),
            );
          }
        }
      }

      // Auto-fit columns (approximate)
      for (var i = 0; i < headers.length; i++) {
        sheet.setColumnWidth(i, 20.0);
      }

      // Save and return bytes
      var fileBytes = excel.save();
      if (fileBytes != null) {
        Logger.info('Excel export başarılı: ${fileBytes.length} bytes');
        return Uint8List.fromList(fileBytes);
      } else {
        Logger.error('Excel save failed: fileBytes is null');
        return null;
      }
    } catch (e) {
      Logger.error('Excel export hatası: $e');
      return null;
    }
  }

  /// Export products to Excel file
  Future<Uint8List?> exportProductsToExcel(List<Product> products) async {
    try {
      Logger.info('Excel export başlatılıyor: ${products.length} ürün');

      var excel = Excel.createExcel();
      Sheet sheet = excel['Ürünler'];

      // Header row
      final headers = [
        'Ürün ID',
        'Ürün Adı',
        'Kategori',
        'Fiyat',
        'İndirimli Fiyat',
        'Stok',
        'Durum',
        'Açıklama',
        'İçerik',
        'Ağırlık',
        'Raf Ömrü',
      ];

      for (var i = 0; i < headers.length; i++) {
        var cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: i, rowIndex: 0));
        cell.value = TextCellValue(headers[i]);
        cell.cellStyle = CellStyle(
          bold: true,
          backgroundColorHex: ExcelColor.fromHexString('#8B4513'),
          fontColorHex: ExcelColor.white,
        );
      }

      // Data rows
      for (var i = 0; i < products.length; i++) {
        final product = products[i];
        final rowIndex = i + 1;

        final rowData = [
          product.id ?? 'N/A',
          product.name ?? '-',
          product.category ?? '-',
          '${product.price.toStringAsFixed(2)} ₺',
          product.discountPercentage > 0 ? '${product.discountedPrice.toStringAsFixed(2)} ₺' : '-',
          '${product.stock}',
          product.isActive == true ? 'Aktif' : 'Pasif',
          product.description ?? '-',
          product.ingredients.isNotEmpty ? product.ingredients.join(', ') : '-',
          '${product.weight} ${product.weightUnit}',
          product.storageInstructions ?? '-',
        ];

        for (var j = 0; j < rowData.length; j++) {
          var cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: j, rowIndex: rowIndex));
          cell.value = TextCellValue(rowData[j]);

          if (i % 2 == 0) {
            cell.cellStyle = CellStyle(
              backgroundColorHex: ExcelColor.fromHexString('#F5F5F5'),
            );
          }
        }
      }

      // Auto-fit columns
      for (var i = 0; i < headers.length; i++) {
        sheet.setColumnWidth(i, 20.0);
      }

      var fileBytes = excel.save();
      if (fileBytes != null) {
        Logger.info('Excel export başarılı: ${fileBytes.length} bytes');
        return Uint8List.fromList(fileBytes);
      } else {
        Logger.error('Excel save failed: fileBytes is null');
        return null;
      }
    } catch (e) {
      Logger.error('Excel export hatası: $e');
      return null;
    }
  }
}
