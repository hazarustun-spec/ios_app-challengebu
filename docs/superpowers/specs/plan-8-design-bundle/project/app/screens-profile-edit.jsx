/* global React, window, useApp, Icon, Avatar, Field, NavHeader, Button, CheckBox, DEPARTMENTS, PRONOUNS, ME */
// ============================================================
// PROFİL DÜZENLE — avatar · ad · zamir · bölüm · sınıf · seviye ·
// dominant el · müsaitlik. Mevcut form bileşenleri + düz dil.
// ============================================================
const { useState: peS } = React;

function Seg({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{ flex: 1, padding: '11px 8px', borderRadius: 'var(--r-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13.5, border: `1.5px solid var(--border-strong)`, background: on ? 'var(--text)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--text-2)', whiteSpace: 'nowrap' }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 9px' }}>{children}</div>;
}

function ProfileEdit({ params }) {
  const { nav } = useApp();
  const [pronoun, setPronoun] = peS(ME.pronoun);
  const [level, setLevel] = peS('orta');
  const [hand, setHand] = peS(ME.hand);
  const [avail, setAvail] = peS(['wd_eve', 'we_am']);
  const slots = [['wd_am', 'Hafta içi sabah'], ['wd_noon', 'Hafta içi öğlen'], ['wd_eve', 'Hafta içi akşam'], ['we_am', 'Hafta sonu sabah'], ['we_noon', 'Hafta sonu öğlen'], ['we_eve', 'Hafta sonu akşam']];
  const toggle = k => setAvail(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <NavHeader onBack={() => nav.back()} title="Profili düzenle" />
      <div className="scroll-y" style={{ flex: 1, minHeight: 0, padding: '4px 20px 20px' }}>

        {/* avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '6px 0 20px' }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={ME.name} slot="me-photo-edit" round size={92} />
            <div style={{ position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: '50%', background: 'var(--text)', border: '1.5px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" size={15} color="#fff" stroke={2.2} />
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--court)', fontFamily: 'var(--font-sans)' }}>Fotoğrafı değiştir</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="Ad Soyad" value={ME.name} />

          <div>
            <FieldLabel>Zamir</FieldLabel>
            <Seg value={pronoun} onChange={setPronoun} options={PRONOUNS.map(p => ({ value: p, label: p }))} />
          </div>

          <Field label="Bölüm" value={ME.dept} icon="search" suffix="değiştir" />

          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>Sınıf</FieldLabel>
              <Field value={ME.year + '. sınıf'} />
            </div>
            <div style={{ flex: 1 }}>
              <FieldLabel>Dominant el</FieldLabel>
              <Seg value={hand} onChange={setHand} options={[{ value: 'Sağ', label: 'Sağ' }, { value: 'Sol', label: 'Sol' }]} />
            </div>
          </div>

          <div>
            <FieldLabel>Tenis seviyesi</FieldLabel>
            <Seg value={level} onChange={setLevel} options={[{ value: 'baslangic', label: 'Başlangıç' }, { value: 'orta', label: 'Orta' }, { value: 'ileri', label: 'İleri' }]} />
          </div>

          <div>
            <FieldLabel>Müsaitlik</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {slots.map(([k, l]) => { const on = avail.includes(k); return (
                <button key={k} onClick={() => toggle(k)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px', borderRadius: 'var(--r-md)', border: `1.5px solid var(--border-strong)`, background: on ? 'var(--lime-soft)' : 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  <CheckBox checked={on} /><span style={{ fontWeight: 700, fontSize: 12.5, textAlign: 'left', lineHeight: 1.2 }}>{l}</span>
                </button>
              ); })}
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 20px 26px', borderTop: '1.5px solid var(--border)' }}>
        <Button full size="lg" onClick={() => { nav.toast('Profil güncellendi'); nav.back(); }}>Kaydet</Button>
      </div>
    </div>
  );
}

window.ProfileEdit = ProfileEdit;
if (window.registerScreens) window.registerScreens([{ id: 'profile_edit', group: 'Profil & Gamification', title: 'Profil düzenle', comp: ProfileEdit }]);
