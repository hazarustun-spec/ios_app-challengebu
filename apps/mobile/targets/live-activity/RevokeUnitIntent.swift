import AppIntents

// "−" on the Live Activity: take back the last unit given to ONE side.
//
// Per-side on purpose. The old UndoPointIntent called `undo_point`, which
// reversed whichever side scored last — so correcting your own mis-tap could
// delete your opponent's game instead.
@available(iOS 17.0, *)
struct RevokeUnitIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Skoru geri al"
  @Parameter(title: "side") var side: String
  @Parameter(title: "matchId") var matchId: String
  init() {}
  init(side: String, matchId: String) { self.side = side; self.matchId = matchId }

  func perform() async throws -> some IntentResult {
    await LiveScoreRPC.callAndApply(
      rpc: "revoke_unit",
      matchId: matchId,
      body: ["p_match_id": matchId, "p_side": side])
    return .result()
  }
}
