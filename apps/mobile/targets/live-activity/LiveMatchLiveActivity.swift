import ActivityKit
import SwiftUI
import WidgetKit

// Minimal spike UI — verifies the Live Activity appears + updates. The full
// branded design (compact/minimal/expanded/lock-screen) lands in the next task.
struct LiveMatchLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveMatchAttributes.self) { context in
      HStack {
        Text("🎾 Maç sürüyor")
          .font(.system(.headline, design: .rounded).bold())
        Spacer()
        Text("\(context.state.gamesA)–\(context.state.gamesB)")
          .font(.system(.title3, design: .rounded).bold())
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          Text("🎾 \(context.state.gamesA)–\(context.state.gamesB)")
            .font(.system(.title3, design: .rounded).bold())
        }
      } compactLeading: {
        Text("🎾")
      } compactTrailing: {
        Text("\(context.state.gamesA)–\(context.state.gamesB)")
          .font(.system(.caption, design: .rounded).bold())
      } minimal: {
        Text("🎾")
      }
    }
  }
}

@main
struct LiveMatchWidgetBundle: WidgetBundle {
  var body: some Widget {
    LiveMatchLiveActivity()
  }
}
