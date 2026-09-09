import ActivityKit

// Shared Live Activity data model. NOTE: this struct is intentionally duplicated
// in modules/live-match-activity/ios/LiveMatchAttributes.swift — the widget
// extension target and the control module compile in separate targets and
// expo-apple-targets has no first-class file sharing. ActivityKit pairs the two
// at runtime by the type name + Codable shape, so BOTH copies MUST stay
// byte-identical.
struct LiveMatchAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    // Units won by each FIXED team side — 'a' is always team A, on both
    // players' phones. What a unit is depends on the format: a game in Klasik
    // and Pro Set, a tiebreak point in Hızlı Tiebreak, a set in 3 Set Klasik.
    // `Sides` maps these to you/opponent through `youSide`.
    var unitsA: Int
    var unitsB: Int
    var phase: String    // "ongoing" | "void" | "finished"
    var winner: String?  // "a" | "b" | nil
  }

  var matchId: String
  var youSide: String    // "a" | "b"
  var nameA: String
  var nameB: String
  var formatKey: String  // matches.format — decides what a unit is called
  var unitLabel: String  // "oyun" | "sayı" | "set"
  var categoryLabel: String?
}
