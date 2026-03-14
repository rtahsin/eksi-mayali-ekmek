// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:convert' show base64Encode;
import 'dart:html' show AnchorElement;

/// Web platformu için Excel dosyası indirme
void downloadFile(List<int> bytes, String filename) {
  AnchorElement(
    href:
        'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Encode(bytes)}',
  )
    ..setAttribute('download', filename)
    ..click();
}
