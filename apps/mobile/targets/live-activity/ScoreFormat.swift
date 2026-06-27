import SwiftUI

// Brand palette + score helpers for the Live Activity UI (verbatim from
// apps/mobile/theme/colors.ts).
enum ScoreFormat {
  static let pts = ["0", "15", "30", "40", "Ad"]
  static func point(_ i: Int) -> String { pts[max(0, min(4, i))] }

  static let lime = Color(red: 0x8F / 255, green: 0xD4 / 255, blue: 0x3B / 255)
  static let court = Color(red: 0x22 / 255, green: 0x70 / 255, blue: 0xBC / 255)
  static let ink = Color(red: 0x16 / 255, green: 0x16 / 255, blue: 0x18 / 255)
}

// Maps the raw a/b ContentState to "you" / "opponent" via the static youSide
// attribute, so the same broadcast score renders correctly on each device.
struct Sides {
  let youGames: Int
  let oppGames: Int
  let youPoints: Int
  let oppPoints: Int
  let youName: String
  let oppName: String

  init(_ a: LiveMatchAttributes, _ s: LiveMatchAttributes.ContentState) {
    if a.youSide == "a" {
      youGames = s.gamesA; oppGames = s.gamesB
      youPoints = s.pointsA; oppPoints = s.pointsB
      youName = a.nameA; oppName = a.nameB
    } else {
      youGames = s.gamesB; oppGames = s.gamesA
      youPoints = s.pointsB; oppPoints = s.pointsA
      youName = a.nameB; oppName = a.nameA
    }
  }
}
