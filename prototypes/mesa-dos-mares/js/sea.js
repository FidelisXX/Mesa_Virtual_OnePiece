// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// O mar em 3D low-poly toon: fundo da tela inicial e a luta naval em tempo real (a viagem em si é a carta náutica 2D).
'use strict';

const Sea = (() => {
  let renderer, scn, camera, water, sky;
  const ships3d = {}, wakes = [], clouds = [], balls = [], splashes = [], islands3d = [];
  let t = 0, camYaw = 0, camZoom = 1, orbit = null, titleAng = 0, wakeClock = 0;
  const SEG = 90, SIZE = 720, ARENA = { x: 1500, z: 1500, r: 340 };
  const OLD3D = [ // ilhas decorativas da tela inicial
    { id: 'foosha', x: -210, z: 170, r: 26, tema: 'vila', telhado: 0xc4472f, nome: 'Vila Foosha' },
    { id: 'shells', x: -10, z: 20, r: 30, tema: 'base', telhado: 0x2f5fa8, nome: 'Shells Town' },
    { id: 'orange', x: 190, z: 110, r: 28, tema: 'cidade', telhado: 0xe08a2a, nome: 'Orange Town' },
    { id: 'baratie', x: 70, z: -190, r: 22, tema: 'navio', telhado: 0xd8c08a, nome: 'Baratie' },
  ];
  const lam = (color, extra) => new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: true }, extra || {}));

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !CHEAP });
    renderer.setPixelRatio(CHEAP ? 0.5 : Math.min(devicePixelRatio || 1, 2));
    scn = new THREE.Scene();
    const sc = document.createElement('canvas'); sc.width = 4; sc.height = 256; const sg = sc.getContext('2d');
    const gr = sg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#3d9be0'); gr.addColorStop(0.55, '#8fd3f4'); gr.addColorStop(1, '#e6f7fb');
    sg.fillStyle = gr; sg.fillRect(0, 0, 4, 256); sky = new THREE.CanvasTexture(sc); sky.colorSpace = THREE.SRGBColorSpace;
    scn.background = sky; scn.fog = new THREE.Fog(0xcdeef7, 260, 820);
    camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.5, 2500);
    scn.add(new THREE.HemisphereLight(0xeaf8ff, 0x2a8f9f, 1.9));
    const sun = new THREE.DirectionalLight(0xfff1d0, 2.4); sun.position.set(120, 200, 80); scn.add(sun);
    const wg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); wg.rotateX(-Math.PI / 2);
    water = new THREE.Mesh(wg, new THREE.MeshPhongMaterial({ color: 0x23b3c7, flatShading: true, shininess: 90, specular: 0x9ff6ff }));
    scn.add(water);
    const base = new THREE.Mesh(new THREE.CircleGeometry(4000, 24).rotateX(-Math.PI / 2), lam(0x1b98ad)); base.position.y = -1.6; scn.add(base);
    OLD3D.forEach(buildIsland);
    const R = artRng(77);
    for (let i = 0; i < 16; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(8 + R() * 8, 0), lam(0xffffff, { emissive: 0x9aa8b0 })); m.position.set(k * 9 - 13, R() * 3, R() * 6); m.scale.y = 0.45; c.add(m); }
      c.position.set(ARENA.x + (R() - 0.5) * 1000, 80 + R() * 50, ARENA.z + (R() - 0.5) * 1000); scn.add(c); clouds.push(c);
    }
    canvas.addEventListener('pointerdown', e => { orbit = { x: e.clientX, yaw: camYaw }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (orbit) camYaw = orbit.yaw - (e.clientX - orbit.x) * 0.008; });
    canvas.addEventListener('pointerup', () => { orbit = null; });
    canvas.addEventListener('wheel', e => { e.preventDefault(); camZoom = clamp(camZoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.4, 3); }, { passive: false });
    canvas.addEventListener('dblclick', () => { camYaw = 0; camZoom = 1; });
  }

  function waveY(x, z) {
    const s = t * 1.1, h = 0.9;
    return h * (Math.sin(x * 0.07 + s) + 0.7 * Math.sin(z * 0.09 - s * 1.3) + 0.5 * Math.sin((x + z) * 0.045 + s * 0.6)) / 2.2;
  }

  function buildIsland(isl) {
    const g = new THREE.Group(), R = artRng(hashStr(isl.id) + 3), r = isl.r;
    g.position.set(isl.x, 0, isl.z); scn.add(g);
    const roof = lam(isl.telhado), wall = lam(0xf4ecd8), wood = lam(0x7a5230), leaf = lam(0x5fb34a), leaf2 = lam(0x3f9a3c);
    const house = (x, z, s = 1, rot = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(3 * s, 2.6 * s, 3 * s), wall); b.position.set(x, 1.3 * s, z); b.rotation.y = rot; const c = new THREE.Mesh(new THREE.ConeGeometry(2.6 * s, 2 * s, 4), roof); c.position.set(0, 2.3 * s, 0); c.rotation.y = Math.PI / 4; b.add(c); return b; };
    const tree = (x, z, y) => { const tr = new THREE.Group(); tr.position.set(x, y, z); const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3, 5), wood); tk.position.y = 1.5; tr.add(tk); const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 0), R() > 0.5 ? leaf : leaf2); lf.position.y = 3.6; tr.add(lf); return tr; };
    if (isl.tema === 'navio') {
      const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam(0xe7dcc0)); hull.scale.set(11, 5, 22); hull.position.y = 2.4; g.add(hull);
      const hall = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 16), lam(0xf4ecd8)); hall.position.set(0, 5.8, -1); g.add(hall);
      const top = new THREE.Mesh(new THREE.ConeGeometry(10, 4, 4), roof); top.position.set(0, 10.8, -1); top.rotation.y = Math.PI / 4; top.scale.z = 1.3; g.add(top);
      const fish = new THREE.Mesh(new THREE.ConeGeometry(3.4, 8, 6), lam(0xd8b04a)); fish.rotation.x = Math.PI / 2; fish.position.set(0, 4, 23); g.add(fish);
    } else {
      const sand = new THREE.Mesh(new THREE.CylinderGeometry(r + 1, r + 5, 2.4, 11), lam(0xecd59c)); sand.position.y = 0.3; g.add(sand);
      const grass = new THREE.Mesh(new THREE.CylinderGeometry(r - 2, r + 0.5, 3, 11), lam(0x82c95b)); grass.position.y = 2; g.add(grass);
      const hill = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * (isl.tema === 'vila' ? 0.9 : 0.6), 7), lam(0x5aa548)); hill.position.set(-r * 0.25, 3.5 + r * 0.3, -r * 0.3); g.add(hill);
      for (let i = 0; i < (isl.tema === 'cidade' ? 14 : 6); i++) { const a = R() * Math.PI * 2, d = 5 + R() * (r - 9); const h = house(Math.cos(a) * d, Math.sin(a) * d, 0.9 + R() * 0.4, R() * 3); h.position.y += 3.4; g.add(h); }
      for (let i = 0; i < 10; i++) { const a = R() * Math.PI * 2, d = 4 + R() * (r - 5); g.add(tree(Math.cos(a) * d, Math.sin(a) * d, 3.4)); }
      if (isl.tema === 'base') {
        const wm = lam(0xd9d6cc), b = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 10), wm); b.position.set(2, 7.4, -4); g.add(b);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(14.2, 1.2, 10.2), lam(0x2f5fa8)); stripe.position.set(2, 9.5, -4); g.add(stripe);
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 16, 8), wm); tw.position.set(8, 11.4, -8); g.add(tw);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3, 8), lam(0x2f5fa8)); cap.position.set(8, 20.9, -8); g.add(cap);
      }
    }
    const foam = new THREE.Mesh(new THREE.RingGeometry(r + 4, r + 7.5, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
    foam.rotation.x = -Math.PI / 2; foam.position.y = 0.55; g.add(foam); islands3d.push({ g, foam });
  }

  function emblemTexture(emb, bg) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(120,100,70,.35)'; g.lineWidth = 3; for (let x = 32; x < 256; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    if (emb !== 'pescador') drawEmblem(g, 128, 128, 70, emb === 'marinha' ? 'marinha' : 'pirata');
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  const LOOK = { pirata: [0xb38755, 0x6b3a1f, '#fbf7ea', 0xb3261e, 1], marinha: [0xb38755, 0xe9e6dc, '#fbf7ea', 0x2f5fa8, 1.15], rival: [0x4a3a4e, 0x2a1d2e, '#3a2e3e', 0x1e1a22, 1.1], pescador: [0xc9a96f, 0x9b7a4a, '#e8dcc0', 0x6b8a3a, 0.75] };
  function buildShip(emb) {
    const L = LOOK[emb] || LOOK.pirata, g = new THREE.Group();
    const shape = new THREE.Shape([[0, 7.5], [2.3, 4], [2.6, -3.5], [1.9, -6], [-1.9, -6], [-2.6, -3.5], [-2.3, 4]].map(p => new THREE.Vector2(p[0], p[1])));
    const hg = new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false }); hg.rotateX(Math.PI / 2); hg.translate(0, 1.8, 0);
    g.add(new THREE.Mesh(hg, [lam(L[0]), lam(L[1])]));
    if (emb === 'marinha') { const sg = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }); sg.rotateX(Math.PI / 2); sg.scale(1.03, 1, 1.02); sg.translate(0, 0.9, 0); g.add(new THREE.Mesh(sg, lam(0x2f5fa8))); }
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 2.6), lam(emb === 'marinha' ? 0xf4f4f0 : 0x8a4b26)); cab.position.set(0, 2.6, -4.4); g.add(cab);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const cn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.2, 6), lam(0x2b2b2b)); cn.rotation.z = Math.PI / 2; cn.position.set(sx * 2.6, 1.3, -2 + i * 2.2); g.add(cn); }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 14, 6), lam(0x5a3a1c)); mast.position.set(0, 8.6, 0.6); g.add(mast);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8, 5), lam(0x5a3a1c)); yard.rotation.z = Math.PI / 2; yard.position.set(0, 14.2, 0.9); g.add(yard);
    const sgm = new THREE.PlaneGeometry(7.4, 7, 8, 6), p = sgm.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.cos(x / 7.4 * Math.PI) * 1.2 + Math.cos(y / 7 * Math.PI) * 0.3); }
    sgm.computeVertexNormals(); sgm.translate(0, -3.5, 0);
    const sail = new THREE.Mesh(sgm, new THREE.MeshLambertMaterial({ map: emblemTexture(emb, L[2]), side: THREE.DoubleSide })); sail.position.set(0, 14.1, 1.1); g.add(sail);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), lam(L[3], { side: THREE.DoubleSide })); flag.position.set(0, 16.2, -0.7); flag.rotation.y = Math.PI / 2; g.add(flag);
    g.scale.setScalar(L[4]); scn.add(g); return { g, sail, flag, sink: 0 };
  }

  // ---- Quadro geral ----
  function update(dt, mode) {
    t += dt;
    islands3d.forEach(o => { o.foam.scale.setScalar(1 + Math.sin(t * 1.4) * 0.03); });
    clouds.forEach(c => { c.position.x += dt * 2; if (c.position.x > ARENA.x + 700) c.position.x -= 1400; });
    if (mode === 'title') titleAng += dt * 0.09;
    for (let i = wakes.length - 1; i >= 0; i--) { const w = wakes[i]; w.life -= dt; const k = 1 - w.life / w.max; w.m.scale.setScalar(1 + k * 3); w.m.material.opacity = 0.8 * (1 - k); if (w.life <= 0) { scn.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); wakes.splice(i, 1); } }
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i]; b.t += dt; const k = Math.min(1, b.t / b.dur);
      b.m.position.set(b.a[0] + (b.b[0] - b.a[0]) * k, b.a[1] + (b.b[1] - b.a[1]) * k + Math.sin(k * Math.PI) * b.arc, b.a[2] + (b.b[2] - b.a[2]) * k);
      if (k >= 1) { scn.remove(b.m); splash(b.b[0], b.b[2], b.hit); balls.splice(i, 1); }
    }
    for (let i = splashes.length - 1; i >= 0; i--) { const s = splashes[i]; s.life -= dt; const k = 1 - s.life / s.max; s.m.scale.setScalar(1 + k * 5); s.m.material.opacity = 0.9 * (1 - k); if (s.life <= 0) { scn.remove(s.m); splashes.splice(i, 1); } }
  }
  function splash(x, z, hit) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.6, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: hit ? 0xffa040 : 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    m.position.set(x, 1, z); scn.add(m); splashes.push({ m, life: 0.7, max: 0.7 });
  }
  function shotBall(a, b, hit) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 5), lam(0x1e1e1e)); scn.add(m);
    balls.push({ m, a: [a.x, 7, a.z], b: [b.x, 2, b.z], arc: 10, dur: 0.7, t: 0, hit });
  }
  function spawnWake(x, z) {
    if (wakes.length > 70) return;
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.2, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    m.position.set(x, 0.7, z); scn.add(m); wakes.push({ m, life: 2.2, max: 2.2 });
  }
  function render(mode, w, h, focus) {
    if (!renderer) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    let tx, tz, ang, dist = 36 * camZoom, hgt = 15 * camZoom;
    if (mode === 'title') { tx = -120; tz = 120; ang = titleAng; dist = 190; hgt = 70; }
    else if (focus) { tx = focus.x; tz = focus.z; ang = focus.h + camYaw; }
    else { tx = ARENA.x; tz = ARENA.z; ang = camYaw; dist = 90; hgt = 50; }
    camera.position.set(tx - Math.sin(ang) * dist, hgt + 2, tz - Math.cos(ang) * dist); camera.lookAt(tx, 5, tz);
    const step = SIZE / SEG, ox = Math.round(tx / step) * step, oz = Math.round(tz / step) * step;
    water.position.set(ox, 0, oz); const p = water.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, waveY(p.getX(i) + ox, p.getZ(i) + oz));
    p.needsUpdate = true; renderer.render(scn, camera);
  }

  // ======================================================================================
  // Luta naval em tempo real
  // ======================================================================================
  const ENEMIES = {
    pescador: { nome: 'Barco de pescador', emb: 'pescador', casco: 20, canhoes: 1, vel: 0.8, def: 10, atk: 1, moral: 6 },
    patrulha: { nome: 'Patrulha da Marinha', emb: 'marinha', casco: 36, canhoes: 2, vel: 1, def: 12, atk: 3, moral: 12 },
    rival:    { nome: 'Pirata rival', emb: 'rival', casco: 30, canhoes: 2, vel: 1, def: 12, atk: 2, moral: 10 },
  };
  const P = {};            // poses locais: id → { x, z, h, speed, sail, cd:{p,s,r}, pilot }
  let hudSig = '', hostSeen = 0, lastPoseSend = 0, simT = 0, ending = false;
  const cur = () => (db.naval && db.naval.cur && db.naval.cur.on && db.naval.cur.mode === 'rt' ? db.naval.cur : null);
  const ids = c => Object.keys(c.ships);
  const mine = c => (me() && !me().gm && c.ships['pj-' + shipKey(me())]) || null;
  const visible = () => { const c = cur(), m = me(); if (!c || !m) return false; return m.gm || !!c.ships['pj-' + shipKey(m)]; };
  const locked = () => !!(cur() && visible() && !isGM());

  function ensure(c) {
    if (Object.keys(P).length && P._key === c.started) return;
    Object.keys(ships3d).forEach(k => { scn.remove(ships3d[k].g); delete ships3d[k]; });
    Object.keys(P).forEach(k => delete P[k]);
    P._key = c.started;
    ids(c).forEach(id => { const s = c.ships[id], p0 = c.poses0[id]; P[id] = { x: p0.x, z: p0.z, h: p0.h, speed: 0, sail: s.side === 'npc' ? 2 : 0, cd: { p: 0, s: 0, r: 0 }, pilot: null, remoteAt: 0 }; ships3d[id] = buildShip(s.emb); });
  }
  const cls = c => { const s = mine(c); return s ? s : Object.values(c.ships).find(x => x.side === 'pj'); };
  const defOfShip = (c, s) => (s.side === 'npc' ? s.def + Math.floor((s.lv || 1) / 4) : tune.navalDef + (profOn(s.key, 'timoneiro') ? 2 : 0) + Math.floor((s.lvMed || 1) / 10));
  function timBonus(key) { return profOn(key, 'timoneiro') ? 1 + tune.rtTimoneiro : 1; }

  function start(key, opts) {
    if (cur()) return; const s = db.ships[key]; if (!s) return;
    const E = ENEMIES[opts.enemy] || ENEMIES.patrulha, lv = Math.max(1, opts.lv || 1), n = opts.count || 1, started = Date.now();
    const ships = {}, poses0 = {};
    ships['pj-' + key] = { id: 'pj-' + key, side: 'pj', key, fac: s.fac, nome: shipName(s), emb: s.fac, casco: s.casco, cascoMax: s.cascoMax, moral: tune.navalMoral, moralMax: tune.navalMoral, canhoes: s.canhoes, lvMed: Master.cls(s).lvMed };
    poses0['pj-' + key] = { x: ARENA.x - 70, z: ARENA.z, h: Math.PI / 2 };
    for (let i = 0; i < n; i++) {
      const id = 'npc-' + i, scale = 1 + (lv - 1) * 0.06;
      ships[id] = { id, side: 'npc', nome: n > 1 ? E.nome + ' ' + (i + 1) : E.nome, emb: E.emb, casco: Math.round(E.casco * scale), cascoMax: Math.round(E.casco * scale), moral: E.moral, moralMax: E.moral, canhoes: E.canhoes, def: E.def, atk: E.atk + Math.floor(lv / 3), vel: E.vel, lv };
      poses0[id] = { x: ARENA.x + 90, z: ARENA.z + (i - (n - 1) / 2) * 60, h: -Math.PI / 2 };
    }
    db.naval.cur = { on: true, mode: 'rt', key, host: myId, started, ships, poses0, enemyLv: lv };
    commit('naval', 'cur', db.naval.cur); camYaw = 0; camZoom = 1; simT = 0; ending = false;
    sysMsg('navio-' + key, 'Luta naval! Pilote com W/S/A/D e atire com Q (bombordo) e E (boreste). R conserta o casco.');
    mesaDirty = true;
  }

  function endBattle(win) {
    const c = db.naval.cur; if (!c || !c.on || ending) return; ending = true; c.on = false; commit('naval', 'cur', c);
    const s = db.ships[c.key], deck = 'navio-' + c.key, crew = s ? crewOf(s.key) : [];
    const npc = Object.values(c.ships).filter(x => x.side === 'npc'), lv = c.enemyLv || 1;
    if (win) {
      const xp = Math.round(tune.xpPerNpcLv * lv * npc.length * 2), money = Math.round(tune.berriesPerNpcLv * lv * npc.length * 3 * (0.7 + rng() * 0.6));
      sysMsg(deck, 'Vitória na luta naval! Cada tripulante recebe +' + xp + ' XP e ' + Math.round(money / Math.max(1, crew.length)) + ' Berries do espólio.');
      crew.forEach(x => { x.berries = (x.berries || 0) + Math.round(money / Math.max(1, crew.length)); addXp(x, xp); addRep(x, tune.repPerKill * npc.length + Math.floor(lv / 4)); });
    } else {
      sysMsg(deck, 'O navio afunda... A tripulação é resgatada por pescadores e levada de volta ao porto de onde saiu, sem parte do espólio.');
      crew.forEach(x => { x.berries = Math.round((x.berries || 0) * 0.8); commit('chars', x.id, x); });
    }
    if (s) {
      const pj = c.ships['pj-' + c.key]; if (pj) s.casco = Math.max(win ? pj.casco : Math.round(s.cascoMax * 0.25), win ? 1 : 0);
      if (win) Travel.resume(s); else { const from = s.travel ? s.travel.from : s.at; s.travel = null; s.at = from; }
      commit('ships', s.key, s);
    }
    Object.keys(P).forEach(k => delete P[k]); Object.keys(ships3d).forEach(k => { scn.remove(ships3d[k].g); delete ships3d[k]; });
    mesaDirty = true;
  }

  // ---- Física e ordens ----
  function stepShip(p, dt, turn, sailT, speedMax, tb) {
    const vt = speedMax * sailT / 3, a = tune.rtAccel * tb * dt;
    p.speed += clamp(vt - p.speed, -a * 1.6, a);
    const rate = tune.rtTurn * tb * (p.speed > 1 ? 1 : 0.35);
    p.h += turn * rate * dt; p.x += Math.sin(p.h) * p.speed * dt; p.z += Math.cos(p.h) * p.speed * dt;
    const dx = p.x - ARENA.x, dz = p.z - ARENA.z, d = Math.hypot(dx, dz);
    if (d > ARENA.r) { p.x = ARENA.x + dx / d * ARENA.r; p.z = ARENA.z + dz / d * ARENA.r; p.speed *= 0.9; }
  }
  function separate(c) {
    const L = ids(c).filter(i => !c.ships[i].out && P[i]);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = P[L[i]], b = P[L[j]], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 0.01;
      if (d < 16) { const k = (16 - d) / 2; a.x -= dx / d * k; a.z -= dz / d * k; b.x += dx / d * k; b.z += dz / d * k; }
    }
  }
  // O alvo está de que lado, a que distância, dentro do arco?
  function aim(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 0.01, fx = Math.sin(a.h), fz = Math.cos(a.h);
    const cross = fx * dz - fz * dx, dot = fx * dx + fz * dz, arc = Math.sin(tune.rtArc * Math.PI / 180);
    return { d, side: cross > 0 ? 's' : 'p', ok: Math.abs(dot) / d <= arc && d <= tune.rtRange };
  }
  const foesOf = (c, s) => ids(c).filter(i => c.ships[i].side !== s.side && !c.ships[i].out && P[i]);
  function pickFoe(c, id, side, prefer) {
    const s = c.ships[id], cands = foesOf(c, s).map(i => ({ i, a: aim(P[id], P[i]) })).filter(x => x.a.ok && x.a.side === side);
    if (!cands.length) return null;
    return cands.find(x => x.i === prefer) || cands.sort((a, b) => a.a.d - b.a.d)[0];
  }
  // Tiro: rola d20 contra a Defesa; o acerto tira Casco e Moral. Quem atira calcula e grava.
  function fire(c, id, side, actor) {
    const s = c.ships[id], p = P[id]; if (!s || !p || s.out || p.cd[side] > 0) return false;
    const pick = pickFoe(c, id, side, Fight3D.target); if (!pick) { if (actor) toast('Nenhum alvo no arco de ' + (side === 'p' ? 'bombordo' : 'boreste') + ' e no alcance.'); return false; }
    const t = c.ships[pick.i], pen = Math.floor(pick.a.d / tune.rtRangePen), deck = 'navio-' + (s.side === 'pj' ? s.key : c.key);
    p.cd[side] = s.side === 'pj' ? tune.rtCooldown : tune.rtNpcCooldown;
    let bonus, nome, opts;
    if (s.side === 'pj') { const a = actor || me(), art = a && !a.gm; bonus = (art ? attr(a, 'TEC') + (a.classe === 'atirador' ? 2 : 0) + Math.floor(a.lv / 5) : tune.navalFillerAtk) - pen; nome = a ? a.nome : s.nome; opts = { fac: s.fac }; }
    else { bonus = s.atk - pen; nome = s.nome; opts = { npc: 'navio' }; }
    const def = defOfShip(c, t), r = rolarD20(bonus, 'normal'); r.label = 'Tiro de ' + (side === 'p' ? 'bombordo' : 'boreste') + ' (' + s.nome + ')'; r.vs = { nome: t.nome, def };
    postRollTo(deck, nome, r, opts);
    const hit = r.nat === 20 || (r.nat !== 1 && r.total >= def);
    shotBall(P[id], P[pick.i], hit); broadcast({ t: 'fshot', a: id, b: pick.i, hit });
    if (!hit) { sysMsg(deck, 'Os tiros de ' + s.nome + ' caem na água perto de ' + t.nome + '.'); return true; }
    const crit = r.nat === 20, d = parseRolagem((s.canhoes * (crit ? 2 : 1)) + 'd' + tune.navalDmgDie, null); d.label = 'Dano em ' + t.nome + (crit ? ' (crítico)' : ''); postRollTo(deck, nome, d, opts);
    t.casco = Math.max(0, t.casco - d.total); t.moral = Math.max(0, t.moral - (crit ? 2 : 1));
    sysMsg(deck, t.nome + ' leva ' + d.total + ' de dano: Casco ' + t.casco + '/' + t.cascoMax + ', Moral ' + t.moral + '/' + t.moralMax + '.');
    if (t.casco <= 0) { t.out = 'afundou'; sysMsg(deck, t.nome + ' está afundando!'); }
    else if (t.moral <= 0) { t.out = 'rendeu'; sysMsg(deck, 'A tripulação de ' + t.nome + ' se rende.'); }
    if (t.side === 'pj' && s.side === 'npc') { const sh = db.ships[t.key]; if (sh) { sh.casco = t.casco; commit('ships', sh.key, sh); } }
    commit('naval', 'cur', c);
    const npcLeft = Object.values(c.ships).some(x => x.side === 'npc' && !x.out), pjLeft = Object.values(c.ships).some(x => x.side === 'pj' && !x.out);
    if (!npcLeft) later(1.8, () => endBattle(true)); else if (!pjLeft) later(1.8, () => endBattle(false));
    return true;
  }
  function repair(c, id) {
    const s = c.ships[id], p = P[id]; if (!s || s.out || p.cd.r > 0) return; const m = me(), key = c.key;
    const carp = profOn(key, 'carpinteiro'); if (!carp) { toast('Sem Carpinteiro a bordo para consertar.'); return; }
    if (s.casco >= s.cascoMax) { toast('O casco está inteiro.'); return; }
    p.cd.r = tune.rtRepair; const r = parseRolagem('1d6+' + Math.max(1, attr(carp, 'TEC')), null); r.label = 'Conserto do casco'; postRollTo('navio-' + key, carp.nome, r, { fac: s.fac });
    s.casco = Math.min(s.cascoMax, s.casco + r.total); const sh = db.ships[key]; if (sh) { sh.casco = s.casco; commit('ships', sh.key, sh); } commit('naval', 'cur', c);
    sysMsg('navio-' + key, carp.nome + ' remenda o casco: Casco ' + s.casco + '/' + s.cascoMax + '.');
  }
  function aiStep(c, id, dt) {
    const s = c.ships[id], p = P[id]; if (s.out) { p.speed *= 0.97; p.x += Math.sin(p.h) * p.speed * dt; p.z += Math.cos(p.h) * p.speed * dt; return; }
    const foes = foesOf(c, s); if (!foes.length) return; const tg = foes.map(i => P[i]).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz), toward = Math.atan2(dx, dz); let want = toward;
    if (d < tune.rtRange * 1.15) { const side = Math.sin(p.h - toward) > 0 ? 1 : -1; want = toward + side * Math.PI / 2; } // vira o costado
    let diff = want - p.h; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    stepShip(p, dt, clamp(diff * 2, -1, 1), d > tune.rtRange * 0.8 ? 3 : 1.5, tune.rtSpeed * tune.rtEnemySpeed * (s.vel || 1), 1);
    ['p', 's'].forEach(side => { if (p.cd[side] <= 0) fire(c, id, side, null); });
  }

  function update3(dt) {
    const c = cur(); if (!c || !visible()) return; ensure(c); simT += dt;
    Object.values(P).forEach(p => { if (p && p.cd) { p.cd.p = Math.max(0, p.cd.p - dt); p.cd.s = Math.max(0, p.cd.s - dt); p.cd.r = Math.max(0, p.cd.r - dt); } });
    const host = c.host === myId, myS = mine(c), myId3 = myS && myS.id;
    // o anfitrião roda os inimigos; se ele sumiu, outra aba assume
    if (!host && hostSeen > 3.5 && (myS || isGM())) { c.host = myId; commit('naval', 'cur', c); hostSeen = 0; }
    hostSeen += dt;
    // piloto: meu navio
    if (myS && !myS.out && !typing()) {
      const p = P[myId3], tim = timBonus(c.key), live = !p.remoteAt || clock.now() - p.remoteAt > 0.5 || p.pilot === myId;
      if (pressed('KeyW') || pressed('KeyS') || down.has('KeyA') || down.has('KeyD')) p.pilot = myId;
      if (pressed('KeyW')) { p.sail = Math.min(3, p.sail + 1); tone(330 + p.sail * 60, 0.1, 'triangle', 0.12); }
      if (pressed('KeyS')) { p.sail = Math.max(0, p.sail - 1); tone(300 - p.sail * 30, 0.1, 'triangle', 0.12); }
      const turn = ((down.has('KeyA') || down.has('ArrowLeft')) ? 1 : 0) - ((down.has('KeyD') || down.has('ArrowRight')) ? 1 : 0);
      if (live) stepShip(p, dt, turn, p.sail, tune.rtSpeed * (1 + Math.min(db.ships[c.key].velas || 0, 4) * 0.05), tim);
      if (pressed('KeyQ')) fire(c, myId3, 'p', me());
      if (pressed('KeyE')) fire(c, myId3, 's', me());
      if (pressed('KeyR')) repair(c, myId3);
    } else if (myS && myS.out) { const p = P[myId3]; p.speed *= 0.97; }
    // inimigos (anfitrião)
    if (host) ids(c).filter(i => c.ships[i].side === 'npc').forEach(i => aiStep(c, i, dt));
    separate(c);
    // envia poses (meu navio; os inimigos se sou o anfitrião)
    lastPoseSend += dt; if (lastPoseSend > 0.08) {
      lastPoseSend = 0;
      ids(c).forEach(i => { const own = host ? c.ships[i].side === 'npc' : false; if ((i === myId3 && P[i].pilot === myId) || own) { const p = P[i]; broadcast({ t: 'fpose', id: i, x: p.x, z: p.z, h: p.h, speed: p.speed, sail: p.sail, host: own ? 1 : 0, pilot: p.pilot }); } });
    }
    // modelos
    ids(c).forEach(i => {
      const o = ships3d[i], p = P[i], s = c.ships[i]; if (!o || !p) return;
      o.g.position.set(p.x, waveY(p.x, p.z) * 0.8 - 0.3 - (s.out === 'afundou' ? (o.sink += dt) * 2 : 0), p.z);
      o.g.rotation.set(Math.sin(t * 1.3) * 0.04 + (s.out === 'afundou' ? o.sink * 0.1 : 0), p.h, Math.sin(t * 1.1) * 0.05);
      o.sail.scale.y = 0.18 + 0.82 * (p.sail / 3); o.flag.rotation.y = Math.PI / 2 + Math.sin(t * 5) * 0.2;
      o.g.visible = !(s.out === 'afundou' && o.sink > 4);
      if (p.speed > 2) { wakeClock += dt / Math.max(1, ids(c).length); if (wakeClock > 0.09) { wakeClock = 0; spawnWake(p.x - Math.sin(p.h) * 6, p.z - Math.cos(p.h) * 6); } }
    });
  }
  bcHandlers.fpose = m => {
    const c = cur(); if (!c || !P[m.id]) return; const p = P[m.id];
    if (m.id === (mine(c) || {}).id && p.pilot === myId && m.pilot !== myId) { /* eu estou pilotando: ignoro */ }
    Object.assign(p, { x: m.x, z: m.z, h: m.h, speed: m.speed, sail: m.sail, pilot: m.pilot, remoteAt: clock.now() });
    if (m.host) hostSeen = 0;
  };
  bcHandlers.fshot = m => { const c = cur(); if (!c || !P[m.a] || !P[m.b]) return; shotBall(P[m.a], P[m.b], m.hit); };

  function focus() { const c = cur(); if (!c) return null; ensure(c); const s = mine(c) || Object.values(c.ships).find(x => x.side === 'pj'); return s ? P[s.id] : null; }
  const bars = s => `<div class="bar hp"><i style="width:${s.casco / s.cascoMax * 100}%"></i><span>Casco ${s.casco}/${s.cascoMax}</span></div><div class="bar st"><i style="width:${s.moral / s.moralMax * 100}%"></i><span>Moral ${s.moral}/${s.moralMax}</span></div>`;
  function hud(el) {
    const c = cur(), show = !!(c && visible() && curScene() === 'play'); el.hidden = !show; if (!show) { hudSig = ''; return; }
    const myS = mine(c), p = myS && P[myS.id], cd = k => (p ? Math.ceil(p.cd[k]) : 0);
    const sig = JSON.stringify([Object.values(c.ships).map(s => [s.casco, s.moral, s.out]), p ? [cd('p'), cd('s'), cd('r'), p.sail] : 0, Fight3D.target]);
    if (sig === hudSig) return; hudSig = sig;
    let h = `<div class="nv-top plate"><b>Luta naval</b> · clique num inimigo para mirar · alvo: <b>${Fight3D.target && c.ships[Fight3D.target] ? esc(c.ships[Fight3D.target].nome) : 'o mais próximo'}</b></div><div class="nv-list">` +
      Object.values(c.ships).map(s => `<div class="nv-row plate ${s.out ? 'out' : ''}"><b>${esc(s.nome)}</b><span class="nv-tag" style="background:${s.side === 'npc' ? '#555' : (s.fac === 'marinha' ? '#1f4f9a' : '#b3261e')}">${s.out ? s.out : s.side === 'npc' ? 'inimigo' : 'aliado'}</span><span>Casco <b>${s.casco}/${s.cascoMax}</b></span><span>Moral <b>${s.moral}/${s.moralMax}</b></span></div>`).join('') + '</div>';
    if (myS) h += `<div class="nv-actions plate"><div class="nv-lbl">Velas ${p ? p.sail : 0}/3 · <kbd>W</kbd><kbd>S</kbd> velas · <kbd>A</kbd><kbd>D</kbd> leme</div><div class="row"><button class="btn sm red" data-f="p" ${cd('p') ? 'disabled' : ''}>Bombordo (Q)${cd('p') ? ' ' + cd('p') + 's' : ''}</button><button class="btn sm red" data-f="s" ${cd('s') ? 'disabled' : ''}>Boreste (E)${cd('s') ? ' ' + cd('s') + 's' : ''}</button><button class="btn sm wood" data-f="r" ${cd('r') ? 'disabled' : ''}>Consertar (R)${cd('r') ? ' ' + cd('r') + 's' : ''}</button></div></div>`;
    el.innerHTML = h;
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { const k = b.dataset.f, m = mine(c); if (!m) return; if (k === 'r') repair(c, m.id); else fire(c, m.id, k, me()); });
  }
  function click(e, canvas) {
    const c = cur(); if (!c || !visible()) return; const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 2 - 1, y = -((e.clientY - r.top) / r.height) * 2 + 1;
    const v = new THREE.Vector3(x, y, 0.5).unproject(camera), dir = v.sub(camera.position).normalize(), k = -camera.position.y / dir.y, wx = camera.position.x + dir.x * k, wz = camera.position.z + dir.z * k;
    const hit = ids(c).filter(i => c.ships[i].side === 'npc' && !c.ships[i].out && P[i]).find(i => Math.hypot(P[i].x - wx, P[i].z - wz) < 18);
    Fight3D.target = hit || null;
  }

  const fight = { ENEMIES, start, visible, locked, active: () => !!cur(), update: update3, hud, focus, cur, click, endBattle, target: null };
  return { init, update, render, fight, ENEMIES };
})();
const Fight3D = Sea.fight;
