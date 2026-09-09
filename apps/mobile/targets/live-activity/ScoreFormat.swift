import SwiftUI

// Brand palette for the Live Activity UI (verbatim from
// apps/mobile/theme/colors.ts).
enum ScoreFormat {
  static let lime = Color(red: 0x8F / 255, green: 0xD4 / 255, blue: 0x3B / 255)
  static let court = Color(red: 0x22 / 255, green: 0x70 / 255, blue: 0xBC / 255)
  static let ink = Color(red: 0x16 / 255, green: 0x16 / 255, blue: 0x18 / 255)

  // The 15/30/40/Ad ladder used to live here. Rally points are no longer
  // tracked: a match is now recorded one unit at a time — a game, a tiebreak
  // point or a set, depending on the format — because nobody picks up a phone
  // between rallies. Point-by-point entry is planned for an Apple Watch mode.
}

// Maps the raw a/b ContentState to "you" / "opponent" via the static youSide
// attribute, so the same broadcast score renders correctly on each device.
//
// This mapping is the reason the widget stayed correct while the score SCREEN
// mirrored itself for team-B players: the screen hard-coded "me" to side 'a'
// and had no equivalent of this.
struct Sides {
  let youUnits: Int
  let oppUnits: Int
  let youName: String
  let oppName: String
  /// The team side the wearer is on — what the +/- buttons must write to.
  let youSide: String
  let oppSide: String

  init(_ a: LiveMatchAttributes, _ s: LiveMatchAttributes.ContentState) {
    if a.youSide == "a" {
      youUnits = s.unitsA; oppUnits = s.unitsB
      youName = a.nameA; oppName = a.nameB
      youSide = "a"; oppSide = "b"
    } else {
      youUnits = s.unitsB; oppUnits = s.unitsA
      youName = a.nameB; oppName = a.nameA
      youSide = "b"; oppSide = "a"
    }
  }
}
