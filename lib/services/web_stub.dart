// Stub for non-web platforms
// This file is used when running on mobile/desktop platforms where package:web is not available

/// Stub class to replace web.window for non-web platforms
class Window {
  Storage? get localStorage => null;
  EventStreamProviders<MessageEvent> get onMessage => EventStreamProviders<MessageEvent>();
  Navigator get navigator => Navigator();
}

/// Stub class for navigator
class Navigator {
  String get userAgent => 'stub';
}

/// Stub class to replace web.Storage for non-web platforms
class Storage {
  String? getItem(String key) => null;
  void setItem(String key, String value) {}
  void removeItem(String key) {}
}

/// Stub class for message events
class MessageEvent {
  dynamic get data => null;
}

/// Stub event stream provider
class EventStreamProviders<T> {
  Stream<T> listen(void Function(T event) onData) {
    return const Stream<Never>.empty() as Stream<T>;
  }
}

/// Global stub window object
final Window window = Window();
