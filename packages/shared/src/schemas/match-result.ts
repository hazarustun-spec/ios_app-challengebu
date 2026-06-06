import { z } from 'zod';
import { ALL_FORMATS } from '../types/formats.js';

const teamLetterSchema = z.enum(['a', 'b']);
const winnerTeamSchema = z.enum(['a', 'b', 'void']);

export const buKlasikScoreDetail = z
  .object({
    els: z
      .array(
        z.object({
          el: z.number().int().min(1),
          winner: teamLetterSchema,
        }),
      )
      .min(1)
      .max(7),
  })
  .refine((data) => data.els.every((el, idx) => el.el === idx + 1), {
    message: 'els must be sequential starting from 1',
  });

export const threeSetScoreDetail = z
  .object({
    sets: z
      .array(
        z.object({
          set: z.number().int().min(1).max(3),
          a: z.number().int().min(0).max(7),
          b: z.number().int().min(0).max(7),
        }),
      )
      .min(2)
      .max(3),
  })
  .refine((data) => data.sets.every((s, idx) => s.set === idx + 1), {
    message: 'sets must be sequential starting from 1',
  });

export const proSet8ScoreDetail = z.object({
  games: z.object({
    a: z.number().int().min(0),
    b: z.number().int().min(0),
  }),
  tiebreakScore: z
    .object({
      a: z.number().int().min(0),
      b: z.number().int().min(0),
    })
    .optional(),
});

export const tiebreakScoreDetail = z.object({
  points: z.object({
    a: z.number().int().min(0),
    b: z.number().int().min(0),
  }),
});

export const scoreDetailsSchema = z.union([
  buKlasikScoreDetail,
  threeSetScoreDetail,
  proSet8ScoreDetail,
  tiebreakScoreDetail,
]);

export const matchResultSchema = z
  .object({
    matchId: z.string().uuid(),
    format: z.enum(ALL_FORMATS),
    scoreTeamA: z.number().int().min(0),
    scoreTeamB: z.number().int().min(0),
    winnerTeam: winnerTeamSchema,
    scoreDetails: scoreDetailsSchema,
  })
  .refine(
    (data) => {
      if (data.winnerTeam === 'void') {
        return data.scoreTeamA === data.scoreTeamB;
      }
      if (data.winnerTeam === 'a') {
        return data.scoreTeamA > data.scoreTeamB;
      }
      return data.scoreTeamB > data.scoreTeamA;
    },
    { message: 'winnerTeam must match scores', path: ['winnerTeam'] },
  );

export type MatchResultInput = z.infer<typeof matchResultSchema>;
