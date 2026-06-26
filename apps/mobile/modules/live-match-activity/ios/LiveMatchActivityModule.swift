import ExpoModulesCore
import ActivityKit

// Controls the live-match Live Activity from JS: start / update / end. Keeps a
// handle to the running activity so update/end target the right one.
public class LiveMatchActivityModule: Module {
  private var current: Any?
  private var pushToStartTask: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("LiveMatchActivity")

    Events("onPushToken", "onPushToStartToken")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("start") { (a: [String: Any]) in
      guard #available(iOS 16.2, *) else {
        throw NSError(domain: "LiveMatch", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "iOS < 16.2"])
      }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw NSError(domain: "LiveMatch", code: 2,
                      userInfo: [NSLocalizedDescriptionKey: "areActivitiesEnabled = false"])
      }
      if let defaults = UserDefaults(suiteName: "group.app.challengebu.ios") {
        defaults.set(a["supabaseUrl"] as? String ?? "", forKey: "supabaseUrl")
        defaults.set(a["supabaseAnonKey"] as? String ?? "", forKey: "supabaseAnonKey")
        defaults.set(a["accessToken"] as? String ?? "", forKey: "accessToken")
        defaults.set(a["matchId"] as? String ?? "", forKey: "matchId")
      }
      let attrs = LiveMatchAttributes(
        matchId: a["matchId"] as? String ?? "",
        youSide: a["youSide"] as? String ?? "a",
        nameA: a["nameA"] as? String ?? "Sen",
        nameB: a["nameB"] as? String ?? "Rakip",
        categoryLabel: a["categoryLabel"] as? String
      )
      let state = LiveMatchAttributes.ContentState(
        gamesA: 0, gamesB: 0, pointsA: 0, pointsB: 0, phase: "ongoing", winner: nil)
      // Throw (not try?) so the JS side surfaces the real ActivityKit error.
      // pushType: .token so the activity gets an APNs push token we can use to
      // update it from the server (cross-device sync).
      let activity = try Activity.request(
        attributes: attrs,
        content: .init(state: state, staleDate: nil),
        pushType: .token)
      self.current = activity
      // Observe push-token updates and forward each (hex-encoded) to JS so it can
      // register the token with the backend.
      Task {
        for await tokenData in activity.pushTokenUpdates {
          let hex = tokenData.map { String(format: "%02x", $0) }.joined()
          self.sendEvent("onPushToken", ["token": hex])
        }
      }
    }

    // Observe the DEVICE/USER-level push-to-start token (iOS 17.2+). This token
    // is NOT tied to any running activity — it lets the server materialize a
    // brand-new Live Activity of this attributes type on the device without the
    // app running. Captured once at app startup after auth. On iOS < 17.2 this is
    // a no-op (the static pushToStartTokenUpdates API doesn't exist there).
    AsyncFunction("observePushToStartToken") {
      if #available(iOS 17.2, *) {
        // Cancel any prior observer so repeated calls stay idempotent (one live
        // observer) instead of leaking a Task per call.
        self.pushToStartTask?.cancel()
        self.pushToStartTask = Task { [weak self] in
          for await data in Activity<LiveMatchAttributes>.pushToStartTokenUpdates {
            guard let self else { return }
            let hex = data.map { String(format: "%02x", $0) }.joined()
            self.sendEvent("onPushToStartToken", ["token": hex])
          }
        }
      }
    }

    AsyncFunction("update") { (s: [String: Any]) in
      guard #available(iOS 16.2, *),
            let act = self.current as? Activity<LiveMatchAttributes> else { return }
      await act.update(.init(state: Self.contentState(from: s), staleDate: nil))
    }

    AsyncFunction("end") { (s: [String: Any]) in
      guard #available(iOS 16.2, *) else { return }
      if let act = self.current as? Activity<LiveMatchAttributes> {
        await act.end(
          .init(state: Self.contentState(from: s), staleDate: nil),
          dismissalPolicy: .after(.now + 3))
      }
      self.current = nil
    }
  }

  @available(iOS 16.2, *)
  static func contentState(from s: [String: Any]) -> LiveMatchAttributes.ContentState {
    LiveMatchAttributes.ContentState(
      gamesA: s["gamesA"] as? Int ?? 0,
      gamesB: s["gamesB"] as? Int ?? 0,
      pointsA: s["pointsA"] as? Int ?? 0,
      pointsB: s["pointsB"] as? Int ?? 0,
      phase: s["phase"] as? String ?? "ongoing",
      winner: s["winner"] as? String)
  }
}
