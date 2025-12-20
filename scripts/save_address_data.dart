// ignore_for_file: avoid_print

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  final firestore = FirebaseFirestore.instance;

  try {
    print('Beylikdüzü mahalle ve sokak verilerini Firestore\'a yükleme başladı...');

    final neighborhoods = {
      'Adnan Kahveci Mah.': ['Anadolu Caddesi', '1. Sokak', '2. Sokak', 'Gardenya Sokak'],
      'Barış Mah.': ['Barış Caddesi', 'Huzur Sokak', 'Dostluk Sokak', 'Egemenlik Sokak'],
      'Büyükşehir Mah.': ['Büyükşehir Bulvarı', 'Metropol Sokak', 'Şehir Caddesi'],
      'Cumhuriyet Mah.': ['Atatürk Caddesi', 'İnönü Sokak', 'Cumhuriyet Bulvarı'],
      'Dereağzı Mah.': ['Dereağzı Caddesi', 'Marmara Sokak', 'Deniz Sokak'],
      'Gürpınar Mah.': ['Gürpınar Caddesi', 'Sahil Yolu', 'Balıkçı Sokak'],
      'Yakuplu Mah.': ['Yakuplu Caddesi', 'Hürriyet Sokak', 'Vatan Caddesi'],
      'Marmara Mah.': ['Marmara Caddesi', 'Deniz Sokak', 'Sahil Sokak'],
    };

    for (var entry in neighborhoods.entries) {
      await firestore.collection('neighborhoods').doc(entry.key).set({
        'streets': entry.value,
      });
      print('${entry.key} eklendi');
    }

    print('Adres verileri başarıyla yüklendi!');
  } catch (e) {
    print('Hata oluştu: $e');
  }
}
