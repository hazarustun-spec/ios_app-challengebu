// Format-rules acknowledgement gate.
//
// Ranking matches affect ELO and are bound by format rules, so the player
// must open the rules screen before sending. The acknowledgement is stored
// per-format (`rulesAcknowledgedFormat` in stores/new-match-store.ts) so
// switching format after reading correctly re-arms the gate.
//
// Pure module — no react-native / expo imports, so it stays testable.

export type RulesGateState = 'not-required' | 'unread' | 'read';

export function rulesGateState(
  kind: string,
  format: string,
  acknowledgedFormat: string | null,
): RulesGateState {
  if (kind !== 'ranking') return 'not-required';
  return acknowledgedFormat === format ? 'read' : 'unread';
}
