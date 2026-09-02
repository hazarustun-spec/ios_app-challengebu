-- Plan 8 Phase D polish: full university departments list (lisans + lisansüstü)
-- Replaces the 37-row dev seed with the official list grouped by faculty/enstitü.

-- Clear existing rows; pre-launch so no FK consequence beyond profiles
-- that referenced old IDs. Profiles created via onboarding will re-pick.
update public.profiles set department_id = null where department_id is not null;
delete from public.departments;

-- ============================================================
-- LİSANS (undergraduate)
-- ============================================================

insert into public.departments (name, faculty, program_level, display_order, is_active) values
  -- Eğitim Fakültesi
  ('Bilgisayar ve Öğretim Teknolojileri Eğitimi Bölümü', 'Eğitim Fakültesi', 'lisans', 100, true),
  ('Eğitim Bilimleri Bölümü', 'Eğitim Fakültesi', 'lisans', 101, true),
  ('Temel Eğitim Bölümü', 'Eğitim Fakültesi', 'lisans', 102, true),
  ('Matematik ve Fen Bilimleri Eğitimi Bölümü', 'Eğitim Fakültesi', 'lisans', 103, true),
  ('Yabancı Diller Eğitimi Bölümü', 'Eğitim Fakültesi', 'lisans', 104, true),

  -- Fen Fakültesi
  ('Fizik Bölümü', 'Fen Fakültesi', 'lisans', 200, true),
  ('Kimya Bölümü', 'Fen Fakültesi', 'lisans', 201, true),
  ('Matematik Bölümü', 'Fen Fakültesi', 'lisans', 202, true),
  ('Moleküler Biyoloji ve Genetik Bölümü', 'Fen Fakültesi', 'lisans', 203, true),

  -- Hukuk Fakültesi (no specific programs listed; faculty-level entry)
  ('Hukuk', 'Hukuk Fakültesi', 'lisans', 300, true),

  -- İktisadi ve İdari Bilimler Fakültesi
  ('Ekonomi Bölümü', 'İktisadi ve İdari Bilimler Fakültesi', 'lisans', 400, true),
  ('İşletme Bölümü', 'İktisadi ve İdari Bilimler Fakültesi', 'lisans', 401, true),
  ('Siyaset Bilimi ve Uluslararası İlişkiler Bölümü', 'İktisadi ve İdari Bilimler Fakültesi', 'lisans', 402, true),
  ('Turizm İşletmeciliği Bölümü', 'İktisadi ve İdari Bilimler Fakültesi', 'lisans', 403, true),
  ('Uluslararası Ticaret Bölümü', 'İktisadi ve İdari Bilimler Fakültesi', 'lisans', 404, true),
  ('Yönetim Bilişim Sistemleri Bölümü', 'İktisadi ve İdari Bilimler Fakültesi', 'lisans', 405, true),

  -- İnsan ve Toplum Bilimleri Fakültesi
  ('Sosyoloji Bölümü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 500, true),
  ('Psikoloji Bölümü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 501, true),
  ('Tarih Bölümü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 502, true),
  ('Türk Dili ve Edebiyatı Bölümü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 503, true),
  ('Çeviribilimi Bölümü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 504, true),
  ('Dilbilimi Bölümü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 505, true),
  ('Felsefe Bölümü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 506, true),
  ('Batı Dilleri ve Edebiyatları Bölümü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 507, true),
  ('Beşeri Bilimler (Humanities) Dersleri Koordinatörlüğü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 508, true),
  ('Türkçe Dersleri Koordinatörlüğü', 'İnsan ve Toplum Bilimleri Fakültesi', 'lisans', 509, true),

  -- Mühendislik Fakültesi
  ('Bilgisayar Mühendisliği Bölümü', 'Mühendislik Fakültesi', 'lisans', 600, true),
  ('Elektrik-Elektronik Mühendisliği Bölümü', 'Mühendislik Fakültesi', 'lisans', 601, true),
  ('Endüstri Mühendisliği Bölümü', 'Mühendislik Fakültesi', 'lisans', 602, true),
  ('İnşaat Mühendisliği Bölümü', 'Mühendislik Fakültesi', 'lisans', 603, true),
  ('Kimya Mühendisliği Bölümü', 'Mühendislik Fakültesi', 'lisans', 604, true),
  ('Makina Mühendisliği Bölümü', 'Mühendislik Fakültesi', 'lisans', 605, true),

  -- Yabancı Diller Yüksekokulu
  ('İleri İngilizce Birimi', 'Yabancı Diller Yüksekokulu', 'lisans', 700, true),
  ('İngilizce Hazırlık Birimi', 'Yabancı Diller Yüksekokulu', 'lisans', 701, true),
  ('Modern Diller Birimi', 'Yabancı Diller Yüksekokulu', 'lisans', 702, true);

-- ============================================================
-- LİSANSÜSTÜ (graduate)
-- ============================================================

insert into public.departments (name, faculty, program_level, display_order, is_active) values
  -- Atatürk İlkeleri ve İnkılap Tarihi Enstitüsü
  ('Türkiye Cumhuriyeti Tarihi Programı', 'Atatürk İlkeleri ve İnkılap Tarihi Enstitüsü', 'lisansustu', 1000, true),

  -- Biyomedikal Mühendisliği Enstitüsü
  ('Biyomedikal Mühendisliği Lisansüstü Programları', 'Biyomedikal Mühendisliği Enstitüsü', 'lisansustu', 1100, true),

  -- Çevre Bilimleri Enstitüsü
  ('Çevre Bilimleri Lisansüstü Programları', 'Çevre Bilimleri Enstitüsü', 'lisansustu', 1200, true),
  ('Çevre Teknolojisi Lisansüstü Programları', 'Çevre Bilimleri Enstitüsü', 'lisansustu', 1201, true),

  -- Fen Bilimleri Enstitüsü
  ('Bilgisayar Mühendisliği Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1300, true),
  ('Elektrik-Elektronik Mühendisliği Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1301, true),
  ('Endüstri Mühendisliği Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1302, true),
  ('Fizik Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1303, true),
  ('Hesaplamalı Bilim ve Mühendislik Yüksek Lisans Anabilim Dalı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1304, true),
  ('İnşaat Mühendisliği Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1305, true),
  ('Kimya Mühendisliği Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1306, true),
  ('Kimya Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1307, true),
  ('Matematik Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1308, true),
  ('Makina Mühendisliği Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1309, true),
  ('Moleküler Biyoloji ve Genetik Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1310, true),
  ('Matematik ve Fen Bilimleri Eğitimi Lisansüstü Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1311, true),
  ('Sistem ve Kontrol Mühendisliği Yüksek Lisans Programı', 'Fen Bilimleri Enstitüsü', 'lisansustu', 1312, true),

  -- Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü
  ('Jeodezi Lisansüstü Programları', 'Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü', 'lisansustu', 1400, true),
  ('Jeofizik Lisansüstü Programları', 'Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü', 'lisansustu', 1401, true),
  ('Deprem Mühendisliği Lisansüstü Programları', 'Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü', 'lisansustu', 1402, true),
  ('Deprem Riskinin Azaltılması Yüksek Lisans Programı', 'Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü', 'lisansustu', 1403, true),

  -- Sosyal Bilimler Enstitüsü
  ('Batı Dilleri ve Edebiyatları Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1500, true),
  ('İngiliz Edebiyatı Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1501, true),
  ('Çeviribilimi Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1502, true),
  ('Konferans Çevirmenliği Tezsiz Yüksek Lisans', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1503, true),
  ('Yazılı Çeviri Lisansüstü Programı (M.A.)', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1504, true),
  ('Çeviribilimi Lisansüstü Programı (Ph.D.)', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1505, true),
  ('Bilişsel Bilim Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1506, true),
  ('Dilbilimi Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1507, true),
  ('Eğitim Bilimleri Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1508, true),
  ('Eğitim Teknolojisi Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1509, true),
  ('Eleştiri ve Kültür Çalışmaları Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1510, true),
  ('Erken Çocukluk Eğitimi Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1511, true),
  ('Felsefe Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1512, true),
  ('İktisat Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1513, true),
  ('İngiliz Dili Eğitimi Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1514, true),
  ('İşletme Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1515, true),
  ('Kamu Hukuku Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1516, true),
  ('Öğrenme Bilimleri Doktora Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1517, true),
  ('Özel Hukuk Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1518, true),
  ('Klinik Psikoloji Doktora Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1519, true),
  ('Psikoloji Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1520, true),
  ('Siyaset Bilimi ve Uluslararası İlişkiler Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1521, true),
  ('Sosyal Politika Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1522, true),
  ('Sosyoloji Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1523, true),
  ('Sürdürülebilir Turizm Yönetimi Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1524, true),
  ('Tarih Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1525, true),
  ('Türk Dili ve Edebiyatı Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1526, true),
  ('Uluslararası Ticaret Yönetimi Yüksek Lisans Programı', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1527, true),
  ('Yönetim Bilişim Sistemleri Lisansüstü Programları', 'Sosyal Bilimler Enstitüsü', 'lisansustu', 1528, true),

  -- Veri Bilimi ve Yapay Zeka Enstitüsü
  ('Veri Bilimi ve Yapay Zeka Lisansüstü Programları', 'Veri Bilimi ve Yapay Zeka Enstitüsü', 'lisansustu', 1600, true),

  -- İkinci Öğretim Tezsiz Yüksek Lisans Programları
  ('Asya Çalışmaları Yüksek Lisans Programı (Tezsiz)', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1700, true),
  ('Ekonomi ve Finans Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1701, true),
  ('Executive MBA Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1702, true),
  ('Finans Mühendisliği Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1703, true),
  ('İşletme Bilişim Sistemleri Yüksek Lisans Programı (Tezsiz)', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1704, true),
  ('Mekatronik Mühendisliği Yüksek Lisans Programı (Tezsiz)', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1705, true),
  ('Mühendislik ve Teknoloji Yönetimi Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1706, true),
  ('Sınıf Öğretmenliği Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1707, true),
  ('Tıbbi Sistemler ve Bilişim Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1708, true),
  ('Otomotiv Mühendisliği Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1709, true),
  ('Uluslararası İlişkiler: Türkiye, Avrupa ve Orta Doğu Yüksek Lisans Programı (Tezsiz)', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1710, true),
  ('Uluslararası Rekabet ve Ticaret Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1711, true),
  ('Yabancı Dil Öğretimi II. Öğretim Tezsiz Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1712, true),
  ('Yakıt ve Enerji Teknolojileri Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1713, true),
  ('Yapım Mühendisliği ve Yönetimi Yüksek Lisans Programı', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1714, true),
  ('Yazılım Mühendisliği Yüksek Lisans Programı (Tezsiz)', 'İkinci Öğretim Tezsiz YL', 'lisansustu', 1715, true),

  -- İkinci Öğretim Tezli Yüksek Lisans Programları
  ('Asya Çalışmaları Yüksek Lisans Programı (Tezli)', 'İkinci Öğretim Tezli YL', 'lisansustu', 1800, true),
  ('İşletme Bilişim Sistemleri Yüksek Lisans Programı (Tezli)', 'İkinci Öğretim Tezli YL', 'lisansustu', 1801, true),
  ('Mekatronik Mühendisliği Yüksek Lisans Programı (Tezli)', 'İkinci Öğretim Tezli YL', 'lisansustu', 1802, true),
  ('Uluslararası İlişkiler: Türkiye, Avrupa ve Orta Doğu (Tezli)', 'İkinci Öğretim Tezli YL', 'lisansustu', 1803, true),
  ('Yazılım Mühendisliği Yüksek Lisans Programı (Tezli)', 'İkinci Öğretim Tezli YL', 'lisansustu', 1804, true);
