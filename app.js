(() => {
  'use strict';

  const SUPABASE_URL = 'https://nuezufupwutnuxhkblyi.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZXp1ZnVwd3V0bnV4aGtibHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDczMTcsImV4cCI6MjA4OTc4MzMxN30.Qqi3BWcBCE1G5Aro_tIh7iMgJejk-Q0fG3EjFyhOVxw';
  const CLOUD_BUCKET = 'audio-files';

  const STORAGE_KEY = 'bsp_notes_upgrade_projects_v1';
  const ACTIVE_KEY = 'bsp_notes_upgrade_active_v1';
  const DB_NAME = 'bsp_notes_upgrade_db';
  const DB_VERSION = 1;

  const $ = (id) => document.getElementById(id);
  const el = {
    cloudBtn: $('cloudBtn'),
    syncBtn: $('syncBtn'),
    cloudStatus: $('cloudStatus'),
    projectPicker: $('projectPicker'),
    newProjectBtn: $('newProjectBtn'),
    renameProjectBtn: $('renameProjectBtn'),
    deleteProjectBtn: $('deleteProjectBtn'),
    notesEditor: $('notesEditor'),
    notesAttachBtn: $('notesAttachBtn'),
    notesImageInput: $('notesImageInput'),
    notesFontSize: $('notesFontSize'),
    notesTextColor: $('notesTextColor'),
    boldBtn: $('boldBtn'),
    italicBtn: $('italicBtn'),
    underlineBtn: $('underlineBtn'),
    saveBtn: $('saveBtn'),
    statusText: $('statusText'),
    projectMeta: $('projectMeta'),
    authModal: $('authModal'),
    authCloseBtn: $('authCloseBtn'),
    authMessage: $('authMessage'),
    authEmailInput: $('authEmailInput'),
    authPasswordInput: $('authPasswordInput'),
    authSignInBtn: $('authSignInBtn'),
    authSignUpBtn: $('authSignUpBtn'),
    authSignOutBtn: $('authSignOutBtn'),
    cropModal: $('cropModal'),
    cropCloseBtn: $('cropCloseBtn'),
    cropApplyBtn: $('cropApplyBtn'),
    cropStage: $('cropStage'),
    cropImage: $('cropImage'),
    cropSelection: $('cropSelection')
  };

  const state = {
    projects: [],
    activeProjectId: '',
    notesSelectedImageId: '',
    notesImageDrag: null,
    notesImageResize: null,
    notesCrop: null,
    db: null,
    saveTimer: null,
    syncTimer: null,
    cloud: {
      client: null,
      user: null,
      syncing: false
    }
  };

  function now(){ return Date.now(); }
  function nowIso(){ return new Date().toISOString(); }
  function uuid(){ return window.crypto?.randomUUID ? window.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random()*16|0; const v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function escapeHtml(s){ return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function extFromType(type){
    const t = String(type || '').toLowerCase();
    if(t.includes('png')) return 'png';
    if(t.includes('webp')) return 'webp';
    if(t.includes('gif')) return 'gif';
    return 'jpg';
  }

  function defaultProject(name='My Project'){
    return {
      id: uuid(),
      name,
      notesHtml: '',
      notesColor: '#151515',
      updatedAt: now(),
      images: []
    };
  }

  function setStatus(msg){
    el.statusText.textContent = msg || 'Ready';
  }

  function getActiveProject(){
    return state.projects.find((p) => p.id === state.activeProjectId) || state.projects[0] || null;
  }

  function saveProjectsLocal(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
    localStorage.setItem(ACTIVE_KEY, state.activeProjectId || '');
    renderProjectMeta();
  }

  function loadProjectsLocal(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      state.projects = Array.isArray(parsed) ? parsed : [];
    }catch{
      state.projects = [];
    }
    if(!state.projects.length) state.projects = [defaultProject()];
    state.activeProjectId = localStorage.getItem(ACTIVE_KEY) || state.projects[0].id;
    if(!state.projects.some((p) => p.id === state.activeProjectId)) state.activeProjectId = state.projects[0].id;
  }

  function renderProjectPicker(){
    const active = state.activeProjectId;
    el.projectPicker.innerHTML = '';
    state.projects.forEach((project) => {
      const opt = document.createElement('option');
      opt.value = project.id;
      opt.textContent = project.name;
      if(project.id === active) opt.selected = true;
      el.projectPicker.appendChild(opt);
    });
  }

  function renderProjectMeta(){
    const p = getActiveProject();
    if(!p){ el.projectMeta.textContent = ''; return; }
    el.projectMeta.textContent = `${p.images.filter((x) => !x.deleted).length} photo(s) · updated ${new Date(p.updatedAt || now()).toLocaleString()}`;
  }

  async function initDb(){
    if(state.db) return state.db;
    state.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains('note_images')) db.createObjectStore('note_images', { keyPath:'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return state.db;
  }

  async function dbPutImage(rec){
    const db = await initDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('note_images','readwrite');
      tx.objectStore('note_images').put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbGetImage(id){
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('note_images','readonly');
      const req = tx.objectStore('note_images').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbDeleteImage(id){
    const db = await initDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('note_images','readwrite');
      tx.objectStore('note_images').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function openAuthModal(){
    el.authModal.classList.add('show');
    el.authModal.setAttribute('aria-hidden','false');
  }
  function closeAuthModal(){
    el.authModal.classList.remove('show');
    el.authModal.setAttribute('aria-hidden','true');
  }

  function updateCloudUi(message=''){
    if(message) el.authMessage.textContent = message;
    if(state.cloud.user){
      el.cloudStatus.textContent = `Signed in as ${state.cloud.user.email || 'user'}`;
      el.cloudBtn.textContent = 'Cloud ✓';
    }else{
      el.cloudStatus.textContent = 'Local only';
      el.cloudBtn.textContent = 'Cloud';
    }
  }

  async function initCloud(){
    if(state.cloud.client) return state.cloud.client;
    if(!window.supabase?.createClient) return null;
    state.cloud.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    const { data } = await state.cloud.client.auth.getSession();
    state.cloud.user = data?.session?.user || null;
    state.cloud.client.auth.onAuthStateChange((_event, session) => {
      state.cloud.user = session?.user || null;
      updateCloudUi('');
      if(state.cloud.user) scheduleSync(300);
    });
    updateCloudUi('');
    return state.cloud.client;
  }

  async function signIn(){
    const client = await initCloud();
    const email = String(el.authEmailInput.value || '').trim();
    const password = String(el.authPasswordInput.value || '');
    if(!email || !password){ updateCloudUi('Enter email and password.'); return; }
    const { error } = await client.auth.signInWithPassword({ email, password });
    updateCloudUi(error ? (error.message || 'Sign-in failed.') : 'Signed in.');
    if(!error) scheduleSync(300);
  }

  async function signUp(){
    const client = await initCloud();
    const email = String(el.authEmailInput.value || '').trim();
    const password = String(el.authPasswordInput.value || '');
    if(!email || !password){ updateCloudUi('Enter email and password.'); return; }
    const { error } = await client.auth.signUp({ email, password });
    updateCloudUi(error ? (error.message || 'Sign-up failed.') : 'Check your email to confirm sign-up.');
  }

  async function signOut(){
    const client = await initCloud();
    const { error } = await client.auth.signOut();
    updateCloudUi(error ? (error.message || 'Sign-out failed.') : 'Signed out.');
  }

  function userRoot(){
    const uid = state.cloud.user?.id;
    return uid ? `notes-projects/${uid}` : '';
  }
  function projectManifestPath(projectId){ return `${userRoot()}/${projectId}/project.json`; }
  function projectImagePath(projectId, imageId, type){ return `${userRoot()}/${projectId}/images/${imageId}.${extFromType(type)}`; }

  async function uploadText(path, text){
    const client = await initCloud();
    return client.storage.from(CLOUD_BUCKET).upload(path, new Blob([text], { type:'application/json' }), { upsert:true, contentType:'application/json' });
  }
  async function uploadBlob(path, blob, type){
    const client = await initCloud();
    return client.storage.from(CLOUD_BUCKET).upload(path, blob, { upsert:true, contentType:type || blob.type || 'application/octet-stream' });
  }
  async function downloadText(path){
    const client = await initCloud();
    const { data, error } = await client.storage.from(CLOUD_BUCKET).download(path);
    if(error) throw error;
    return data.text();
  }
  async function downloadBlob(path){
    const client = await initCloud();
    const { data, error } = await client.storage.from(CLOUD_BUCKET).download(path);
    if(error) throw error;
    return data;
  }
  async function listFolder(path){
    const client = await initCloud();
    const { data, error } = await client.storage.from(CLOUD_BUCKET).list(path, { limit:100, offset:0 });
    if(error) throw error;
    return data || [];
  }

  function currentNotesHtml(){
    return el.notesEditor.innerHTML;
  }

  function queueSave(){
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveActiveProjectFromEditor, 180);
  }

  function scheduleSync(ms=900){
    clearTimeout(state.syncTimer);
    state.syncTimer = setTimeout(() => syncAll().catch((err) => { console.error(err); setStatus(`Sync failed: ${err.message || err}`); }), ms);
  }

  function ensureImageChrome(block){
    if(!block || block.dataset.chromeReady === '1') return;
    block.dataset.chromeReady = '1';
    if(!block.querySelector('.notesImageDeleteBtn')){
      const btn = document.createElement('button');
      btn.className = 'notesImageDeleteBtn';
      btn.type = 'button';
      btn.title = 'Delete photo';
      btn.textContent = '×';
      block.appendChild(btn);
    }
    if(!block.querySelector('.notesImageCropBtn')){
      const btn = document.createElement('button');
      btn.className = 'notesImageCropBtn';
      btn.type = 'button';
      btn.title = 'Crop photo';
      btn.textContent = '✂';
      block.appendChild(btn);
    }
    if(!block.querySelector('.notesImageResizeHandle')){
      const h = document.createElement('span');
      h.className = 'notesImageResizeHandle';
      block.appendChild(h);
    }
  }

  function clearImageSelection(){
    state.notesSelectedImageId = '';
    el.notesEditor.querySelectorAll('.notesImageBlock.is-selected').forEach((node) => node.classList.remove('is-selected'));
  }

  function selectImage(imageId){
    clearImageSelection();
    state.notesSelectedImageId = String(imageId || '');
    const block = el.notesEditor.querySelector(`.notesImageBlock[data-notes-image-id="${CSS.escape(state.notesSelectedImageId)}"]`);
    block?.classList.add('is-selected');
  }

  function normalizeImageBlock(block){
    if(!block) return;
    ensureImageChrome(block);
    const w = Number(block.dataset.width || parseFloat(block.style.width) || 320);
    block.dataset.width = String(clamp(w, 120, 900));
    block.style.width = `${Number(block.dataset.width)}px`;
    const x = Number(block.dataset.freeX || 0) || 0;
    const y = Number(block.dataset.freeY || 0) || 0;
    block.dataset.freeX = String(x);
    block.dataset.freeY = String(y);
    block.style.transform = `translate(${x}px, ${y}px)`;
  }

  function updateProjectManifestFromEditor(){
    const p = getActiveProject();
    if(!p) return;
    const existing = new Map((p.images || []).map((img) => [String(img.id), img]));
    const next = [];
    el.notesEditor.querySelectorAll('.notesImageBlock[data-notes-image-id]').forEach((block) => {
      const id = String(block.dataset.notesImageId || '');
      if(!id) return;
      const prev = existing.get(id) || { id, projectId:p.id, createdAt: nowIso() };
      const imgEl = block.querySelector('img[data-notes-image-id]');
      const width = Number(block.dataset.width || parseFloat(block.style.width) || 320) || 320;
      const entry = {
        ...prev,
        id,
        projectId:p.id,
        title: prev.title || imgEl?.alt || 'Photo',
        width,
        freeX: Number(block.dataset.freeX || 0) || 0,
        freeY: Number(block.dataset.freeY || 0) || 0,
        deleted:false,
        updatedAt: nowIso()
      };
      next.push(entry);
    });
    // preserve deleted entries for sync cleanup history
    for(const old of (p.images || [])){
      if(old.deleted && !next.some((x) => x.id === old.id)) next.push(old);
    }
    p.images = next;
    p.notesHtml = currentNotesHtml();
    p.notesColor = el.notesTextColor.value || '#151515';
    p.updatedAt = now();
  }

  function saveActiveProjectFromEditor(){
    const p = getActiveProject();
    if(!p) return;
    updateProjectManifestFromEditor();
    saveProjectsLocal();
    setStatus('Saved locally');
    if(state.cloud.user) scheduleSync();
  }

  async function refreshImageElementFromBlob(imageId, blob){
    const img = el.notesEditor.querySelector(`img[data-notes-image-id="${CSS.escape(String(imageId))}"]`);
    if(!img || !blob) return;
    try{ if(img.dataset.objectUrl) URL.revokeObjectURL(img.dataset.objectUrl); }catch{}
    const url = URL.createObjectURL(blob);
    img.src = url;
    img.dataset.objectUrl = url;
  }

  async function resolveImageSources(){
    const p = getActiveProject();
    if(!p) return;
    const manifest = new Map((p.images || []).map((entry) => [String(entry.id), entry]));
    const imgs = Array.from(el.notesEditor.querySelectorAll('img[data-notes-image-id]'));
    for(const img of imgs){
      const id = String(img.dataset.notesImageId || '');
      const block = img.closest('.notesImageBlock');
      normalizeImageBlock(block);
      try{
        const rec = await dbGetImage(id);
        if(rec?.blob){
          await refreshImageElementFromBlob(id, rec.blob);
          continue;
        }
      }catch(err){ console.warn(err); }
      const entry = manifest.get(id);
      if(entry?.path && state.cloud.user){
        try{
          const blob = await downloadBlob(entry.path);
          await dbPutImage({ id, projectId:p.id, blob, title:entry.title, contentType:entry.contentType, size:entry.size, updatedAt: entry.updatedAt });
          await refreshImageElementFromBlob(id, blob);
        }catch(err){ console.warn('Could not download image', err); }
      }
    }
  }

  async function insertImageFromFile(file){
    const p = getActiveProject();
    if(!file || !p) return;
    const id = uuid();
    const rec = { id, projectId:p.id, blob:file, title:file.name || 'Photo', contentType:file.type || 'image/jpeg', size:file.size || 0, updatedAt: nowIso() };
    await dbPutImage(rec);
    const html = `<div class="notesImageBlock" contenteditable="false" data-notes-image-id="${id}" data-width="320" data-free-x="0" data-free-y="0" style="width:320px;transform:translate(0px,0px)"><img class="notesImage" data-notes-image-id="${id}" alt="${escapeHtml(file.name || 'Photo')}" loading="lazy" decoding="async"></div><div><br></div>`;
    try{
      document.execCommand('insertHTML', false, html);
    }catch{
      el.notesEditor.insertAdjacentHTML('beforeend', html);
    }
    const block = el.notesEditor.querySelector(`.notesImageBlock[data-notes-image-id="${CSS.escape(id)}"]`);
    normalizeImageBlock(block);
    const entry = { id, projectId:p.id, title:rec.title, contentType:rec.contentType, size:rec.size, updatedAt:rec.updatedAt, width:320, freeX:0, freeY:0, deleted:false, path:'' };
    p.images = (p.images || []).filter((x) => x.id !== id).concat(entry);
    await resolveImageSources();
    selectImage(id);
    saveActiveProjectFromEditor();
    setStatus('Photo added');
  }

  async function removeImage(imageId){
    const p = getActiveProject();
    if(!p || !imageId) return;
    const block = el.notesEditor.querySelector(`.notesImageBlock[data-notes-image-id="${CSS.escape(String(imageId))}"]`);
    block?.nextElementSibling?.remove?.();
    block?.remove();
    p.images = (p.images || []).map((img) => String(img.id) === String(imageId) ? ({ ...img, deleted:true, updatedAt:nowIso() }) : img);
    await dbDeleteImage(String(imageId)).catch(() => {});
    clearImageSelection();
    saveActiveProjectFromEditor();
    setStatus('Photo deleted');
  }

  function renderProject(){
    const p = getActiveProject();
    if(!p) return;
    el.notesEditor.innerHTML = p.notesHtml || '';
    el.notesEditor.style.color = p.notesColor || '#151515';
    el.notesTextColor.value = p.notesColor || '#151515';
    el.notesEditor.querySelectorAll('.notesImageBlock').forEach((block) => normalizeImageBlock(block));
    clearImageSelection();
    renderProjectPicker();
    renderProjectMeta();
    resolveImageSources();
  }

  function addProject(){
    const name = prompt('New project name?', `Project ${state.projects.length + 1}`)?.trim();
    if(!name) return;
    const p = defaultProject(name);
    state.projects.unshift(p);
    state.activeProjectId = p.id;
    saveProjectsLocal();
    renderProject();
  }

  function renameProject(){
    const p = getActiveProject();
    if(!p) return;
    const name = prompt('Rename project', p.name)?.trim();
    if(!name) return;
    p.name = name;
    p.updatedAt = now();
    saveProjectsLocal();
    renderProject();
  }

  async function deleteProject(){
    const p = getActiveProject();
    if(!p || state.projects.length === 1) return;
    if(!confirm(`Delete "${p.name}"?`)) return;
    for(const img of (p.images || [])) await dbDeleteImage(img.id).catch(() => {});
    state.projects = state.projects.filter((x) => x.id !== p.id);
    state.activeProjectId = state.projects[0].id;
    saveProjectsLocal();
    renderProject();
    scheduleSync(250);
  }

  function execCmd(cmd){
    document.execCommand(cmd, false, null);
    queueSave();
  }

  function wireEditor(){
    el.notesEditor.addEventListener('input', queueSave);
    el.notesEditor.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.notesImageDeleteBtn');
      if(deleteBtn){
        e.preventDefault();
        e.stopPropagation();
        const block = deleteBtn.closest('.notesImageBlock');
        removeImage(block?.dataset.notesImageId);
        return;
      }
      const cropBtn = e.target.closest('.notesImageCropBtn');
      if(cropBtn){
        e.preventDefault();
        e.stopPropagation();
        const block = cropBtn.closest('.notesImageBlock');
        openCropModal(block?.dataset.notesImageId);
        return;
      }
      const block = e.target.closest('.notesImageBlock');
      if(block){
        e.preventDefault();
        e.stopPropagation();
        selectImage(block.dataset.notesImageId);
        return;
      }
      clearImageSelection();
    });

    el.notesEditor.addEventListener('pointerdown', (e) => {
      const resizeHandle = e.target.closest('.notesImageResizeHandle');
      if(resizeHandle){
        const block = resizeHandle.closest('.notesImageBlock');
        if(block){
          e.preventDefault();
          e.stopPropagation();
          selectImage(block.dataset.notesImageId);
          startResize(block, e);
        }
        return;
      }
      if(e.target.closest('.notesImageDeleteBtn, .notesImageCropBtn')) return;
      const block = e.target.closest('.notesImageBlock');
      if(!block) return;
      e.preventDefault();
      e.stopPropagation();
      selectImage(block.dataset.notesImageId);
      prepareLongPressDrag(block, e);
    });

    el.notesEditor.addEventListener('pointermove', (e) => {
      if(state.notesImageResize?.block){
        e.preventDefault();
        moveResize(e);
      }
      if(state.notesImageDrag?.dragging){
        e.preventDefault();
        moveDrag(e);
      }
    });

    const stopPointerWork = (e) => {
      stopResize(e);
      stopDrag(e);
    };
    el.notesEditor.addEventListener('pointerup', stopPointerWork);
    el.notesEditor.addEventListener('pointercancel', stopPointerWork);
    el.notesEditor.addEventListener('lostpointercapture', stopPointerWork);
  }

  function prepareLongPressDrag(block, e){
    stopDrag();
    const pointerId = e.pointerId;
    const rect = block.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = Number(block.dataset.freeX || 0) || 0;
    const baseY = Number(block.dataset.freeY || 0) || 0;
    const drag = {
      block,
      pointerId,
      startX,
      startY,
      baseX,
      baseY,
      dragging:false,
      timer:setTimeout(() => {
        drag.dragging = true;
        block.setPointerCapture?.(pointerId);
        setStatus('Dragging photo');
      }, 220),
      cancelIfMoved(ev){
        if(drag.dragging) return;
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if(moved > 7){ clearTimeout(drag.timer); drag.timer = null; state.notesImageDrag = null; }
      }
    };
    state.notesImageDrag = drag;
    const onMove = (ev) => drag.cancelIfMoved(ev);
    document.addEventListener('pointermove', onMove, { passive:true, once:false });
    drag.cancelListener = onMove;
  }

  function moveDrag(e){
    const drag = state.notesImageDrag;
    if(!drag?.dragging) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const x = drag.baseX + dx;
    const y = drag.baseY + dy;
    drag.block.dataset.freeX = String(Math.round(x));
    drag.block.dataset.freeY = String(Math.round(y));
    drag.block.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function stopDrag(){
    const drag = state.notesImageDrag;
    if(!drag) return;
    clearTimeout(drag.timer);
    if(drag.cancelListener) document.removeEventListener('pointermove', drag.cancelListener);
    if(drag.dragging) saveActiveProjectFromEditor();
    state.notesImageDrag = null;
  }

  function startResize(block, e){
    state.notesImageResize = {
      block,
      pointerId:e.pointerId,
      startX:e.clientX,
      startWidth:Number(block.dataset.width || parseFloat(block.style.width) || block.getBoundingClientRect().width || 320)
    };
    block.setPointerCapture?.(e.pointerId);
    setStatus('Resizing photo');
  }

  function moveResize(e){
    const r = state.notesImageResize;
    if(!r?.block) return;
    const next = clamp(r.startWidth + (e.clientX - r.startX), 120, 900);
    r.block.dataset.width = String(Math.round(next));
    r.block.style.width = `${Math.round(next)}px`;
  }

  function stopResize(){
    const r = state.notesImageResize;
    if(!r?.block) return;
    saveActiveProjectFromEditor();
    state.notesImageResize = null;
  }

  function ensureCropState(){
    if(state.notesCrop) return state.notesCrop;
    state.notesCrop = { open:false, imageId:'', rec:null, sel:null, drag:null };
    return state.notesCrop;
  }

  function renderCropSelection(){
    const crop = ensureCropState();
    const sel = crop.sel;
    if(!sel) return;
    el.cropSelection.style.left = `${sel.x}px`;
    el.cropSelection.style.top = `${sel.y}px`;
    el.cropSelection.style.width = `${sel.w}px`;
    el.cropSelection.style.height = `${sel.h}px`;
  }

  async function openCropModal(imageId){
    const p = getActiveProject();
    if(!p || !imageId) return;
    const rec = await dbGetImage(String(imageId));
    if(!rec?.blob) return;
    const crop = ensureCropState();
    crop.open = true;
    crop.imageId = String(imageId);
    crop.rec = rec;
    try{ if(crop.objectUrl) URL.revokeObjectURL(crop.objectUrl); }catch{}
    crop.objectUrl = URL.createObjectURL(rec.blob);
    el.cropImage.src = crop.objectUrl;
    el.cropModal.classList.add('show');
    el.cropModal.setAttribute('aria-hidden','false');
    await new Promise((resolve) => { el.cropImage.onload = () => resolve(); setTimeout(resolve, 80); });
    const w = el.cropImage.clientWidth || 400;
    const h = el.cropImage.clientHeight || 300;
    crop.sel = { x:Math.round(w*0.1), y:Math.round(h*0.1), w:Math.round(w*0.8), h:Math.round(h*0.8) };
    renderCropSelection();
  }

  function closeCropModal(){
    const crop = ensureCropState();
    crop.open = false;
    crop.drag = null;
    el.cropModal.classList.remove('show');
    el.cropModal.setAttribute('aria-hidden','true');
  }

  function startCropPointer(e){
    const crop = ensureCropState();
    if(!crop.open || !crop.sel) return;
    const handle = e.target.closest('.cropHandle')?.dataset.handle || 'move';
    const box = el.cropStage.getBoundingClientRect();
    crop.drag = {
      mode:handle,
      startX:e.clientX,
      startY:e.clientY,
      startSel:{ ...crop.sel },
      bounds:{ w: box.width, h: box.height },
      pointerId:e.pointerId
    };
    el.cropSelection.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  }

  function moveCropPointer(e){
    const crop = ensureCropState();
    const drag = crop.drag;
    if(!drag || !crop.sel) return;
    const min = 40;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    let { x, y, w, h } = drag.startSel;
    if(drag.mode === 'move'){
      x = clamp(drag.startSel.x + dx, 0, drag.bounds.w - w);
      y = clamp(drag.startSel.y + dy, 0, drag.bounds.h - h);
    }else if(drag.mode === 'br'){
      w = clamp(drag.startSel.w + dx, min, drag.bounds.w - x);
      h = clamp(drag.startSel.h + dy, min, drag.bounds.h - y);
    }else if(drag.mode === 'tl'){
      const right = drag.startSel.x + drag.startSel.w;
      const bottom = drag.startSel.y + drag.startSel.h;
      x = clamp(drag.startSel.x + dx, 0, right - min);
      y = clamp(drag.startSel.y + dy, 0, bottom - min);
      w = right - x;
      h = bottom - y;
    }else if(drag.mode === 'tr'){
      const left = drag.startSel.x;
      const bottom = drag.startSel.y + drag.startSel.h;
      y = clamp(drag.startSel.y + dy, 0, bottom - min);
      w = clamp(drag.startSel.w + dx, min, drag.bounds.w - left);
      h = bottom - y;
      x = left;
    }else if(drag.mode === 'bl'){
      const top = drag.startSel.y;
      const right = drag.startSel.x + drag.startSel.w;
      x = clamp(drag.startSel.x + dx, 0, right - min);
      w = right - x;
      h = clamp(drag.startSel.h + dy, min, drag.bounds.h - top);
      y = top;
    }
    crop.sel = { x:Math.round(x), y:Math.round(y), w:Math.round(w), h:Math.round(h) };
    renderCropSelection();
  }

  function stopCropPointer(){
    const crop = ensureCropState();
    crop.drag = null;
  }

  async function applyCrop(){
    const crop = ensureCropState();
    if(!crop.open || !crop.rec?.blob || !crop.sel) return;
    const naturalW = el.cropImage.naturalWidth || 0;
    const naturalH = el.cropImage.naturalHeight || 0;
    const renderW = el.cropImage.clientWidth || naturalW;
    const renderH = el.cropImage.clientHeight || naturalH;
    if(!naturalW || !naturalH || !renderW || !renderH) return;
    const scaleX = naturalW / renderW;
    const scaleY = naturalH / renderH;
    const sx = Math.round(crop.sel.x * scaleX);
    const sy = Math.round(crop.sel.y * scaleY);
    const sw = Math.max(1, Math.round(crop.sel.w * scaleX));
    const sh = Math.max(1, Math.round(crop.sel.h * scaleY));
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(el.cropImage, sx, sy, sw, sh, 0, 0, sw, sh);
    const outType = String(crop.rec.contentType || crop.rec.blob.type || 'image/jpeg').includes('png') ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Crop failed')), outType, 0.92));
    const nextRec = { ...crop.rec, blob, contentType: outType, size: blob.size, updatedAt: nowIso() };
    await dbPutImage(nextRec);
    await refreshImageElementFromBlob(crop.imageId, blob);
    const p = getActiveProject();
    if(p){
      p.images = (p.images || []).map((img) => String(img.id) === crop.imageId ? ({ ...img, contentType:outType, size:blob.size, updatedAt:nowIso(), path:'' }) : img);
      p.updatedAt = now();
      saveProjectsLocal();
    }
    saveActiveProjectFromEditor();
    closeCropModal();
    setStatus('Crop applied');
  }

  async function pushProject(project){
    if(!state.cloud.user) return;
    for(const img of (project.images || [])){
      if(img.deleted) continue;
      const rec = await dbGetImage(img.id).catch(() => null);
      if(!rec?.blob) continue;
      const path = projectImagePath(project.id, img.id, rec.contentType || rec.blob.type);
      const { error } = await uploadBlob(path, rec.blob, rec.contentType || rec.blob.type);
      if(error) throw error;
      img.path = path;
      img.contentType = rec.contentType || rec.blob.type || img.contentType || 'image/jpeg';
      img.size = rec.size || rec.blob.size || img.size || 0;
    }
    const manifest = {
      id: project.id,
      name: project.name,
      notesHtml: project.notesHtml,
      notesColor: project.notesColor,
      updatedAt: project.updatedAt,
      images: (project.images || []).map((img) => ({ ...img }))
    };
    const { error } = await uploadText(projectManifestPath(project.id), JSON.stringify(manifest, null, 2));
    if(error) throw error;
  }

  async function pullRemoteProjects(){
    if(!state.cloud.user) return [];
    const root = userRoot();
    let items = [];
    try{ items = await listFolder(root); }catch(err){ console.warn('List remote failed', err); return []; }
    const projects = [];
    for(const item of items){
      const name = String(item.name || '').trim();
      if(!name || name.endsWith('.json')) continue;
      try{
        const raw = await downloadText(`${root}/${name}/project.json`);
        const parsed = JSON.parse(raw);
        if(parsed?.id) projects.push(parsed);
      }catch(err){ console.warn('Pull remote project failed', err); }
    }
    return projects;
  }

  async function mergeRemoteProject(remote){
    if(!remote?.id) return;
    let local = state.projects.find((p) => p.id === remote.id);
    const remoteStamp = Number(remote.updatedAt || 0) || Date.parse(remote.updatedAt || '') || 0;
    const localStamp = Number(local?.updatedAt || 0) || Date.parse(local?.updatedAt || '') || 0;
    if(!local){
      local = { id:remote.id, name:remote.name || 'Project', notesHtml:'', notesColor:'#151515', updatedAt:0, images:[] };
      state.projects.push(local);
    }
    if(remoteStamp >= localStamp){
      local.name = remote.name || local.name;
      local.notesHtml = String(remote.notesHtml || '');
      local.notesColor = String(remote.notesColor || '#151515');
      local.updatedAt = remoteStamp || now();
      local.images = Array.isArray(remote.images) ? remote.images : [];
      for(const img of local.images.filter((x) => !x.deleted && x.path)){
        const hasLocal = await dbGetImage(img.id).catch(() => null);
        if(hasLocal?.blob) continue;
        try{
          const blob = await downloadBlob(img.path);
          await dbPutImage({ id:img.id, projectId:local.id, blob, title:img.title, contentType:img.contentType, size:img.size, updatedAt:img.updatedAt });
        }catch(err){ console.warn('Remote image fetch failed', err); }
      }
    }
  }

  async function syncAll(){
    if(state.cloud.syncing) return;
    const client = await initCloud();
    if(!client || !state.cloud.user) return;
    state.cloud.syncing = true;
    try{
      setStatus('Syncing…');
      const remoteProjects = await pullRemoteProjects();
      for(const remote of remoteProjects) await mergeRemoteProject(remote);
      for(const project of state.projects) await pushProject(project);
      saveProjectsLocal();
      renderProjectPicker();
      renderProjectMeta();
      if(getActiveProject()) renderProject();
      setStatus('Cloud sync complete');
    }finally{
      state.cloud.syncing = false;
    }
  }

  function wireUi(){
    el.cloudBtn.addEventListener('click', openAuthModal);
    el.authCloseBtn.addEventListener('click', closeAuthModal);
    el.authModal.addEventListener('click', (e) => { if(e.target === el.authModal) closeAuthModal(); });
    el.authSignInBtn.addEventListener('click', signIn);
    el.authSignUpBtn.addEventListener('click', signUp);
    el.authSignOutBtn.addEventListener('click', signOut);
    el.syncBtn.addEventListener('click', () => syncAll().catch((err) => setStatus(`Sync failed: ${err.message || err}`)));

    el.projectPicker.addEventListener('change', () => {
      state.activeProjectId = el.projectPicker.value;
      saveProjectsLocal();
      renderProject();
    });
    el.newProjectBtn.addEventListener('click', addProject);
    el.renameProjectBtn.addEventListener('click', renameProject);
    el.deleteProjectBtn.addEventListener('click', deleteProject);

    el.notesAttachBtn.addEventListener('click', () => el.notesImageInput.click());
    el.notesImageInput.addEventListener('change', async () => {
      const files = Array.from(el.notesImageInput.files || []);
      for(const file of files) await insertImageFromFile(file);
      el.notesImageInput.value = '';
    });
    el.notesFontSize.addEventListener('change', () => {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('fontSize', false, '7');
      const sel = window.getSelection();
      const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
      const parent = range?.startContainer?.parentElement;
      if(parent) parent.style.fontSize = `${Number(el.notesFontSize.value || 18)}px`;
      queueSave();
    });
    el.notesTextColor.addEventListener('input', () => {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, el.notesTextColor.value || '#151515');
      queueSave();
    });
    el.boldBtn.addEventListener('click', () => execCmd('bold'));
    el.italicBtn.addEventListener('click', () => execCmd('italic'));
    el.underlineBtn.addEventListener('click', () => execCmd('underline'));
    el.saveBtn.addEventListener('click', saveActiveProjectFromEditor);

    el.cropCloseBtn.addEventListener('click', closeCropModal);
    el.cropApplyBtn.addEventListener('click', applyCrop);
    el.cropSelection.addEventListener('pointerdown', startCropPointer);
    document.addEventListener('pointermove', moveCropPointer, { passive:false });
    document.addEventListener('pointerup', stopCropPointer, true);
    document.addEventListener('pointercancel', stopCropPointer, true);

    wireEditor();
  }

  async function boot(){
    loadProjectsLocal();
    renderProjectPicker();
    renderProject();
    wireUi();
    await initDb();
    await initCloud();
    updateCloudUi('');
  }

  boot().catch((err) => {
    console.error(err);
    setStatus(`Boot failed: ${err.message || err}`);
  });
})();
