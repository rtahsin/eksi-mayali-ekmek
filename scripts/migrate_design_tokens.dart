import 'dart:io';

void main(List<String> args) {
  final rootArg = args.firstWhere(
    (a) => a.startsWith('--root='),
    orElse: () => '--root=lib/admin',
  );
  final rootPath = rootArg.substring('--root='.length).replaceAll('\\', '/');
  final rootDir = Directory(rootPath);

  if (!rootDir.existsSync()) {
    stderr.writeln('Path not found: $rootPath');
    exit(1);
  }

  final spacingMap = <String, String>{
    '0': 'AppTheme.spaceZero',
    '0.0': 'AppTheme.spaceZero',
    '5': 'AppTheme.space5',
    '5.0': 'AppTheme.space5',
    '4': 'AppTheme.spaceXxs',
    '4.0': 'AppTheme.spaceXxs',
    '6': 'AppTheme.space2xs',
    '6.0': 'AppTheme.space2xs',
    '8': 'AppTheme.spaceXs',
    '8.0': 'AppTheme.spaceXs',
    '10': 'AppTheme.spaceSm',
    '10.0': 'AppTheme.spaceSm',
    '12': 'AppTheme.spaceMd',
    '12.0': 'AppTheme.spaceMd',
    '14': 'AppTheme.spaceBase',
    '14.0': 'AppTheme.spaceBase',
    '16': 'AppTheme.spaceLg',
    '16.0': 'AppTheme.spaceLg',
    '18': 'AppTheme.space18',
    '18.0': 'AppTheme.space18',
    '20': 'AppTheme.spaceXl',
    '20.0': 'AppTheme.spaceXl',
    '24': 'AppTheme.space2xl',
    '24.0': 'AppTheme.space2xl',
    '32': 'AppTheme.space3xl',
    '32.0': 'AppTheme.space3xl',
    '40': 'AppTheme.space4xl',
    '40.0': 'AppTheme.space4xl',
    '48': 'AppTheme.space5xl',
    '48.0': 'AppTheme.space5xl',
    '60': 'AppTheme.space6xl',
    '60.0': 'AppTheme.space6xl',
    '70': 'AppTheme.space7xl',
    '70.0': 'AppTheme.space7xl',
    '100': 'AppTheme.space8xl',
    '100.0': 'AppTheme.space8xl',
  };

  final radiusMap = <String, String>{
    '4': 'AppTheme.radiusXxs',
    '4.0': 'AppTheme.radiusXxs',
    '5': 'AppTheme.radiusXs',
    '5.0': 'AppTheme.radiusXs',
    '6': 'AppTheme.radiusSmSoft',
    '6.0': 'AppTheme.radiusSmSoft',
    '8': 'AppTheme.radiusSm',
    '8.0': 'AppTheme.radiusSm',
    '10': 'AppTheme.radiusMdSoft',
    '10.0': 'AppTheme.radiusMdSoft',
    '12': 'AppTheme.radiusMd',
    '12.0': 'AppTheme.radiusMd',
    '14': 'AppTheme.radiusLg',
    '14.0': 'AppTheme.radiusLg',
    '16': 'AppTheme.radiusXl',
    '16.0': 'AppTheme.radiusXl',
    '20': 'AppTheme.radius2xl',
    '20.0': 'AppTheme.radius2xl',
    '24': 'AppTheme.radius3xl',
    '24.0': 'AppTheme.radius3xl',
    '30': 'AppTheme.radiusPill',
    '30.0': 'AppTheme.radiusPill',
  };

  final files = rootDir
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'))
      .where((f) =>
          !f.path.endsWith('.g.dart') &&
          !f.path.endsWith('.freezed.dart') &&
          !f.path.replaceAll('\\', '/').contains('/generated/'))
      .toList();

  int changedFiles = 0;
  int changedLines = 0;

  for (final file in files) {
    final original = file.readAsStringSync();
    var content = original;

    content = content.replaceAllMapped(
      RegExp(r'EdgeInsets\.(all|symmetric|only|fromLTRB)\(([^)]*)\)'),
      (m) {
        final argsText = m.group(2)!;
        var newArgs = argsText;
        spacingMap.forEach((num, token) {
          newArgs = newArgs.replaceAllMapped(
            RegExp('(?<![A-Za-z0-9_.])${RegExp.escape(num)}(?![A-Za-z0-9_.])'),
            (_) => token,
          );
        });
        return 'EdgeInsets.${m.group(1)}($newArgs)';
      },
    );

    content = content.replaceAllMapped(
      RegExp(r'BorderRadius\.circular\(([^)]*)\)'),
      (m) {
        final value = m.group(1)!.trim();
        final replacement = radiusMap[value];
        if (replacement == null) return m.group(0)!;
        return 'BorderRadius.circular($replacement)';
      },
    );

    if (content != original) {
      final normalizedPath = file.path.replaceAll('\\', '/');
      final isAppThemeFile = normalizedPath.endsWith('/lib/theme/app_theme.dart');

      if (!isAppThemeFile &&
          content.contains('AppTheme.') &&
          !content.contains('app_theme.dart')) {
        final importRegex = RegExp(r'''^import\s+['"].*['"];''', multiLine: true);
        final imports = importRegex.allMatches(content).toList();
        if (imports.isNotEmpty) {
          final lastImport = imports.last;
          final relImport = _relativeImportToAppTheme(normalizedPath);
          content =
              '${content.substring(0, lastImport.end)}\nimport $relImport;${content.substring(lastImport.end)}';
        }
      }

      if (content != original) {
        changedFiles++;
        changedLines += _countDiffLines(original, content);
        file.writeAsStringSync(content);
      }
    }
  }

  stdout.writeln('Updated $changedFiles files. Approx changed lines: $changedLines');
}

String _relativeImportToAppTheme(String normalizedPath) {
  final parts = normalizedPath.split('/');
  final libIndex = parts.lastIndexOf('lib');
  if (libIndex == -1 || parts.length < libIndex + 2) {
    return "'package:eksi_mayali_ekmek_web/theme/app_theme.dart'";
  }

  final inLib = parts.sublist(libIndex + 1);
  final dirParts = inLib.sublist(0, inLib.length - 1);
  final target = ['theme', 'app_theme.dart'];

  int common = 0;
  while (common < dirParts.length && common < target.length && dirParts[common] == target[common]) {
    common++;
  }

  final upCount = dirParts.length - common;
  final up = List.filled(upCount, '..').join('/');
  final down = target.sublist(common).join('/');
  final path = up.isEmpty ? down : '$up/$down';
  return "'$path'";
}

int _countDiffLines(String oldText, String newText) {
  final oldLines = oldText.split('\n');
  final newLines = newText.split('\n');
  final maxLen = oldLines.length > newLines.length ? oldLines.length : newLines.length;
  int changed = 0;
  for (var i = 0; i < maxLen; i++) {
    final oldLine = i < oldLines.length ? oldLines[i] : '';
    final newLine = i < newLines.length ? newLines[i] : '';
    if (oldLine != newLine) changed++;
  }
  return changed;
}
