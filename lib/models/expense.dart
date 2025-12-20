// ignore_for_file: prefer_const_constructors

/*
 * Gider Modeli
 * 
 * PURPOSE: Hammadde ve diğer gider kayıtları için model
 * LAYER: Model
 * 
 * LAST UPDATED: 2025-12-12
 */

class Expense {
  final String id;
  final String category; // hammadde, enerji, kira, maaş, vs
  final String name; // Un, Maya, Elektrik faturası, vs
  final double amount; // Tutar
  final String paymentMethod; // nakit, kart, havale
  final DateTime expenseDate;
  final String? supplier; // Tedarikçi
  final String? invoiceNumber; // Fatura no
  final String? notes;
  final DateTime createdAt;

  Expense({
    required this.id,
    required this.category,
    required this.name,
    required this.amount,
    required this.paymentMethod,
    required this.expenseDate,
    this.supplier,
    this.invoiceNumber,
    this.notes,
    required this.createdAt,
  });

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: json['id'] as String,
      category: json['category'] as String,
      name: json['name'] as String,
      amount: (json['amount'] as num).toDouble(),
      paymentMethod: json['paymentMethod'] as String,
      expenseDate: DateTime.parse(json['expenseDate'] as String),
      supplier: json['supplier'] as String?,
      invoiceNumber: json['invoiceNumber'] as String?,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'category': category,
      'name': name,
      'amount': amount,
      'paymentMethod': paymentMethod,
      'expenseDate': expenseDate.toIso8601String(),
      'supplier': supplier,
      'invoiceNumber': invoiceNumber,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
