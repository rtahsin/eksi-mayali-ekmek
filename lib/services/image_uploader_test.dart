// ignore_for_file: avoid_print

import 'image_service.dart';

void main() async {
  // Ürün görselleri
  final productUrls = {
    'ekmek':
        'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Ekşi mayalı ekmek
    'kahve':
        'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Filtre kahve
    'pasta':
        'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Çikolatalı pasta
    'limonata':
        'https://images.pexels.com/photos/2109099/pexels-photo-2109099.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Ev yapımı limonata
    'kurabiye':
        'https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Çikolatalı kurabiye
    'poğaça':
        'https://images.pexels.com/photos/267308/pexels-photo-267308.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Zeytinli poğaça
    'simit':
        'https://images.pexels.com/photos/13271982/pexels-photo-13271982.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Simit
    'çavdar':
        'https://images.pexels.com/photos/1586947/pexels-photo-1586947.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Çavdarlı ekmek
    'zeytinli':
        'https://images.pexels.com/photos/461060/pexels-photo-461060.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Zeytinli ekmek
    'cevizli':
        'https://images.pexels.com/photos/209206/pexels-photo-209206.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Cevizli ekmek
    'sucuk':
        'https://images.pexels.com/photos/9287040/pexels-photo-9287040.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Sucuk
    'peynir':
        'https://images.pexels.com/photos/821365/pexels-photo-821365.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Peynir
    'bal':
        'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Bal
    'kaşar':
        'https://images.pexels.com/photos/4109943/pexels-photo-4109943.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Kaşar
    'croissant':
        'https://images.pexels.com/photos/3892469/pexels-photo-3892469.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Croissant
    'tahinli':
        'https://images.pexels.com/photos/267308/pexels-photo-267308.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Tahinli çörek
  };

  // Kategori görselleri
  final categoryUrls = {
    'Ekmek Çeşitleri':
        'https://images.pexels.com/photos/1070946/pexels-photo-1070946.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Ekmek vitrini
    'Kahvaltılık':
        'https://images.pexels.com/photos/5589033/pexels-photo-5589033.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Kahvaltı masası
    'Tatlılar':
        'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Pasta vitrini
    'İçecekler':
        'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Kahve
    'Şarküteri':
        'https://images.pexels.com/photos/6941026/pexels-photo-6941026.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Şarküteri vitrini
  };

  // Ürün görsellerini yükle
  for (var entry in productUrls.entries) {
    final url = await ImageService.uploadImageFromUrl(entry.value, name: entry.key);
    if (url != null) {
      print('${entry.key}: $url');
    } else {
      print('${entry.key} yüklenemedi');
    }
  }

  // Kategori görsellerini yükle
  for (var entry in categoryUrls.entries) {
    final url = await ImageService.uploadImageFromUrl(entry.value, name: entry.key.toLowerCase());
    if (url != null) {
      print('${entry.key}: $url');
    } else {
      print('${entry.key} yüklenemedi');
    }
  }
}
