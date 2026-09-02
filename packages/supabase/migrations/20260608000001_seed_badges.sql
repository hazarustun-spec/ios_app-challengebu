-- Seed the MVP badge catalog. All badges keyed by `code` (snake_case) so the
-- award-badges Edge Function can reference them without UUID hard-coding.
-- display_order groups badges within each category in the spec's order.

insert into public.badges (code, name_tr, description_tr, icon, category, is_seasonal, display_order) values
  -- Milestones (cumulative match count, dostluk dahil)
  ('milestone_1_match',     'İlk Adım',           '1 maç oyna', '🌱', 'milestone', false, 10),
  ('milestone_3_matches',   'Üçleme',             '3 maç oyna', '🎾', 'milestone', false, 20),
  ('milestone_5_matches',   'Beşli',              '5 maç oyna', '🖐️', 'milestone', false, 30),
  ('milestone_10_matches',  'Onluk',              '10 maç oyna', '🔟', 'milestone', false, 40),
  ('milestone_25_matches',  'Çeyrek Yüz',         '25 maç oyna', '🥉', 'milestone', false, 50),
  ('milestone_50_matches',  'Yarım Yüz',          '50 maç oyna', '🥈', 'milestone', false, 60),
  ('milestone_100_matches', 'Yüzlük',             '100 maç oyna', '🥇', 'milestone', false, 70),
  ('milestone_250_matches', 'Çeyrek Bin',         '250 maç oyna', '🏅', 'milestone', false, 80),
  ('milestone_500_matches', 'Yarım Bin',          '500 maç oyna', '🏆', 'milestone', false, 90),

  -- Wins (sıralama maçları)
  ('wins_1',   'İlk Galibiyet',      '1 sıralama maçı kazan',   '🎯', 'win', false, 10),
  ('wins_3',   'Üç Galibiyet',       '3 sıralama maçı kazan',   '🎯', 'win', false, 20),
  ('wins_5',   'Beş Galibiyet',      '5 sıralama maçı kazan',   '🎯', 'win', false, 30),
  ('wins_10',  'On Galibiyet',       '10 sıralama maçı kazan',  '🎖️', 'win', false, 40),
  ('wins_25',  'Yirmi Beş Galibiyet','25 sıralama maçı kazan',  '🎖️', 'win', false, 50),
  ('wins_50',  'Elli Galibiyet',     '50 sıralama maçı kazan',  '🏅', 'win', false, 60),
  ('wins_100', 'Yüz Galibiyet',      '100 sıralama maçı kazan', '👑', 'win', false, 70),

  -- Special wins
  ('bagel',    'Bagel',     '4-0 Klasik veya 6-0 set ile kazan',            '🥯', 'win', false, 80),
  ('comeback', 'Geri Dönüş','0-2''den 3-2 veya 1-3''ten 4-3 ile kazan',     '🔥', 'win', false, 90),

  -- Social
  ('social_first_doubles',     'İlk Çift Maçı',          'Çift kategorisinde ilk maç', '🤝', 'social', false, 10),
  ('social_5_diff_partners',   'Çevremi Genişletiyorum', '5 farklı partner ile maç oyna', '👥', 'social', false, 20),
  ('social_10_diff_opponents', 'Yeni Yüzler',            '10 farklı rakiple maç oyna',    '🆕', 'social', false, 30),

  -- Seasonal (her sezon sonu sıfırlanır; user_badges season_id ile kaydedilir)
  ('season_ladder_top10', 'Sezon Top 10',         'Sezon sonunda ladder Top 10',         '🔟', 'season', true, 10),
  ('season_ladder_top3',  'Sezon Top 3',          'Sezon sonunda ladder Top 3',          '🥉', 'season', true, 20),
  ('season_champion',     'Sezon Şampiyonu',      'Sezon finalini kazan',                '👑', 'season', true, 30),
  ('season_finalist',     'Sezon Finalisti',      'Sezon finalinde finale çık',          '🥈', 'season', true, 40),
  ('season_semifinalist', 'Sezon Yarı Finalisti', 'Sezon finalinde yarı finale çık',     '🥉', 'season', true, 50),

  -- Yearly (kategori başına, kalıcı)
  ('yearly_champion', 'Yıllık Şampiyon', 'Yıllık şampiyonluğu kazan (kategori başına)', '🏆', 'yearly', false, 10),

  -- Fun
  ('fun_night_owl',     'Gece Kuşu',           '22:00 sonrası 5 maç oyna',          '🦉', 'fun', false, 10),
  ('fun_early_bird',    'Erken Kuş',           '09:00 öncesi 5 maç oyna',           '🐦', 'fun', false, 20),
  ('fun_bebek_lover',   'Bebek Kort Sevdalısı','Bebek Kort''ta 10 maç oyna',         '🏖️', 'fun', false, 30),
  ('fun_court_explorer','Saha Gezgini',        'Üç farklı kortta da maç oyna',      '🗺️', 'fun', false, 40),
  ('fun_marathon',      'Maraton',             '3 Set Klasik formatında 5 maç oyna','🏃‍♂️', 'fun', false, 50),

  -- Loyalty
  ('loyalty_first_season', '1. Sezon', 'İlk sezonunu tamamla',          '⭐', 'loyalty', false, 10),
  ('loyalty_one_year',     '1 Yıl',    '3 sezon (1 akademik yıl) tamamla', '🌟', 'loyalty', false, 20),
  ('loyalty_founder',      'Kurucu',   'İlk 50 üyeden biri ol',           '🏛️', 'loyalty', false, 30)
on conflict (code) do nothing;
