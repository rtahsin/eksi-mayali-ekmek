/// Mobil platformlar için placeholder - Excel indirme desteklenmiyor
void downloadFile(List<int> bytes, String filename) {
  // Mobil platformda Excel indirme desteklenmiyor
  // Bu fonksiyon asla çağrılmamalı çünkü UI'da kIsWeb check var
  throw UnsupportedError('Excel indirme sadece web platformunda destekleniyor');
}
