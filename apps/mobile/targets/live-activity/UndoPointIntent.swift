import AppIntents
import ActivityKit

@available(iOS 17.0, *)
struct UndoPointIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Geri al"
  @Parameter(title: "matchId") var matchId: String
  init() {}
  init(matchId: String) { self.matchId = matchId }

  func perform() async throws -> some IntentResult {
    // matchId comes from THIS activity's intent parameter (not a shared App Group
    // key) so each card's button undoes against its own match.
    guard let d = UserDefaults(suiteName: "group.app.challengebu.ios"),
          let url = d.string(forKey: "supabaseUrl"), !url.isEmpty,
          let anon = d.string(forKey: "supabaseAnonKey"),
          let token = d.string(forKey: "accessToken"), !token.isEmpty,
          !self.matchId.isEmpty
    else { return .result() }

    guard let reqURL = URL(string: "\(url)/rest/v1/rpc/undo_point") else { return .result() }

    // Build the undo_point request for a given bearer token.
    func undoRequest(_ bearer: String) throws -> URLRequest {
      var req = URLRequest(url: reqURL)
      req.httpMethod = "POST"
      req.setValue("application/json", forHTTPHeaderField: "Content-Type")
      req.setValue(anon, forHTTPHeaderField: "apikey")
      req.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")
      req.httpBody = try JSONSerialization.data(
        withJSONObject: ["p_match_id": self.matchId])
      return req
    }

    var (data, response) = try await URLSession.shared.data(for: try undoRequest(token))

    // The App-Group access token is only refreshed while the app runs (JWT ~1h
    // TTL). After the app's been closed >1h the token is expired → 401. Refresh
    // it with the stored refresh token, persist the new pair, and retry once.
    if (response as? HTTPURLResponse)?.statusCode == 401,
       let refresh = d.string(forKey: "refreshToken"), !refresh.isEmpty,
       let newToken = try? await Self.refreshAccessToken(
         url: url, anon: anon, refreshToken: refresh, defaults: d) {
      (data, response) = try await URLSession.shared.data(for: try undoRequest(newToken))
    }

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

  // Exchange a refresh token for a fresh session. On success, persists the new
  // access + refresh tokens back to the App Group and returns the new access
  // token. Returns nil (never throws) on any failure so the intent stays silent.
  static func refreshAccessToken(
    url: String, anon: String, refreshToken: String, defaults: UserDefaults
  ) async throws -> String? {
    guard let refreshURL = URL(string: "\(url)/auth/v1/token?grant_type=refresh_token")
    else { return nil }
    var req = URLRequest(url: refreshURL)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.setValue(anon, forHTTPHeaderField: "apikey")
    req.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": refreshToken])

    let (data, response) = try await URLSession.shared.data(for: req)
    guard (response as? HTTPURLResponse)?.statusCode == 200,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let newAccess = json["access_token"] as? String, !newAccess.isEmpty
    else { return nil }

    defaults.set(newAccess, forKey: "accessToken")
    if let newRefresh = json["refresh_token"] as? String, !newRefresh.isEmpty {
      defaults.set(newRefresh, forKey: "refreshToken")
    }
    return newAccess
  }
}
