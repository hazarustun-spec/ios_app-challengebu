import ExpoModulesCore
import ActivityKit

// Controls the live-match Live Activity from JS: start / update / end. Keeps a
// handle to the running activity so update/end target the right one.
public class LiveMatchActivityModule: Module {
  private var current: Any?

  public func definition() -> ModuleDefinition {
    Name("LiveMatchActivity")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("start") { (a: [String: Any]) in
      guard #available(iOS 16.2, *) else { return }
      let attrs = LiveMatchAttributes(
        matchId: a["matchId"] as? String ?? "",
        youSide: a["youSide"] as? String ?? "a",
        nameA: a["nameA"] as? String ?? "Sen",
        nameB: a["nameB"] as? String ?? "Rakip",
        categoryLabel: a["categoryLabel"] as? String
      )
      let state = LiveMatchAttributes.ContentState(
        gamesA: 0, gamesB: 0, pointsA: 0, pointsB: 0, phase: "ongoing", winner: nil)
      self.current = try? Activity.request(
        attributes: attrs, content: .init(state: state, staleDate: nil))
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
