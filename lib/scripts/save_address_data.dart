// ignore_for_file: avoid_print

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/widgets.dart';

import '../core/di/service_locator.dart';
import '../services/address_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  ServiceLocator.setup();
  await ServiceLocator.initialize();

  final addressService = ServiceLocator.getIt<AddressService>();

  try {
    print('Beylikdüzü mahalle ve sokak verilerini Firestore\'a yükleme başladı...');
    await addressService.addSampleAddressData();
    print('Adres verileri başarıyla yüklendi!');
  } catch (e) {
    print('Hata oluştu: $e');
  }
}
