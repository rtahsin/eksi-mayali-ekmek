Map<String, String> getCurrentQueryParams() {
  return Uri.base.queryParameters;
}

void replaceQueryParams(Map<String, String> queryParams) {
  // Non-web platformlarda URL query güncellemesi gerekmez.
}
