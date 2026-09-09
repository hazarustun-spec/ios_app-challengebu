import ActivityKit
import Foundation

// One place for the widget's calls into the live-score RPCs.
//
// AwardPointIntent and UndoPointIntent each carried their own copy of the
// request builder, the 401 refresh dance and the response parser — about a
// hundred duplicated lines that had to be kept in step by hand. They are one
// implementation now, so a fix to the token refresh cannot land in one intent
// and miss the other.
enum LiveScoreRPC {
  static let appGroup = "group.app.challengebu.ios"

  /// Calls a live-score RPC that returns the updated `live_match_scores` row,
  /// then pushes that row into every Live Activity for the match so the card
  /// reflects the tap immediately instead of waiting for the server push.
  ///
  /// Silent on every failure: a Live Activity button that throws would show the
  /// user a system error over their lock screen for something that will be
  /// corrected by the next Realtime update anyway.
  static func callAndApply(rpc: String, matchId: String, body: [String: Any]) async {
    guard let d = UserDefaults(suiteName: appGroup),
          let url = d.string(forKey: "supabaseUrl"), !url.isEmpty,
          let anon = d.string(forKey: "supabaseAnonKey"),
          let token = d.string(forKey: "accessToken"), !token.isEmpty,
          !matchId.isEmpty,
          let reqURL = URL(string: "\(url)/rest/v1/rpc/\(rpc)")
    else { return }

    func request(_ bearer: String) throws -> URLRequest {
      var req = URLRequest(url: reqURL)
      req.httpMethod = "POST"
      req.setValue("application/json", forHTTPHeaderField: "Content-Type")
      req.setValue(anon, forHTTPHeaderField: "apikey")
      req.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")
      req.httpBody = try JSONSerialization.data(withJSONObject: body)
      return req
    }

    guard var (data, response) = try? await URLSession.shared.data(for: request(token))
    else { return }

    // The App-Group access token is only refreshed while the app runs (JWT ~1h
    // TTL). After the app has been closed >1h the token is expired → 401.
    // Refresh with the stored refresh token, persist the new pair, retry once.
    if (response as? HTTPURLResponse)?.statusCode == 401,
       let refresh = d.string(forKey: "refreshToken"), !refresh.isEmpty,
       let newToken = try? await refreshAccessToken(
         url: url, anon: anon, refreshToken: refresh, defaults: d),
       let retried = try? await URLSession.shared.data(for: request(newToken)) {
      (data, response) = retried
    }

    // PostgREST returns a JSON object for RETURNS <rowtype>; handle an array
    // defensively.
    let parsed = try? JSONSerialization.jsonObject(with: data)
    let row: [String: Any]?
    if let obj = parsed as? [String: Any] {
      row = obj
    } else if let arr = parsed as? [[String: Any]], let first = arr.first {
      row = first
    } else {
      row = nil
    }
    guard let row else { return }

    if #available(iOS 16.2, *) {
      // `games_a`/`games_b` keep their historical column names but now hold the
      // format's unit count — see migration 20260909000001.
      let state = LiveMatchAttributes.ContentState(
        unitsA: row["games_a"] as? Int ?? 0,
        unitsB: row["games_b"] as? Int ?? 0,
        phase: row["phase"] as? String ?? "ongoing",
        winner: row["winner"] as? String)
      for activity in Activity<LiveMatchAttributes>.activities
      where activity.attributes.matchId == matchId {
        await activity.update(.init(state: state, staleDate: nil))
      }
    }
  }

  /// Exchange a refresh token for a fresh session, persisting the new pair back
  /// to the App Group. Returns nil (never throws) on any failure.
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
