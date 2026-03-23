import 'dart:convert' show base64Encode;
import 'package:web/web.dart' as web;

/// Web platformu için Excel dosyası indirme
void downloadFile(List<int> bytes, String filename) {
  final anchor = web.HTMLAnchorElement()
    ..href =
        'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Encode(bytes)}'
    ..download = filename;

  anchor.click();
}
