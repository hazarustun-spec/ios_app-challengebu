import ActivityKit

// DUPLICATE of targets/live-activity/LiveMatchAttributes.swift — see that file's
// note. ActivityKit pairs the widget and the app by type name + Codable shape,
// so the two copies MUST stay byte-identical.
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
