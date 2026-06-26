import AppIntents
import ActivityKit

@available(iOS 17.0, *)
struct AwardPointIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Sayı ekle"
  @Parameter(title: "side") var side: String
  @Parameter(title: "matchId") var matchId: String
  init() {}
  init(side: String, matchId: String) { self.side = side; self.matchId = matchId }

  func perform() async throws -> some IntentResult {
    // matchId comes from THIS activity's intent parameter (not a shared App Group
    // key) so each card's buttons award to its own match.
    guard let d = UserDefaults(suiteName: "group.app.challengebu.ios"),
          let url = d.string(forKey: "supabaseUrl"), !url.isEmpty,
          let anon = d.string(forKey: "supabaseAnonKey"),
          let token = d.string(forKey: "accessToken"), !token.isEmpty,
          !self.matchId.isEmpty
    else { return .result() }

    var req = URLRequest(url: URL(string: "\(url)/rest/v1/rpc/award_point")!)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.setValue(anon, forHTTPHeaderField: "apikey")
    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    req.httpBody = try JSONSerialization.data(
      withJSONObject: ["p_match_id": self.matchId, "p_side": side])

    let (data, _) = try await URLSession.shared.data(for: req)

    // PostgREST returns a JSON object for RETURNS <rowtype>; handle array defensively
    let parsed = try? JSONSerialization.jsonObject(with: data)
    let row: [String: Any]?
    if let obj = parsed as? [String: Any] {
      row = obj
    } else if let arr = parsed as? [[String: Any]], let first = arr.first {
      row = first
    } else {
      row = nil
    }

    guard let row else { return .result() }

    if #available(iOS 16.2, *) {
      let state = LiveMatchAttributes.ContentState(
        gamesA: row["games_a"] as? Int ?? 0, gamesB: row["games_b"] as? Int ?? 0,
        pointsA: row["points_a"] as? Int ?? 0, pointsB: row["points_b"] as? Int ?? 0,
        phase: row["phase"] as? String ?? "ongoing", winner: row["winner"] as? String)
      for activity in Activity<LiveMatchAttributes>.activities
      where activity.attributes.matchId == self.matchId {
        await activity.update(.init(state: state, staleDate: nil))
      }
    }
    return .result()
  }
}
