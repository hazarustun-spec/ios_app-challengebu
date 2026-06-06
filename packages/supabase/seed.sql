-- Courts
insert into public.courts (name, display_order) values
  ('Kort 1', 1),
  ('Kort 2', 2),
  ('Bebek Kort', 3);

-- Departments — Boğaziçi Üniversitesi bölüm listesi
-- Fen-Edebiyat Fakültesi
insert into public.departments (name, faculty, display_order) values
  ('Batı Dilleri ve Edebiyatları', 'Fen-Edebiyat Fakültesi', 1),
  ('Biyoloji', 'Fen-Edebiyat Fakültesi', 2),
  ('Çeviribilim', 'Fen-Edebiyat Fakültesi', 3),
  ('Felsefe', 'Fen-Edebiyat Fakültesi', 4),
  ('Fizik', 'Fen-Edebiyat Fakültesi', 5),
  ('Kimya', 'Fen-Edebiyat Fakültesi', 6),
  ('Matematik', 'Fen-Edebiyat Fakültesi', 7),
  ('Moleküler Biyoloji ve Genetik', 'Fen-Edebiyat Fakültesi', 8),
  ('Psikoloji', 'Fen-Edebiyat Fakültesi', 9),
  ('Sosyoloji', 'Fen-Edebiyat Fakültesi', 10),
  ('Tarih', 'Fen-Edebiyat Fakültesi', 11),
  ('Türk Dili ve Edebiyatı', 'Fen-Edebiyat Fakültesi', 12);

-- İktisadi ve İdari Bilimler Fakültesi
insert into public.departments (name, faculty, display_order) values
  ('Ekonomi', 'İktisadi ve İdari Bilimler Fakültesi', 20),
  ('İşletme', 'İktisadi ve İdari Bilimler Fakültesi', 21),
  ('Siyaset Bilimi ve Uluslararası İlişkiler', 'İktisadi ve İdari Bilimler Fakültesi', 22),
  ('Uluslararası Ticaret', 'İktisadi ve İdari Bilimler Fakültesi', 23);

-- Mühendislik Fakültesi
insert into public.departments (name, faculty, display_order) values
  ('Bilgisayar Mühendisliği', 'Mühendislik Fakültesi', 30),
  ('Biyomedikal Mühendisliği', 'Mühendislik Fakültesi', 31),
  ('Elektrik-Elektronik Mühendisliği', 'Mühendislik Fakültesi', 32),
  ('Endüstri Mühendisliği', 'Mühendislik Fakültesi', 33),
  ('İnşaat Mühendisliği', 'Mühendislik Fakültesi', 34),
  ('Kimya Mühendisliği', 'Mühendislik Fakültesi', 35),
  ('Makine Mühendisliği', 'Mühendislik Fakültesi', 36);

-- Eğitim Fakültesi
insert into public.departments (name, faculty, display_order) values
  ('Bilgisayar ve Öğretim Teknolojileri Eğitimi', 'Eğitim Fakültesi', 40),
  ('Eğitim Bilimleri', 'Eğitim Fakültesi', 41),
  ('İlköğretim', 'Eğitim Fakültesi', 42),
  ('Matematik ve Fen Bilimleri Eğitimi', 'Eğitim Fakültesi', 43),
  ('Ortaöğretim Sosyal Alanlar Eğitimi', 'Eğitim Fakültesi', 44),
  ('Türkçe ve Sosyal Bilimler Eğitimi', 'Eğitim Fakültesi', 45),
  ('Yabancı Diller Eğitimi', 'Eğitim Fakültesi', 46);

-- Uygulamalı Bilimler Yüksekokulu
insert into public.departments (name, faculty, display_order) values
  ('Turizm İşletmeciliği', 'Uygulamalı Bilimler Yüksekokulu', 50),
  ('Yönetim Bilişim Sistemleri', 'Uygulamalı Bilimler Yüksekokulu', 51),
  ('Uluslararası Ticaret (UBYO)', 'Uygulamalı Bilimler Yüksekokulu', 52);

-- Diğer / Hazırlık / YL programları
insert into public.departments (name, faculty, display_order) values
  ('BUSEL (Hazırlık)', 'Yabancı Diller Yüksekokulu', 90),
  ('Yüksek Lisans (Belirtilmemiş)', 'Lisansüstü', 91),
  ('Doktora (Belirtilmemiş)', 'Lisansüstü', 92),
  ('Diğer', 'Diğer', 99);

-- Badges catalog
insert into public.badges (code, name_tr, description_tr, icon, category, is_seasonal, display_order) values
  -- Milestones
  ('milestone_1', 'İlk Maç', 'İlk maçını oynadın!', '🎾', 'milestone', false, 100),
  ('milestone_3', '3 Maç', '3 maç oynadın.', '🎾', 'milestone', false, 101),
  ('milestone_5', '5 Maç', '5 maç oynadın.', '🎾', 'milestone', false, 102),
  ('milestone_10', '10 Maç', '10 maç oynadın.', '🏆', 'milestone', false, 103),
  ('milestone_25', '25 Maç', '25 maç oynadın.', '🏆', 'milestone', false, 104),
  ('milestone_50', '50 Maç', '50 maç oynadın.', '🥇', 'milestone', false, 105),
  ('milestone_100', '100 Maç', '100 maç oynadın!', '🥇', 'milestone', false, 106),
  ('milestone_250', '250 Maç', '250 maç oynadın!', '💎', 'milestone', false, 107),
  ('milestone_500', '500 Maç', 'Efsane: 500 maç!', '💎', 'milestone', false, 108),

  -- Wins
  ('win_1', 'İlk Zafer', 'İlk maçını kazandın!', '🏅', 'win', false, 200),
  ('win_3', '3 Zafer', '3 sıralama maçı kazandın.', '🏅', 'win', false, 201),
  ('win_5', '5 Zafer', '5 sıralama maçı kazandın.', '🏅', 'win', false, 202),
  ('win_10', '10 Zafer', '10 sıralama maçı kazandın.', '🥇', 'win', false, 203),
  ('win_25', '25 Zafer', '25 sıralama maçı kazandın.', '🥇', 'win', false, 204),
  ('win_50', '50 Zafer', '50 sıralama maçı kazandın!', '👑', 'win', false, 205),
  ('win_100', '100 Zafer', '100 sıralama maçı kazandın!', '👑', 'win', false, 206),
  ('win_bagel', 'Bagel', '4-0 (BÜ Klasik) veya 6-0 set kazandın.', '🥯', 'win', false, 210),
  ('win_comeback', 'Comeback', '0-2 setten 3-2''ye veya 1-3''ten 4-3''e döndün.', '🔥', 'win', false, 211),

  -- Social
  ('social_first_doubles', 'İlk Çift Maçı', 'İlk çift maçını oynadın.', '🤝', 'social', false, 300),
  ('social_5_partners', 'Çevremi Genişletiyorum', '5 farklı oyuncuyla çift oynadın.', '🤝', 'social', false, 301),
  ('social_10_opponents', 'Yeni Yüzler', '10 farklı rakiple maç yaptın.', '🌐', 'social', false, 302),

  -- Season
  ('season_top_10', 'Sezon Ladder Top 10', 'Sezon ladder''da Top 10''a girdin.', '⭐', 'season', true, 400),
  ('season_top_3', 'Sezon Ladder Top 3', 'Sezon ladder''da Top 3''e girdin.', '⭐', 'season', true, 401),
  ('season_champion', 'Sezon Şampiyonu', 'Sezon finalini kazandın.', '👑', 'season', true, 402),
  ('season_finalist', 'Sezon Finalisti', 'Sezon finaline kaldın.', '🥈', 'season', true, 403),
  ('season_semifinalist', 'Sezon Yarı Finalisti', 'Sezon yarı finaline kaldın.', '🥉', 'season', true, 404),

  -- Yearly
  ('yearly_champion', 'Yıllık Şampiyon', 'Yılın şampiyonu oldun!', '🏆', 'yearly', false, 500),

  -- Fun
  ('fun_night_owl', 'Gece Kuşu', '22:00 sonrası 5 maç oynadın.', '🦉', 'fun', false, 600),
  ('fun_early_bird', 'Erken Kuş', '09:00 öncesi 5 maç oynadın.', '🐦', 'fun', false, 601),
  ('fun_bebek_lover', 'Bebek Kort Sevdalısı', 'Bebek Kort''ta 10 maç oynadın.', '💙', 'fun', false, 602),
  ('fun_court_hopper', 'Saha Gezgini', '3 farklı kortta da maç oynamak', '🚶', 'fun', false, 603),
  ('fun_marathon', 'Maraton', '3 Set Klasik formatında 5 maç oynadın.', '🏃', 'fun', false, 604),

  -- Loyalty
  ('loyalty_first_season', '1. Sezon', 'İlk sezonunu tamamladın.', '🎖️', 'loyalty', false, 700),
  ('loyalty_one_year', '1 Yıl', '3 sezon (1 yıl) tamamladın.', '🎖️', 'loyalty', false, 701),
  ('loyalty_founder', 'Kurucu', 'İlk 50 üye arasındasın!', '🏛️', 'loyalty', false, 702);
