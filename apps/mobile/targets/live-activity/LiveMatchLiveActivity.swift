import ActivityKit
import SwiftUI
import WidgetKit

// Live Activity for a match in progress.
//
// The score it shows is the unit count for the match's format — games in
// Klasik and Pro Set, tiebreak points in Hızlı Tiebreak, sets in 3 Set Klasik.
// The 15/30/40 column is gone along with rally scoring.
//
// Every control writes through `Sides`, which resolves the wearer's own team
// side from `youSide`. Hard-coding a side here would reproduce the bug that
// made the score screen award the opponent's points for half the players.
struct LiveMatchLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveMatchAttributes.self) { context in
      LockScreenView(attributes: context.attributes, state: context.state)
    } dynamicIsland: { context in
      let s = Sides(context.attributes, context.state)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          PlayerRow(name: s.youName, units: s.youUnits, color: ScoreFormat.lime)
        }
        DynamicIslandExpandedRegion(.trailing) {
          PlayerRow(name: s.oppName, units: s.oppUnits, color: ScoreFormat.court)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if context.state.phase == "ongoing", #available(iOS 17.0, *) {
            ScoreControls(attributes: context.attributes, sides: s)
          } else {
            Text(statusText(context.state))
              .font(.system(.caption2, design: .rounded))
              .foregroundStyle(.secondary)
          }
        }
      } compactLeading: {
        Text("🎾")
      } compactTrailing: {
        Text("\(s.youUnits)–\(s.oppUnits)")
          .font(.system(.caption, design: .rounded).bold())
          .foregroundStyle(ScoreFormat.lime)
      } minimal: {
        Text("\(s.youUnits)–\(s.oppUnits)")
          .font(.system(.caption2, design: .rounded).bold())
      }
    }
  }

  func statusText(_ s: LiveMatchAttributes.ContentState) -> String {
    switch s.phase {
    case "finished": return "Bitti 🎾"
    case "void": return "Berabere"
    default: return "Maç sürüyor"
    }
  }
}

// A +/− pair per side, in the same order as the two score rows, so the button
// you press sits under the number it changes. `−` is per-side on purpose: the
// old single "undo" reversed whichever side scored last, so correcting your own
// mistake could delete your opponent's game.
@available(iOS 17.0, *)
struct ScoreControls: View {
  let attributes: LiveMatchAttributes
  let sides: Sides

  var body: some View {
    HStack(spacing: 6) {
      stepper(side: sides.youSide, label: "Sen", tint: ScoreFormat.lime)
      stepper(side: sides.oppSide, label: sides.oppName, tint: ScoreFormat.court)
    }
    .buttonStyle(.borderedProminent)
  }

  private func stepper(side: String, label: String, tint: Color) -> some View {
    HStack(spacing: 4) {
      Button(intent: RevokeUnitIntent(side: side, matchId: attributes.matchId)) {
        Image(systemName: "minus")
          .font(.system(.caption2, design: .rounded).bold())
          .padding(.vertical, 6).padding(.horizontal, 2)
      }
      .tint(ScoreFormat.ink)
      .accessibilityLabel("\(label): bir \(attributes.unitLabel) geri al")

      Button(intent: AwardUnitIntent(side: side, matchId: attributes.matchId)) {
        Text("\(label) +1")
          .font(.system(.caption, design: .rounded).bold())
          .lineLimit(1)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 6)
      }
      .tint(tint)
      .accessibilityLabel("\(label): bir \(attributes.unitLabel) ekle")
    }
  }
}

struct PlayerRow: View {
  let name: String
  let units: Int
  let color: Color

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(name)
        .font(.system(.caption2, design: .rounded))
        .foregroundStyle(.secondary)
        .lineLimit(1)
      Text("\(units)")
        .font(.system(.title3, design: .rounded).bold())
        .foregroundStyle(color)
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
        // Naming the unit here is what stops a 2-1 set score reading like a
        // 2-1 game score.
        Text(state.phase == "finished" ? "Bitti" : attributes.unitLabel)
          .font(.system(.caption2, design: .rounded))
          .foregroundStyle(.white.opacity(0.6))
      }
      scoreRow(s.youName, s.youUnits, ScoreFormat.lime)
      scoreRow(s.oppName, s.oppUnits, ScoreFormat.court)
      if state.phase == "ongoing", #available(iOS 17.0, *) {
        ScoreControls(attributes: attributes, sides: s)
      }
    }
    .padding(14)
    .activityBackgroundTint(ScoreFormat.ink)
    .activitySystemActionForegroundColor(.white)
  }

  func scoreRow(_ name: String, _ units: Int, _ color: Color) -> some View {
    HStack(spacing: 10) {
      RoundedRectangle(cornerRadius: 2)
        .fill(color)
        .frame(width: 4, height: 22)
      Text(name)
        .font(.system(.subheadline, design: .rounded))
        .foregroundStyle(.white)
        .lineLimit(1)
      Spacer()
      Text("\(units)")
        .font(.system(.title3, design: .rounded).bold())
        .foregroundStyle(color)
    }
  }
}

@main
struct LiveMatchWidgetBundle: WidgetBundle {
  var body: some Widget {
    LiveMatchLiveActivity()
  }
}
