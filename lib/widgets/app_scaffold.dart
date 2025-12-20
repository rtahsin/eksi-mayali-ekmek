import 'package:flutter/material.dart';

/// Uygulama genelinde tutarlı bir Scaffold yapısı oluşturan widget
class AppScaffold extends StatelessWidget {
  final String title;
  final Widget body;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final bool automaticallyImplyLeading;
  final bool resizeToAvoidBottomInset;
  final PreferredSizeWidget? bottom;

  const AppScaffold({
    Key? key,
    required this.title,
    required this.body,
    this.actions,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.automaticallyImplyLeading = true,
    this.resizeToAvoidBottomInset = true,
    this.bottom,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          title,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: actions,
        automaticallyImplyLeading: automaticallyImplyLeading,
        bottom: bottom,
      ),
      body: body,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
    );
  }
}
