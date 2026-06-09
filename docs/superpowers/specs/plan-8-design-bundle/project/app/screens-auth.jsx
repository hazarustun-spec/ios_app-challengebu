/* global React, window, useApp, Icon, Button, Field, NavHeader, Cloud, Squiggle, Star, Dots, BallMark */
// ============================================================
// AUTH — splash, welcome, email, otp  (screens 1-4)
// ============================================================
const { useState: aS, useEffect: aE } = React;

function Splash() {
  const { nav } = useApp();
  aE(() => { const t = setTimeout(() => nav.replace('welcome'), 1500); return () => clearTimeout(t); }, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 22 }}>
      <div style={{ animation: 'pop .6s cubic-bezier(.2,.9,.3,1.1)' }}><BallMark size={96} /></div>
      <div style={{ position: 'absolute', bottom: 60, display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--clay)', animation: `pulse 1s ${i * 0.18}s infinite` }} />)}
      </div>
    </div>
  );
}

function Welcome() {
  const { nav } = useApp();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 18px 24px' }}>
      {/* hero color block */}
      <div style={{ flex: 1, borderRadius: 'var(--r-xl)', background: 'var(--lime)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '26px 24px' }}>
        {/* doodles */}
        <Cloud w={150} color="rgba(22,22,24,.14)" fill="rgba(22,22,24,.14)" style={{ position: 'absolute', top: -10, right: -24 }} />
        <Squiggle w={70} color="var(--pink)" stroke={4} style={{ position: 'absolute', top: 130, left: 24 }} />
        <Star size={26} color="#fff" style={{ position: 'absolute', bottom: 170, right: 34 }} />
        <Dots size={42} color="rgba(22,22,24,.5)" style={{ position: 'absolute', bottom: 150, left: 30 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,.28)', padding: '6px 13px', borderRadius: 'var(--r-pill)', letterSpacing: '.02em' }}>BÜ TENİS · LADDER</span>
          <div style={{ animation: 'floaty 4s ease-in-out infinite' }}><BallMark size={52} color="#fff" /></div>
        </div>

        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.035em', lineHeight: .98, margin: 0, color: '#fff' }}>Meydan&nbsp;oku.<br />Tırman.<br />Şampiyon&nbsp;ol.</h1>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,.88)', marginTop: 16, lineHeight: 1.5, maxWidth: 290, fontWeight: 600 }}>Kampüsteki tenis topluluğunun sıralama, maç ve sezon platformu.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        <Button full size="lg" arrow onClick={() => nav.go('email')}>Üniversite e-postanla başla</Button>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5, margin: '2px 0 0', fontWeight: 600 }}>Öğrenci, personel ve mezun Boğaziçi hesapları.</p>
      </div>
    </div>
  );
}

function EmailScreen() {
  const { nav } = useApp();
  const [email, setEmail] = aS('');
  const valid = /@(std|pt|retired|alumni)\.bogazici\.edu\.tr$|@bogazici\.edu\.tr$/.test(email.trim());
  const dirty = email.length > 3;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} />
      <div style={{ flex: 1, padding: '8px 24px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.02em', margin: '8px 0 8px' }}>E-postanı gir</h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 28 }}>Sana giriş bağlantısı göndereceğiz. Sadece üniversite hesapları kabul edilir.</p>
        <Field icon="mail" placeholder="ad.soyad@std.bogazici.edu.tr" value={email} onChange={setEmail} type="email" autoFocus big
          error={dirty && !valid} hint={dirty && !valid ? 'Geçerli bir Boğaziçi e-postası gir (öğrenci, personel, mezun vb.).' : 'Öğrenci, akademisyen, personel, emekli ve mezun hesapları kabul edilir.'} />
        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          {['@std.bogazici.edu.tr', '@bogazici.edu.tr', '@alumni.bogazici.edu.tr'].map(d => (
            <button key={d} onClick={() => setEmail(e => (e.split('@')[0] || 'ad.soyad') + d)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--clay-text)', background: 'var(--clay-softer)', border: '1px solid var(--clay-soft)', padding: '7px 11px', borderRadius: 'var(--r-pill)', cursor: 'pointer' }}>{d}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 24px 26px' }}>
        <Button full size="lg" disabled={!valid} onClick={() => nav.go('otp', { email })} iconRight="chevR">Giriş bağlantısı gönder</Button>
      </div>
    </div>
  );
}

function OtpScreen({ params }) {
  const { nav } = useApp();
  const [code, setCode] = aS(['', '', '', '', '', '']);
  const [resent, setResent] = aS(false);
  const filled = code.join('').length === 6;
  aE(() => { if (filled) { const t = setTimeout(() => nav.reset('ob_name'), 500); return () => clearTimeout(t); } }, [filled]);
  const setDigit = (i, v) => { if (!/^\d?$/.test(v)) return; setCode(c => c.map((x, j) => j === i ? v : x)); };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} />
      <div style={{ flex: 1, padding: '8px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 'var(--r-lg)', background: 'var(--clay-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '14px 0 22px' }}>
          <Icon name="mail" size={30} color="var(--clay)" />
        </div>
        <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 8px' }}>Gelen kutunu kontrol et</h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 30 }}>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{params.email || 'e-postana'}</span> adresine 6 haneli bir kod ve sihirli bağlantı gönderdik.
        </p>
        <div style={{ display: 'flex', gap: 9, marginBottom: 24 }}>
          {code.map((d, i) => (
            <input key={i} value={d} onChange={e => setDigit(i, e.target.value.slice(-1))} inputMode="numeric" maxLength={1}
              autoFocus={i === 0} className="num"
              style={{ width: 44, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 700, borderRadius: 'var(--r-md)',
                border: `1.5px solid ${d ? 'var(--clay)' : 'var(--border-strong)'}`, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
          ))}
        </div>
        <button onClick={() => setResent(true)} style={{ fontSize: 14, fontWeight: 700, color: resent ? 'var(--text-3)' : 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer' }}>
          {resent ? 'Kod tekrar gönderildi · 0:59' : 'Kodu tekrar gönder'}
        </button>
      </div>
      <div style={{ padding: '0 24px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button full size="lg" variant="secondary" icon="link" onClick={() => nav.reset('ob_name')}>Sihirli bağlantıyı kullandım</Button>
      </div>
    </div>
  );
}

registerScreens([
  { id: 'splash', group: 'Auth & Onboarding', title: 'Splash', comp: Splash, noStatus: true },
  { id: 'welcome', group: 'Auth & Onboarding', title: 'Karşılama', comp: Welcome },
  { id: 'email', group: 'Auth & Onboarding', title: 'E-posta girişi', comp: EmailScreen },
  { id: 'otp', group: 'Auth & Onboarding', title: 'OTP / Sihirli bağlantı', comp: OtpScreen },
]);
