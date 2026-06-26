import ActivityKit
import SwiftUI
import WidgetKit

struct LiveMatchLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveMatchAttributes.self) { context in
      LockScreenView(attributes: context.attributes, state: context.state)
    } dynamicIsland: { context in
      let s = Sides(context.attributes, context.state)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          PlayerRow(name: s.youName, games: s.youGames, point: s.youPoints,
                    color: ScoreFormat.lime)
        }
        DynamicIslandExpandedRegion(.trailing) {
          PlayerRow(name: s.oppName, games: s.oppGames, point: s.oppPoints,
                    color: ScoreFormat.court)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if context.state.phase == "ongoing" {
            if #available(iOS 17.0, *) {
              HStack(spacing: 8) {
                Button(intent: AwardPointIntent(side: context.attributes.youSide, matchId: context.attributes.matchId)) {
                  Text("Sen +1").font(.system(.caption, design: .rounded).bold())
                    .frame(maxWidth: .infinity).padding(.vertical, 6)
                }.tint(ScoreFormat.lime)
                Button(intent: AwardPointIntent(side: context.attributes.youSide == "a" ? "b" : "a", matchId: context.attributes.matchId)) {
                  Text("Rakip +1").font(.system(.caption, design: .rounded).bold())
                    .frame(maxWidth: .infinity).padding(.vertical, 6)
                }.tint(ScoreFormat.court)
              }
              .buttonStyle(.borderedProminent)
            } else {
              Text(statusText(context.state))
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
            }
          } else {
            Text(statusText(context.state))
              .font(.system(.caption2, design: .rounded))
              .foregroundStyle(.secondary)
          }
        }
      } compactLeading: {
        Text("🎾")
      } compactTrailing: {
        Text("\(s.youGames)–\(s.oppGames)")
          .font(.system(.caption, design: .rounded).bold())
          .foregroundStyle(ScoreFormat.lime)
      } minimal: {
        Text("\(s.youGames)–\(s.oppGames)")
          .font(.system(.caption2, design: .rounded).bold())
      }
    }
  }

  func statusText(_ s: LiveMatchAttributes.ContentState) -> String {
    switch s.phase {
    case "finished": return "Bitti 🎾"
    case "void": return "Berabere · void"
    default: return "Maç sürüyor"
    }
  }
}

struct PlayerRow: View {
  let name: String
  let games: Int
  let point: Int
  let color: Color

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(name)
        .font(.system(.caption2, design: .rounded))
        .foregroundStyle(.secondary)
        .lineLimit(1)
      HStack(spacing: 6) {
        Text("\(games)")
          .font(.system(.title3, design: .rounded).bold())
          .foregroundStyle(color)
        Text(ScoreFormat.point(point))
          .font(.system(.caption, design: .rounded))
          .foregroundStyle(.secondary)
      }
    }
  }
}

struct LockScreenView: View {
  let attributes: LiveMatchAttributes
  let state: LiveMatchAttributes.ContentState

  var body: some View {
    let s = Sides(attributes, state)
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("🎾 ChallengeBu!")
          .font(.system(.caption, design: .rounded).bold())
          .foregroundStyle(.white)
        Spacer()
        Text(state.phase == "finished" ? "Bitti" : "Maç sürüyor")
          .font(.system(.caption2, design: .rounded))
          .foregroundStyle(.white.opacity(0.6))
      }
      scoreRow(s.youName, s.youGames, s.youPoints, ScoreFormat.lime)
      scoreRow(s.oppName, s.oppGames, s.oppPoints, ScoreFormat.court)
      if state.phase == "ongoing" {
        if #available(iOS 17.0, *) {
          HStack(spacing: 8) {
            Button(intent: AwardPointIntent(side: attributes.youSide, matchId: attributes.matchId)) {
              Text("Sen +1").font(.system(.caption, design: .rounded).bold())
                .frame(maxWidth: .infinity).padding(.vertical, 6)
            }.tint(ScoreFormat.lime)
            Button(intent: AwardPointIntent(side: attributes.youSide == "a" ? "b" : "a", matchId: attributes.matchId)) {
              Text("Rakip +1").font(.system(.caption, design: .rounded).bold())
                .frame(maxWidth: .infinity).padding(.vertical, 6)
            }.tint(ScoreFormat.court)
          }
          .buttonStyle(.borderedProminent)
        }
      }
    }
    .padding(14)
    .activityBackgroundTint(ScoreFormat.ink)
    .activitySystemActionForegroundColor(.white)
  }

  func scoreRow(_ name: String, _ games: Int, _ point: Int, _ color: Color) -> some View {
    HStack(spacing: 10) {
      RoundedRectangle(cornerRadius: 2)
        .fill(color)
        .frame(width: 4, height: 22)
      Text(name)
        .font(.system(.subheadline, design: .rounded))
        .foregroundStyle(.white)
        .lineLimit(1)
      Spacer()
      Text("\(games)")
        .font(.system(.title3, design: .rounded).bold())
        .foregroundStyle(color)
      Text(ScoreFormat.point(point))
        .font(.system(.subheadline, design: .rounded))
        .foregroundStyle(.white.opacity(0.8))
        .frame(width: 34, alignment: .trailing)
    }
  }
}

@main
struct LiveMatchWidgetBundle: WidgetBundle {
  var body: some Widget {
    LiveMatchLiveActivity()
  }
}
