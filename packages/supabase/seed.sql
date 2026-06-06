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
