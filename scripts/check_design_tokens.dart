import 'dart:io';

/// Lightweight design token audit for Flutter UI files.
///
/// Default mode: informational (always exits 0)
/// Strict mode: `--strict` (exits 1 when violations exist)
/// Scoped mode: `--include=<path>` (can be repeated)
///
/// What it flags:
/// - EdgeInsets.*(...) literal spacing values (8/10/12/14/16/20/24/32)
///   unless an AppTheme spacing token is used.
/// - BorderRadius.circular(...) literal radius values
///   unless an AppTheme radius token is used.
void main(List<String> args) {
  final strict = args.contains('--strict');
  final includePaths = args
      .where((a) => a.startsWith('--include='))
      .map((a) => a.substring('--include='.length).replaceAll('\\', '/'))
      .where((p) => p.trim().isNotEmpty)
      .toList();

  final root = Directory('lib');
  if (!root.existsSync()) {
    stderr.writeln('Design token audit skipped: lib/ directory not found.');
    exit(0);
  }

  final files = root
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'))
      .where((f) =>
          !f.path.endsWith('.g.dart') &&
          !f.path.endsWith('.freezed.dart') &&
          !f.path.contains('${Platform.pathSeparator}generated${Platform.pathSeparator}'))
      .where((f) {
        if (includePaths.isEmpty) return true;
        final normalized = f.path.replaceAll('\\', '/');
        return includePaths.any((inc) => normalized.endsWith(inc) || normalized.contains('/$inc'));
      })
      .toList();

  final edgeInsetsLiteral = RegExp(
    r'EdgeInsets\.(all|symmetric|only|fromLTRB)\(([^)]*\b(8|10|12|14|16|20|24|32)(\.0)?\b[^)]*)\)',
  );
  final borderRadiusLiteral = RegExp(
    r'BorderRadius\.circular\((8|10|12|14|16|20|24|32)(\.0)?\)',
  );

  final violations = <String>[];

  for (final file in files) {
    final lines = file.readAsLinesSync();
    for (var i = 0; i < lines.length; i++) {
      final line = lines[i];
      final lineNo = i + 1;

      if (edgeInsetsLiteral.hasMatch(line) && !line.contains('AppTheme.space')) {
        violations.add('${file.path}:$lineNo  EdgeInsets literal -> $line');
      }

      if (borderRadiusLiteral.hasMatch(line) && !line.contains('AppTheme.radius')) {
        violations.add('${file.path}:$lineNo  BorderRadius literal -> $line');
      }
    }
  }

  stdout.writeln('Design token audit scanned ${files.length} Dart files.');
  if (includePaths.isNotEmpty) {
    stdout.writeln('Scope includes: ${includePaths.join(', ')}');
  }

  if (violations.isEmpty) {
    stdout.writeln('✅ No design token literal violations found.');
    exit(0);
  }

  stdout.writeln('⚠️  Found ${violations.length} potential design-token violations:');
  for (final v in violations) {
    stdout.writeln(' - $v');
  }

  stdout.writeln('');
  stdout.writeln('Suggestion: Replace literals with AppTheme.space*/AppTheme.radius* tokens.');
  stdout.writeln('Run strict mode in CI once migration is complete:');
  stdout.writeln('  dart run scripts/check_design_tokens.dart --strict');
  stdout.writeln('Run strict mode for selected files:');
  stdout.writeln('  dart run scripts/check_design_tokens.dart --strict --include=lib/screens/order_screen.dart');

  if (strict) {
    exit(1);
  }

  exit(0);
}
