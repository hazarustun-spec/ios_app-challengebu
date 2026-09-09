import AppIntents

// "+1" on the Live Activity: one unit for one team side.
//
// `side` is the FIXED team side ('a'/'b'), resolved by the caller from
// `LiveMatchAttributes.youSide` — never assumed. That resolution is what kept
// the widget correct while the score screen hard-coded "me" to side 'a' and
// scored for the opponent on half the phones.
//
// Renamed from AwardPointIntent: a tap is a game, a tiebreak point or a set now
// (whatever the format counts), not a rally.
@available(iOS 17.0, *)
struct AwardUnitIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Skoru artır"
  @Parameter(title: "side") var side: String
  @Parameter(title: "matchId") var matchId: String
  init() {}
  init(side: String, matchId: String) { self.side = side; self.matchId = matchId }

  func perform() async throws -> some IntentResult {
    // matchId comes from THIS activity's intent parameter (not a shared App
    // Group key) so each card's buttons act on its own match.
    await LiveScoreRPC.callAndApply(
      rpc: "award_unit",
      matchId: matchId,
      body: ["p_match_id": matchId, "p_side": side])
    return .result()
  }
}
