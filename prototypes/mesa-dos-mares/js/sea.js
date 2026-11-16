// PROTOTYPE - NOT FOR PRODUCTION
// Question: O ciclo navegar → atracar → jogar pelo chat da ilha → zarpar funciona como mesa de RPG, e o chat é gostoso de usar para interpretar?
// Date: 2026-11-16
// O East Blue em 3D low-poly toon: mar com ondas, ilhas, dois navios pilotáveis, rota pontilhada.
'use strict';

const Sea = (() => {
  let renderer, scene, camera, water, waterBase, sky;
  const ships = {}, islands3d = {}, wakes = [], clouds = [];
  let t = 0, camYaw = 0, camZoom = 1, orbit = null, titleAng = 0;
  let poseClock = 0, saveClock = 0, wakeClock = 0, lastNear = null, hintShown = false;
  const SEG = 90, SIZE = 720;

  const lam = (color, extra) => new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: true }, extra || {}));

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !CHEAP });
    renderer.setPixelRatio(CHEAP ? 0.5 : Math.min(devicePixelRatio || 1, 2));
    scene = new THREE.Scene();
    // céu: gradiente claro de Wind Waker
    const sc = document.createElement('canvas'); sc.width = 4; sc.height = 256; const sg = sc.getContext('2d');
    const gr = sg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#3d9be0'); gr.addColorStop(0.55, '#8fd3f4'); gr.addColorStop(1, '#e6f7fb');
    sg.fillStyle = gr; sg.fillRect(0, 0, 4, 256); sky = new THREE.CanvasTexture(sc); sky.colorSpace = THREE.SRGBColorSpace;
    scene.background = sky;
    scene.fog = new THREE.Fog(0xcdeef7, 260, 820);
    camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.5, 2500);
    scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x2a8f9f, 1.9));
    const sun = new THREE.DirectionalLight(0xfff1d0, 2.4); sun.position.set(120, 200, 80); scene.add(sun);

    // mar: malha que acompanha a câmera, ondas no CPU, sombreado chapado
    const wg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); wg.rotateX(-Math.PI / 2);
    water = new THREE.Mesh(wg, new THREE.MeshPhongMaterial({ color: 0x23b3c7, flatShading: true, shininess: 90, specular: 0x9ff6ff }));
    scene.add(water);
    waterBase = new THREE.Mesh(new THREE.CircleGeometry(4000, 24).rotateX(-Math.PI / 2), lam(0x1b98ad));
    waterBase.position.y = -1.6; scene.add(waterBase);

    ISLANDS.forEach(buildIsland);
    ships.pirata = buildShip('pirata'); ships.marinha = buildShip('marinha');
    // nuvens chapadas
    const R = artRng(77);
    for (let i = 0; i < 16; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(8 + R() * 8, 0), lam(0xffffff, { emissive: 0x9aa8b0 })); m.position.set(k * 9 - 13, R() * 3, R() * 6); m.scale.y = 0.45; c.add(m); }
      c.position.set((R() - 0.5) * 1200, 80 + R() * 50, (R() - 0.5) * 1200); scene.add(c); clouds.push(c);
    }
    // limite: névoa da Grand Line
    const mist = new THREE.Mesh(new THREE.CylinderGeometry(tune.seaRadius + 30, tune.seaRadius + 30, 60, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xf2fbff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false }));
    mist.position.y = 25; scene.add(mist);

    // órbita da câmera com arraste (mouse/toque)
    canvas.addEventListener('pointerdown', e => { orbit = { x: e.clientX, yaw: camYaw }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (orbit) camYaw = orbit.yaw - (e.clientX - orbit.x) * 0.008; });
    canvas.addEventListener('pointerup', () => { orbit = null; });
    canvas.addEventListener('wheel', e => { e.preventDefault(); camZoom = clamp(camZoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.4, 3); }, { passive: false });
    canvas.addEventListener('dblclick', () => { camYaw = 0; camZoom = 1; });
  }

  function waveY(x, z) {
    const s = t * tune.waveSpeed, h = tune.waveHeight;
    return h * (Math.sin(x * 0.07 + s) + 0.7 * Math.sin(z * 0.09 - s * 1.3) + 0.5 * Math.sin((x + z) * 0.045 + s * 0.6)) / 2.2;
  }

  function buildIsland(isl) {
    const g = new THREE.Group(), R = artRng(hashStr(isl.id) + 3), r = isl.r;
    g.position.set(isl.x, 0, isl.z); scene.add(g);
    const roof = lam(isl.telhado), wall = lam(0xf4ecd8), wood = lam(0x7a5230), leaf = lam(0x5fb34a), leaf2 = lam(0x3f9a3c);
    const house = (x, z, s = 1, rot = 0) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(3 * s, 2.6 * s, 3 * s), wall); b.position.set(x, 1.3 * s, z); b.rotation.y = rot;
      const c = new THREE.Mesh(new THREE.ConeGeometry(2.6 * s, 2 * s, 4), roof); c.position.set(0, 2.3 * s, 0); c.rotation.y = Math.PI / 4; b.add(c); return b;
    };
    const tree = (x, z, y) => {
      const tr = new THREE.Group(); tr.position.set(x, y, z);
      const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3, 5), wood); tk.position.y = 1.5; tr.add(tk);
      const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 0), R() > 0.5 ? leaf : leaf2); lf.position.y = 3.6; tr.add(lf); return tr;
    };
    if (isl.tema === 'navio') { // o restaurante-navio flutuante
      const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam(0xe7dcc0));
      hull.scale.set(11, 5, 22); hull.position.y = 2.4; g.add(hull);
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.6, 12), lam(0xb38755)); deck.scale.set(10.5, 1, 21.5); deck.position.y = 2.5; g.add(deck);
      const hall = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 16), lam(0xf4ecd8)); hall.position.set(0, 5.8, -1); g.add(hall);
      const top = new THREE.Mesh(new THREE.ConeGeometry(10, 4, 4), roof); top.position.set(0, 10.8, -1); top.rotation.y = Math.PI / 4; top.scale.z = 1.3; g.add(top);
      const fish = new THREE.Mesh(new THREE.ConeGeometry(3.4, 8, 6), lam(0xd8b04a)); fish.rotation.x = Math.PI / 2; fish.position.set(0, 4, 23); g.add(fish);
      for (const sx of [-1, 1]) { const fin = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 3), lam(0xc4472f)); fin.position.set(sx * 3, 6, 20); fin.rotation.z = sx * 0.9; g.add(fin); }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 14, 6), wood); mast.position.set(0, 15, 6); g.add(mast);
    } else {
      const sand = new THREE.Mesh(new THREE.CylinderGeometry(r + 1, r + 5, 2.4, 11), lam(0xecd59c)); sand.position.y = 0.3; g.add(sand);
      const grass = new THREE.Mesh(new THREE.CylinderGeometry(r - 2, r + 0.5, 3, 11), lam(0x82c95b)); grass.position.y = 2; g.add(grass);
      const hill = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * (isl.tema === 'vila' ? 0.9 : 0.6), 7), lam(0x5aa548)); hill.position.set(-r * 0.25, 3.5 + r * 0.3, -r * 0.3); g.add(hill);
      for (let i = 0; i < 4; i++) { const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 + R() * 2, 0), lam(0x9a9488)); const a = R() * 7; rock.position.set(Math.cos(a) * (r + 3), 0.6, Math.sin(a) * (r + 3)); g.add(rock); }
      const nH = isl.tema === 'cidade' ? 14 : isl.tema === 'base' ? 6 : 6;
      for (let i = 0; i < nH; i++) { const a = R() * Math.PI * 2, d = 5 + R() * (r - 9); const h = house(Math.cos(a) * d, Math.sin(a) * d, 0.9 + R() * 0.4, R() * 3); h.position.y += 3.4; g.add(h); }
      for (let i = 0; i < (isl.tema === 'cidade' ? 4 : 10); i++) { const a = R() * Math.PI * 2, d = 4 + R() * (r - 5); g.add(tree(Math.cos(a) * d, Math.sin(a) * d, 3.4)); }
      if (isl.tema === 'vila') { // moinho
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2, 8, 6), wall); tw.position.set(r * 0.4, 7.4, r * 0.1); g.add(tw);
        const blades = new THREE.Group(); blades.position.set(r * 0.4, 11, r * 0.1 + 2.1);
        for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 0.2), wood); bl.position.y = 3.5; const p = new THREE.Group(); p.rotation.z = i * Math.PI / 2; p.add(bl); blades.add(p); }
        g.add(blades); g.userData.spin = blades;
      }
      if (isl.tema === 'base') { // base da Marinha: muro, prédio, torre e bandeira azul
        const wallM = lam(0xd9d6cc);
        const b = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 10), wallM); b.position.set(2, 7.4, -4); g.add(b);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(14.2, 1.2, 10.2), lam(0x2f5fa8)); stripe.position.set(2, 9.5, -4); g.add(stripe);
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 16, 8), wallM); tower.position.set(8, 11.4, -8); g.add(tower);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3, 8), lam(0x2f5fa8)); cap.position.set(8, 20.9, -8); g.add(cap);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 4), wood); pole.position.set(8, 25.5, -8); g.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), new THREE.MeshLambertMaterial({ map: emblemTexture('marinha', '#ffffff'), side: THREE.DoubleSide })); flag.position.set(10, 27.5, -8); g.add(flag); g.userData.flag = flag;
      }
      const dock = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 12), wood); dock.position.set(0, 1.6, r + 4); g.add(dock);
    }
    // espuma em volta
    const foam = new THREE.Mesh(new THREE.RingGeometry(r + 4, r + 7.5, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
    foam.rotation.x = -Math.PI / 2; foam.position.y = 0.55; g.add(foam);
    // placa com o nome
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: bannerTexture(isl.nome), depthTest: false, fog: false }));
    label.scale.set(34, 8.5, 1); label.position.y = r * 0.7 + 18; label.renderOrder = 10; g.add(label);
    // anel de atracação pontilhado
    const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); }
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffd75a, dashSize: 0.04, gapSize: 0.04 }));
    ring.computeLineDistances(); ring.position.y = 0.9; ring.visible = false; g.add(ring);
    islands3d[isl.id] = { g, foam, ring };
  }

  function bannerTexture(txt) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 6;
    g.beginPath(); g.moveTo(30, 18); g.lineTo(482, 18); g.lineTo(505, 64); g.lineTo(482, 110); g.lineTo(30, 110); g.lineTo(7, 64); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = 'italic bold 56px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 66);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  function emblemTexture(f, bg) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(120,100,70,.35)'; g.lineWidth = 3; for (let x = 32; x < 256; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    drawEmblem(g, 128, 128, 70, f);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }

  function buildShip(f) {
    const g = new THREE.Group(), marine = f === 'marinha';
    const shape = new THREE.Shape([[0, 7.5], [2.3, 4], [2.6, -3.5], [1.9, -6], [-1.9, -6], [-2.6, -3.5], [-2.3, 4]].map(p => new THREE.Vector2(p[0], p[1])));
    const hg = new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false }); hg.rotateX(Math.PI / 2); hg.translate(0, 1.8, 0);
    const hull = new THREE.Mesh(hg, [lam(0xb38755), lam(marine ? 0xe9e6dc : 0x6b3a1f)]); g.add(hull);
    if (marine) { const sg = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }); sg.rotateX(Math.PI / 2); sg.scale(1.03, 1, 1.02); sg.translate(0, 0.9, 0); g.add(new THREE.Mesh(sg, lam(0x2f5fa8))); }
    // castelo de popa
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 2.6), lam(marine ? 0xf4f4f0 : 0x8a4b26)); cab.position.set(0, 2.6, -4.4); g.add(cab);
    // canhões
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const cn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.2, 6), lam(0x2b2b2b)); cn.rotation.z = Math.PI / 2; cn.position.set(sx * 2.6, 1.3, -2 + i * 2.2); g.add(cn); }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 14, 6), lam(0x5a3a1c)); mast.position.set(0, 8.6, 0.6); g.add(mast);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8, 5), lam(0x5a3a1c)); yard.rotation.z = Math.PI / 2; yard.position.set(0, 14.2, 0.9); g.add(yard);
    // vela: plano curvado com o emblema
    const sgm = new THREE.PlaneGeometry(7.4, 7, 8, 6); const p = sgm.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.cos(x / 7.4 * Math.PI) * 1.2 + Math.cos(y / 7 * Math.PI) * 0.3); }
    sgm.computeVertexNormals(); sgm.translate(0, -3.5, 0);
    const sail = new THREE.Mesh(sgm, new THREE.MeshLambertMaterial({ map: emblemTexture(f, '#fbf7ea'), side: THREE.DoubleSide }));
    sail.position.set(0, 14.1, 1.1); g.add(sail);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), lam(marine ? 0x2f5fa8 : 0xb3261e, { side: THREE.DoubleSide })); flag.position.set(0, 16.2, -0.7); flag.rotation.y = Math.PI / 2; g.add(flag);
    if (marine) g.scale.setScalar(1.18);
    scene.add(g);
    // rota pontilhada
    const route = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: marine ? 0x1f4f9a : 0xb3261e, dashSize: 2.2, gapSize: 2.2 }));
    route.position.y = 0.8; scene.add(route);
    const s = { g, sail, flag, route, routeLen: -1, rx: 0, rz: 0, rh: 0, init: false };
    return s;
  }

  // ---- Física do meu navio ----
  function shipTarget(f, s) {
    const nav = navOf(f), wf = 1 - tune.windPenalty * (nav ? 1 - tune.navWindReduce : 1) * (1 - Math.cos(s.h - db.world.wind)) / 2;
    const bonus = nav ? tune.navSpeedBonus + tune.navTecBonus * attr(nav, 'TEC') : 0;
    return { v: tune.shipMaxSpeed * (s.sail / 3) * wf * (1 + bonus), nav, bonus, wf };
  }
  function pilot(dt) {
    const c = me(); if (!c || c.gm) return;
    const f = c.faccao, s = db.ships[f]; if (s.at) return;
    let input = false;
    if (pressed('KeyW') || pressed('ArrowUp')) { s.sail = Math.min(3, s.sail + 1); input = true; tone(330 + s.sail * 60, 0.12, 'triangle', 0.15); }
    if (pressed('KeyS') || pressed('ArrowDown')) { s.sail = Math.max(0, s.sail - 1); input = true; tone(300 - s.sail * 30, 0.12, 'triangle', 0.15); }
    const turn = ((down.has('KeyA') || down.has('ArrowLeft')) ? 1 : 0) - ((down.has('KeyD') || down.has('ArrowRight')) ? 1 : 0);
    if (turn) input = true;
    if (input) s.pilot = myId;
    const remoteFresh = s.remoteAt && clock.now() - s.remoteAt < 0.5 && s.pilot !== myId;
    if (remoteFresh) return; // outra aba está pilotando: só mostro
    const tg = shipTarget(f, s);
    const dv = tg.v - s.speed, a = tune.shipAccel * dt; s.speed += Math.max(-a * 1.6, Math.min(a, dv));
    const tr = tune.shipTurnRate * (s.speed > 1 ? 1 : tune.shipTurnStill);
    s.h += turn * tr * dt;
    s.x += Math.sin(s.h) * s.speed * dt; s.z += Math.cos(s.h) * s.speed * dt;
    // ilhas são sólidas
    ISLANDS.forEach(isl => {
      const dx = s.x - isl.x, dz = s.z - isl.z, d = Math.hypot(dx, dz), min = isl.r + 6;
      if (d < min) { s.x = isl.x + dx / d * min; s.z = isl.z + dz / d * min; s.speed *= 0.6; }
    });
    // além do mar: a Grand Line (fora do escopo)
    const dc = Math.hypot(s.x, s.z);
    if (dc > tune.seaRadius) { s.x *= tune.seaRadius / dc; s.z *= tune.seaRadius / dc; s.speed *= 0.5; if (!pilot.warned) { toast('A névoa engrossa: além daqui fica a Grand Line. Ainda não!'); pilot.warned = true; } }
    else if (dc < tune.seaRadius - 40) pilot.warned = false;
    // rota pontilhada
    const last = s.route[s.route.length - 1];
    if (!last || Math.hypot(s.x - last[0], s.z - last[1]) > tune.routeSampleDist) { s.route.push([Math.round(s.x * 10) / 10, Math.round(s.z * 10) / 10]); if (s.route.length > tune.routeMaxPoints) s.route.splice(0, s.route.length - tune.routeMaxPoints); }
    if (s.speed > 0.05 || input) {
      poseClock += dt; saveClock += dt;
      if (poseClock >= tune.poseSendEvery) { poseClock = 0; s.pilot = myId; sendPose(f, s); }
      if (saveClock >= 1) { saveClock = 0; commit('ships', f, s); }
    } else if (saveClock > 0) { saveClock = 0; commit('ships', f, s); }
    // atracar
    const near = nearestIsland(s);
    if (near && near.d < tune.dockRadius && (pressed('KeyE'))) dock(f, near.isl);
    if (!hintShown && s.sail === 0 && t > 1) hintShown = true;
  }
  function nearestIsland(s) {
    let best = null;
    ISLANDS.forEach(isl => { const d = Math.hypot(s.x - isl.x, s.z - isl.z); if (!best || d < best.d) best = { isl, d }; });
    return best;
  }
  function dock(f, isl) {
    const s = db.ships[f]; s.at = isl.id; s.speed = 0; s.sail = 0;
    const a = Math.atan2(s.x - isl.x, s.z - isl.z); s.x = isl.x + Math.sin(a) * (isl.r + 12); s.z = isl.z + Math.cos(a) * (isl.r + 12); s.pilot = null;
    commit('ships', f, s);
    tone(880, 0.25, 'sine', 0.3); setTimeout(() => tone(660, 0.4, 'sine', 0.25), 180);
    sysMsg(isl.id, (f === 'marinha' ? 'O navio da Marinha' : 'O navio pirata') + ' atracou em ' + isl.nome + '.');
    events.push({ t: 'dock', isl: isl.id });
  }
  function undock(f) {
    const s = db.ships[f]; if (!s.at) return; const isl = ISLAND[s.at];
    sysMsg(s.at, (f === 'marinha' ? 'O navio da Marinha' : 'O navio pirata') + ' zarpou de ' + isl.nome + '.');
    s.at = null; const a = Math.atan2(s.x - isl.x, s.z - isl.z); s.h = a; s.speed = 0; s.sail = 0; commit('ships', f, s);
  }

  // ---- Quadro ----
  function update(dt, mode) {
    t += dt;
    if (mode === 'play') pilot(dt);
    // anima moinho e bandeiras
    Object.values(islands3d).forEach(o => { if (o.g.userData.spin) o.g.userData.spin.rotation.z += dt * 0.8; if (o.g.userData.flag) o.g.userData.flag.rotation.y = Math.sin(t * 2) * 0.25; o.foam.scale.setScalar(1 + Math.sin(t * 1.4) * 0.03); });
    clouds.forEach(c => { c.position.x += Math.sin(db.world.wind) * dt * 3; c.position.z += Math.cos(db.world.wind) * dt * 3; if (Math.hypot(c.position.x, c.position.z) > 800) c.position.multiplyScalar(-0.95); });
    // navios: renderiza com suavização (posição remota) e balanço nas ondas
    ['pirata', 'marinha'].forEach(f => {
      const s = db.ships[f], o = ships[f];
      if (!o.init) { o.rx = s.x; o.rz = s.z; o.rh = s.h; o.init = true; }
      const k = Math.min(1, dt * 10); o.rx += (s.x - o.rx) * k; o.rz += (s.z - o.rz) * k;
      let dh = s.h - o.rh; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); o.rh += dh * k;
      o.g.position.set(o.rx, waveY(o.rx, o.rz) * 0.8 - 0.3, o.rz);
      o.g.rotation.set(Math.sin(t * 1.3 + (f === 'marinha' ? 1 : 0)) * 0.04, o.rh, Math.sin(t * 1.1) * 0.05);
      const sf = 0.18 + 0.82 * s.sail / 3; o.sail.scale.y = sf;
      o.flag.rotation.y = Math.PI / 2 + Math.sin(t * 5) * 0.2;
      if (s.route.length !== o.routeLen) {
        o.routeLen = s.route.length;
        const pts = s.route.map(p => new THREE.Vector3(p[0], 0, p[1]));
        if (pts.length > 1) { o.route.geometry.dispose(); o.route.geometry = new THREE.BufferGeometry().setFromPoints(pts); o.route.computeLineDistances(); }
        o.route.visible = pts.length > 1;
      }
      // espuma do rastro
      if (s.speed > 2) { wakeClock += dt; if (wakeClock > 0.09) { wakeClock = 0; spawnWake(o.rx - Math.sin(o.rh) * 6, o.rz - Math.cos(o.rh) * 6, s.speed); } }
      o.g.visible = true;
    });
    for (let i = wakes.length - 1; i >= 0; i--) {
      const w = wakes[i]; w.life -= dt; const k = 1 - w.life / w.max; w.m.scale.setScalar(1 + k * 3); w.m.material.opacity = 0.8 * (1 - k);
      if (w.life <= 0) { scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); wakes.splice(i, 1); }
    }
  }
  function spawnWake(x, z) {
    if (wakes.length > 70) return;
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.2, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    m.position.set(x, 0.7, z); scene.add(m); wakes.push({ m, life: 2.4, max: 2.4 });
  }

  function focusShip() {
    const c = me(); if (!c) return null;
    const f = c.gm ? (c.follow || 'pirata') : c.faccao; return { f, o: ships[f], s: db.ships[f] };
  }
  function render(mode, w, h) {
    if (!renderer) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    let tx, tz, ang, dist = tune.camDist * camZoom, hgt = tune.camHeight * camZoom;
    if (mode === 'title') { titleAng += 0.0015; tx = -120; tz = 120; ang = titleAng; dist = 190; hgt = 70; }
    else { const fs = focusShip(); if (!fs) return; tx = fs.o.rx; tz = fs.o.rz; ang = fs.o.rh + camYaw; }
    const cx = tx - Math.sin(ang) * dist, cz = tz - Math.cos(ang) * dist;
    camera.position.set(cx, hgt + 2, cz); camera.lookAt(tx, 5, tz);
    // malha do mar segue a câmera (encaixada no passo da malha)
    const step = SIZE / SEG, ox = Math.round(tx / step) * step, oz = Math.round(tz / step) * step;
    water.position.set(ox, 0, oz);
    const p = water.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, waveY(p.getX(i) + ox, p.getZ(i) + oz));
    p.needsUpdate = true;
    // anel de atracação perto
    const fs = mode === 'play' && focusShip();
    ISLANDS.forEach(isl => {
      const o = islands3d[isl.id], d = fs ? Math.hypot(fs.s.x - isl.x, fs.s.z - isl.z) : 1e9;
      o.ring.visible = d < tune.dockRadius * 2.4; o.ring.scale.setScalar(tune.dockRadius);
      o.ring.material.color.setHex(d < tune.dockRadius ? 0x7dff8a : 0xffd75a);
    });
    renderer.render(scene, camera);
  }

  // ---- HUD do mar: bússola, vento, velas, velocidade, navegador, ilha próxima ----
  function hud() {
    const c = me(); if (!c) return null;
    const f = c.gm ? (c.follow || 'pirata') : c.faccao, s = db.ships[f], tg = shipTarget(f, s), near = nearestIsland(s);
    return { f, s, tg, near, canDock: !c.gm && near && near.d < tune.dockRadius };
  }
  function miniMap(g, W) {
    const R = W / 2 - 6, k = R / tune.seaRadius;
    g.clearRect(0, 0, W, W);
    g.save(); g.translate(W / 2, W / 2); g.scale(-1, -1); // mesmo lado da câmera atrás do navio: +z para cima
    g.fillStyle = PARCH; g.beginPath(); g.arc(0, 0, R + 4, 0, 7); g.fill();
    g.fillStyle = 'rgba(52,150,170,.35)'; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R + 4, 0, 7); g.stroke();
    ISLANDS.forEach(isl => { g.fillStyle = isl.tema === 'navio' ? '#c99c62' : '#9ccf6e'; g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.arc(isl.x * k, isl.z * k, Math.max(4, isl.r * k * 1.3), 0, 7); g.fill(); g.stroke(); });
    ['pirata', 'marinha'].forEach(f => {
      const s = db.ships[f]; g.save(); g.translate(s.x * k, s.z * k); g.rotate(-s.h);
      g.fillStyle = f === 'marinha' ? NAVY : RED; g.strokeStyle = INK; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 7); g.lineTo(4.5, -5); g.lineTo(-4.5, -5); g.closePath(); g.fill(); g.stroke(); g.restore();
    });
    // vento
    const w = db.world.wind; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(-Math.sin(w) * 22, -Math.cos(w) * 22); g.lineTo(Math.sin(w) * 22, Math.cos(w) * 22); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(Math.sin(w) * 30, Math.cos(w) * 30); g.lineTo(Math.sin(w) * 18 + Math.cos(w) * 7, Math.cos(w) * 18 - Math.sin(w) * 7); g.lineTo(Math.sin(w) * 18 - Math.cos(w) * 7, Math.cos(w) * 18 + Math.sin(w) * 7); g.fill();
    g.restore();
  }

  return { init, update, render, hud, miniMap, dock, undock, shipTarget, waveY };
})();
