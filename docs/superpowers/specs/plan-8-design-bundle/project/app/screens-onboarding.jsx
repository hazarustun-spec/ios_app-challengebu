/* global React, window, useApp, Icon, Button, Field, NavHeader, Segmented, CheckBox, Toggle, Progress, Sheet, Avatar, DEPARTMENTS, LEVELS, BallMark */
// ============================================================
// ONBOARDING wizard  (screens 5-16)
// ============================================================
const { useState: oS } = React;
window.OB = window.OB || { name: '', surname: '', pronoun: 'he/him', category: 'erkek', dept: '', deptShow: true, year: '', yearShow: true, level: 'orta', hand: 'Sağ', avail: [], photo: false };

const OB_STEPS = ['ob_name','ob_phone','ob_pronoun','ob_category','ob_dept','ob_year','ob_level','ob_hand','ob_avail','ob_photo'];

function OBFrame({ stepId, title, subtitle, children, onNext, nextLabel = 'Devam', canNext = true, onSkip, foot }) {
  const { nav } = useApp();
  const idx = OB_STEPS.indexOf(stepId);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => nav.back()} style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="back" size={20} /></button>
        <div style={{ flex: 1 }}><Progress value={(idx + 1) / OB_STEPS.length * 100} /></div>
        <span className="num" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)' }}>{idx + 1}/{OB_STEPS.length}</span>
      </div>
      <div className="scroll-y" style={{ flex: 1, padding: '20px 24px 8px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 8px' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 26px' }}>{subtitle}</p>}
        {children}
      </div>
      <div style={{ padding: '8px 24px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {foot}
        <div style={{ display: 'flex', gap: 10 }}>
          {onSkip && <Button variant="secondary" size="lg" onClick={onSkip} style={{ flex: 1 }}>Atla</Button>}
          <Button size="lg" disabled={!canNext} onClick={onNext} iconRight="chevR" style={{ flex: onSkip ? 2 : 1 }} full={!onSkip}>{nextLabel}</Button>
        </div>
      </div>
    </div>
  );
}

const set = (k, v) => { window.OB[k] = v; };

function ObName() { const { nav } = useApp(); const [v, sv] = oS(window.OB.name); const [s2, ss2] = oS(window.OB.surname);
  return <OBFrame stepId="ob_name" title="Adın ve soyadın" subtitle="Sıralama ve maçlarda bu isimle görüneceksin." canNext={v.trim().length > 0 && s2.trim().length > 0} onNext={() => { set('name', v); set('surname', s2); nav.go('ob_phone'); }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="Ad" placeholder="Ad" value={v} onChange={sv} autoFocus big icon="user" />
      <Field label="Soyad" placeholder="Soyad" value={s2} onChange={ss2} big icon="user" />
    </div>
  </OBFrame>; }

function ObPhone() { const { nav } = useApp(); const [v, sv] = oS('');
  return <OBFrame stepId="ob_phone" title="Telefon (opsiyonel)" subtitle="Rakiplerinle kort koordinasyonu için kullanılır. İstersen sonra eklersin." nextLabel="Devam" onSkip={() => nav.go('ob_pronoun')} onNext={() => { set('phone', v); nav.go('ob_pronoun'); }}>
    <Field placeholder="5XX XXX XX XX" value={v} onChange={sv} type="tel" big icon="phone" suffix="🇹🇷 +90" />
  </OBFrame>; }

function PickList({ value, options, onPick, cols = 1 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} onClick={() => onPick(o.value)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', textAlign: 'left', cursor: 'pointer',
            borderRadius: 'var(--r-md)', border: `1.5px solid ${on ? 'var(--clay)' : 'var(--border-strong)'}`,
            background: on ? 'var(--clay-softer)' : 'var(--surface)', fontFamily: 'var(--font-sans)',
          }}>
            {o.icon && <div style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', background: on ? 'var(--clay-soft)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={o.icon} size={20} color={on ? 'var(--clay)' : 'var(--text-2)'} /></div>}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--text)' }}>{o.label}</div>
              {o.desc && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4 }}>{o.desc}</div>}
            </div>
            <div style={{ width: 22, height: 22, borderRadius: '50%', border: on ? 'none' : '2px solid var(--border-strong)', background: on ? 'var(--clay)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on && <Icon name="check" size={14} color="#fff" stroke={3} />}</div>
          </button>
        );
      })}
    </div>
  );
}
window.PickList = PickList;

function ObPronoun() { const { nav } = useApp(); const [v, sv] = oS(window.OB.pronoun);
  return <OBFrame stepId="ob_pronoun" title="Zamirin" subtitle="Profilinde “Ali (he/him)” biçiminde küçük bir çip olarak görünür." onNext={() => { set('pronoun', v); nav.go('ob_category'); }}>
    <PickList value={v} onPick={sv} options={[{ value: 'he/him', label: 'he/him' }, { value: 'she/her', label: 'she/her' }, { value: 'they/them', label: 'they/them' }, { value: 'other', label: 'Diğer / belirtmek istemiyorum' }]} />
  </OBFrame>; }

function ObCategory() { const { nav } = useApp(); const [v, sv] = oS(window.OB.category);
  return <OBFrame stepId="ob_category" title="Yarışma kategorin" subtitle="Hangi tekler sıralamalarında yer alacağını belirler. Open sıralamalarına herkes katılabilir." onNext={() => { set('category', v); nav.go('ob_dept'); }}>
    <PickList value={v} onPick={sv} options={[
      { value: 'erkek', label: 'Erkek', icon: 'user', desc: 'Erkek Tek + Open Tek sıralamalarında yer alırsın.' },
      { value: 'kadin', label: 'Kadın', icon: 'user', desc: 'Kadın Tek + Open Tek sıralamalarında yer alırsın.' },
      { value: 'open', label: 'Sadece Open', icon: 'ranking', desc: 'Yalnızca Open Tek sıralamasında yer alırsın.' },
    ]} />
    <div style={{ marginTop: 16, display: 'flex', gap: 10, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
      <Icon name="info" size={18} color="var(--info)" />
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>Bu seçim sıralama uygunluğunu etkiler, ayarlardan sonra değiştirilebilir.</p>
    </div>
  </OBFrame>; }

function ObDept() { const { nav } = useApp(); const [v, sv] = oS(window.OB.dept); const [show, ss] = oS(window.OB.deptShow);
  const open = () => nav.sheet(<DeptSheet value={v} onPick={(d) => { sv(d); nav.closeSheet(); }} />);
  return <OBFrame stepId="ob_dept" title="Bölümün" subtitle="Profilinde göstermek senin tercihin." canNext={!!v} onNext={() => { set('dept', v); set('deptShow', show); nav.go('ob_year'); }}>
    <button onClick={open} style={{ width: '100%', height: 58, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
      <Icon name="list" size={20} color="var(--text-3)" />
      <span style={{ flex: 1, textAlign: 'left', fontSize: 16, fontWeight: v ? 600 : 500, color: v ? 'var(--text)' : 'var(--text-3)' }}>{v || 'Bölüm seç'}</span>
      <Icon name="chevD" size={20} color="var(--text-3)" />
    </button>
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, padding: '6px 2px', cursor: 'pointer' }} onClick={() => ss(!show)}>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>Profilimde göster</div><div style={{ fontSize: 13, color: 'var(--text-3)' }}>Diğer oyuncular bölümünü görebilir</div></div>
      <Toggle value={show} onChange={ss} />
    </label>
  </OBFrame>; }

function DeptSheet({ value, onPick }) {
  const [q, sq] = oS('');
  const list = DEPARTMENTS.filter(d => d.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet onClose={() => useApp().nav.closeSheet()} title="Bölüm seç">
      <Field icon="search" placeholder="Bölüm ara…" value={q} onChange={sq} autoFocus />
      <div style={{ marginTop: 12, maxHeight: 380, overflowY: 'auto' }}>
        {list.map(d => (
          <button key={d} onClick={() => onPick(d)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 6px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', textAlign: 'left' }}>{d}</span>
            {value === d && <Icon name="check" size={18} color="var(--clay)" stroke={3} />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function ObYear() { const { nav } = useApp(); const [v, sv] = oS(window.OB.year); const [show, ss] = oS(window.OB.yearShow);
  const years = ['Hazırlık', '1', '2', '3', '4', 'Yüksek Lisans', 'Doktora'];
  return <OBFrame stepId="ob_year" title="Sınıfın" canNext={!!v} onNext={() => { set('year', v); set('yearShow', show); nav.go('ob_level'); }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
      {years.map(y => { const on = v === y; return (
        <button key={y} onClick={() => sv(y)} style={{ padding: '12px 18px', borderRadius: 'var(--r-pill)', border: `1.5px solid ${on ? 'var(--clay)' : 'var(--border-strong)'}`, background: on ? 'var(--clay)' : 'var(--surface)', color: on ? '#fff' : 'var(--text)', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{y}</button>
      ); })}
    </div>
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, padding: '6px 2px', cursor: 'pointer' }} onClick={() => ss(!show)}>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>Profilimde göster</div></div>
      <Toggle value={show} onChange={ss} />
    </label>
  </OBFrame>; }

function ObLevel() { const { nav } = useApp(); const [v, sv] = oS(window.OB.level);
  return <OBFrame stepId="ob_level" title="Tenis seviyen" subtitle="Başlangıç ELO’nu belirlemeye yardımcı olur. İlk 10 maçta hızla kalibre olur." onNext={() => { set('level', v); nav.go('ob_hand'); }}>
    <PickList value={v} onPick={sv} options={[
      { value: 'baslangic', label: 'Başlangıç', icon: 'spark', desc: 'Yeni başlıyorum / temel vuruşlar.' },
      { value: 'orta', label: 'Orta', icon: 'bolt', desc: 'Düzenli oynuyorum, ralli kurabiliyorum.' },
      { value: 'ileri', label: 'İleri', icon: 'flame', desc: 'Maç tecrübem var, taktik oynuyorum.' },
    ]} />
  </OBFrame>; }

function ObHand() { const { nav } = useApp(); const [v, sv] = oS(window.OB.hand);
  return <OBFrame stepId="ob_hand" title="Dominant elin" onNext={() => { set('hand', v); nav.go('ob_avail'); }}>
    <PickList value={v} onPick={sv} cols={2} options={[{ value: 'Sağ', label: 'Sağ' }, { value: 'Sol', label: 'Sol' }]} />
  </OBFrame>; }

function ObAvail() { const { nav } = useApp(); const [v, sv] = oS(window.OB.avail);
  const slots = [['wd_am', 'Hafta içi sabah'], ['wd_noon', 'Hafta içi öğlen'], ['wd_eve', 'Hafta içi akşam'], ['we_am', 'Hafta sonu sabah'], ['we_noon', 'Hafta sonu öğlen'], ['we_eve', 'Hafta sonu akşam']];
  const toggle = k => sv(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k]);
  return <OBFrame stepId="ob_avail" title="Müsaitliğin" subtitle="Sana uygun rakipler önerebilmemiz için ne zaman oynayabildiğini seç." canNext={v.length > 0} onNext={() => { set('avail', v); nav.go('ob_photo'); }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {slots.map(([k, l]) => { const on = v.includes(k); return (
        <button key={k} onClick={() => toggle(k)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px', borderRadius: 'var(--r-md)', border: `1.5px solid ${on ? 'var(--grass)' : 'var(--border-strong)'}`, background: on ? 'var(--grass-soft)' : 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          <CheckBox checked={on} />
          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', textAlign: 'left', lineHeight: 1.25 }}>{l}</span>
        </button>
      ); })}
    </div>
  </OBFrame>; }

function ObPhoto() { const { nav } = useApp(); const [has, sh] = oS(false);
  return <OBFrame stepId="ob_photo" title="Profil fotoğrafı" subtitle="Opsiyonel — rakiplerin seni tanısın. İstemezsen baş harflerin gösterilir." nextLabel="Bitir" onSkip={() => { set('photo', false); nav.go('ob_done'); }} onNext={() => { set('photo', has); nav.go('ob_done'); }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '10px 0' }}>
      <div onClick={() => sh(true)} style={{ cursor: 'pointer', position: 'relative' }}>
        {has ? <Avatar name={(window.OB.name || 'A') + ' ' + (window.OB.surname || 'Y')} size={120} /> :
          <div style={{ width: 120, height: 120, borderRadius: 'var(--r-xl)', background: 'var(--surface-2)', border: '2px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={34} color="var(--text-3)" /></div>}
        <div style={{ position: 'absolute', right: -4, bottom: -4, width: 38, height: 38, borderRadius: '50%', background: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg)' }}><Icon name="plus" size={18} color="#fff" stroke={2.6} /></div>
      </div>
      <button onClick={() => sh(true)} style={{ fontSize: 14, fontWeight: 700, color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer' }}>Fotoğraf yükle</button>
    </div>
  </OBFrame>; }

function ObDone() { const { nav } = useApp(); const lvl = LEVELS.find(l => l.key === 'caylak');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 18px 24px' }}>
      {/* hero block */}
      <div style={{ flex: 1, borderRadius: 'var(--r-xl)', background: 'var(--lime)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '30px 26px' }}>
        <Cloud w={150} color="rgba(255,255,255,.25)" fill="rgba(255,255,255,.25)" style={{ position: 'absolute', top: -14, left: -20 }} />
        <Squiggle w={64} color="var(--pink)" stroke={4} style={{ position: 'absolute', top: 40, right: 28 }} />
        <Star size={22} color="#fff" style={{ position: 'absolute', bottom: 150, left: 30 }} />
        <Dots size={40} color="rgba(22,22,24,.45)" style={{ position: 'absolute', bottom: 60, right: 26 }} />

        <div style={{ position: 'relative', animation: 'pop .55s cubic-bezier(.2,.9,.3,1.1)' }}><BallMark size={92} color="#fff" /></div>
        <span style={{ position: 'relative', marginTop: 22, fontSize: 12.5, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,.26)', padding: '6px 14px', borderRadius: 'var(--r-pill)', letterSpacing: '.04em' }}>PROFİL HAZIR</span>
        <h1 style={{ position: 'relative', fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.02, margin: '14px 0 0', color: '#fff' }}>Hoş geldin,<br />{window.OB.name || 'oyuncu'}!</h1>
        <p style={{ position: 'relative', fontSize: 15, color: 'rgba(255,255,255,.92)', lineHeight: 1.5, margin: '12px 0 0', maxWidth: 280, fontWeight: 600 }}>İlk 10 maçında ELO’n hızla gerçek yerini bulacak.</p>
      </div>

      {/* stat strip */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1, background: 'var(--surface)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '.06em' }}>BAŞLANGIÇ ELO</div>
          <div className="num tc-display" style={{ fontWeight: 800, fontSize: 26, marginTop: 3 }}>1200</div>
        </div>
        <div style={{ flex: 1, background: 'var(--court)', borderRadius: 'var(--r-md)', padding: '14px 16px', border: '1.5px solid var(--border-strong)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'color-mix(in srgb,var(--bg) 55%,transparent)', letterSpacing: '.06em' }}>SEVİYE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}><LevelIcon level={lvl} size={18} /><span className="tc-display" style={{ fontWeight: 800, fontSize: 17, color: 'var(--bg)' }}>{lvl.name}</span></div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button full size="lg" arrow onClick={() => nav.reset('leaderboard')}>Sıralamayı keşfet</Button>
        <Button full size="md" variant="ghost" onClick={() => nav.reset('new_match_type')}>İlk maçını oluştur</Button>
      </div>
    </div>
  );
}

registerScreens([
  { id: 'ob_name', group: 'Auth & Onboarding', title: 'Onboarding · Ad Soyad', comp: ObName },
  { id: 'ob_phone', group: 'Auth & Onboarding', title: 'Onboarding · Telefon', comp: ObPhone },
  { id: 'ob_pronoun', group: 'Auth & Onboarding', title: 'Onboarding · Zamir', comp: ObPronoun },
  { id: 'ob_category', group: 'Auth & Onboarding', title: 'Onboarding · Kategori', comp: ObCategory },
  { id: 'ob_dept', group: 'Auth & Onboarding', title: 'Onboarding · Bölüm', comp: ObDept },
  { id: 'ob_year', group: 'Auth & Onboarding', title: 'Onboarding · Sınıf', comp: ObYear },
  { id: 'ob_level', group: 'Auth & Onboarding', title: 'Onboarding · Seviye', comp: ObLevel },
  { id: 'ob_hand', group: 'Auth & Onboarding', title: 'Onboarding · Dominant el', comp: ObHand },
  { id: 'ob_avail', group: 'Auth & Onboarding', title: 'Onboarding · Müsaitlik', comp: ObAvail },
  { id: 'ob_photo', group: 'Auth & Onboarding', title: 'Onboarding · Fotoğraf', comp: ObPhoto },
  { id: 'ob_done', group: 'Auth & Onboarding', title: 'Onboarding · Tamamlandı', comp: ObDone },
]);
