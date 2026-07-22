-- #5 — Fake / boş maç TESPİT sorgusu (SİLMEZ, sadece listeler).
--
-- Supabase Dashboard → SQL Editor'a yapıştır, çalıştır, çıktıya bak.
-- "Boş/fake" tanımı: skoru hiç girilmemiş (winner_team null), hâlâ onay
-- bekleyen (awaiting_confirmation) ve maç saati geçmiş (1 günden eski) maçlar —
-- yani başlayıp sonuçlanmamış, terk edilmiş kayıtlar.

select
  m.id,
  m.played_at,
  m.created_at,
  m.status,
  m.is_rated,
  cardinality(m.started_by) as basladi_kac_kisi,   -- 0 = kimse başlatmadı
  m.category,
  m.format,
  ta.first_name || ' ' || ta.last_name as a_oyuncu,
  tb.first_name || ' ' || tb.last_name as b_oyuncu
from public.matches m
left join public.profiles ta on ta.user_id = m.team_a_player_ids[1]
left join public.profiles tb on tb.user_id = m.team_b_player_ids[1]
where m.winner_team is null
  and m.status = 'awaiting_confirmation'
  and m.played_at < now() - interval '1 day'
order by m.played_at asc;

-- Özet sayım:
-- select count(*) from public.matches
-- where winner_team is null and status = 'awaiting_confirmation'
--   and played_at < now() - interval '1 day';

-- ---------------------------------------------------------------------------
-- SİLME (yukarıdaki listeyi onayladıktan SONRA çalıştır — geri alınamaz):
--
-- delete from public.matches m
-- where m.winner_team is null
--   and m.status = 'awaiting_confirmation'
--   and m.played_at < now() - interval '1 day';
--
-- Belirli id'leri silmek için:
-- delete from public.matches where id in ('<id1>', '<id2>');
-- ---------------------------------------------------------------------------
