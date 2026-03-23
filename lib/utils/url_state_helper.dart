import 'dart:html' as html;

Map<String, String> getCurrentQueryParams() {
  return Uri.base.queryParameters;
}

void replaceQueryParams(Map<String, String> queryParams) {
  final current = Uri.base;
  final uri = current.replace(
    queryParameters: queryParams.isEmpty ? null : queryParams,
  );

  html.window.history.replaceState(null, '', uri.toString());
}
