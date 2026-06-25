import ActivityKit

// Shared Live Activity data model. NOTE: this struct is intentionally duplicated
// in modules/live-match-activity/ios/LiveMatchAttributes.swift — the widget
// extension target and the control module compile in separate targets and
// expo-apple-targets has no first-class file sharing. ActivityKit pairs the two
// at runtime by the type name + Codable shape, so BOTH copies MUST stay
// byte-identical.
struct LiveMatchAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var gamesA: Int
    var gamesB: Int
    var pointsA: Int
    var pointsB: Int
    var phase: String    // "ongoing" | "void" | "finished"
    var winner: String?  // "a" | "b" | nil
  }

  var matchId: String
  var youSide: String    // "a" | "b"
  var nameA: String
  var nameB: String
  var categoryLabel: String?
}
