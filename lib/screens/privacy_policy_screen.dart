import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  static const routeName = '/gizlilik-politikasi';

  const PrivacyPolicyScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gizlilik Politikası'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'KVKK Aydınlatma Metni',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text(
              'Ekşi Mayalı Ekmek olarak kişisel verilerinizin güvenliği hakkında '
              'bilgilendirmek isteriz. Bu nedenle işbu Gizlilik Politikasını '
              'hazırladık.',
              style: TextStyle(fontSize: 16),
            ),
            _buildSectionTitle('Kişisel Verilerin İşlenme Amacı'),
            _buildBulletPoint('Sipariş teslimatı gerçekleştirmek'),
            _buildBulletPoint('Ürün ve hizmetlerimizi iyileştirmek'),
            _buildBulletPoint('Müşteri hizmetleri sunmak'),
            _buildSectionTitle('Toplanan Kişisel Veriler'),
            _buildBulletPoint('İsim, soyisim, e-posta'),
            _buildBulletPoint('Teslimat adresi ve telefon numarası'),
            _buildBulletPoint('Ödeme bilgileriniz (güvenli şekilde saklanır)'),
            _buildSectionTitle('Kişisel Verilerin Saklanma Süresi'),
            const Text(
              'Kişisel verileriniz, işlenme amaçlarının gerektirdiği süreler '
              'boyunca saklanmaktadır. Saklama süresi sona eren kişisel veriler '
              'silinir, yok edilir veya anonim hale getirilir.',
              style: TextStyle(fontSize: 14),
            ),
            _buildSectionTitle('Haklarınız (KVKK Madde 11)'),
            _buildBulletPoint(
                'Kişisel verilerinizin işlenip işlenmediğini öğrenme'),
            _buildBulletPoint(
                'Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme'),
            _buildBulletPoint('Kişisel verilerinizin işlenme amacını öğrenme'),
            _buildBulletPoint(
                'Kişisel verilerinizin yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme'),
            _buildBulletPoint(
                'Eksik veya yanlış işlenen kişisel verilerinizin düzeltilmesini isteme'),
            _buildBulletPoint(
                'Kişisel verilerinizin silinmesini veya yok edilmesini isteme'),
            const SizedBox(height: 32),
            _buildSectionTitle('İletişim'),
            const Text(
              'Kişisel verilerinizle ilgili talepleriniz için aşağıdaki adres '
              'üzerinden bize ulaşabilirsiniz:',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 8),
            const Text(
              'E-posta: kvkk@eksimayaliekmek.com',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                // Veri talep formu veya izin yönetimi sayfasına gitme
                Navigator.of(context).pushNamed('/privacy-settings');
              },
              child: const Text('Veri Talebi Oluştur'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}
