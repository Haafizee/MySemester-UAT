console.log('MySemester app.js v1.5 (Subject offerings + student selection) loaded');
let idToken = null;
let devToken = null;

function getConfig() {
  if (typeof window !== 'undefined' && window.MYSEMESTER_CONFIG) return window.MYSEMESTER_CONFIG;
  if (typeof MYSEMESTER_CONFIG !== 'undefined') return MYSEMESTER_CONFIG;
  return {};
}

const LOGIN_MODE = String(getConfig().LOGIN_MODE || 'manual').toLowerCase();
let rolePreviewStarting = false;
let currentUser = null;
let authenticatedUser = null;
let currentClass = null;
let adminData = null;
let selectedAdminClassId = null;
let activeRoleTest = null;
let roleMatrixData = null;
let roleTestContextData = null;
let activeTestSemesterId = null;
let activeRoleLabTab = 'dashboard';
let roleLabEditing = null;
const roleLabListState = {};
const ROLE_LAB_PAGE_SIZE = 8;
let scheduleCalendarDate = new Date();
let roleLabCalendarDate = new Date();
let scheduleCalendarSearch = '';
let scheduleCalendarSubject = 'all';
let workspaceData = null;
let activeNav = 'overview';
let isSystemAdminCurrent = false;

const $ = (selector) => document.querySelector(selector);
function show(selector, visible) {
  const el=$(selector);
  if(el) el.classList.toggle('hidden', !visible);
}
function rolePermission(role, permission) {
  if(currentClass&&String(currentClass.memberRole||'').toLowerCase()===String(role||'').toLowerCase()&&Array.isArray(currentClass.permissions)) {
    return currentClass.permissions.includes(permission);
  }
  const permissions={
    student:['class.view','semester.view','schedule.view','pb.view','pb.progress.update','resources.view','calendar.view'],
    pic:['class.view','semester.view','schedule.view','schedule.edit','schedule.delete','pb.view','resources.view','calendar.view','calendar.create','members.view','reports.view'],
    lecturer:['class.view','semester.view','subject.offerings.manage','schedule.view','schedule.edit','schedule.verify','schedule.delete','pb.view','pb.create','pb.edit','pb.delete','pb.marks.manage','resources.view','resources.manage','resources.delete','calendar.view','calendar.create','calendar.edit','calendar.delete','members.view','reports.view'],
    ko:['class.view','semester.view','semester.manage','subject.offerings.manage','schedule.view','schedule.edit','schedule.verify','schedule.delete','pb.view','pb.create','pb.edit','pb.delete','resources.view','resources.manage','resources.delete','calendar.view','calendar.create','calendar.edit','calendar.delete','members.view','members.roles.manage','reports.view','notifications.manage'],
    class_admin:['class.activate','class.view','semester.view','semester.manage','subject.offerings.manage','schedule.view','schedule.edit','schedule.verify','schedule.delete','pb.view','pb.create','pb.edit','pb.delete','pb.marks.manage','resources.view','resources.manage','resources.delete','calendar.view','calendar.create','calendar.edit','calendar.delete','members.view','members.roles.manage','reports.view','notifications.manage']
  };
  const normalized=String(role||'').toLowerCase()==='admin'?'class_admin':String(role||'').toLowerCase();
  return (permissions[normalized]||[]).includes(permission);
}
function setNavigationAvailability(isLoggedIn,isSystemAdmin,hasClass) {
  const allowed=isLoggedIn
    ? (isSystemAdmin?['overview','classes','preview','users','data','guide']:
      ['overview','schedule','assignments','calendar','resources'])
    : ['overview','classes','schedule','assignments','calendar','resources','preview','users','data','guide'];
  if(isLoggedIn&&!isSystemAdmin&&hasClass&&currentClass?.permissions?.includes('subject.offerings.manage')) allowed.push('subjects');
  document.querySelectorAll('[data-nav]').forEach(button=>{
    const key=button.dataset.nav;
    button.classList.toggle('hidden',!allowed.includes(key));
    button.disabled=!!isLoggedIn&&!isSystemAdmin&&!hasClass&&key!=='overview';
  });
  document.querySelectorAll('.nav-section-title').forEach((el,index)=>{
    el.classList.toggle('hidden',isLoggedIn&&!isSystemAdmin&&index!==0);
  });
  show('#userProfileBadge',isLoggedIn);
  show('#currentSessionBadge',isLoggedIn);
  show('#logoutBtn',isLoggedIn);
  show('.header-search',isLoggedIn);
  show('#clearCacheBtn',isLoggedIn&&isSystemAdmin);
  document.querySelectorAll('#filterToolbar .filter-item').forEach(item=>{
    item.classList.toggle('hidden',!isLoggedIn||isSystemAdmin);
  });
}
function navigateTo(key) {
  const panel=$('#panel-'+key);
  if(!$('#appView') || $('#appView').classList.contains('hidden')) {
    const requestedPage=key;
    key='overview';
    show('#loginView',true);
    if(requestedPage!=='overview') showToast('Sila log masuk untuk membuka fungsi ini.','error');
  } else if(key!=='overview'&&!panel) {
    key='overview';
  } else if(key!=='overview'&&panel?.classList.contains('hidden')&&panel.dataset.navDisabled==='true') {
    key='overview';
  }
  activeNav=key;
  document.querySelectorAll('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav===key));
  document.querySelectorAll('.app-panel').forEach(section=>section.classList.toggle('hidden',section.id!=='panel-'+key));
  const sidebar=$('#appSidebar');
  if(sidebar) sidebar.classList.remove('open');
  $('#sidebarBackdrop')?.classList.remove('active');
  if(key==='preview'&&isSystemAdminCurrent&&!roleMatrixData) loadRolePreviewConfig();
  if(key==='data'&&isSystemAdminCurrent&&!adminDataSchema) loadAdminDataTable();
  if(key==='subjects'&&!isSystemAdminCurrent) renderSubjectAssignmentPanel();
}
document.querySelectorAll('[data-nav]').forEach(button=>button.addEventListener('click',()=>navigateTo(button.dataset.nav)));
$('#sidebarToggleBtn')?.addEventListener('click',()=>{
  $('#appSidebar')?.classList.toggle('open');
  $('#sidebarBackdrop')?.classList.toggle('active');
});
$('#sidebarBackdrop')?.addEventListener('click',()=>{
  $('#appSidebar')?.classList.remove('open');
  $('#sidebarBackdrop')?.classList.remove('active');
});
$('#mobileMoreBtn')?.addEventListener('click',()=>{
  $('#appSidebar')?.classList.toggle('open');
  $('#sidebarBackdrop')?.classList.toggle('active');
});
setNavigationAvailability(false,false,false);
function setError(message) { $('#loginError').textContent = message || ''; }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

let toastTimer = null;
function showToast(message, type = 'ok', duration = 3500) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast ' + (type === true ? 'error' : (type === false ? 'ok' : type));
  show('#toast', true);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { show('#toast', false); }, duration);
}

function initializeGoogleSignIn() {
  if (!window.google || !google.accounts || !google.accounts.id) {
    setError('Google Sign-In belum dimuatkan. Sila refresh halaman.');
    return;
  }
  const config = getConfig();
  if (!config.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID.includes('PASTE_')) {
    setError('Google Client ID belum dikonfigurasikan dalam config.js.');
    return;
  }
  google.accounts.id.initialize({
    client_id: config.GOOGLE_CLIENT_ID,
    callback: onGoogleCredential,
    auto_select: false
  });
  google.accounts.id.renderButton($('#googleButton'), {
    theme: 'outline', size: 'large', shape: 'pill',
    text: 'continue_with', width: 260
  });
}
window.addEventListener('load', () => {
  if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then(()=>{const status=$('.system-status-indicator .status-text');if(status)status.textContent='Fast Cache Aktif • Online';})
      .catch(error=>{
        const status=$('.system-status-indicator .status-text');
        if(status)status.textContent='Cache luar talian tidak tersedia';
        console.error('MySemester service worker registration failed:',error);
      });
  }
  const manual=LOGIN_MODE==='manual';
  show('#manualLoginForm',manual);
  show('#googleLoginPanel',!manual);
  if(manual) return; // Google Identity Services is not even requested in manual development mode.
  const script=document.createElement('script');
  script.src='https://accounts.google.com/gsi/client';
  script.async=true;script.defer=true;
  script.onload=initializeGoogleSignIn;
  script.onerror=()=>setError('Tidak dapat memuatkan Google Sign-In. Semak sambungan internet.');
  document.head.appendChild(script);
});

async function completeLogin(result) {
  currentUser=result.user||{};
  authenticatedUser=currentUser;
  currentUser.name=currentUser.name||currentUser.fullName||currentUser.email||'Pengguna';
  $('#welcomeName').textContent='Selamat datang, '+currentUser.name;
  $('#welcomeEmail').textContent=currentUser.email||'';
  show('#loginView',false);
  show('#appView',true);
  const isSystemAdmin=!!(result.isSystemAdmin||result.workspace==='system_admin');
  isSystemAdminCurrent=isSystemAdmin;
  $('#headerUserName').textContent=currentUser.name;
  $('#headerAvatar').textContent=(currentUser.name||currentUser.email||'M').trim().charAt(0).toUpperCase();
  $('#headerUserRole').textContent=isSystemAdmin?'PENTADBIR':String(result.classes?.[0]?.memberRole||'PELAJAR').toUpperCase();
  setNavigationAvailability(true,isSystemAdmin,!!result.classes?.length);
  navigateTo('overview');
  if(isSystemAdmin) {
    show('#adminView',true);
    show('#studentView',false);
    $('#adminWelcomeName').textContent=currentUser.name||currentUser.email;
    $('#adminWelcomeEmail').textContent=currentUser.email;
    await loadAdminDashboard();
  } else {
    show('#adminView',false);
    show('#studentView',true);
    workspaceData={classes:result.classes||[]};
    populateWorkspaceFilters();
    if(result.classes?.length) await loadStudentWorkspace();
    else {
      currentClass=null;
      show('#noClass',true);show('#classArea',false);
      renderOverviewDashboard();
    }
  }
}
function populateWorkspaceFilters() {
  const classes=workspaceData?.classes||[];
  const classSelect=$('#filterClassSelect');
  if(classSelect) {
    classSelect.innerHTML=classes.map(c=>`<option value="${escapeHtml(c.classId)}">${escapeHtml(c.className)}</option>`).join('');
    classSelect.value=currentClass?.classId||classes[0]?.classId||'';
    classSelect.closest('.filter-item')?.classList.toggle('hidden',classes.length<2);
  }
  const selected=classes.find(c=>c.classId===classSelect?.value)||classes[0]||null;
  currentClass=selected;
  const semesterSelect=$('#filterSemesterSelect');
  const semesters=selected?.semesters||[];
  if(semesterSelect) {
    semesterSelect.innerHTML=semesters.map(s=>`<option value="${escapeHtml(s.semesterId)}">${escapeHtml(s.semesterName)}${s.academicSession?' · '+escapeHtml(s.academicSession):''}</option>`).join('');
    const active=semesters.find(s=>s.status==='active')||semesters[0];
    semesterSelect.value=workspaceData?.semesterId&&semesters.some(s=>s.semesterId===workspaceData.semesterId)
      ?workspaceData.semesterId:(active?.semesterId||'');
    semesterSelect.closest('.filter-item')?.classList.toggle('hidden',semesters.length<2);
  }
  if(selected) {
    $('#className').textContent=selected.className;
    $('#classCode').textContent='Kod kelas: '+(selected.classCode||'');
    $('#rolePill').textContent=selected.memberRole||'';
    $('#sessionBadgeYear').textContent=semesters.find(s=>s.semesterId===semesterSelect?.value)?.academicSession||'—';
  }
  setNavigationAvailability(true,isSystemAdminCurrent,!!selected);
  show('#classArea',!!selected);
  show('#noClass',!selected);
}
function subjectOptions(classInfo,semesterId) {
  return (classInfo?.semesterSubjects||[]).filter(s=>{
    if(semesterId&&s.semesterId!==semesterId) return false;
    if(currentClassRole()==='student'&&!(classInfo?.selectedSemesterSubjectIds||[]).includes(s.semesterSubjectId)) return false;
    if(currentClassRole()==='lecturer') {
      return s.lecturerUserId===currentUser?.id;
    }
    if(currentClassRole()==='pic') return s.picUserId===currentUser?.id;
    return true;
  });
}
function calendarDateKey(date) {
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function calendarWeekStart(value) {
  const date=new Date(value);
  date.setHours(0,0,0,0);
  date.setDate(date.getDate()-((date.getDay()+6)%7));
  return date;
}
function renderWeeklyScheduleCalendar({sessions=[],series=[],events=[],subjects={},date=new Date(),scope='global',query='',subjectFilter='all'}) {
  const start=calendarWeekStart(date), days=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});
  const dayIndexes={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
  const subjectFor=id=>subjects[id]||{};
  const textFor=event=>`${event.title} ${event.detail} ${event.subjectName||''}`.toLocaleLowerCase();
  const matches=event=>(!query||textFor(event).includes(query.trim().toLocaleLowerCase()))&&
    (subjectFilter==='all'||event.semesterSubjectId===subjectFilter);
  const items=[];
  sessions.filter(x=>x.status!=='cancelled').forEach(session=>{
    const key=session.session_date;
    if(!key||key<calendarDateKey(days[0])||key>calendarDateKey(days[6])) return;
    const subject=subjectFor(session.semester_subject_id);
    const event={date:key,start:session.start_time||'08:00',end:session.end_time||'09:00',
      title:subject.subjectName||subject.subject_name||'Sesi kuliah',
      detail:[session.session_type||'Kuliah',session.room||'',session.verification_status||''].filter(Boolean).join(' · '),
      subjectName:subject.subjectName||subject.subject_name||'',semesterSubjectId:session.semester_subject_id,
      color:subject.subjectColor||subject.subject_color||'',seriesId:session.series_id||'',source:'session'};
    if(matches(event)) items.push(event);
  });
  const existingSeriesDates=new Set(items.filter(x=>x.seriesId).map(x=>`${x.seriesId}|${x.date}`));
  series.filter(x=>x.status!=='cancelled').forEach(row=>{
    const dayIndex=dayIndexes[String(row.day_of_week||'').toLowerCase()];
    if(dayIndex===undefined) return;
    const occurrence=days[dayIndex], dateKey=calendarDateKey(occurrence);
    if(dateKey<String(row.recurrence_start||'0000-00-00')||dateKey>String(row.recurrence_end||'9999-12-31')) return;
    if(existingSeriesDates.has(`${row.series_id}|${dateKey}`)) return;
    const subject=subjectFor(row.semester_subject_id);
    const event={date:dateKey,start:row.start_time||'08:00',end:row.end_time||'09:00',
      title:subject.subjectName||subject.subject_name||'Sesi berulang',
      detail:[row.room||'',row.delivery_mode||''].filter(Boolean).join(' · '),
      subjectName:subject.subjectName||subject.subject_name||'',semesterSubjectId:row.semester_subject_id,
      color:subject.subjectColor||subject.subject_color||'',seriesId:row.series_id||'',source:'series'};
    if(matches(event)) items.push(event);
  });
  const allDay=[];
  events.filter(x=>x.visibility!=='archived'&&x.visibility!=='personal').forEach(row=>{
    const first=String(row.start_at||'').slice(0,10),last=String(row.end_at||row.start_at||'').slice(0,10);
    if(!first) return;
    const timed=String(row.start_at||'').includes('T');
    let current=new Date(`${first}T00:00:00`);
    const lastDate=new Date(`${last}T00:00:00`);
    for(let i=0;i<8&&current<=lastDate;i++,current.setDate(current.getDate()+1)) {
      const key=calendarDateKey(current);
      if(key<calendarDateKey(days[0])||key>calendarDateKey(days[6])) continue;
      const subject=subjectFor(row.semester_subject_id);
      const startMatch=String(row.start_at||'').match(/T(\d{2}:\d{2})/);
      const endMatch=String(row.end_at||'').match(/T(\d{2}:\d{2})/);
      const event={date:key,start:timed?(startMatch?.[1]||'08:00'):'',end:timed?(endMatch?.[1]||'09:00'):'',
        title:row.title||'Acara',detail:row.event_category||'Acara',
        subjectName:subject.subjectName||subject.subject_name||'',semesterSubjectId:row.semester_subject_id||'',
        color:subject.subjectColor||subject.subject_color||'',source:'calendar'};
      if(!matches(event)) continue;
      if(timed) items.push(event); else allDay.push(event);
    }
  });
  const timeToMinutes=value=>{const [h,m]=String(value||'08:00').split(':').map(Number);return h*60+(m||0);};
  const timed=items.filter(x=>x.start);
  const minHour=Math.max(6,Math.min(8,...timed.map(x=>Math.floor(timeToMinutes(x.start)/60))));
  const maxHour=Math.min(23,Math.max(18,...timed.map(x=>Math.ceil(timeToMinutes(x.end)/60))));
  const hours=Array.from({length:Math.max(1,maxHour-minHour)},(_,i)=>minHour+i),hourHeight=60;
  const formatter=new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short'});
  const weekLabel=`${formatter.format(days[0])} – ${formatter.format(days[6])} ${days[6].getFullYear()}`;
  const subjectOptions=Array.from(new Map([...sessions,...series].map(x=>{
    const subject=subjectFor(x.semester_subject_id);
    return [x.semester_subject_id,subject.subjectName||subject.subject_name||x.semester_subject_id];
  })).entries());
  const columns=days.map(day=>{
    const key=calendarDateKey(day),dayEvents=timed.filter(x=>x.date===key).sort((a,b)=>a.start.localeCompare(b.start));
    const markers=allDay.filter(x=>x.date===key);
    return `<div class="google-calendar-day-head"><span>${new Intl.DateTimeFormat('ms-MY',{weekday:'short'}).format(day)}</span><strong>${day.getDate()}</strong></div>`;
  }).join('');
  const allDayCells=days.map(day=>{
    const markers=allDay.filter(x=>x.date===calendarDateKey(day));
    return `<div class="google-calendar-all-day-cell">${markers.slice(0,3).map(x=>`<span title="${escapeHtml(x.title)}">${escapeHtml(x.title)}</span>`).join('')}${markers.length>3?`<small>+${markers.length-3} lagi</small>`:''}</div>`;
  }).join('');
  const dayColumns=days.map(day=>{
    const key=calendarDateKey(day),dayEvents=timed.filter(x=>x.date===key);
    return `<div class="google-calendar-day-column" style="height:${hours.length*hourHeight}px">${dayEvents.map(event=>{
      const minutes=timeToMinutes(event.start),end=timeToMinutes(event.end);
      const top=Math.max(0,(minutes-minHour*60)/60*hourHeight),height=Math.max(28,(end-minutes)/60*hourHeight);
      const color=/^#[0-9a-f]{6}$/i.test(event.color)?event.color:'#dbeafe';
      return `<article class="google-calendar-event ${event.source==='calendar'?'google-calendar-event-note':''}" style="--event-color:${color};top:${top}px;height:${height}px" title="${escapeHtml(`${event.title} · ${event.detail}`)}"><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.start)}–${escapeHtml(event.end)}${event.detail?' · '+event.detail:''}</small></article>`;
    }).join('')}</div>`;
  }).join('');
  const subjectName=subjectOptions.find(([id])=>id===subjectFilter)?.[1];
  return `<section class="google-calendar" aria-label="Jadual mingguan">
    <div class="google-calendar-toolbar">
      <div class="google-calendar-navigation"><button type="button" class="btn btn-light btn-small" data-calendar-nav="prev" data-calendar-scope="${scope}" aria-label="Minggu sebelumnya">‹</button><button type="button" class="btn btn-light btn-small" data-calendar-nav="today" data-calendar-scope="${scope}">Hari ini</button><button type="button" class="btn btn-light btn-small" data-calendar-nav="next" data-calendar-scope="${scope}" aria-label="Minggu seterusnya">›</button><strong>${weekLabel}</strong></div>
      <div class="google-calendar-filters"><label><span class="sr-only">Cari jadual</span><input type="search" data-calendar-search="${scope}" value="${escapeHtml(query)}" placeholder="Cari jadual..." autocomplete="off"></label><label><span class="sr-only">Tapis subjek</span><select data-calendar-filter="${scope}"><option value="all">Semua subjek</option>${subjectOptions.map(([id,label])=>`<option value="${escapeHtml(id)}" ${id===subjectFilter?'selected':''}>${escapeHtml(label)}</option>`).join('')}</select></label></div>
    </div>
    <div class="google-calendar-scroll"><div class="google-calendar-head"><div class="google-calendar-time-label"></div>${columns}</div>
      <div class="google-calendar-all-day"><div class="google-calendar-time-label">Sepanjang hari</div>${allDayCells}</div>
      <div class="google-calendar-time-grid"><div class="google-calendar-hour-labels">${hours.map(hour=>`<span>${String(hour).padStart(2,'0')}:00</span>`).join('')}</div>${dayColumns}</div>
    </div><div class="google-calendar-empty ${items.length||allDay.length?'hidden':''}">Tiada jadual atau acara pada minggu ini${subjectName?' untuk '+escapeHtml(subjectName):''}.</div>
  </section>`;
}
function populateSubjectSelects() {
  const semesterId=$('#filterSemesterSelect')?.value||'';
  const subjects=subjectOptions(currentClass,semesterId);
  const scheduledIds=new Set([...(workspaceData?.schedules||[]),...(workspaceData?.scheduleSeries||[])]
    .filter(item=>!['cancelled','archived'].includes(String(item.status||'').toLowerCase()))
    .map(item=>item.semester_subject_id));
  ['#sessSubject','#pbSubject','#evSubject','#pbSubjectFilter'].forEach(selector=>{
    const select=$(selector);
    if(!select)return;
    const selectable=selector==='#sessSubject'||currentClassRole()!=='lecturer'
      ?subjects:subjects.filter(subject=>scheduledIds.has(subject.semesterSubjectId));
    const options=selectable.map(s=>`<option value="${escapeHtml(s.semesterSubjectId)}">${escapeHtml([s.subjectCode,s.subjectName].filter(Boolean).join(' · ')||s.subjectId)}</option>`).join('');
    const allOption=selector==='#pbSubjectFilter'?'<option value="all">Semua subjek</option>':'';
    select.innerHTML=allOption+options;
    select.disabled=!selectable.length;
  });
}
function currentClassRole() {
  return String(currentClass?.memberRole||'').toLowerCase();
}
async function loadStudentWorkspace() {
  populateWorkspaceFilters();
  const classId=currentClass?.classId;
  const semesterId=$('#filterSemesterSelect')?.value;
  if(!classId||!semesterId) {
    workspaceData={...(workspaceData||{}),schedules:[],scheduleSeries:[],assignments:[],assignmentResources:[],progress:[],events:[],resources:[],members:[]};
    populateSubjectSelects();
    renderStudentWorkspace();
    return;
  }
  workspaceData={...(workspaceData||{}),semesterId};
  populateSubjectSelects();
  const params={classId,semesterId};
  try {
    const [schedules,assignments,events]=await Promise.all([
      api('listSchedules',params),
      api('listAssignments',params),
      api('listCalendarEvents',params)
    ]);
    workspaceData={...workspaceData,schedules:schedules.items||[],scheduleSeries:schedules.series||[]};
    const selectableSubjects=subjectOptions(currentClass,semesterId);
    const scheduledSubjectIds=new Set([...(schedules.items||[]),...(schedules.series||[])]
      .filter(item=>!['cancelled','archived'].includes(String(item.status||'').toLowerCase()))
      .map(item=>item.semester_subject_id));
    const resourceSubjects=currentClassRole()==='student'
      ?selectableSubjects.filter(subject=>(currentClass?.selectedSemesterSubjectIds||[]).includes(subject.semesterSubjectId))
      :currentClassRole()==='lecturer'
        ?selectableSubjects.filter(subject=>scheduledSubjectIds.has(subject.semesterSubjectId))
        :selectableSubjects;
    const resources=await Promise.all(resourceSubjects.map(subject=>
      api('listResources',{classId,semesterSubjectId:subject.semesterSubjectId})
    ));
    const members=currentClass?.permissions?.includes('members.view')
      ?await api('listClassMembers',{classId}):{items:[]};
    workspaceData={
      ...workspaceData,
      assignments:assignments.items||[],
      assignmentResources:assignments.assignmentResources||[],
      progress:assignments.progress||[],
      events:events.items||[],
      resources:resources.flatMap(result=>result.items||[]),
      members:members.items||[]
    };
    populateSubjectSelects();
    renderStudentWorkspace();
  } catch(error) {
    workspaceData={...(workspaceData||{}),schedules:[],scheduleSeries:[],assignments:[],assignmentResources:[],progress:[],events:[],resources:[]};
    renderStudentWorkspace(error.message);
    showToast('Gagal memuatkan data kelas: '+error.message,'error');
  }
}
function renderSubjectAssignmentPanel() {
  const semesterSelect=$('#subjectConfigSemester');
  if(!semesterSelect) return;
  const semesters=currentClass?.semesters||[];
  const previous=semesterSelect.value;
  semesterSelect.innerHTML=semesters.map(s=>`<option value="${escapeHtml(s.semesterId)}">${escapeHtml(s.semesterName)}</option>`).join('');
  const filterSemesterId=$('#filterSemesterSelect')?.value;
  const defaultSemester=semesters.find(s=>s.semesterId===filterSemesterId)?.semesterId||
    semesters.find(s=>s.status==='active')?.semesterId||semesters[0]?.semesterId||'';
  semesterSelect.value=semesters.some(s=>s.semesterId===previous)?previous:defaultSemester;
  const semester=semesters.find(s=>s.semesterId===semesterSelect.value);
  const links=(currentClass?.semesterSubjects||[]).filter(s=>s.semesterId===semesterSelect.value);
  const available=(currentClass?.availableSubjects||[]);
  const classLabel=[currentClass?.className,currentClass?.classCode].filter(Boolean).join(' · ')||'Kelas';
  const sessionLabel=semester?.academicSession?` · Sesi ${escapeHtml(semester.academicSession)}`:'';
  $('#subjectConfigContext').innerHTML=`<span class="subject-config-context-label">Struktur pemetaan</span><strong>${escapeHtml(classLabel)}</strong><span>›</span><strong>${escapeHtml(semester?.semesterName||'Pilih semester')}${sessionLabel}</strong><span>›</span><span>Subjek · Pensyarah · PIC</span>`;
  const subjectLinkSelect=$('#subjectLinkSubject');
  if(subjectLinkSelect) {
    subjectLinkSelect.innerHTML=available.map(subject=>
      `<option value="${escapeHtml(subject.subject_id)}">${escapeHtml([subject.subject_code,subject.subject_name].filter(Boolean).join(' · '))}</option>`
    ).join('')||'<option value="">Tiada subjek tersedia untuk dipautkan</option>';
    subjectLinkSelect.disabled=!available.length;
    const form=$('#subjectLinkForm');
    if(form) form.classList.add('hidden');
  }
  const offeringForm=$('#subjectOfferingForm');
  const canManageOfferings=currentClass?.permissions?.includes('subject.offerings.manage');
  if(offeringForm) offeringForm.classList.toggle('hidden',!canManageOfferings);
  const offeringSubject=$('#subjectOfferingSubject');
  if(offeringSubject) {
    const previousOfferingSubject=offeringSubject.value;
    offeringSubject.innerHTML='<option value="">Tambah subjek baharu...</option>'+available.map(subject=>
      `<option value="${escapeHtml(subject.subject_id)}">${escapeHtml([subject.subject_code,subject.subject_name].filter(Boolean).join(' · '))}</option>`
    ).join('');
    offeringSubject.value=available.some(subject=>subject.subject_id===previousOfferingSubject)?previousOfferingSubject:'';
    show('#newSubjectFields',!offeringSubject.value);
    $('#newSubjectCode')?.toggleAttribute('required',!offeringSubject.value);
    $('#newSubjectName')?.toggleAttribute('required',!offeringSubject.value);
  }
  const members=workspaceData?.members||[];
  const canAssignStaff=currentClass?.permissions?.includes('semester.manage');
  const scheduledIds=new Set([...(workspaceData?.schedules||[]),...(workspaceData?.scheduleSeries||[])]
    .filter(x=>!['cancelled','archived'].includes(String(x.status||'').toLowerCase()))
    .map(x=>x.semester_subject_id));
  const staffById=Object.fromEntries(members.map(member=>[member.userId,member]));
  const staffName=userId=>staffById[userId]?.name||userId||'Belum ditetapkan';
  const readyCount=links.filter(link=>link.lecturerUserId&&link.picUserId&&scheduledIds.has(link.semesterSubjectId)).length;
  $('#subjectConfigStats').innerHTML=[
    ['Pemetaan subjek',links.length],
    ['Pensyarah ditetapkan',links.filter(link=>link.lecturerUserId).length],
    ['PIC ditetapkan',links.filter(link=>link.picUserId).length],
    ['Sedia untuk pelajar',readyCount]
  ].map(([label,count])=>`<article class="subject-config-stat"><span>${label}</span><strong>${count}<small> / ${links.length}</small></strong></article>`).join('');
  const staffOptions=(role,selected)=>`<option value="">Belum ditetapkan</option>`+members
    .filter(member=>String(member.role||'').toLowerCase()===role)
    .map(member=>`<option value="${escapeHtml(member.userId)}" ${member.userId===selected?'selected':''}>${escapeHtml(member.name||member.userId)}</option>`).join('');
  const offeringLecturer=$('#subjectOfferingLecturer');
  if(offeringLecturer) {
    const lecturers=members.filter(member=>String(member.role||'').toLowerCase()==='lecturer');
    const self=currentClassRole()==='lecturer'&&currentUser?.id
      ?[{userId:currentUser.id,name:currentUser.name,email:currentUser.email,role:'lecturer'}]:[];
    const availableLecturers=[...lecturers.filter(member=>member.userId!==currentUser?.id),...self,...lecturers.filter(member=>member.userId===currentUser?.id)];
    offeringLecturer.innerHTML=availableLecturers.map(member=>
      `<option value="${escapeHtml(member.userId)}">${escapeHtml(member.name||member.email||member.userId)}</option>`
    ).join('')||'<option value="">Tiada pensyarah berdaftar</option>';
    offeringLecturer.value=currentClassRole()==='lecturer'?currentUser.id:(offeringLecturer.value||availableLecturers[0]?.userId||'');
    offeringLecturer.disabled=currentClassRole()==='lecturer';
    offeringLecturer.closest('label')?.classList.toggle('hidden',currentClassRole()==='lecturer');
  }
  const offeringPic=$('#subjectOfferingPic');
  if(offeringPic) {
    const pics=members.filter(member=>String(member.role||'').toLowerCase()==='pic');
    offeringPic.innerHTML=pics.map(member=>
      `<option value="${escapeHtml(member.userId)}">${escapeHtml(member.name||member.email||member.userId)}</option>`
    ).join('')||'<option value="">Tiada PIC berdaftar</option>';
    offeringPic.value=offeringPic.value||pics[0]?.userId||'';
  }
  const query=($('#subjectConfigSearch')?.value||'').trim().toLowerCase();
  const filteredLinks=links.filter(link=>[
    link.subjectCode,link.subjectName,staffName(link.lecturerUserId),staffName(link.picUserId)
  ].join(' ').toLowerCase().includes(query));
  $('#subjectConfigRows').innerHTML=filteredLinks.map(link=>{
    const complete=!!link.lecturerUserId&&!!link.picUserId&&scheduledIds.has(link.semesterSubjectId);
    const subjectLabel=[link.subjectCode,link.subjectName].filter(Boolean).join(' · ');
    return `<article class="subject-mapping-card">
      <header class="subject-mapping-card-head">
        <div><span class="subject-mapping-code">${escapeHtml(link.subjectCode||'SUBJEK')}</span><h3>${escapeHtml(link.subjectName||'Subjek')}</h3><small>${escapeHtml(link.offeringName||'Tawaran')}</small></div>
        <span class="status ${complete?'active':'draft'}">${complete?'Sedia untuk pelajar':'Belum lengkap'}</span>
      </header>
      <p class="subject-mapping-trail"><span>${escapeHtml(currentClass?.className||'Kelas')}</span><span>›</span><span>${escapeHtml(semester?.semesterName||'Semester')}</span><span>›</span><span>${escapeHtml(link.subjectCode||'Subjek')}</span></p>
      ${canAssignStaff?`<div class="subject-mapping-staff">
        <label><span>Pensyarah</span><select data-subject-staff="lecturerUserId" data-semester-subject="${escapeHtml(link.semesterSubjectId)}" aria-label="Pensyarah ${escapeHtml(subjectLabel)}">${staffOptions('lecturer',link.lecturerUserId)}</select><small>${escapeHtml(staffName(link.lecturerUserId))}</small></label>
        <label><span>PIC subjek</span><select data-subject-staff="picUserId" data-semester-subject="${escapeHtml(link.semesterSubjectId)}" aria-label="PIC ${escapeHtml(subjectLabel)}">${staffOptions('pic',link.picUserId)}</select><small>${escapeHtml(staffName(link.picUserId))}</small></label>
      </div>`:`<div class="subject-mapping-staff"><label><span>Pensyarah</span><strong>${escapeHtml(staffName(link.lecturerUserId))}</strong></label><label><span>PIC subjek</span><strong>${escapeHtml(staffName(link.picUserId))}</strong></label></div>`}
      <footer class="subject-mapping-card-foot"><span>${scheduledIds.has(link.semesterSubjectId)?'Jadual aktif tersedia':'Jadual belum ditetapkan'}</span>${canAssignStaff?`<button type="button" class="btn btn-light btn-small" data-save-subject-staff="${escapeHtml(link.semesterSubjectId)}">Simpan pemetaan</button>`:''}</footer>
    </article>`;
  }).join('')||(query?'<p class="muted">Tiada pemetaan sepadan dengan carian.</p>':'<p class="muted">Tiada subjek dipautkan kepada semester ini. Tambahkan subjek untuk membina pemetaan kelas.</p>');
}
function groupBySubject(records,subjectIdOf,subjectNameOf) {
  const groups=new Map();
  records.forEach(record=>{
    const subjectId=subjectIdOf(record)||'general';
    if(!groups.has(subjectId)) groups.set(subjectId,{subjectId,subjectName:subjectNameOf(subjectId),items:[]});
    groups.get(subjectId).items.push(record);
  });
  return Array.from(groups.values()).sort((a,b)=>a.subjectName.localeCompare(b.subjectName));
}
function subjectDisclosure(group,countLabel,content) {
  return `<details class="subject-disclosure">
    <summary><span class="subject-disclosure-title">${escapeHtml(group.subjectName)}</span><span class="subject-disclosure-count">${group.items.length} ${escapeHtml(countLabel)}</span></summary>
    <div class="subject-disclosure-body">${content}</div>
  </details>`;
}
function populateSubjectFilter(selector,includeGeneral=false) {
  const select=$(selector);
  if(!select)return;
  const value=select.value||'all';
  const scheduledIds=new Set([...(workspaceData?.schedules||[]),...(workspaceData?.scheduleSeries||[])]
    .filter(item=>!['cancelled','archived'].includes(String(item.status||'').toLowerCase()))
    .map(item=>item.semester_subject_id));
  const options=(currentClass?.semesterSubjects||[]).filter(subject=>
    (!workspaceData?.semesterId||subject.semesterId===workspaceData.semesterId)&&
    (currentClassRole()!=='student'||(currentClass?.selectedSemesterSubjectIds||[]).includes(subject.semesterSubjectId))&&
    (currentClassRole()!=='lecturer'||scheduledIds.has(subject.semesterSubjectId))
  ).map(subject=>
    `<option value="${escapeHtml(subject.semesterSubjectId)}">${escapeHtml([subject.subjectCode,subject.subjectName].filter(Boolean).join(' · ')||'Subjek')}</option>`);
  select.innerHTML=`<option value="all">Semua subjek</option>${includeGeneral?'<option value="general">Umum / tanpa subjek</option>':''}${options.join('')}`;
  select.value=Array.from(select.options).some(option=>option.value===value)?value:'all';
}
function renderStudentWorkspace(errorMessage='') {
  const data=workspaceData||{};
  const role=currentClassRole();
  const progressByAssignment=Object.fromEntries((data.progress||[]).map(p=>[p.assignment_id,p]));
  const subjects=Object.fromEntries((currentClass?.semesterSubjects||[]).map(s=>[s.semesterSubjectId,s]));
  const year=$('#filterYearSelect')?.value||'all';
  const category=$('#filterCategorySelect')?.value||'all';
  const status=$('#filterStatusSelect')?.value||'all';
  const inYear=value=>year==='all'||!value||String(value).slice(0,4)===year;
  const canSchedule=rolePermission(role,'schedule.edit');
  const canCreatePb=rolePermission(role,'pb.create');
  const canCreateEvent=rolePermission(role,'calendar.create');
  show('#sessionFormWrap',canSchedule);
  show('#scheduleAddBtn',canSchedule);
  show('#assignmentFormWrap',canCreatePb);
  show('#assignmentAddBtn',canCreatePb);
  show('#eventFormWrap',canCreateEvent);
  show('#eventAddBtn',canCreateEvent);
  const assignmentFilter=$('#pbSubjectFilter')?.value||'all';
  const assignmentQuery=($('#pbSearch')?.value||'').trim().toLowerCase();
  const assignments=(data.assignments||[]).filter(a=>{
    const progress=progressByAssignment[a.assignment_id];
    const progressState=progress?.progress_status==='completed'?'completed':'active';
    const matchesStatus=status==='all'||progressState===status;
    const matchesProgressFilter=($('#pbStatusFilter')?.value||'all')==='all'||
      (($('#pbStatusFilter')?.value==='done')===(progressState==='completed'));
    const matchesQuery=!assignmentQuery||[a.title,a.description,a.assignment_type,subjects[a.semester_subject_id]?.subjectName]
      .join(' ').toLowerCase().includes(assignmentQuery);
    return inYear(a.due_at)&&matchesStatus&&matchesProgressFilter&&matchesQuery&&(category==='all'||category==='pb');
  });
  const filteredAssignments=assignments.filter(a=>assignmentFilter==='all'||a.semester_subject_id===assignmentFilter);
  const schedules=data.schedules||[];
  const scheduledSubjectIds=new Set([...schedules,...(data.scheduleSeries||[])]
    .filter(item=>!['cancelled','archived'].includes(String(item.status||'').toLowerCase()))
    .map(item=>item.semester_subject_id));
  populateSubjectFilter('#calendarSubjectFilter',true);
  populateSubjectFilter('#resourceSubjectFilter',true);
  const events=(data.events||[]).filter(event=>{
    const type=String(event.event_category||'').toLowerCase();
    const matchesCategory=category==='all'||(category==='pb'?(type.includes('pb')||type.includes('pbs')||type.includes('penilaian')):type.includes(category));
    const matchesSubject=($('#calendarSubjectFilter')?.value||'all')==='all'||
      (event.semester_subject_id||'general')===$('#calendarSubjectFilter').value;
    const matchesQuery=!($('#calendarSearch')?.value||'').trim()||
      [event.title,event.description,event.event_category,subjects[event.semester_subject_id]?.subjectName]
        .join(' ').toLowerCase().includes($('#calendarSearch').value.trim().toLowerCase());
    return matchesCategory&&matchesSubject&&matchesQuery&&inYear(event.start_at);
  });
  const resourceQuery=($('#resourceSearch')?.value||'').trim().toLowerCase();
  const resources=(data.resources||[]).filter(resource=>{
    const matchesSubject=($('#resourceSubjectFilter')?.value||'all')==='all'||
      (resource.semester_subject_id||'general')===$('#resourceSubjectFilter').value;
    const matchesQuery=!resourceQuery||[resource.resource_name,resource.description,resource.resource_type,
      subjects[resource.semester_subject_id]?.subjectName].join(' ').toLowerCase().includes(resourceQuery);
    return inYear(resource.created_at)&&matchesSubject&&matchesQuery&&(category==='all'||category==='academic');
  });
  const calendarSubjects=Object.fromEntries((currentClass?.semesterSubjects||[]).filter(subject=>
    (role!=='student'||(currentClass?.selectedSemesterSubjectIds||[]).includes(subject.semesterSubjectId))&&
    (role!=='lecturer'||scheduledSubjectIds.has(subject.semesterSubjectId))
  ).map(subject=>[
    subject.semesterSubjectId,{subjectName:subject.subjectName,subjectColor:subject.subjectColor||''}
  ]));
  $('#scheduleList').innerHTML=errorMessage?`<p class="form-message error">${escapeHtml(errorMessage)}</p>`:
    renderWeeklyScheduleCalendar({sessions:schedules,series:data.scheduleSeries||[],events:data.events||[],
      subjects:calendarSubjects,date:scheduleCalendarDate,scope:'global',query:scheduleCalendarSearch,
      subjectFilter:scheduleCalendarSubject});
  const assignmentGroups=groupBySubject(filteredAssignments,a=>a.semester_subject_id,
    subjectId=>subjects[subjectId]?.subjectName||'Subjek umum');
  $('#assignmentList').innerHTML=errorMessage?`<p class="form-message error">${escapeHtml(errorMessage)}</p>`:
    filteredAssignments.length?assignmentGroups.map(group=>subjectDisclosure(group,'PB',
      group.items.map(a=>{
      const progress=progressByAssignment[a.assignment_id]||{};
      const attachmentHtml=(data.assignmentResources||[]).filter(link=>link.assignment_id===a.assignment_id).map(link=>{
        const resource=(data.resources||[]).find(item=>item.resource_id===link.resource_id);
        if(!resource) return '';
        const url=resource.url||resource.storage_file_id||'';
        const label=escapeHtml(resource.resource_name||'Bahan PB');
        return /^https?:\/\//i.test(url)?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`:`<span>${label}</span>`;
      }).filter(Boolean).join(' · ');
      const progressEditor=rolePermission(role,'pb.progress.update')?`<form class="assignment-progress-form" data-assignment-id="${escapeHtml(a.assignment_id)}">
        <label>Status kemajuan <select name="progress_status">
          ${[['not_started','Belum bermula'],['in_progress','Sedang dibuat'],['nearly_done','Hampir siap'],['completed','Selesai']].map(([value,label])=>`<option value="${value}" ${progress.progress_status===value?'selected':''}>${label}</option>`).join('')}
        </select></label>
        <label>Kemajuan (%) <input name="progress_percentage" type="number" min="0" max="100" value="${escapeHtml(progress.progress_percentage||0)}"></label>
        <label>Nota peribadi <input name="personal_notes" value="${escapeHtml(progress.personal_notes||'')}"></label>
        <button class="btn btn-small" type="submit">Simpan kemajuan</button>
      </form>`:'';
      return `<article class="role-lab-card assignment-card"><div class="role-lab-card-head"><div>
        <h3>${escapeHtml(a.title)}</h3><p class="muted small">${escapeHtml(subjects[a.semester_subject_id]?.subjectName||'')} · ${escapeHtml(a.assignment_type||'PB')} · ${escapeHtml(a.marks_percentage||0)}%</p>
        </div><span class="status ${progress.progress_status==='completed'?'active':'draft'}">${escapeHtml(progress.progress_status||a.status||'published')}</span></div>
        <p>${escapeHtml(a.description||'')}</p><p class="muted small">Tarikh hantar: ${escapeHtml(a.due_at||'—')} · Kaedah: ${escapeHtml(a.submission_method||'—')}</p>${attachmentHtml?`<p class="muted small"><strong>Bahan PB:</strong> ${attachmentHtml}</p>`:''}${progressEditor}</article>`;
    }).join(''))).join(''):'<p class="muted">Tiada tugasan PB untuk semester ini.</p>';
  const sortedEvents=events.slice().sort((a,b)=>String(a.start_at||'').localeCompare(String(b.start_at||'')));
  $('#calendarList').innerHTML=errorMessage?`<p class="form-message error">${escapeHtml(errorMessage)}</p>`:
    sortedEvents.length?groupBySubject(sortedEvents,event=>event.semester_subject_id,
      subjectId=>subjects[subjectId]?.subjectName||(subjectId==='general'?'Umum / tanpa subjek':'Subjek')).map(group=>subjectDisclosure(group,'acara',
        group.items.map(event=>`<article class="role-lab-list-row"><div><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.event_category||'Acara')}${event.description?' · '+escapeHtml(event.description):''}</small></div><time>${escapeHtml(event.start_at||'')}${event.end_at?' – '+escapeHtml(event.end_at):''}</time></article>`).join('')
      )).join(''):'<p class="muted">Tiada acara kalendar untuk semester ini.</p>';
  $('#resourcesList').innerHTML=errorMessage?`<p class="form-message error">${escapeHtml(errorMessage)}</p>`:
    resources.length?groupBySubject(resources,resource=>resource.semester_subject_id,
      subjectId=>subjects[subjectId]?.subjectName||(subjectId==='general'?'Umum / tanpa subjek':'Subjek')).map(group=>subjectDisclosure(group,'sumber',
      group.items.map(resource=>{
      const link=resource.url||resource.storage_file_id||'';
      return `<article class="role-lab-list-row"><div><strong>${escapeHtml(resource.resource_name||'Nota pembelajaran')}</strong><small>${escapeHtml(resource.description||'')}</small></div>
        ${/^https?:\/\//i.test(link)?`<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Buka sumber</a>`:''}</article>`;
    }).join(''))).join(''):'<p class="muted">Tiada nota atau sumber dikongsi untuk semester ini.</p>';
  const availableStudentOffers=(currentClass?.semesterSubjects||[]).filter(subject=>subject.semesterId===data.semesterId);
  const configuredSubjects=role==='student'
    ?availableStudentOffers.filter(subject=>(currentClass?.selectedSemesterSubjectIds||[]).includes(subject.semesterSubjectId))
    :availableStudentOffers;
  show('#studentConfigNotice',role==='student'&&!configuredSubjects.length);
  if(role==='student') {
    const notice=$('#studentConfigNotice');
    const hasOffers=availableStudentOffers.length>0;
    notice?.querySelector('strong')&&(notice.querySelector('strong').textContent=hasOffers
      ?'Pilih tawaran pensyarah untuk melihat jadual anda.'
      :'Data subjek belum tersedia untuk semester ini.');
    const paragraph=notice?.querySelector('p');
    if(paragraph) paragraph.textContent=hasOffers
      ?'Buka Jadual dan pilih pensyarah serta kumpulan bagi setiap subjek. Pilihan hanya mengubah jadual akaun anda.'
      :'KO atau Pentadbir kelas perlu menetapkan pensyarah, PIC dan jadual aktif bagi subjek sebelum tawaran dipaparkan.';
  }
  renderStudentOfferingSelection(data.semesterId);
  renderSubjectAssignmentPanel();
  renderOverviewDashboard({...data,schedules,assignments,events,resources});
}
function renderStudentOfferingSelection(semesterId) {
  const panel=$('#studentOfferingSelection');
  if(!panel) return;
  const isStudent=currentClassRole()==='student';
  show('#studentOfferingSelection',isStudent);
  if(!isStudent) return;
  const offers=(currentClass?.semesterSubjects||[]).filter(item=>item.semesterId===semesterId);
  const grouped=new Map();
  offers.forEach(offer=>{
    if(!grouped.has(offer.subjectId)) grouped.set(offer.subjectId,{subjectCode:offer.subjectCode,subjectName:offer.subjectName,offers:[]});
    grouped.get(offer.subjectId).offers.push(offer);
  });
  panel.innerHTML=`<div class="section-heading"><div><h3>Pilih pensyarah dan kumpulan</h3>
    <p class="muted small">Pilihan ini khusus untuk akaun anda. Jadual, PB dan sumber akan dipaparkan selepas anda memilih satu tawaran bagi setiap subjek.</p></div></div>
    <div class="student-offering-list">${Array.from(grouped.entries()).map(([subjectId,group])=>{
      const selected=(currentClass.selectedSemesterSubjectIds||[]).find(id=>group.offers.some(offer=>offer.semesterSubjectId===id))||'';
      const options=group.offers.map(offer=>{
        const label=[offer.offeringName||'Tawaran',offer.lecturerName||offer.lecturerEmail].filter(Boolean).join(' · ');
        return `<option value="${escapeHtml(offer.semesterSubjectId)}" ${selected===offer.semesterSubjectId?'selected':''}>${escapeHtml(label)}</option>`;
      }).join('');
      return `<div class="student-offering-row"><div><strong>${escapeHtml([group.subjectCode,group.subjectName].filter(Boolean).join(' · '))}</strong>
        <small>${group.offers.length} tawaran tersedia</small></div>
        <select data-student-offering="${escapeHtml(subjectId)}" aria-label="Pilih pensyarah untuk ${escapeHtml(group.subjectName)}">
          <option value="">Belum pilih</option>${options}</select>
        <button class="btn btn-light btn-small" type="button" data-save-student-offering="${escapeHtml(subjectId)}">Simpan</button></div>`;
    }).join('')||'<p class="muted">Belum ada tawaran subjek yang lengkap dengan pensyarah, PIC dan jadual.</p>'}</div>`;
}
function renderOverviewDashboard(viewData) {
  const data=viewData||workspaceData||{};
  const stats=adminData?.stats;
  const visibleAssignmentIds=new Set((data.assignments||[]).map(a=>a.assignment_id));
  const completed=(data.progress||[]).filter(p=>visibleAssignmentIds.has(p.assignment_id)&&p.progress_status==='completed').length;
  const values=stats?[
    stats.totalClasses??0,'—','—',stats.activeMembers??0,'—','—'
  ]:[
    (data.classes||[]).length,(data.assignments||[]).length,(data.schedules||[]).length,
    completed,(data.events||[]).length,(data.resources||[]).length
  ];
  const labels=stats
    ?['Kelas','Tugasan PB','Sesi kuliah','Ahli kelas','Tarikh penting','Nota & sumber']
    :['Kelas','Tugasan PB','Sesi kuliah','PB selesai','Tarikh penting','Nota & sumber'];
  const subtitles=stats
    ?[`${stats.activeClasses||0} kelas aktif`,'Tiada data tersedia','Tiada data tersedia',`${stats.totalUsers||0} pengguna berdaftar`,'Tiada data tersedia','Tiada data tersedia']
    :['Kelas disertai','Dalam semester dipilih','Dalam semester dipilih','Daripada PB ditapis','Dalam semester dipilih','Dalam semester dipilih'];
  document.querySelectorAll('.kpi-card').forEach((card,index)=>{
    const value=card.querySelector('.kpi-number');
    const title=card.querySelector('.kpi-title');
    const subtitle=card.querySelector('.kpi-subtext');
    if(value)value.textContent=String(values[index]??0);
    if(title)title.textContent=labels[index];
    if(subtitle)subtitle.textContent=subtitles[index]||'';
    card.querySelector('.kpi-badge')?.classList.add('hidden');
  });
  const replaceHeading=(selector,text)=>{const heading=$(selector)?.querySelector('h3');if(heading)heading.textContent=text;};
  replaceHeading('#trendChartCard','Ringkasan semester');
  replaceHeading('#donutChartCard','Kelas dan semester');
  replaceHeading('#top5Card','Tarikh terdekat');
  replaceHeading('#stackedBarCard','Jadual terkini');
  $('#trendChartCard .trend-legend').innerHTML='<span class="legend-pill"><span class="legend-dot blue"></span> Jadual</span><span class="legend-pill"><span class="legend-dot amber"></span> Tugasan PB</span><span class="legend-pill"><span class="legend-dot green"></span> Acara</span>';
  $('#stackedBarCard .trend-legend').innerHTML='<span class="legend-pill">Sesi kuliah dalam semester dipilih</span>';
  $('#achievementCard .subtab-pill-row').innerHTML='<span class="eyebrow">KEMAJUAN TUGASAN</span>';
  $('#resourcesCard .subtab-pill-row').innerHTML='<span class="eyebrow">SUMBER PEMBELAJARAN</span>';
  $('#trendChartWrap').innerHTML=stats
    ?`<div class="role-lab-summary"><span>Kelas aktif</span><strong>${stats.activeClasses||0}</strong></div>
      <div class="role-lab-summary"><span>Jumlah pengguna</span><strong>${stats.totalUsers||0}</strong></div>
      <div class="role-lab-summary"><span>Keahlian aktif</span><strong>${stats.activeMembers||0}</strong></div>`
    :`<div class="role-lab-summary"><span>Semester</span><strong>${escapeHtml(currentClass?.semesters?.find(s=>s.semesterId===data.semesterId)?.semesterName||'—')}</strong></div>
      <div class="role-lab-summary"><span>Kelas</span><strong>${escapeHtml(currentClass?.className||'—')}</strong></div>
      <div class="role-lab-summary"><span>Peranan</span><strong>${escapeHtml(currentClass?.memberRole||'')}</strong></div>`;
  $('#donutTotalNumber').textContent=String(stats?.totalClasses??(data.classes||[]).length);
  const classes=stats?(adminData?.classes||[]):(data.classes||[]);
  $('#donutLegendList').innerHTML=classes.map(c=>`<div class="role-lab-list-row"><strong>${escapeHtml(c.className)}</strong><span>${(c.semesters||[]).length} semester</span></div>`).join('')||
    `<p class="muted small">${escapeHtml(currentClass?.className||'Log masuk untuk melihat kelas anda.')}</p>`;
  const today=new Date().toISOString().slice(0,10);
  const upcoming=[...(data.assignments||[]).filter(a=>a.due_at&&String(a.due_at)>=today).map(a=>({title:a.title,date:a.due_at,type:'PB'})),
    ...(data.events||[]).filter(e=>e.start_at&&String(e.start_at)>=today).map(e=>({title:e.title,date:e.start_at,type:e.event_category||'Acara'}))]
    .sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,5);
  $('#top5List').innerHTML=upcoming.map(item=>`<div class="role-lab-list-row"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type)}</small></div><time>${escapeHtml(item.date)}</time></div>`).join('')||
    '<p class="muted small">Tiada tarikh terdekat direkodkan.</p>';
  $('#stackedBarList').innerHTML=(data.schedules||[]).slice(0,5).map(s=>`<div class="role-lab-list-row"><div><strong>${escapeHtml(s.session_date||'')}</strong><small>${escapeHtml(s.session_type||'Kuliah')} · ${escapeHtml(s.room||'')}</small></div><time>${escapeHtml(s.start_time||'')}</time></div>`).join('')||
    '<p class="muted small">Tiada sesi jadual direkodkan.</p>';
  $('#achievementColumnBody').innerHTML=(data.assignments||[]).slice(0,5).map(a=>{
    const progress=(data.progress||[]).find(p=>p.assignment_id===a.assignment_id);
    const pct=Math.max(0,Math.min(100,Number(progress?.progress_percentage)||0));
    return `<div class="role-lab-summary"><span>${escapeHtml(a.title)}</span><strong>${pct}%</strong></div><progress max="100" value="${pct}"></progress>`;
  }).join('')||'<p class="muted small">Tiada tugasan untuk dipaparkan.</p>';
  $('#resourceColumnBody').innerHTML=(data.resources||[]).slice(0,5).map(r=>`<div class="role-lab-list-row"><strong>${escapeHtml(r.resource_name||'Sumber')}</strong><span>${escapeHtml(r.description||'')}</span></div>`).join('')||
    '<p class="muted small">Tiada sumber dikongsi.</p>';
}
$('#filterClassSelect')?.addEventListener('change',()=>{
  workspaceData={...(workspaceData||{}),semesterId:''};
  populateWorkspaceFilters();
  loadStudentWorkspace();
});
$('#filterSemesterSelect')?.addEventListener('change',()=>{
  if($('#subjectConfigSemester')) $('#subjectConfigSemester').value=$('#filterSemesterSelect').value;
  loadStudentWorkspace();
});
$('#subjectConfigSemester')?.addEventListener('change',()=>{
  const semesterFilter=$('#filterSemesterSelect');
  if(semesterFilter&&semesterFilter.value!==$('#subjectConfigSemester').value) {
    semesterFilter.value=$('#subjectConfigSemester').value;
    loadStudentWorkspace();
  } else renderSubjectAssignmentPanel();
});
$('#subjectConfigSearch')?.addEventListener('input',renderSubjectAssignmentPanel);
$('#subjectLinkForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const semesterId=$('#subjectConfigSemester').value,subjectId=$('#subjectLinkSubject').value;
  const message=$('#subjectConfigMessage');
  try {
    const result=await api('linkSemesterSubject',{classId:currentClass?.classId,semesterId,subjectId});
    const refreshed=await api('bootstrap',{});
    workspaceData={...(workspaceData||{}),classes:refreshed.classes||[]};
    currentClass=(refreshed.classes||[]).find(item=>item.classId===currentClass?.classId)||null;
    await loadStudentWorkspace();
    if(message) message.textContent=result.message||'Subjek dipautkan.';
  } catch(error) {
    if(message) message.textContent='Gagal memautkan subjek: '+error.message;
    showToast('Gagal memautkan subjek: '+error.message,'error');
  }
});
$('#subjectOfferingSubject')?.addEventListener('change',()=>{
  show('#newSubjectFields',!$('#subjectOfferingSubject').value);
  $('#newSubjectCode')?.toggleAttribute('required',!$('#subjectOfferingSubject').value);
  $('#newSubjectName')?.toggleAttribute('required',!$('#subjectOfferingSubject').value);
});
$('#subjectOfferingForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const message=$('#subjectConfigMessage');
  const subjectId=$('#subjectOfferingSubject').value;
  const payload={
    semesterId:$('#subjectConfigSemester').value,
    subjectId,
    subjectCode:$('#newSubjectCode').value.trim(),
    subjectName:$('#newSubjectName').value.trim(),
    creditHour:Number($('#newSubjectCredit').value||0),
    offeringName:$('#subjectOfferingName').value.trim(),
    lecturerUserId:$('#subjectOfferingLecturer').value||currentUser?.id,
    picUserId:$('#subjectOfferingPic').value
  };
  if(message) message.textContent='Menyimpan tawaran subjek...';
  try {
    const result=await api('createSubjectOffering',payload);
    const refreshed=await api('bootstrap',{});
    workspaceData={...(workspaceData||{}),classes:refreshed.classes||[]};
    currentClass=(refreshed.classes||[]).find(item=>item.classId===currentClass?.classId)||null;
    await loadStudentWorkspace();
    e.target.reset();
    if(message) message.textContent=result.message;
    showToast(result.message||'Tawaran subjek disimpan.');
  } catch(error) {
    if(message) message.textContent='Gagal mencipta tawaran: '+error.message;
    showToast('Gagal mencipta tawaran: '+error.message,'error');
  }
});
$('#studentOfferingSelection')?.addEventListener('click',async e=>{
  const button=e.target.closest('[data-save-student-offering]');
  if(!button) return;
  const subjectId=button.dataset.saveStudentOffering;
  const select=$(`[data-student-offering="${CSS.escape(subjectId)}"]`);
  button.disabled=true;
  try {
    const result=await api('selectStudentSubjectOffering',{
      classId:currentClass.classId,semesterId:workspaceData?.semesterId,subjectId,
      semesterSubjectId:select?.value||''
    });
    const refreshed=await api('bootstrap',{});
    workspaceData={...(workspaceData||{}),classes:refreshed.classes||[]};
    currentClass=(refreshed.classes||[]).find(item=>item.classId===currentClass?.classId)||null;
    await loadStudentWorkspace();
    showToast(result.message||'Pilihan disimpan.');
  } catch(error) {
    showToast('Gagal menyimpan pilihan: '+error.message,'error');
  } finally { button.disabled=false; }
});
$('#subjectConfigRows')?.addEventListener('click',async e=>{
  const button=e.target.closest('[data-save-subject-staff]');
  if(!button) return;
  const semesterSubjectId=button.dataset.saveSubjectStaff;
  const fields=Array.from(document.querySelectorAll(`[data-semester-subject="${CSS.escape(semesterSubjectId)}"]`));
  const lecturerUserId=fields.find(field=>field.dataset.subjectStaff==='lecturerUserId')?.value||'';
  const picUserId=fields.find(field=>field.dataset.subjectStaff==='picUserId')?.value||'';
  const message=$('#subjectConfigMessage');
  button.disabled=true;
  if(message) message.textContent='Menyimpan penetapan...';
  try {
    const result=await api('assignSemesterSubjectStaff',{semesterSubjectId,lecturerUserId,picUserId});
    const refreshed=await api('bootstrap',{});
    workspaceData={...(workspaceData||{}),classes:refreshed.classes||[]};
    currentClass=(refreshed.classes||[]).find(item=>item.classId===currentClass?.classId)||null;
    await loadStudentWorkspace();
    if(message) message.textContent=result.message||'Penetapan disimpan.';
    showToast(result.message||'Penetapan disimpan.');
  } catch(error) {
    if(message) message.textContent='Gagal menyimpan: '+error.message;
    showToast('Gagal menyimpan penetapan: '+error.message,'error');
  } finally { button.disabled=false; }
});
$('#pbSubjectFilter')?.addEventListener('change',()=>renderStudentWorkspace());
$('#pbStatusFilter')?.addEventListener('change',()=>renderStudentWorkspace());
$('#pbSearch')?.addEventListener('input',()=>renderStudentWorkspace());
$('#calendarSubjectFilter')?.addEventListener('change',()=>renderStudentWorkspace());
$('#calendarSearch')?.addEventListener('input',()=>renderStudentWorkspace());
$('#resourceSubjectFilter')?.addEventListener('change',()=>renderStudentWorkspace());
$('#resourceSearch')?.addEventListener('input',()=>renderStudentWorkspace());
['#filterYearSelect','#filterCategorySelect','#filterStatusSelect'].forEach(selector=>{
  $(selector)?.addEventListener('change',()=>renderStudentWorkspace());
});
$('#filterHomeBtn')?.addEventListener('click',()=>navigateTo('overview'));
function searchWorkspace(query) {
  const q=String(query||'').trim().toLowerCase();
  const targets=[
    ['classes','#adminClassList','classes'],
    ['schedule','#scheduleList','schedule'],
    ['assignments','#assignmentList','assignments'],
    ['calendar','#calendarList','calendar'],
    ['resources','#resourcesList','resources'],
    ['users','#adminUserList','users'],
    ['data','#adminDataList','data']
  ];
  let firstMatch=null;
  targets.forEach(([key,selector,panel])=>{
    const root=$(selector);
    if(!root)return;
    const children=Array.from(root.children);
    children.forEach(item=>{
      const match=!q||item.textContent.toLowerCase().includes(q);
      item.classList.toggle('hidden',!match);
      if(q&&match&&!firstMatch)firstMatch=panel;
    });
  });
  if(q&&firstMatch)navigateTo(firstMatch);
}
$('#globalSearch')?.addEventListener('input',e=>searchWorkspace(e.target.value));
$('#globalSearch')?.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.target.value='';searchWorkspace('');e.target.blur();}
});
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k') {
    e.preventDefault();
    $('#globalSearch')?.focus();
  }
});
$('#assignmentList')?.addEventListener('submit',async e=>{
  const form=e.target.closest('.assignment-progress-form');
  if(!form)return;
  e.preventDefault();
  const values=Object.fromEntries(new FormData(form).entries());
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;
  try {
    await api('updateProgress',{assignmentId:form.dataset.assignmentId,progress:{
      progress_status:values.progress_status,progress_percentage:Number(values.progress_percentage),
      personal_notes:values.personal_notes
    }});
    showToast('Kemajuan tugasan berjaya disimpan.');
    await loadStudentWorkspace();
  } catch(error) {
    showToast('Gagal menyimpan kemajuan: '+error.message,'error');
    button.disabled=false;
  }
});
async function onGoogleCredential(response) {
  idToken=response.credential;
  setError('');
  $('#googleButton').classList.add('disabled');
  try { await completeLogin(await api('bootstrap',{})); }
  catch(error) { idToken=null;setError(error.message||'Log masuk gagal.'); }
  finally { $('#googleButton').classList.remove('disabled'); }
}
$('#manualLoginForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const button=$('#manualLoginBtn');
  button.disabled=true;button.textContent='Mengesahkan...';setError('');
  try {
    const result=await api('devLogin',{username:$('#manualUsername').value.trim(),password:$('#manualPassword').value});
    devToken=result.devToken;
    $('#manualPassword').value='';
    if (result.user && (result.isSystemAdmin || result.workspace === 'system_admin')) {
      await completeLogin(result);
    } else {
      await completeLogin(await api('bootstrap',{}));
    }
  } catch(error) {
    devToken=null;setError(error.message||'Log masuk pembangunan gagal.');
  } finally {
    button.disabled=false;button.textContent='Log masuk Development Mode';
  }
});

function api(action,data={},testSessionToken) {
  if(action!=='devLogin' && !idToken && !devToken) return Promise.reject(new Error('Sila log masuk terlebih dahulu.'));
  const config=getConfig();
  const apiUrl=config.APPS_SCRIPT_URL;
  if(!apiUrl||!apiUrl.endsWith('/exec')) return Promise.reject(new Error('URL Apps Script tidak ditemui atau tidak sah dalam config.js. Pastikan menggunakan URL Web App (/exec).'));
  const requestId='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,15);
  const payload={
    action,
    data:data||{},
    idToken:idToken||'',
    devToken:devToken||'',
    requestId,
    origin:(typeof window!=='undefined'&&window.location&&window.location.origin)?window.location.origin:''
  };
  if(testSessionToken) payload.testSessionToken=testSessionToken;

  return new Promise((resolve,reject)=>{
    let finished=false;
    let timeoutId;

    // Use a unique isolated iframe per request to eliminate concurrency collisions
    const iframeId='apiFrame_'+requestId;
    const iframe=document.createElement('iframe');
    iframe.name=iframeId;
    iframe.id=iframeId;
    iframe.style.display='none';
    document.body.appendChild(iframe);

    const cleanup=()=>{
      window.removeEventListener('message',onMessage);
      window.clearTimeout(timeoutId);
      setTimeout(()=>{
        try{iframe.remove();}catch(e){}
      },500);
    };

    const onMessage=(event)=>{
      const message=event.data;
      if(!message||message.type!=='MYSTER_POST_RESPONSE'||message.requestId!==requestId)return;
      finished=true;cleanup();
      const result=message.result||{};
      if(result.ok)resolve(result);
      else{
        const err=result.error||'MySemester API returned an error.';
        if(/token verification failed/i.test(err)){idToken=null;reject(new Error('Sesi Google tamat. Sila log masuk semula.'));}
        else reject(new Error(err));
      }
    };
    window.addEventListener('message',onMessage);
    timeoutId=window.setTimeout(()=>{
      if(finished)return;finished=true;cleanup();
      reject(new Error('Tiada respons daripada Apps Script dalam 30 saat. Semak sambungan internet dan status Web App.'));
    },30000);

    const form=document.createElement('form');
    form.method='POST';form.action=apiUrl;form.target=iframeId;form.style.display='none';
    const field=document.createElement('input');
    field.type='hidden';field.name='payload';field.value=JSON.stringify(payload);
    form.appendChild(field);document.body.appendChild(form);
    try{form.submit();}
    catch(error){finished=true;cleanup();reject(new Error('Gagal menghantar permintaan: '+error.message));}
    finally{form.remove();}
  });
}

/* ---------------- SYSTEM ADMIN WORKSPACE ---------------- */
async function loadAdminDashboard() {
  $('#adminLoading').textContent='Memuatkan data pentadbiran...';
  show('#adminLoading',true);
  try {
    adminData=await api('adminDashboard',{});
    renderAdminStats();
    renderAdminClasses();
    renderAdminUsers();
    show('#adminLoading',false);
    show('#adminContent',true);
    if(selectedAdminClassId) renderSelectedAdminClass();
  } catch(error) {
    $('#adminLoading').textContent='Gagal memuatkan dashboard: '+error.message;
  }
}
function renderAdminStats() {
  const s=adminData.stats||{};
  $('#adminStats').innerHTML=[
    ['Jumlah kelas',s.totalClasses||0,'layers'],
    ['Kelas aktif',s.activeClasses||0,'check-circle'],
    ['Pengguna berdaftar',s.totalUsers||0,'users'],
    ['Keahlian kelas',s.activeMembers||0,'user-check']
  ].map(x=>`<article class="admin-stat"><span>${x[0]}</span><b>${x[1]}</b></article>`).join('');
  renderOverviewDashboard();
}
function renderAdminClasses() {
  const query=($('#adminClassSearch')?.value||'').trim().toLowerCase();
  const classes=(adminData.classes||[]).filter(c=>
    [c.className,c.classCode,c.programme,c.cohort].some(value=>String(value||'').toLowerCase().includes(query)));
  const pageSize=8;
  const pageCount=Math.max(1,Math.ceil(classes.length/pageSize));
  adminClassPage=Math.min(adminClassPage,pageCount);
  const visibleClasses=classes.slice((adminClassPage-1)*pageSize,adminClassPage*pageSize);
  $('#adminClassList').innerHTML=classes.length?visibleClasses.map(c=>`
    <tr>
      <td><strong>${escapeHtml(c.className)}</strong><small>${escapeHtml(c.programme||'')} ${escapeHtml(c.cohort||'')}</small></td>
      <td><code>${escapeHtml(c.classCode)}</code></td>
      <td><span class="status ${c.status==='active'?'active':'draft'}">${escapeHtml(c.status)}</span></td>
      <td>${c.semesterCount}/${c.semesterLimit}</td><td>${c.memberCount}</td>
      <td><button class="btn btn-small btn-light" data-manage-class="${escapeHtml(c.classId)}">Urus</button></td>
    </tr>`).join(''):`<tr><td colspan="6" class="muted">${query?'Tiada kelas sepadan dengan carian.':'Belum ada kelas. Cipta kelas pertama.'}</td></tr>`;
  const first=classes.length?(adminClassPage-1)*pageSize+1:0;
  const last=Math.min(adminClassPage*pageSize,classes.length);
  $('#adminClassPageInfo').textContent=`${first}–${last} daripada ${classes.length} kelas`;
  $('#adminClassPrevPage').disabled=adminClassPage<=1;
  $('#adminClassNextPage').disabled=adminClassPage>=pageCount;
}
let adminClassPage=1;
function renderAdminUsers() {
  const users=adminData.users||[];
  $('#adminUserList').innerHTML=users.length?users.map(u=>`
    <tr><td>${escapeHtml(u.fullName||'—')}</td><td>${escapeHtml(u.email)}</td>
    <td><span class="status ${u.accountStatus==='active'?'active':'draft'}">${escapeHtml(u.accountStatus)}</span></td>
    <td>${escapeHtml(u.lastLogin||'—')}</td></tr>`).join(''):'<tr><td colspan="4">Belum ada pengguna.</td></tr>';
}

/* SYSTEM ADMIN DATA CRUD */
let adminDataSchema=null, adminDataRows=[], adminDataSelected=null, adminDataMode='none';
function adminDataMessage(message,isError=false){
  const el=$('#adminDataMessage'); if(el){el.textContent=message||'';el.classList.toggle('error',!!isError);}
}
function renderAdminDataRows(){
  const body=$('#adminDataList'); if(!body)return;
  body.innerHTML=adminDataRows.length?adminDataRows.map(row=>{
    const id=String(row[adminDataSchema.key]??'');
    const summary=Object.entries(row).filter(([k,v])=>k!==adminDataSchema.key && v!=='' && v!==null && v!==undefined).slice(0,3).map(([k,v])=>`${k}: ${String(v).slice(0,70)}`).join(' · ');
    return `<tr><td><code>${escapeHtml(id)}</code></td><td>${escapeHtml(summary||'—')}</td>
      <td><button class="btn btn-small btn-light" type="button" data-admin-data-open="${escapeHtml(id)}">Buka</button></td></tr>`;
  }).join(''):'<tr><td colspan="3" class="muted">Tiada rekod ditemui.</td></tr>';
  $('#adminDataCount').textContent=`${adminDataRows.length} rekod dipaparkan daripada ${adminDataSchema?.total||0}`;
}
async function loadAdminDataTable(){
  const table=$('#adminDataTable')?.value; if(!table)return;
  adminDataMessage('Memuatkan rekod...');
  try{
    adminDataSchema=await api('adminListData',{table,search:$('#adminDataSearch')?.value||'',limit:250});
    adminDataRows=adminDataSchema.records||[];
    adminDataSelected=null; adminDataMode='none';
    $('#adminDataJson').value='';
    $('#adminDataMode').textContent='Tiada pilihan';
    $('#adminDataDelete').disabled=true;
    $('#adminDataEditorHint').textContent=`Kunci utama: ${adminDataSchema.key}. Medan tersedia: ${adminDataSchema.columns.join(', ')}`;
    renderAdminDataRows(); adminDataMessage('Data berjaya dimuatkan.');
  }catch(e){adminDataMessage(e.message,true);}
}
function startAdminDataNew(){
  if(!adminDataSchema){adminDataMessage('Muatkan jadual dahulu.',true);return;}
  const blank={}; adminDataSchema.columns.forEach(c=>blank[c]='');
  $('#adminDataJson').value=JSON.stringify(blank,null,2);
  adminDataSelected=null; adminDataMode='create';
  $('#adminDataMode').textContent='Rekod baharu';
  $('#adminDataDelete').disabled=true;
  $('#adminDataEditorHint').textContent=`Isi ${adminDataSchema.key} dan medan yang diperlukan.`;
  adminDataMessage('Mod cipta rekod baharu.');
}
async function saveAdminDataRecord(){
  if(!adminDataSchema)return;
  let record;
  try{record=JSON.parse($('#adminDataJson').value);}catch(e){adminDataMessage('JSON tidak sah: '+e.message,true);return;}
  if(!record||Array.isArray(record)||typeof record!=='object'){adminDataMessage('Rekod mesti objek JSON.',true);return;}
  try{
    if(adminDataMode==='create'){
      await api('adminCreateData',{table:adminDataSchema.table,record});
      adminDataMessage('Rekod berjaya dicipta.');
    }else if(adminDataMode==='edit' && adminDataSelected){
      const patch={...record}; delete patch[adminDataSchema.key];
      await api('adminUpdateData',{table:adminDataSchema.table,id:adminDataSelected[adminDataSchema.key],patch});
      adminDataMessage('Rekod berjaya dikemas kini.');
    }else{adminDataMessage('Pilih rekod atau tekan Rekod baharu.',true);return;}
    await loadAdminDataTable();
  }catch(e){adminDataMessage(e.message,true);}
}
async function deleteAdminDataRecord(){
  if(!adminDataSchema||!adminDataSelected)return;
  const id=adminDataSelected[adminDataSchema.key];
  if(!confirm(`Padam rekod ${id} daripada ${adminDataSchema.table}? Tindakan ini kekal.`))return;
  try{await api('adminDeleteData',{table:adminDataSchema.table,id});adminDataMessage('Rekod berjaya dipadam.');await loadAdminDataTable();}
  catch(e){adminDataMessage(e.message,true);}
}
function selectedClass() {
  return (adminData?.classes||[]).find(c=>c.classId===selectedAdminClassId)||null;
}
function renderSelectedAdminClass() {
  const c=selectedClass();
  if(!c){show('#adminClassDetail',false);return;}
  show('#adminClassDetail',true);
  $('#selectedClassTitle').textContent=c.className;
  $('#selectedClassMeta').textContent=`${c.classCode} • ${c.status} • ${c.memberCount} ahli`;
  const semesterLimit=Number(c.semesterLimit)||3;
  const semesterCount=Number(c.semesterCount)||0;
  const semesterNumbers=new Set((c.semesters||[]).map(s=>Number(s.semesterNumber)));
  let nextSemesterNumber=1;
  while(semesterNumbers.has(nextSemesterNumber)&&nextSemesterNumber<=semesterLimit) nextSemesterNumber++;
  const allSemestersReady=semesterCount===semesterLimit&&semesterNumbers.size===semesterLimit&&
    Array.from(semesterNumbers).every(number=>Number.isInteger(number)&&number>=1&&number<=semesterLimit);
  $('#selectedClassSemesterProgress').textContent=`${semesterCount} / ${semesterLimit} semester`;
  $('#semesterSectionSummary').textContent=`${semesterCount} daripada ${semesterLimit}`;
  $('#semesterList').innerHTML=(c.semesters||[]).map(s=>`
    <div class="semester-row"><div><strong>${escapeHtml(s.semesterName)}</strong>
    <small>${escapeHtml(s.academicSession||'')} • Semester ${escapeHtml(s.semesterNumber)}</small></div>
    <span class="status ${s.status==='active'?'active':'draft'}">${escapeHtml(s.status)}</span></div>`).join('')||'<p class="muted">Belum ada semester.</p>';
  const canActivate=allSemestersReady&&c.status!=='active';
  $('#activateClassBtn').disabled=!canActivate;
  $('#activateClassHint').textContent=c.status==='active'?'Kelas telah diaktifkan.':
    `Lengkapkan semester 1 hingga ${semesterLimit} untuk mengaktifkan kelas (${semesterCount}/${semesterLimit}).`;
  $('#semesterNumber').max=String(semesterLimit);
  $('#semesterNumber').value=String(Math.min(nextSemesterNumber,semesterLimit));
  $('#semesterNumber').disabled=semesterCount>=semesterLimit;
  if(semesterCount>=semesterLimit) $('#createSemesterDetails').open=false;
  $('#createSemesterForm button[type="submit"]').disabled=semesterCount>=semesterLimit;
  if(semesterCount>=semesterLimit) $('#semesterMessage').textContent=`Had ${semesterLimit} semester telah dicapai.`;
  $('#createInviteBtn').disabled=c.status!=='active';
  $('#lecturerDirectoryList').innerHTML=(c.lecturers||[]).map(lecturer=>`
    <div class="lecturer-directory-row"><div><strong>${escapeHtml(lecturer.fullName)}</strong><small>${escapeHtml(lecturer.email)}</small></div>
    <span class="status ${lecturer.status==='linked'?'active':lecturer.status==='conflict'?'draft':'pending'}">${escapeHtml(lecturer.status)}</span></div>`
  ).join('')||'<p class="muted small">Belum ada pensyarah dipra-daftar.</p>';
}
async function refreshAdmin() {
  await loadAdminDashboard();
}
$('#createClassForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const data={
    className:$('#newClassName').value.trim(),
    programme:$('#newClassProgramme').value.trim(),
    institution:$('#newClassInstitution').value.trim(),
    cohort:$('#newClassCohort').value.trim(),
    description:$('#newClassDescription').value.trim(),
    semesterLimit:Number($('#newClassSemesterLimit').value)
  };
  $('#createClassMessage').textContent='Mencipta kelas...';
  try {
    const r=await api('createClass',data);
    $('#createClassMessage').textContent=`Kelas berjaya dicipta. Kod kelas: ${r.classCode}. Tambah ${r.semesterLimit} semester untuk mengaktifkannya.`;
    e.target.reset();await refreshAdmin();
    selectedAdminClassId=r.classId;renderSelectedAdminClass();
  } catch(err){$('#createClassMessage').textContent=err.message;}
});
$('#adminClassSearch')?.addEventListener('input',()=>{adminClassPage=1;renderAdminClasses();});
$('#adminClassPrevPage')?.addEventListener('click',()=>{adminClassPage=Math.max(1,adminClassPage-1);renderAdminClasses();});
$('#adminClassNextPage')?.addEventListener('click',()=>{adminClassPage++;renderAdminClasses();});
$('#adminClassList').addEventListener('click',e=>{
  const b=e.target.closest('[data-manage-class]');
  if(!b)return;
  selectedAdminClassId=b.dataset.manageClass;
  renderSelectedAdminClass();
});
$('#createSemesterForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!selectedAdminClassId)return;
  const c=selectedClass();
  if(c&&c.semesterCount>=c.semesterLimit){$('#semesterMessage').textContent=`Had ${c.semesterLimit} semester telah dicapai.`;return;}
  const data={
    classId:selectedAdminClassId,
    semesterName:$('#semesterName').value.trim(),
    academicSession:$('#semesterSession').value.trim(),
    semesterNumber:Number($('#semesterNumber').value),
    startDate:$('#semesterStart').value,
    endDate:$('#semesterEnd').value
  };
  $('#semesterMessage').textContent='Menyimpan semester...';
  try{await api('createSemester',data);$('#semesterMessage').textContent='Semester berjaya ditambah.';e.target.reset();await refreshAdmin();renderSelectedAdminClass();}
  catch(err){$('#semesterMessage').textContent=err.message;}
});
$('#activateClassBtn').addEventListener('click',async()=>{
  if(!selectedAdminClassId)return;
  $('#activateClassHint').textContent='Mengaktifkan kelas...';
  try{const r=await api('activateClass',{classId:selectedAdminClassId});$('#activateClassHint').textContent=r.message;await refreshAdmin();renderSelectedAdminClass();}
  catch(err){$('#activateClassHint').textContent=err.message;}
});
$('#createInviteForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!selectedAdminClassId)return;
  const data={classId:selectedAdminClassId,expiresAt:$('#inviteExpiry').value,maxUses:Number($('#inviteMaxUses').value||0)};
  $('#inviteMessage').textContent='Menjana kod...';
  try{
    const r=await api('adminCreateInvitation',data);
    $('#inviteMessage').textContent='Kod jemputan: '+r.inviteCode+' — salin dan edarkan kepada pelajar.';
    $('#inviteMessage').classList.add('invite-result');
    await refreshAdmin();renderSelectedAdminClass();
  }catch(err){$('#inviteMessage').textContent=err.message;}
});
$('#assignRoleForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!selectedAdminClassId)return;
  const data={classId:selectedAdminClassId,email:$('#assignEmail').value.trim(),memberRole:$('#assignRole').value};
  $('#assignRoleMessage').textContent='Mengemaskini peranan...';
  try{const r=await api('adminAssignClassRole',data);$('#assignRoleMessage').textContent=r.message;e.target.reset();await refreshAdmin();renderSelectedAdminClass();}
  catch(err){$('#assignRoleMessage').textContent=err.message;}
});
$('#registerLecturerForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!selectedAdminClassId)return;
  const message=$('#lecturerRegistrationMessage');
  message.textContent='Mendaftarkan pensyarah...';
  try{
    const result=await api('adminRegisterLecturer',{
      classId:selectedAdminClassId,
      fullName:$('#lecturerFullName').value.trim(),
      email:$('#lecturerEmail').value.trim()
    });
    e.target.reset();
    message.textContent=result.message;
    await refreshAdmin();
    renderSelectedAdminClass();
  }catch(error){message.textContent=error.message;}
});
document.querySelectorAll('[data-admin-tab]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.admin-tab-panel').forEach(x=>x.classList.add('hidden'));
    $('#admin-panel-'+btn.dataset.adminTab).classList.remove('hidden');
    if(btn.dataset.adminTab==='data') loadAdminDataTable();
    if(btn.dataset.adminTab==='preview' && !roleMatrixData) loadRolePreviewConfig();
  });
});
$('#adminDataLoad')?.addEventListener('click',loadAdminDataTable);
$('#adminDataRefresh')?.addEventListener('click',loadAdminDataTable);
$('#adminDataTable')?.addEventListener('change',loadAdminDataTable);
$('#adminDataSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadAdminDataTable();}});
$('#adminDataNew')?.addEventListener('click',startAdminDataNew);
$('#adminDataSave')?.addEventListener('click',saveAdminDataRecord);
$('#adminDataDelete')?.addEventListener('click',deleteAdminDataRecord);
$('#adminDataClear')?.addEventListener('click',()=>{adminDataSelected=null;adminDataMode='none';$('#adminDataJson').value='';$('#adminDataMode').textContent='Tiada pilihan';$('#adminDataDelete').disabled=true;adminDataMessage('Editor dikosongkan.');});
$('#adminDataList')?.addEventListener('click',e=>{
  const btn=e.target.closest('[data-admin-data-open]'); if(!btn)return;
  const row=adminDataRows.find(x=>String(x[adminDataSchema.key])===btn.dataset.adminDataOpen); if(!row)return;
  adminDataSelected=row;adminDataMode='edit';$('#adminDataJson').value=JSON.stringify(row,null,2);
  $('#adminDataMode').textContent='Edit rekod';$('#adminDataDelete').disabled=false;
  $('#adminDataEditorHint').textContent=`ID rekod: ${row[adminDataSchema.key]}. Jangan ubah kunci utama.`;
  adminDataMessage('Rekod dimuatkan ke editor.');
});


/* ---------------- SYSTEM ADMIN: PERMISSION MATRIX + TEMPORARY ROLE TEST ---------------- */
const ROLE_LABELS = {
  student:'Student / Pelajar',
  pic:'PIC',
  lecturer:'Lecturer / Pensyarah',
  ko:'KO / Class Coordinator',
  class_admin:'Class Admin'
};

async function loadRolePreviewConfig() {
  try {
    roleMatrixData=await api('getRoleMatrix',{});
    renderPermissionMatrix();
    populatePreviewClasses();
    renderRoleCards();
    await loadRoleTestHistory();
  } catch(error) {
    const msg=$('#matrixMessage');
    if(msg) msg.textContent='Gagal memuatkan matriks: '+error.message;
  }
}
function populatePreviewClasses() {
  const select=$('#previewClass');
  if(!select) return;
  const classes=adminData?.classes||[];
  const previous=select.value;
  select.innerHTML=classes.map(c=>`<option value="${escapeHtml(c.classId)}">${escapeHtml(c.className)} (${escapeHtml(c.classCode)})</option>`).join('');
  if(previous && classes.some(c=>c.classId===previous)) select.value=previous;
  else if(selectedAdminClassId && classes.some(c=>c.classId===selectedAdminClassId)) select.value=selectedAdminClassId;
}
function renderRoleCards() {
  const target=$('#roleCards');
  if(!target) return;
  const roles=['student','pic','lecturer','ko','class_admin'];
  target.innerHTML=roles.map((role,i)=>`
    <label class="role-card">
      <input type="radio" name="previewRole" value="${role}" ${i===0?'checked':''}>
      <div><span>${ROLE_LABELS[role]}</span><small>Akaun ujian sementara</small></div>
    </label>`).join('');
  const switcher=$('#previewRoleSwitch');
  if(switcher) switcher.innerHTML=roles.map(role=>`<option value="${role}">${ROLE_LABELS[role]}</option>`).join('');
}
function renderPermissionMatrix() {
  const body=$('#permMatrix');
  if(!body || !roleMatrixData) return;
  const roles=roleMatrixData.roles||['student','pic','lecturer','ko','class_admin'];
  const groups={};
  (roleMatrixData.permissions||[]).forEach(p=>(groups[p.group||'Lain-lain'] ||= []).push(p));
  const values={};
  (roleMatrixData.matrix||[]).forEach(row=>{
    values[row.role]={};
    (row.permissions||[]).forEach(cell=>values[row.role][cell.permissionId]=!!cell.enabled);
  });
  body.innerHTML=Object.entries(groups).map(([group,permissions])=>`
    <tr class="perm-group"><td colspan="${roles.length+2}">${escapeHtml(group)}</td></tr>
    ${permissions.map(p=>`<tr>
      <td><strong>${escapeHtml(p.label)}</strong><small style="display:block;color:#60758e">${escapeHtml(p.description||'')} · ${p.implemented?'API tersedia':'Endpoint belum dibangunkan'}</small></td>
      ${roles.map(role=>`<td><input type="checkbox" aria-label="${escapeHtml(ROLE_LABELS[role]+' - '+p.label)}" data-matrix-role="${role}" data-matrix-permission="${p.id}" ${values[role]?.[p.id]?'checked':''}></td>`).join('')}
      <td title="System Admin sentiasa mempunyai akses penuh">🔒 Penuh</td>
    </tr>`).join('')}`).join('');
}
async function savePermissionMatrix() {
  const cells=Array.from(document.querySelectorAll('[data-matrix-role][data-matrix-permission]')).map(el=>({
    role:el.dataset.matrixRole,permissionId:el.dataset.matrixPermission,enabled:el.checked
  }));
  $('#matrixMessage').textContent='Menyimpan matriks kebenaran...';
  try {
    const result=await api('saveRoleMatrix',{cells});
    $('#matrixMessage').textContent=result.message+' ('+result.updated+' tetapan).';
    await loadRolePreviewConfig();
  } catch(error) {
    $('#matrixMessage').textContent='Gagal menyimpan: '+error.message;
  }
}
function selectedPreviewRole() {
  return document.querySelector('input[name="previewRole"]:checked')?.value || 'student';
}
function selectedPreviewClass() {
  return (adminData?.classes||[]).find(c=>c.classId===$('#previewClass')?.value)||null;
}
async function startRolePreview(role) {
  if(rolePreviewStarting) return;
  rolePreviewStarting=true;
  const startButton=$('#startPreviewBtn'), roleSwitch=$('#previewRoleSwitch');
  if(startButton) startButton.disabled=true;
  if(roleSwitch) roleSwitch.disabled=true;
  const classId=$('#previewClass').value;
  const selectedRole=role||selectedPreviewRole();
  if(!classId) { $('#previewMessage').textContent='Sila pilih kelas terlebih dahulu.'; rolePreviewStarting=false;if(startButton)startButton.disabled=false;if(roleSwitch)roleSwitch.disabled=false;return; }
  $('#previewMessage').textContent='Mencipta akaun ujian sementara...';
  try {
    if(activeRoleTest) await stopActiveRoleTest(false);
    const result=await api('startRoleTest',{classId,role:selectedRole});
    activeRoleTest={
      sessionId:result.sessionId,token:result.testSessionToken,classId:result.classId,
      role:result.role,testUser:result.testUser,expiresAt:result.expiresAt,sandboxEnabled:result.sandboxEnabled!==false
    };
    currentUser=result.testUser;
    currentClass=selectedPreviewClass()||{classId,className:'Kelas ujian',classCode:''};
    $('#adminView').classList.add('hidden');
    show('#studentView',true);
    show('#noClass',false);show('#classArea',true);
    show('#filterToolbar',false);show('#previewTestConsole',false);show('#roleLabWorkspace',true);
    document.querySelectorAll('.tabs,.student-tab-content').forEach(el=>el.classList.add('hidden'));
    $('#welcomeName').textContent=result.testUser.name;
    $('#welcomeEmail').textContent=result.testUser.email;
    $('#className').textContent=currentClass.className;
    $('#classCode').textContent='Kod kelas: '+(currentClass.classCode||'')+' • DATA SANDBOX';
    $('#rolePill').textContent=ROLE_LABELS[selectedRole];
    $('#previewInfo').textContent='Kelas: '+currentClass.className+' • Peranan: '+ROLE_LABELS[selectedRole];
    $('#previewAccountId').textContent='ID sementara: '+result.testUser.id+' • Tamat: '+result.expiresAt;
    $('#testRoleMeta').textContent='Peranan: '+ROLE_LABELS[selectedRole];
    $('#testAccountMeta').textContent='ID: '+result.testUser.id;
    $('#testExpiryMeta').textContent='Luput: '+result.expiresAt;
    $('#previewRoleSwitch').value=selectedRole;
    activeRoleLabTab='dashboard';roleLabEditing=null;
    $('#previewMessage').textContent=result.message;
    await loadRoleTestContext();
    document.querySelectorAll('.student-tab').forEach((b,i)=>b.classList.toggle('active',i===0));
    document.querySelectorAll('.student-tab-content').forEach((el,i)=>el.classList.toggle('hidden',i!==0));
  } catch(error) {
    $('#previewMessage').textContent='Gagal memulakan ujian: '+error.message;
    if(!activeRoleTest) {
      show('#studentView',false);show('#filterToolbar',true);show('#previewTestConsole',false);show('#roleLabWorkspace',false);show('#adminView',true);
    }
  } finally {
    rolePreviewStarting=false;
    if(startButton) startButton.disabled=false;
    if(roleSwitch) roleSwitch.disabled=false;
  }
}
async function loadRoleTestContext() {
  if(!activeRoleTest) return;
  try {
    const sessionSnapshot=activeRoleTest;
    const context=await api('roleTestContext',{},sessionSnapshot.token);
    if(!activeRoleTest || activeRoleTest.sessionId!==sessionSnapshot.sessionId) return;
    if(context.role!==activeRoleTest.role || context.sessionId!==activeRoleTest.sessionId) throw new Error('Role context mismatch. Sila mulakan semula sesi ujian.');
    roleTestContextData=context;
    activeRoleTest.sandboxEnabled=context.sandboxEnabled!==false;
    if($('#roleLabAudit')) $('#roleLabAudit').innerHTML=(context.auditLogs||[]).map(log=>`<div class="test-audit-item"><strong>${escapeHtml(log.role||context.role)} / ${escapeHtml(log.action)}</strong> — ${escapeHtml(log.result)}<small>${escapeHtml(log.created_at||'')} • ${escapeHtml(log.entity_type||'')}</small></div>`).join('')||'Belum ada aktiviti.';
    if(!activeTestSemesterId || !(roleTestContextData.semesters||[]).some(x=>x.semester_id===activeTestSemesterId)) {
      activeTestSemesterId=roleTestContextData.semesters?.[0]?.semester_id||null;
    }
    renderRoleTestWorkspace();
  } catch(error) {
    $('#previewTestResult').textContent='Konteks ujian: '+error.message;
  }
}
function rolePermissionEnabled(permissionId) {
  if(!roleMatrixData || !activeRoleTest) return false;
  const roleRow=(roleMatrixData.matrix||[]).find(x=>x.role===activeRoleTest.role);
  const enabled=id=>!!roleRow?.permissions?.find(x=>x.permissionId===id)?.enabled;
  const dependencies={
    'semester.view':['class.view'],'semester.manage':['class.view'],
    'schedule.view':['class.view','semester.view'],
    'schedule.edit':['class.view','semester.view','schedule.view'],
    'schedule.verify':['class.view','semester.view','schedule.view'],
    'schedule.delete':['class.view','semester.view','schedule.view'],
    'pb.view':['class.view','semester.view'],'pb.create':['class.view','semester.view','pb.view'],
    'pb.edit':['class.view','semester.view','pb.view'],'pb.delete':['class.view','semester.view','pb.view'],
    'pb.progress.update':['class.view','semester.view','pb.view'],
    'pb.marks.manage':['class.view','semester.view','pb.view'],
    'resources.view':['class.view','semester.view'],'resources.manage':['class.view','semester.view','resources.view'],
    'resources.delete':['class.view','semester.view','resources.view'],
    'calendar.view':['class.view','semester.view'],'calendar.create':['class.view','semester.view','calendar.view'],
    'calendar.edit':['class.view','semester.view','calendar.view'],'calendar.delete':['class.view','semester.view','calendar.view'],
    'members.view':['class.view'],'members.roles.manage':['class.view','members.view'],
    'reports.view':['class.view'],'notifications.manage':['class.view']
  };
  return enabled(permissionId) && (dependencies[permissionId]||[]).every(enabled);
}

function roleLabAllowed(permission) { return rolePermissionEnabled(permission); }
function roleLabRoleLabel(role) { return ROLE_LABELS[role] || role; }
function roleLabPaginate(tab, records, searchText, filterValue, filterLabel='kategori') {
  const state=roleLabListState[tab]||(roleLabListState[tab]={query:'',filter:'all',page:1});
  const query=state.query.trim().toLocaleLowerCase();
  const options=filterValue?Array.from(new Set(records.map(x=>String(filterValue(x)||'—')))).sort((a,b)=>a.localeCompare(b)): [];
  if(state.filter!=='all'&&!options.includes(state.filter)) state.filter='all';
  const filtered=records.filter(record=>{
    const matchesQuery=!query||searchText(record).toLocaleLowerCase().includes(query);
    const matchesFilter=!filterValue||state.filter==='all'||String(filterValue(record)||'—')===state.filter;
    return matchesQuery&&matchesFilter;
  });
  const pages=Math.max(1,Math.ceil(filtered.length/ROLE_LAB_PAGE_SIZE));
  state.page=Math.min(Math.max(1,state.page),pages);
  const start=(state.page-1)*ROLE_LAB_PAGE_SIZE;
  return {
    items:filtered.slice(start,start+ROLE_LAB_PAGE_SIZE),
    controls:`<div class="role-lab-list-controls">
      <label class="role-lab-search"><span class="sr-only">Cari rekod</span><input id="roleLabSearch" type="search" value="${escapeHtml(state.query)}" placeholder="Cari..." autocomplete="off"></label>
      ${filterValue?`<label class="role-lab-filter"><span class="sr-only">Tapis rekod</span><select id="roleLabFilter"><option value="all">Semua ${escapeHtml(filterLabel)}</option>${options.map(x=>`<option value="${escapeHtml(x)}" ${x===state.filter?'selected':''}>${escapeHtml(x)}</option>`).join('')}</select></label>`:''}
    </div>`,
    pagination:`<nav class="role-lab-pagination" aria-label="Halaman rekod">
      <span>${filtered.length?`${start+1}–${Math.min(start+ROLE_LAB_PAGE_SIZE,filtered.length)} daripada ${filtered.length}`:'Tiada rekod sepadan'}</span>
      <div><button type="button" class="btn btn-light btn-small" data-role-page="-1" ${state.page<=1?'disabled':''}>Sebelumnya</button><span>Halaman ${state.page} / ${pages}</span><button type="button" class="btn btn-light btn-small" data-role-page="1" ${state.page>=pages?'disabled':''}>Seterusnya</button></div>
    </nav>`,
    empty:records.length?'Tiada rekod sepadan dengan carian atau penapis.':'Tiada rekod untuk dipaparkan.'
  };
}
function roleLabSubjectName(semesterSubjectId) {
  const ctx=roleTestContextData||{};
  const ss=(ctx.semesterSubjects||[]).find(x=>x.semester_subject_id===semesterSubjectId)||{};
  const sub=(ctx.subjects||[]).find(x=>x.subject_id===ss.subject_id)||{};
  return `${sub.subject_code||''} ${sub.subject_name||'Subjek'}`.trim();
}
function roleLabTabConfig(role) {
  const base=[['dashboard','Ringkasan','class.view']];
  const all=[['schedule','Jadual','schedule.view'],['assignments','Penilaian PB','pb.view'],
    ['resources','Nota & sumber','resources.view'],['calendar','Kalendar','calendar.view'],
    ['members','Ahli kelas','members.view'],['reports','Laporan','reports.view']];
  const roleTabs={
    student:['schedule','assignments','resources','calendar'],
    pic:['schedule','assignments','resources','calendar','members','reports'],
    lecturer:['schedule','assignments','resources','calendar','members','reports'],
    ko:['schedule','assignments','resources','calendar','members','reports'],
    class_admin:['schedule','assignments','resources','calendar','members','reports']
  };
  return base.concat(all.filter(x=>(roleTabs[role]||[]).includes(x[0]) && roleLabAllowed(x[2])));
}
function renderRoleTestWorkspace() { renderRoleLabWorkspace(); }
function renderRoleLabWorkspace() {
  const ctx=roleTestContextData;
  if(!ctx || !activeRoleTest) return;
  const role=activeRoleTest.role, semesters=ctx.semesters||[];
  if(ctx.role!==role) return;
  const roleLabel=roleLabRoleLabel(role);
  $('#rolePill').textContent=roleLabel;
  $('#previewInfo').textContent='Kelas: '+(currentClass?.className||'Kelas ujian')+' • Peranan: '+roleLabel;
  $('#previewAccountId').textContent='ID sementara: '+activeRoleTest.testUser.id+' • Tamat: '+activeRoleTest.expiresAt;
  $('#testRoleMeta').textContent='Peranan: '+roleLabel;
  $('#testAccountMeta').textContent='ID: '+activeRoleTest.testUser.id;
  $('#welcomeName').textContent=activeRoleTest.testUser.name;
  $('#welcomeEmail').textContent=activeRoleTest.testUser.email;
  const semester=semesters.find(x=>x.semester_id===activeTestSemesterId)||semesters[0]||null;
  activeTestSemesterId=semester?.semester_id||null;
  const availableOffers=(ctx.semesterSubjects||[]).filter(x=>!semester || x.semester_id===semester.semester_id);
  const selectedOfferIds=new Set(ctx.selectedSemesterSubjectIds||[]);
  const ss=role==='student'?availableOffers.filter(x=>selectedOfferIds.has(x.semester_subject_id)):availableOffers;
  const subjectIds=availableOffers.map(x=>x.subject_id);
  const subjects=(ctx.subjects||[]).filter(x=>subjectIds.includes(x.subject_id));
  const ssIds=ss.map(x=>x.semester_subject_id);
  const sessions=(ctx.sessions||[]).filter(x=>ssIds.includes(x.semester_subject_id) && x.status!=='cancelled');
  const assignments=(ctx.assignments||[]).filter(x=>ssIds.includes(x.semester_subject_id) && x.status!=='cancelled');
  const resources=(ctx.resources||[]).filter(x=>ssIds.includes(x.semester_subject_id) && x.visibility!=='personal' && x.visibility!=='archived');
  const events=(ctx.calendarEvents||[]).filter(x=>!semester || x.semester_id===semester.semester_id).filter(x=>x.visibility!=='archived');
  const members=ctx.members||[], ownProgress=ctx.ownProgress||[];
  const membersById=Object.fromEntries(members.map(member=>[member.userId,member]));
  const mappedStaffName=userId=>membersById[userId]?.name||userId||'Belum ditetapkan';
  const subjectsById=Object.fromEntries(subjects.map(x=>[x.subject_id,x]));
  const offeringPanel=$('#roleLabStudentOfferings');
  if(offeringPanel) {
    show('#roleLabStudentOfferings',role==='student');
    if(role==='student') {
      const groups=new Map();
      availableOffers.forEach(offer=>{
        if(!groups.has(offer.subject_id)) groups.set(offer.subject_id,{subject:subjectsById[offer.subject_id]||{},offers:[]});
        groups.get(offer.subject_id).offers.push(offer);
      });
      offeringPanel.innerHTML=`<div class="section-heading"><div><h3>Pilih tawaran subjek</h3><p class="muted small">Pilihan ujian ini hanya untuk akaun sementara.</p></div></div>
        <div class="student-offering-list">${Array.from(groups.entries()).map(([subjectId,group])=>{
          const chosen=(ctx.selectedSemesterSubjectIds||[]).find(id=>group.offers.some(offer=>offer.semester_subject_id===id))||'';
          const label=[group.subject.subject_code,group.subject.subject_name].filter(Boolean).join(' · ');
          return `<div class="student-offering-row"><div><strong>${escapeHtml(label||subjectId)}</strong></div>
            <select data-role-student-offering="${escapeHtml(subjectId)}"><option value="">Belum pilih</option>
              ${group.offers.map(offer=>`<option value="${escapeHtml(offer.semester_subject_id)}" ${chosen===offer.semester_subject_id?'selected':''}>${escapeHtml([offer.offering_name||'Tawaran',mappedStaffName(offer.lecturer_user_id)].join(' · '))}</option>`).join('')}
            </select><button class="btn btn-light btn-small" type="button" data-save-role-student-offering="${escapeHtml(subjectId)}">Simpan</button></div>`;
        }).join('')||'<p class="muted">Tiada tawaran tersedia untuk semester ini.</p>'}</div>`;
    }
  }
  const calendarSubjects=Object.fromEntries(ss.map(link=>{
    const subject=subjectsById[link.subject_id]||{};
    return [link.semester_subject_id,{subjectName:`${subject.subject_code||''} ${subject.subject_name||'Subjek'}`.trim(),subjectColor:link.subject_color||''}];
  }));
  const semSelect=$('#semesterSwitch');
  if(semSelect) {
    semSelect.classList.toggle('hidden',semesters.length<2);
    semSelect.innerHTML=semesters.map(x=>`<option value="${escapeHtml(x.semester_id)}">${escapeHtml(x.semester_name)}</option>`).join('');
    if(activeTestSemesterId) semSelect.value=activeTestSemesterId;
  }
  const roleTitles={student:'Ruang Pembelajaran Pelajar',pic:'Dashboard Penyelaras PIC',lecturer:'Dashboard Pensyarah',ko:'Dashboard Class Coordinator',class_admin:'Dashboard Pentadbir Kelas'};
  const descriptions={student:'Pantau jadual, tugasan PB, sumber pembelajaran dan kemajuan tugasan anda.',pic:'Pantau jadual kelas, cadangkan perubahan dan selaraskan maklumat kelas.',lecturer:'Urus PB, sumber pembelajaran, markah dan maklumat pengajaran.',ko:'Selaraskan semester, jadual, ahli kelas dan komunikasi kohort.',class_admin:'Urus operasi kelas, semester, peranan ahli dan pemantauan keseluruhan.'};
  $('#roleLabTitle').textContent=roleTitles[role]||'Dashboard peranan';
  $('#roleLabDescription').textContent=descriptions[role]||'Ruang kerja ujian peranan.';
  $('#roleLabRolePill').textContent=roleLabRoleLabel(role);
  const sandboxEnabled=activeRoleTest.sandboxEnabled!==false;
  const modeBadge=$('#roleLabSandboxState'),modeButton=$('#roleLabSandboxToggleBtn');
  if(modeBadge) {
    modeBadge.textContent=sandboxEnabled?'SANDBOX':'TERUS SIMPAN';
    modeBadge.classList.toggle('role-lab-live-pill',!sandboxEnabled);
  }
  if(modeButton) modeButton.textContent=sandboxEnabled?'Matikan sandbox':'Aktifkan sandbox';
  const modeHint=$('#roleLabWriteModeHint');
  if(modeHint) modeHint.textContent=sandboxEnabled
    ?'Perubahan sesi ini diasingkan dalam sandbox dan tidak ditulis ke data kelas.'
    :'Mod terus-simpan aktif: perubahan baharu ditulis terus ke pangkalan data.';
  $('#roleLabStats').innerHTML=[['Semester',semesters.length],['Subjek',subjects.length],['Sesi jadual',sessions.length],['Tugasan PB',assignments.length]]
    .map(x=>`<article class="role-lab-stat"><span>${x[0]}</span><strong>${x[1]}</strong></article>`).join('');
  const tabs=roleLabTabConfig(role);
  if(!tabs.some(x=>x[0]===activeRoleLabTab)) activeRoleLabTab='dashboard';
  $('#roleLabNav').innerHTML=tabs.map(x=>`<button type="button" class="role-lab-tab ${activeRoleLabTab===x[0]?'active':''}" data-role-tab="${x[0]}">${x[1]}</button>`).join('');
  const upcoming=[...assignments.map(x=>({title:x.title,date:x.due_at,type:'PB'})),...events.map(x=>({title:x.title,date:x.start_at,type:x.event_category||'Acara'}))]
    .filter(x=>x.date).sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,5);
  const searchRecord=record=>[...Object.values(record),roleLabSubjectName(record.semester_subject_id)].join(' ');
  const listRecords={
    dashboard:roleLabPaginate('dashboard',ss,record=>{const subject=subjectsById[record.subject_id]||{};return [subject.subject_code,subject.subject_name,mappedStaffName(record.lecturer_user_id),mappedStaffName(record.pic_user_id)].join(' ');}),
    schedule:roleLabPaginate('schedule',sessions,searchRecord),
    assignments:roleLabPaginate('assignments',assignments,searchRecord,record=>record.assignment_type||'PB','Jenis'),
    resources:roleLabPaginate('resources',resources,record=>`${searchRecord(record)} ${roleLabSubjectName(record.semester_subject_id)}`,record=>roleLabSubjectName(record.semester_subject_id),'Subjek'),
    calendar:roleLabPaginate('calendar',events,searchRecord,
      record=>record.semester_subject_id?roleLabSubjectName(record.semester_subject_id):'Umum / tanpa subjek','Subjek'),
    members:roleLabPaginate('members',members,searchRecord,record=>record.role||'Ahli','Peranan')
  };
  const listPage=listRecords[activeRoleLabTab];
  let content='';
  const header=`<div class="role-lab-toolbar"><label>Semester aktif <select id="roleLabSemester">${semesters.map(x=>`<option value="${escapeHtml(x.semester_id)}" ${x.semester_id===activeTestSemesterId?'selected':''}>${escapeHtml(x.semester_name)}</option>`).join('')}</select></label>${activeRoleLabTab==='schedule'?'':listPage?.controls||''}</div>`;
  const assignStaff=roleLabAllowed('semester.manage');
  const staffOptions=(staffRole,selectedId)=>`<option value="">Belum ditetapkan</option>`+(members||[])
    .filter(member=>String(member.role||'').toLowerCase()===staffRole)
    .map(member=>`<option value="${escapeHtml(member.userId)}" ${member.userId===selectedId?'selected':''}>${escapeHtml(member.name||member.userId)}</option>`).join('');
  const subjectTable=listRecords.dashboard.items.map(x=>{
    const sub=subjectsById[x.subject_id]||{};
    const scheduleReady=sessions.some(item=>item.semester_subject_id===x.semester_subject_id)||
      (ctx.scheduleSeries||[]).some(item=>item.semester_subject_id===x.semester_subject_id&&item.status!=='cancelled');
    const ready=!!x.lecturer_user_id&&!!x.pic_user_id&&scheduleReady;
    return `<tr><td>${escapeHtml(sub.subject_code||'—')}</td><td>${escapeHtml(sub.subject_name||'Subjek')}</td>
      <td>${assignStaff?`<select data-subject-staff="lecturerUserId" data-semester-subject="${escapeHtml(x.semester_subject_id)}" aria-label="Pensyarah">${staffOptions('lecturer',x.lecturer_user_id)}</select>`:escapeHtml(mappedStaffName(x.lecturer_user_id))}</td>
      <td>${assignStaff?`<select data-subject-staff="picUserId" data-semester-subject="${escapeHtml(x.semester_subject_id)}" aria-label="PIC">${staffOptions('pic',x.pic_user_id)}</select>`:escapeHtml(mappedStaffName(x.pic_user_id))}</td>
      <td>${assignments.filter(a=>a.semester_subject_id===x.semester_subject_id).length}</td>
      <td><span class="status ${ready?'active':'draft'}">${ready?'Sedia':'Belum lengkap'}</span></td>
      ${assignStaff?`<td><button class="btn btn-light btn-small" data-role-action="save-subject-staff" data-id="${escapeHtml(x.semester_subject_id)}">Simpan</button></td>`:''}</tr>`;
  }).join('')||`<tr><td colspan="${assignStaff?7:6}">${escapeHtml(listRecords.dashboard.empty)}</td></tr>`;
  if(activeRoleLabTab==='dashboard') {
    content=`${header}<div class="role-lab-grid">
      <section class="role-lab-card role-lab-wide"><div class="role-lab-card-head"><div><h3>Pemetaan kelas → subjek → pensyarah</h3><p class="muted small">${escapeHtml(currentClass?.className||'Kelas aktif')} · ${escapeHtml(semester?.semesterName||'Semester')}</p></div><span class="muted small">${ss.length} subjek</span></div>${assignStaff?`<p class="muted small">Tetapkan pensyarah dan PIC untuk setiap subjek semester. PB, nota dan sumber hanya tersedia kepada pelajar selepas pemetaan staf dan jadual lengkap.</p><form id="roleLabSubjectLinkForm" class="role-lab-form"><label>Tambah subjek sedia ada<select name="subjectId" required>${(ctx.availableSubjects||[]).filter(subject=>!ss.some(link=>link.subject_id===subject.subject_id)).map(subject=>`<option value="${escapeHtml(subject.subject_id)}">${escapeHtml([subject.subject_code,subject.subject_name].filter(Boolean).join(' · '))}</option>`).join('')||'<option value="">Tiada subjek tersedia untuk dipautkan</option>'}</select></label><button class="btn btn-light" type="submit" ${(ctx.availableSubjects||[]).every(subject=>ss.some(link=>link.subject_id===subject.subject_id))?'disabled':''}>Pautkan kepada semester</button></form>`:''}<div class="table-wrap role-lab-table-wrap"><table><thead><tr><th>Kod</th><th>Subjek</th><th>Pensyarah</th><th>PIC subjek</th><th>PB</th><th>Status pelajar</th>${assignStaff?'<th></th>':''}</tr></thead><tbody>${subjectTable}</tbody></table></div>${listRecords.dashboard.pagination}</section>
      <section class="role-lab-card"><h3>Tarikh penting seterusnya</h3>${upcoming.map(x=>`<div class="role-lab-list-row"><div><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.type)}</small></div><time>${escapeHtml(x.date)}</time></div>`).join('')||'<p class="muted small">Tiada tarikh akan datang direkodkan.</p>'}</section>
      <section class="role-lab-card"><h3>Status ruang kerja</h3><div class="role-lab-summary"><span>Peranan aktif</span><b>${escapeHtml(roleLabRoleLabel(role))}</b></div><div class="role-lab-summary"><span>PB aktif</span><b>${assignments.length}</b></div><div class="role-lab-summary"><span>Ahli kelas</span><b>${members.length}</b></div><p class="muted small">Data kelas dipaparkan bersama perubahan sandbox sesi ini.</p></section>
      ${roleLabAllowed('semester.manage')?`<section class="role-lab-card"><h3>Tambah semester</h3><p class="muted small">Had kelas: ${Number(currentClass?.semesterLimit)||3} semester.</p><form id="roleLabSemesterForm" class="role-lab-form"><label>Nama semester<input name="semesterName" required placeholder="Contoh: Semester 2"></label><label>Sesi akademik<input name="academicSession" placeholder="2026/2027"></label><label>Nombor semester<input name="semesterNumber" type="number" min="1" max="${Number(currentClass?.semesterLimit)||3}" value="${semesters.length+1}" ${semesters.length>=(Number(currentClass?.semesterLimit)||3)?'disabled':''}></label><label>Tarikh mula<input name="startDate" type="date"></label><label>Tarikh tamat<input name="endDate" type="date"></label><div class="btn-row"><button class="btn" type="submit" ${semesters.length>=(Number(currentClass?.semesterLimit)||3)?'disabled':''}>Cipta semester</button><span class="small form-message" id="roleLabSemesterMessage"></span></div></form></section>`:''}
      ${roleLabAllowed('class.activate')?`<section class="role-lab-card"><h3>Status kelas</h3><p class="muted small">Uji proses pengaktifan kelas menggunakan akaun sementara.</p><button class="btn" data-role-action="activate-class">Aktifkan kelas ujian</button></section>`:''}
      ${roleLabAllowed('notifications.manage')?`<section class="role-lab-card"><h3>Hebahan kelas</h3><form id="roleLabNotificationForm" class="role-lab-form"><label>Tajuk<input name="title" required></label><label>Mesej<textarea name="message" required rows="3"></textarea></label><div class="btn-row"><button class="btn" type="submit">Hantar hebahan ujian</button><span id="roleLabNotificationMessage" class="small form-message"></span></div></form></section>`:''}
    </div>`;
  } else if(activeRoleLabTab==='schedule') {
    content=`${header}<section class="role-lab-card"><div class="role-lab-card-head"><div><h3>Jadual kelas</h3><p class="muted small">Paparan minggu mengikut semester aktif.</p></div>${roleLabAllowed('schedule.edit')?'<button class="btn btn-small" data-role-action="new-schedule">Tambah sesi</button>':''}</div>${renderWeeklyScheduleCalendar({sessions,series:ctx.scheduleSeries||[],events,date:roleLabCalendarDate,scope:'role',query:roleLabListState.schedule?.query||'',subjectFilter:roleLabListState.schedule?.subject||'all',subjects:calendarSubjects})}</section><div id="roleLabEditor"></div>`;
  } else if(activeRoleLabTab==='assignments') {
    const assignmentGroups=groupBySubject(listPage.items,a=>a.semester_subject_id,
      subjectId=>roleLabSubjectName(subjectId));
    content=`${header}<section class="role-lab-card"><div class="role-lab-card-head"><div><h3>Penilaian Berterusan</h3><p class="muted small">Setiap PB terikat kepada subjek dalam semester aktif.</p></div>${roleLabAllowed('pb.create')?'<button class="btn btn-small" data-role-action="new-pb">Tambah PB</button>':''}</div>${assignmentGroups.map(group=>subjectDisclosure(group,'PB',
      `<div class="role-lab-records">${group.items.map(a=>{
      const progress=ownProgress.find(x=>x.assignment_id===a.assignment_id);
      const attachmentHtml=(ctx.assignmentResources||[]).filter(link=>link.assignment_id===a.assignment_id).map(link=>{
        const resource=resources.find(item=>item.resource_id===link.resource_id);
        if(!resource) return '';
        const url=resource.url||resource.storage_file_id||'',label=escapeHtml(resource.resource_name||'Bahan PB');
        return /^https?:\/\//i.test(url)?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`:`<span>${label}</span>`;
      }).filter(Boolean).join(' · ');
      const actions=role==='student'?`<button class="btn btn-light btn-small" data-role-action="progress-pb" data-id="${escapeHtml(a.assignment_id)}">Kemaskini kemajuan</button>`:`${roleLabAllowed('pb.edit')?`<button class="btn btn-light btn-small" data-role-action="edit-pb" data-id="${escapeHtml(a.assignment_id)}">Edit</button>`:''}${roleLabAllowed('pb.marks.manage')?`<button class="btn btn-light btn-small" data-role-action="mark-pb" data-id="${escapeHtml(a.assignment_id)}">Rekod markah</button>`:''}${roleLabAllowed('pb.delete')?`<button class="btn btn-danger-light btn-small" data-role-action="delete-pb" data-id="${escapeHtml(a.assignment_id)}">Arkib</button>`:''}`;
      return `<article class="role-lab-record"><div class="role-lab-record-main"><b>${escapeHtml(a.title||'Tugasan PB')}</b><span>${escapeHtml(roleLabSubjectName(a.semester_subject_id))} · ${escapeHtml(a.assignment_type||'PB')} · ${escapeHtml(a.marks_percentage||0)}%</span><small>Mula: ${escapeHtml(a.start_date||'—')} · Hantar: ${escapeHtml(a.due_at||'—')}</small>${attachmentHtml?`<small>Bahan PB: ${attachmentHtml}</small>`:''}${role==='student'?`<div class="role-progress"><span>Kemajuan: ${Number(progress?.progress_percentage||0)}%</span><div><i style="width:${Math.max(0,Math.min(100,Number(progress?.progress_percentage||0)))}%"></i></div></div>`:''}</div><div class="role-lab-record-actions">${actions}</div></article>`;
    }).join('')}</div>`)).join('')||`<p class="muted">${escapeHtml(listPage.empty)}</p>`}${listPage.pagination}</section><div id="roleLabEditor"></div>`;
  } else if(activeRoleLabTab==='resources') {
    const resourceGroups=groupBySubject(listPage.items,r=>r.semester_subject_id,
      subjectId=>roleLabSubjectName(subjectId));
    content=`${header}<section class="role-lab-card"><div class="role-lab-card-head"><div><h3>Nota & sumber pembelajaran</h3><p class="muted small">Bahan disusun mengikut subjek semester ini.</p></div>${roleLabAllowed('resources.manage')?'<button class="btn btn-small" data-role-action="new-resource">Tambah sumber</button>':''}</div>${resourceGroups.map(group=>subjectDisclosure(group,'sumber',
      `<div class="role-lab-records">${group.items.map(r=>`<article class="role-lab-record"><div class="role-lab-record-main"><b>${escapeHtml(r.resource_name||'Sumber pembelajaran')}</b><span>${escapeHtml(r.resource_type||'resource')}</span><small>${escapeHtml(r.description||'')}</small>${r.storage_file_id?`<a href="${escapeHtml(r.storage_file_id)}" target="_blank" rel="noopener noreferrer">Buka sumber ↗</a>`:''}</div><div class="role-lab-record-actions">${roleLabAllowed('resources.manage')?`<button class="btn btn-light btn-small" data-role-action="edit-resource" data-id="${escapeHtml(r.resource_id)}">Edit</button>`:''}${roleLabAllowed('resources.delete')?`<button class="btn btn-danger-light btn-small" data-role-action="delete-resource" data-id="${escapeHtml(r.resource_id)}">Arkib</button>`:''}</div></article>`).join('')}</div>`)).join('')||`<p class="muted">${escapeHtml(listPage.empty)}</p>`}${listPage.pagination}</section><div id="roleLabEditor"></div>`;
  } else if(activeRoleLabTab==='calendar') {
    const eventGroups=groupBySubject(listPage.items,e=>e.semester_subject_id,
      subjectId=>subjectId==='general'?'Umum / tanpa subjek':roleLabSubjectName(subjectId));
    content=`${header}<section class="role-lab-card"><div class="role-lab-card-head"><div><h3>Kalendar & tarikh penting</h3><p class="muted small">Tarikh PB dan acara kelas, dikumpulkan mengikut subjek.</p></div>${roleLabAllowed('calendar.create')?'<button class="btn btn-small" data-role-action="new-event">Tambah acara</button>':''}</div>${eventGroups.map(group=>subjectDisclosure(group,'acara',
      `<div class="role-lab-records">${group.items.map(e=>`<article class="role-lab-record"><div class="role-lab-record-main"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(e.event_category||'Acara')} · ${escapeHtml(e.start_at||'')}</span><small>${escapeHtml(e.description||'')}</small></div><div class="role-lab-record-actions">${roleLabAllowed('calendar.edit')?`<button class="btn btn-light btn-small" data-role-action="edit-event" data-id="${escapeHtml(e.event_id)}">Edit</button>`:''}${roleLabAllowed('calendar.delete')?`<button class="btn btn-danger-light btn-small" data-role-action="delete-event" data-id="${escapeHtml(e.event_id)}">Arkib</button>`:''}</div></article>`).join('')}</div>`)).join('')||`<p class="muted">${escapeHtml(listPage.empty)}</p>`}${listPage.pagination}</section><div id="roleLabEditor"></div>`;
  } else if(activeRoleLabTab==='members') {
    content=`${header}<section class="role-lab-card"><h3>Ahli kelas</h3><p class="muted small">Senarai ahli kelas dan peranan yang ditetapkan.</p><div class="role-lab-records">${listPage.items.map(m=>`<article class="role-lab-record"><div class="role-lab-record-main"><b>${escapeHtml(m.name||m.userId)}</b><span>${escapeHtml(m.email||'Akaun ujian')} · ${escapeHtml(m.status||'active')}</span><small>ID: ${escapeHtml(m.userId)}</small></div><div class="role-lab-record-actions">${roleLabAllowed('members.roles.manage') && m.userId!==activeRoleTest.testUser.id?`<select data-member-role="${escapeHtml(m.userId)}"><option value="student" ${m.role==='student'?'selected':''}>Student</option><option value="pic" ${m.role==='pic'?'selected':''}>PIC</option><option value="lecturer" ${m.role==='lecturer'?'selected':''}>Lecturer</option><option value="ko" ${m.role==='ko'?'selected':''}>KO</option></select><button class="btn btn-light btn-small" data-role-action="save-member-role" data-id="${escapeHtml(m.userId)}">Simpan</button>`:`<span class="pill">${escapeHtml(m.role)}</span>`}</div></article>`).join('')||`<p class="muted">${escapeHtml(listPage.empty)}</p>`}</div>${listPage.pagination}</section>`;
  } else if(activeRoleLabTab==='reports') {
    const completed=ownProgress.filter(x=>x.progress_status==='completed').length;
    content=`${header}<section class="role-lab-card"><h3>Ringkasan pemantauan kelas</h3><div class="role-lab-stats"><article class="role-lab-stat"><span>Ahli kelas</span><strong>${members.length}</strong></article><article class="role-lab-stat"><span>PB aktif</span><strong>${assignments.length}</strong></article><article class="role-lab-stat"><span>Sesi jadual</span><strong>${sessions.length}</strong></article><article class="role-lab-stat"><span>Progress selesai (akaun ini)</span><strong>${completed}</strong></article></div><p class="muted small">Laporan menggunakan data kelas dan perubahan sandbox semasa.</p><button class="btn btn-light" data-role-action="export-report">Eksport ringkasan CSV</button></section>`;
  }
  $('#roleLabContent').innerHTML=content;
}
function roleLabEditor(title,fields,submitLabel='Simpan') {
  const fieldHtml=fields.map(f=>`<label>${f.label}${f.type==='select'?`<select name="${f.name}" ${f.required?'required':''}>${f.options}</select>`:f.type==='textarea'?`<textarea name="${f.name}" rows="3" ${f.required?'required':''}>${escapeHtml(f.value||'')}</textarea>`:`<input name="${f.name}" type="${f.type||'text'}" value="${escapeHtml(f.value||'')}" ${f.required?'required':''} ${f.min!==undefined?`min="${f.min}"`:''} ${f.max!==undefined?`max="${f.max}"`:''}>`}</label>`).join('');
  $('#roleLabEditor').innerHTML=`<section class="role-lab-card role-lab-editor"><div class="role-lab-card-head"><h3>${title}</h3><button type="button" class="btn btn-light btn-small" data-role-action="close-editor">Tutup</button></div><form id="roleLabCrudForm" class="role-lab-form">${fieldHtml}<div class="btn-row"><button class="btn" type="submit">${submitLabel}</button><span id="roleLabFormMessage" class="small form-message"></span></div></form></section>`;
}
function roleLabSelectOptions(items,value,labelFn) { return items.map(x=>`<option value="${escapeHtml(value(x))}">${escapeHtml(labelFn(x))}</option>`).join(''); }
function roleLabOpenEditor(action,id) {
  const ctx=roleTestContextData||{}, ss=(ctx.semesterSubjects||[]).filter(x=>x.semester_id===activeTestSemesterId);
  const sessions=ctx.sessions||[], assignments=ctx.assignments||[], resources=ctx.resources||[], events=ctx.calendarEvents||[];
  const subjectFields=[{name:'semesterSubjectId',label:'Subjek',type:'select',required:true,options:roleLabSelectOptions(ss,x=>x.semester_subject_id,x=>roleLabSubjectName(x.semester_subject_id))}];
  roleLabEditing={action,id:id||null};
  if(action.includes('schedule')) {
    const row=sessions.find(x=>x.session_id===id)||{};
    roleLabEditor(id?'Kemaskini sesi jadual':'Tambah sesi jadual',[
      ...(!id?subjectFields:[]),{name:'sessionDate',label:'Tarikh',type:'date',required:true,value:row.session_date},
      {name:'startTime',label:'Masa mula',type:'time',required:true,value:row.start_time},{name:'endTime',label:'Masa tamat',type:'time',required:true,value:row.end_time},
      {name:'room',label:'Bilik / pautan',value:row.room},{name:'deliveryMode',label:'Mod',type:'select',value:row.delivery_mode,options:'<option>Bersemuka</option><option>Dalam talian</option><option>Hibrid</option>'},
      {name:'sessionType',label:'Jenis',type:'select',value:row.session_type,options:'<option>Kuliah</option><option>Tutorial</option><option>Amali</option><option>Lain-lain</option>'},
      {name:'reason',label:'Sebab perubahan',value:'Ujian melalui Role Workspace'}
    ],'Simpan sesi');
  } else if(action==='progress-pb') {
    const row=assignments.find(x=>x.assignment_id===id)||{}, progress=(ctx.ownProgress||[]).find(x=>x.assignment_id===id)||{};
    roleLabEditor('Kemaskini kemajuan tugasan: '+(row.title||''),[
      {name:'progress_status',label:'Status',type:'select',value:progress.progress_status||'not_started',options:'<option value="not_started">Belum mula</option><option value="in_progress">Sedang dibuat</option><option value="nearly_done">Hampir siap</option><option value="completed">Selesai</option>'},
      {name:'progress_percentage',label:'Kemajuan (%)',type:'number',min:0,max:100,value:progress.progress_percentage||0},
      {name:'personal_due_at',label:'Sasaran peribadi',type:'date',value:progress.personal_due_at},
      {name:'personal_notes',label:'Catatan peribadi',type:'textarea',value:progress.personal_notes}
    ],'Simpan kemajuan');
  } else if(action==='mark-pb') {
    const row=assignments.find(x=>x.assignment_id===id)||{}, students=(ctx.members||[]).filter(x=>x.role==='student');
    roleLabEditor('Rekod markah rasmi: '+(row.title||''),[
      {name:'studentUserId',label:'Pelajar',type:'select',required:true,options:roleLabSelectOptions(students,x=>x.userId,x=>(x.name||x.userId)+' · '+x.userId)},
      {name:'recordedMark',label:'Markah (%)',type:'number',min:0,max:100,required:true,value:0},{name:'feedback',label:'Maklum balas',type:'textarea'}
    ],'Simpan markah');
  } else if(action.includes('pb')) {
    const row=assignments.find(x=>x.assignment_id===id)||{};
    roleLabEditor(id?'Kemaskini PB':'Cipta Penilaian Berterusan',[
      ...(!id?subjectFields:[]),{name:'title',label:'Tajuk PB',required:true,value:row.title},{name:'assignmentCode',label:'Kod PB',value:row.assignment_code},
      {name:'assignmentType',label:'Jenis tugasan',value:row.assignment_type},{name:'marksPercentage',label:'Pemberat (%)',type:'number',min:0,max:100,value:row.marks_percentage||0},
      {name:'startDate',label:'Tarikh mula',type:'date',value:row.start_date},{name:'dueAt',label:'Tarikh hantar',type:'date',value:row.due_at},
      {name:'submissionMethod',label:'Kaedah penghantaran',value:row.submission_method},{name:'description',label:'Arahan tugasan',type:'textarea',value:row.description}
    ],id?'Simpan perubahan':'Terbitkan PB');
  } else if(action.includes('resource')) {
    const row=resources.find(x=>x.resource_id===id)||{};
    roleLabEditor(id?'Kemaskini sumber':'Tambah sumber pembelajaran',[
      ...(!id?subjectFields:[]),{name:'resourceName',label:'Nama sumber',required:true,value:row.resource_name},
      {name:'url',label:'URL HTTPS',value:row.storage_file_id,required:!id},{name:'description',label:'Penerangan',type:'textarea',value:row.description}
    ],id?'Simpan sumber':'Tambah sumber');
  } else if(action.includes('event')) {
    const row=events.find(x=>x.event_id===id)||{};
    roleLabEditor(id?'Kemaskini acara kalendar':'Tambah acara kalendar',[
      {name:'title',label:'Nama acara',required:true,value:row.title},{name:'eventCategory',label:'Kategori',value:row.event_category||'academic'},
      {name:'startAt',label:'Tarikh / masa mula',type:'datetime-local',required:true,value:row.start_at},{name:'endAt',label:'Tarikh / masa tamat',type:'datetime-local',value:row.end_at},
      {name:'description',label:'Penerangan',type:'textarea',value:row.description}
    ],id?'Simpan acara':'Tambah acara');
  }
}
function roleLabExportReport() {
  const ctx=roleTestContextData||{}, rows=[['Jenis','Nama','Status / Tarikh']];
  (ctx.sessions||[]).forEach(x=>rows.push(['Jadual',x.session_date+' '+x.start_time,x.verification_status||x.status]));
  (ctx.assignments||[]).forEach(x=>rows.push(['PB',x.title,x.due_at]));
  (ctx.calendarEvents||[]).forEach(x=>rows.push(['Kalendar',x.title,x.start_at]));
  const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='MySemester-RoleTest-Report.csv';a.click();URL.revokeObjectURL(a.href);
}
async function stopActiveRoleTest(returnToAdmin=true) {
  if(!activeRoleTest) return;
  const old=activeRoleTest;
  try { await api('stopRoleTest',{sessionId:old.sessionId}); }
  catch(error) { console.warn('Unable to close role test session:',error); }
  let closedLogs=[];
  if(returnToAdmin) {
    try { const history=await api('roleTestStatus',{sessionId:old.sessionId}); closedLogs=history.logs||[]; }
    catch(error) { console.warn('Unable to load closed test audit:',error); }
  }
  activeRoleTest=null;roleTestContextData=null;activeTestSemesterId=null;
  currentUser=authenticatedUser;
  if(returnToAdmin) {
    show('#filterToolbar',true);show('#previewTestConsole',false);
    show('#studentView',false);show('#adminView',true);
    $('#admin-panel-preview').classList.remove('hidden');
    document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab==='preview'));
    document.querySelectorAll('.admin-tab-panel').forEach(p=>p.classList.toggle('hidden',p.id!=='admin-panel-preview'));
    $('#roleTestHistory').innerHTML=closedLogs.map(log=>`<div class="test-audit-item"><strong>${escapeHtml(log.role)} / ${escapeHtml(log.action)}</strong> — ${escapeHtml(log.result)}<small>${escapeHtml(log.created_at||'')}</small></div>`).join('')||'Sesi ujian ditamatkan. Tiada log tambahan.';
    await loadAdminDashboard();
  }
}
async function loadRoleTestHistory() {
  const target=$('#roleTestHistory');
  if(!target) return;
  try {
    const result=await api('listRoleTestSessions',{});
    target.innerHTML=(result.items||[]).map(item=>`
      <div class="test-audit-item">
        <strong>${escapeHtml(item.role.toUpperCase())}</strong> · ${escapeHtml(item.status)}
        <small>${escapeHtml(item.test_user_id)} · ${escapeHtml(item.created_at||'')} · Tamat: ${escapeHtml(item.expires_at||'')}</small>
        <div class="test-actions">
          <button type="button" class="btn btn-light btn-small" data-test-history="${escapeHtml(item.session_id)}">Lihat log</button>
          ${item.status==='active'?`<button type="button" class="btn btn-light btn-small" data-close-test-session="${escapeHtml(item.session_id)}">Tamatkan sesi</button>`:''}
          <button type="button" class="btn btn-light btn-small" data-clear-history-sandbox="${escapeHtml(item.session_id)}">Kosongkan sandbox</button>
        </div>
      </div>`).join('')||'Belum ada sesi ujian.';
  } catch(error) { target.textContent='Gagal memuatkan sejarah ujian: '+error.message; }
}
$('#roleTestHistory')?.addEventListener('click',async e=>{
  if(e.target.closest('[data-test-history-back]')) { loadRoleTestHistory(); return; }
  const closeButton=e.target.closest('[data-close-test-session]');
  if(closeButton) {
    if(!confirm('Tamatkan akaun ujian sementara ini?')) return;
    try { await api('stopRoleTest',{sessionId:closeButton.dataset.closeTestSession}); await loadRoleTestHistory(); }
    catch(error) { $('#matrixMessage').textContent=error.message; }
    return;
  }
  const clearButton=e.target.closest('[data-clear-history-sandbox]');
  if(clearButton) {
    if(!confirm('Padam semua rekod sandbox untuk sesi ini? Log audit akan dikekalkan.')) return;
    try { const result=await api('clearRoleTestData',{sessionId:clearButton.dataset.clearHistorySandbox}); $('#matrixMessage').textContent=result.message; await loadRoleTestHistory(); }
    catch(error) { $('#matrixMessage').textContent=error.message; }
    return;
  }
  const button=e.target.closest('[data-test-history]');
  if(!button) return;
  try {
    const result=await api('roleTestStatus',{sessionId:button.dataset.testHistory});
    $('#roleTestHistory').innerHTML=`<button type="button" class="btn btn-light btn-small" data-test-history-back>← Kembali ke senarai sesi</button>`+
      ((result.logs||[]).map(log=>`<div class="test-audit-item"><strong>${escapeHtml(log.role)} / ${escapeHtml(log.action)}</strong> — ${escapeHtml(log.result)}<small>${escapeHtml(log.created_at||'')} · ${escapeHtml(log.entity_type||'')} ${escapeHtml(log.entity_id||'')}</small></div>`).join('')||'<p>Tiada log untuk sesi ini.</p>');
    $('#matrixMessage').textContent='Memaparkan log bagi sesi '+button.dataset.testHistory;
  } catch(error) { $('#matrixMessage').textContent=error.message; }
});

async function refreshRoleTestAudit() {
  if(!activeRoleTest) return;
  try {
    const result=await api('roleTestStatus',{sessionId:activeRoleTest.sessionId});
    const auditHtml=(result.logs||[]).map(log=>`<div class="test-audit-item"><strong>${escapeHtml(log.role||activeRoleTest.role)} / ${escapeHtml(log.action)}</strong> — ${escapeHtml(log.result)}<small>${escapeHtml(log.created_at||'')} • ${escapeHtml(log.entity_type||'')} ${escapeHtml(log.entity_id||'')}</small></div>`).join('')||'Belum ada aktiviti.';
    $('#previewTestAudit').innerHTML=auditHtml;
    if($('#roleLabAudit')) $('#roleLabAudit').innerHTML=auditHtml;
    $('#roleTestHistory').innerHTML=(result.logs||[]).slice(0,12).map(log=>`<div class="test-audit-item"><strong>${escapeHtml(log.role)} / ${escapeHtml(log.action)}</strong> — ${escapeHtml(log.result)}<small>${escapeHtml(log.created_at||'')}</small></div>`).join('')||'Belum ada sejarah ujian.';
  } catch(error) { $('#previewTestAudit').textContent=error.message; }
}
function testPayloadExample(action) {
  const ctx=roleTestContextData||{};
  const sem=(ctx.semesters||[]).find(x=>x.semester_id===activeTestSemesterId)||(ctx.semesters||[])[0]||{};
  const ss=(ctx.semesterSubjects||[]).find(x=>x.semester_id===sem.semester_id)||(ctx.semesterSubjects||[])[0]||{};
  const session=(ctx.sessions||[])[0]||{};
  const assignment=(ctx.assignments||[])[0]||{};
  const resource=(ctx.resources||[])[0]||{};
  const event=(ctx.calendarEvents||[])[0]||{};
  const member=(ctx.members||[]).find(x=>x.role==='student') || (ctx.members||[])[0] || {};
  const commonClass={classId:activeRoleTest?.classId||''};
  const examples={
    roleTestContext:{},
    listSchedules:{...commonClass,semesterId:sem.semester_id||''},
    createScheduleSession:{semesterSubjectId:ss.semester_subject_id||'GANTIKAN_SEMESTER_SUBJECT_ID',sessionDate:'2026-11-25',startTime:'09:00',endTime:'11:00',room:'Bilik Ujian',deliveryMode:'Bersemuka',sessionType:'Kuliah'},
    updateSchedule:{sessionId:session.session_id||'GANTIKAN_SESSION_ID',changes:{room:'Bilik Ujian MySemester'},reason:'Ujian akaun sementara'},
    verifySchedule:{sessionId:session.session_id||'GANTIKAN_SESSION_ID',status:'VERIFIED',comment:'Ujian pengesahan'},
    listAssignments:{...commonClass,semesterId:sem.semester_id||''},
    createAssignment:{semesterSubjectId:ss.semester_subject_id||'GANTIKAN_SEMESTER_SUBJECT_ID',title:'PB Ujian MySemester',assignmentType:'Penulisan',marksPercentage:10,description:'Rekod sandbox ujian'},
    updateProgress:{assignmentId:assignment.assignment_id||'GANTIKAN_ASSIGNMENT_ID',progress:{progress_status:'in_progress',progress_percentage:25,personal_notes:'Ujian kemajuan akaun sementara'}},
    listResources:{...commonClass,semesterSubjectId:ss.semester_subject_id||''},
    createCalendarEvent:{semesterId:sem.semester_id||'GANTIKAN_SEMESTER_ID',title:'Acara Ujian MySemester',eventCategory:'Ujian',startAt:'2026-11-20T09:00:00',endAt:'2026-11-20T10:00:00'},
    createSemester:{...commonClass,semesterName:'Semester Ujian Sandbox',academicSession:'Ujian',semesterNumber:(semestersCount(ctx)+1)},
    activateClass:{...commonClass},
    updateAssignment:{assignmentId:assignment.assignment_id||'GANTIKAN_ASSIGNMENT_ID',changes:{title:'PB Ujian Dikemas Kini',description:'Ujian kemas kini PB'}},
    recordAssignmentMark:{assignmentId:assignment.assignment_id||'GANTIKAN_ASSIGNMENT_ID',studentUserId:member.userId||'GANTIKAN_STUDENT_USER_ID',recordedMark:85,feedback:'Markah ujian sandbox'},
    createResourceLink:{semesterSubjectId:ss.semester_subject_id||'GANTIKAN_SEMESTER_SUBJECT_ID',resourceName:'Nota Ujian',url:'https://example.com/nota-ujian',description:'Pautan ujian sandbox'},
    updateResource:{resourceId:resource.resource_id||'GANTIKAN_RESOURCE_ID',changes:{resource_name:'Nota Ujian Dikemas Kini',description:'Ujian metadata'}},
    updateCalendarEvent:{eventId:event.event_id||'GANTIKAN_EVENT_ID',changes:{title:'Acara Ujian Dikemas Kini',description:'Ujian kalendar'}},
    listClassMembers:{...commonClass},
    manageClassMemberRole:{...commonClass,targetUserId:member.userId||'GANTIKAN_USER_ID',memberRole:'student'},
    classReport:{...commonClass},
    createClassNotification:{...commonClass,title:'Notifikasi Ujian',message:'Ini notifikasi sandbox ujian.',notificationType:'announcement'}
  };
  return JSON.stringify(examples[action]||{},null,2);
}
function semestersCount(ctx){return (ctx.semesters||[]).length;}
$('#matrixSaveBtn')?.addEventListener('click',savePermissionMatrix);
$('#matrixReloadBtn')?.addEventListener('click',loadRolePreviewConfig);
$('#startPreviewBtn')?.addEventListener('click',()=>startRolePreview());
$('#previewThisClassBtn')?.addEventListener('click',()=>{
  populatePreviewClasses();
  if(selectedAdminClassId) $('#previewClass').value=selectedAdminClassId;
  navigateTo('preview');
});
$('#previewRoleSwitch')?.addEventListener('change',e=>startRolePreview(e.target.value));
$('#semesterSwitch')?.addEventListener('change',e=>{activeTestSemesterId=e.target.value;renderRoleTestWorkspace();});
$('#exitPreviewBtn')?.addEventListener('click',()=>stopActiveRoleTest(true));
$('#previewTestAction')?.addEventListener('change',e=>{$('#previewTestPayload').value=testPayloadExample(e.target.value);});
$('#fillTestPayloadBtn')?.addEventListener('click',()=>{$('#previewTestPayload').value=testPayloadExample($('#previewTestAction').value);});
$('#runPreviewTestBtn')?.addEventListener('click',async()=>{
  if(!activeRoleTest) return;
  let data;
  try { data=JSON.parse($('#previewTestPayload').value||'{}'); }
  catch(error) { $('#previewTestResult').textContent='JSON tidak sah: '+error.message;return; }
  const action=$('#previewTestAction').value;
  $('#previewTestResult').textContent='Menjalankan '+action+' sebagai '+activeRoleTest.role+'...';
  try {
    const result=await api(action,data,activeRoleTest.token);
    $('#previewTestOutput').textContent=JSON.stringify(result,null,2);
    $('#previewTestResult').textContent='Ujian berjaya. Sebarang perubahan direkodkan dalam sandbox sesi ini.';
    await loadRoleTestContext();
  } catch(error) {
    $('#previewTestOutput').textContent=error.stack||error.message;
    $('#previewTestResult').textContent='Ujian ditolak / gagal: '+error.message;
    await refreshRoleTestAudit();
  }
});
$('#clearTestSandboxBtn')?.addEventListener('click',async()=>{
  if(!activeRoleTest || !confirm('Kosongkan semua perubahan sandbox bagi sesi ini? Data produksi tidak terjejas.')) return;
  try {
    const result=await api('clearRoleTestData',{sessionId:activeRoleTest.sessionId});
    $('#previewTestResult').textContent=result.message;
    $('#previewTestOutput').textContent='Sandbox dikosongkan.';
    await loadRoleTestContext();
  } catch(error) { $('#previewTestResult').textContent=error.message; }
});
$('#refreshTestAuditBtn')?.addEventListener('click',refreshRoleTestAudit);


/* Role workspace forms: all writes use the active test-session token when previewing. */
function workspaceApi(action,data) {
  return api(action,data,activeRoleTest?.token||'');
}
$('#sessionForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const data={semesterSubjectId:$('#sessSubject').value,sessionDate:$('#sessDate').value,
    startTime:$('#sessStart').value,endTime:$('#sessEnd').value,room:$('#sessRoom').value,
    deliveryMode:$('#sessMode').value,sessionType:$('#sessType').value};
  $('#sessMsg').textContent='Menyimpan sesi jadual dalam '+(activeRoleTest?'sandbox ujian':'ruang kerja')+'...';
  try {
    const result=await workspaceApi('createScheduleSession',data);
    $('#sessMsg').textContent=result.message||'Sesi berjaya direkodkan.';
    e.target.reset();
    if(activeRoleTest) await loadRoleTestContext(); else await loadStudentWorkspace();
  } catch(error) { $('#sessMsg').textContent=error.message; }
});
$('#assignmentForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const data={semesterSubjectId:$('#pbSubject').value,title:$('#pbTitle').value.trim(),
    assignmentCode:$('#pbCode').value.trim(),assignmentType:$('#pbType').value.trim(),
    marksPercentage:Number($('#pbMarks').value||0),submissionMethod:$('#pbMethod').value.trim(),
    startDate:$('#pbStart').value,dueAt:$('#pbDue').value,description:$('#pbDesc').value};
  $('#pbMsg').textContent='Menerbitkan PB...';
  try {
    const result=await workspaceApi('createAssignment',data);
    $('#pbMsg').textContent=result.message||'PB berjaya diterbitkan.';
    e.target.reset();
    if(activeRoleTest) await loadRoleTestContext(); else await loadStudentWorkspace();
  } catch(error) { $('#pbMsg').textContent=error.message; }
});
$('#eventForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const testSemester=(roleTestContextData?.semesters||[]).find(x=>x.semester_id===activeTestSemesterId)||(roleTestContextData?.semesters||[])[0];
  const semId=activeRoleTest?testSemester?.semester_id:($('#filterSemesterSelect')?.value||'');
  if(!semId) { $('#evMsg').textContent='Tiada semester tersedia untuk acara ini.';return; }
  const data={semesterId:semId,semesterSubjectId:$('#evSubject').value||'',
    title:$('#evTitle').value.trim(),eventCategory:$('#evCategory').value,
    startAt:$('#evStart').value,endAt:$('#evEnd').value,description:$('#evDesc').value};
  $('#evMsg').textContent='Menyimpan acara kalendar...';
  try {
    const result=await workspaceApi('createCalendarEvent',data);
    $('#evMsg').textContent=result.message||'Acara berjaya ditambah.';
    e.target.reset();
    if(activeRoleTest) await loadRoleTestContext(); else await loadStudentWorkspace();
  } catch(error) { $('#evMsg').textContent=error.message; }
});


/* Interactive CRUD controls in the temporary role workspace. */
$('#roleLabNav')?.addEventListener('click',e=>{
  const tab=e.target.closest('[data-role-tab]'); if(!tab) return;
  activeRoleLabTab=tab.dataset.roleTab; renderRoleLabWorkspace();
});
$('#roleLabStudentOfferings')?.addEventListener('click',async e=>{
  const button=e.target.closest('[data-save-role-student-offering]');
  if(!button||!activeRoleTest) return;
  const subjectId=button.dataset.saveRoleStudentOffering;
  const select=$(`[data-role-student-offering="${CSS.escape(subjectId)}"]`);
  button.disabled=true;
  try {
    const result=await api('selectStudentSubjectOffering',{
      semesterId:activeTestSemesterId,subjectId,semesterSubjectId:select?.value||''
    },activeRoleTest.token);
    await loadRoleTestContext();
    showToast(result.message||'Pilihan ujian disimpan.');
  } catch(error) {
    showToast('Gagal menyimpan pilihan ujian: '+error.message,'error');
  } finally { button.disabled=false; }
});
$('#roleLabContent')?.addEventListener('input',e=>{
  const isRoleSearch=e.target.id==='roleLabSearch';
  const isCalendarSearch=e.target.dataset.calendarSearch==='role';
  if(!isRoleSearch&&!isCalendarSearch) return;
  const state=roleLabListState[activeRoleLabTab];
  if(!state) return;
  const input=e.target, start=input.selectionStart, end=input.selectionEnd;
  state.query=input.value;
  state.page=1;
  renderRoleLabWorkspace();
  const replacement=isRoleSearch?$('#roleLabSearch'):$('[data-calendar-search="role"]');
  replacement?.focus();
  replacement?.setSelectionRange(start,end);
});
$('#roleLabContent')?.addEventListener('change',e=>{
  if(e.target.id==='roleLabSemester') {
    activeTestSemesterId=e.target.value;
    Object.values(roleLabListState).forEach(state=>{state.page=1;});
    renderRoleLabWorkspace();
  }
  if(e.target.id==='roleLabFilter') {
    const state=roleLabListState[activeRoleLabTab];
    if(state) {state.filter=e.target.value;state.page=1;renderRoleLabWorkspace();}
  }
  if(e.target.dataset.calendarFilter==='role') {
    const state=roleLabListState.schedule;
    if(state) {state.subject=e.target.value;renderRoleLabWorkspace();}
  }
});
$('#roleLabRefreshBtn')?.addEventListener('click',async()=>{await loadRoleTestContext();});
$('#roleLabAuditRefreshBtn')?.addEventListener('click',refreshRoleTestAudit);
$('#roleLabContent')?.addEventListener('click',async e=>{
  const calendarNav=e.target.closest('[data-calendar-nav][data-calendar-scope="role"]');
  if(calendarNav) {
    if(calendarNav.dataset.calendarNav==='today') roleLabCalendarDate=new Date();
    else roleLabCalendarDate.setDate(roleLabCalendarDate.getDate()+(calendarNav.dataset.calendarNav==='next'?7:-7));
    renderRoleLabWorkspace();
    return;
  }
  const pageButton=e.target.closest('[data-role-page]');
  if(pageButton) {
    const state=roleLabListState[activeRoleLabTab];
    if(state) {state.page+=Number(pageButton.dataset.rolePage);renderRoleLabWorkspace();}
    return;
  }
  const btn=e.target.closest('[data-role-action]'); if(!btn) return;
  const action=btn.dataset.roleAction,id=btn.dataset.id;
  if(action==='save-subject-staff') {
    const fields=Array.from(document.querySelectorAll(`[data-semester-subject="${CSS.escape(id)}"]`));
    const lecturerUserId=fields.find(field=>field.dataset.subjectStaff==='lecturerUserId')?.value||'';
    const picUserId=fields.find(field=>field.dataset.subjectStaff==='picUserId')?.value||'';
    try {
      await workspaceApi('assignSemesterSubjectStaff',{semesterSubjectId:id,lecturerUserId,picUserId});
      await loadRoleTestContext();
      showToast('Penetapan pensyarah dan PIC disimpan.');
    } catch(error) { showToast('Gagal menyimpan penetapan: '+error.message,'error'); }
    return;
  }
  if(action==='close-editor') { $('#roleLabEditor').innerHTML='';roleLabEditing=null;return; }
  if(['new-schedule','edit-schedule','new-pb','edit-pb','progress-pb','mark-pb','new-resource','edit-resource','new-event','edit-event'].includes(action)) {
    roleLabOpenEditor(action,id); return;
  }
  if(action==='verify-schedule') {
    const comment=prompt('Catatan pengesahan (pilihan):','Disemak dalam sesi ujian');
    if(comment===null) return;
    try { await workspaceApi('verifySchedule',{sessionId:id,status:'VERIFIED',comment}); await loadRoleTestContext(); }
    catch(err){alert(err.message);} return;
  }
  if(['delete-schedule','delete-pb','delete-resource','delete-event'].includes(action)) {
    if(!confirm('Arkibkan rekod ini dalam sandbox sesi ujian?')) return;
    const map={'delete-schedule':['deleteSchedule',{sessionId:id}],'delete-pb':['deleteAssignment',{assignmentId:id}],
      'delete-resource':['deleteResource',{resourceId:id}],'delete-event':['deleteCalendarEvent',{eventId:id}]};
    try { const [apiAction,data]=map[action]; await workspaceApi(apiAction,data); await loadRoleTestContext(); }
    catch(err){alert(err.message);} return;
  }
  if(action==='save-member-role') {
    const select=document.querySelector(`[data-member-role="${CSS.escape(id)}"]`);
    try { await workspaceApi('manageClassMemberRole',{classId:activeRoleTest.classId,targetUserId:id,memberRole:select.value}); await loadRoleTestContext(); }
    catch(err){alert(err.message);} return;
  }
  if(action==='activate-class') {
    if(!confirm('Aktifkan kelas ini dalam sandbox sesi ujian?')) return;
    try { await workspaceApi('activateClass',{classId:activeRoleTest.classId}); await loadRoleTestContext(); alert('Permintaan pengaktifan berjaya diproses.'); }
    catch(err){alert(err.message);} return;
  }
  if(action==='export-report') { roleLabExportReport(); return; }
});
$('#roleLabSandboxToggleBtn')?.addEventListener('click',async()=>{
  if(!activeRoleTest) return;
  const sandboxEnabled=activeRoleTest.sandboxEnabled===false;
  if(!sandboxEnabled) {
    const pending=Number(roleTestContextData?.sandboxOperations||0);
    const warning=pending
      ?`Tindakan ini mula menyimpan perubahan baharu terus ke database. ${pending} perubahan sandbox sedia ada tidak akan digabungkan dan kekal berasingan. Teruskan?`
      :'Tindakan ini mula menyimpan perubahan baharu terus ke database. Perubahan ini tidak boleh dibatalkan secara automatik. Teruskan?';
    if(!confirm(warning)) return;
  }
  const button=$('#roleLabSandboxToggleBtn');button.disabled=true;
  try {
    const result=await api('setRoleTestSandbox',{sessionId:activeRoleTest.sessionId,sandboxEnabled});
    activeRoleTest.sandboxEnabled=result.sandboxEnabled;
    await loadRoleTestContext();
    showToast(result.message||'Mod simpanan dikemas kini.');
  } catch(error) {
    showToast('Gagal mengubah mod sandbox: '+error.message,'error');
  } finally { button.disabled=false; }
});

$('#scheduleList')?.addEventListener('click',e=>{
  const button=e.target.closest('[data-calendar-nav][data-calendar-scope="global"]');
  if(!button) return;
  if(button.dataset.calendarNav==='today') scheduleCalendarDate=new Date();
  else scheduleCalendarDate.setDate(scheduleCalendarDate.getDate()+(button.dataset.calendarNav==='next'?7:-7));
  renderStudentWorkspace();
});
$('#scheduleList')?.addEventListener('input',e=>{
  if(e.target.dataset.calendarSearch!=='global') return;
  const input=e.target,start=input.selectionStart,end=input.selectionEnd;
  scheduleCalendarSearch=input.value;
  renderStudentWorkspace();
  const replacement=$('[data-calendar-search="global"]');replacement?.focus();replacement?.setSelectionRange(start,end);
});
$('#scheduleList')?.addEventListener('change',e=>{
  if(e.target.dataset.calendarFilter!=='global') return;
  scheduleCalendarSubject=e.target.value;renderStudentWorkspace();
});
$('#roleLabContent')?.addEventListener('submit',async e=>{
  if(e.target.id==='roleLabSubjectLinkForm') {
    e.preventDefault();
    const subjectId=new FormData(e.target).get('subjectId');
    const message=e.target.querySelector('button');
    if(message) message.disabled=true;
    try {
      await workspaceApi('linkSemesterSubject',{classId:activeRoleTest.classId,semesterId:activeTestSemesterId,subjectId});
      await loadRoleTestContext();
      showToast('Subjek dipautkan kepada semester ujian.');
    } catch(error) {
      if(message) message.disabled=false;
      showToast('Gagal memautkan subjek: '+error.message,'error');
    }
    return;
  }
  if(e.target.id==='roleLabSemesterForm') {
    e.preventDefault();const v=Object.fromEntries(new FormData(e.target).entries());
    try { await workspaceApi('createSemester',{classId:activeRoleTest.classId,semesterName:v.semesterName,academicSession:v.academicSession,semesterNumber:Number(v.semesterNumber),startDate:v.startDate,endDate:v.endDate});
      $('#roleLabSemesterMessage').textContent='Semester berjaya dicipta dalam sandbox.';await loadRoleTestContext(); }
    catch(err){$('#roleLabSemesterMessage').textContent=err.message;} return;
  }
  if(e.target.id==='roleLabNotificationForm') {
    e.preventDefault();const v=Object.fromEntries(new FormData(e.target).entries());
    try { await workspaceApi('createClassNotification',{classId:activeRoleTest.classId,title:v.title,message:v.message,notificationType:'role_test'});
      $('#roleLabNotificationMessage').textContent='Hebahan ujian direkodkan dalam sandbox.';e.target.reset();await loadRoleTestContext(); }
    catch(err){$('#roleLabNotificationMessage').textContent=err.message;} return;
  }
  if(e.target.id!=='roleLabCrudForm') return;
  e.preventDefault();
  if(!activeRoleTest || !roleLabEditing) return;
  const v=Object.fromEntries(new FormData(e.target).entries()), editing=roleLabEditing;
  const send=(action,data)=>workspaceApi(action,data);
  const message=$('#roleLabFormMessage'); if(message) message.textContent='Menyimpan perubahan sandbox...';
  try {
    if(editing.action.includes('schedule')) {
      if(editing.id) await send('updateSchedule',{sessionId:editing.id,changes:{session_date:v.sessionDate,start_time:v.startTime,end_time:v.endTime,room:v.room,delivery_mode:v.deliveryMode,session_type:v.sessionType},reason:v.reason});
      else await send('createScheduleSession',{semesterSubjectId:v.semesterSubjectId,sessionDate:v.sessionDate,startTime:v.startTime,endTime:v.endTime,room:v.room,deliveryMode:v.deliveryMode,sessionType:v.sessionType});
    } else if(editing.action==='progress-pb') {
      await send('updateProgress',{assignmentId:editing.id,progress:{progress_status:v.progress_status,progress_percentage:Number(v.progress_percentage),personal_due_at:v.personal_due_at,personal_notes:v.personal_notes}});
    } else if(editing.action==='mark-pb') {
      await send('recordAssignmentMark',{assignmentId:editing.id,studentUserId:v.studentUserId,recordedMark:Number(v.recordedMark),feedback:v.feedback});
    } else if(editing.action.includes('pb')) {
      if(editing.id) await send('updateAssignment',{assignmentId:editing.id,changes:{title:v.title,assignment_code:v.assignmentCode,assignment_type:v.assignmentType,marks_percentage:Number(v.marksPercentage),start_date:v.startDate,due_at:v.dueAt,submission_method:v.submissionMethod,description:v.description}});
      else await send('createAssignment',{semesterSubjectId:v.semesterSubjectId,title:v.title,assignmentCode:v.assignmentCode,assignmentType:v.assignmentType,marksPercentage:Number(v.marksPercentage),startDate:v.startDate,dueAt:v.dueAt,submissionMethod:v.submissionMethod,description:v.description});
    } else if(editing.action.includes('resource')) {
      if(editing.id) await send('updateResource',{resourceId:editing.id,changes:{resource_name:v.resourceName,storage_file_id:v.url,description:v.description}});
      else await send('createResourceLink',{semesterSubjectId:v.semesterSubjectId,resourceName:v.resourceName,url:v.url,description:v.description});
    } else if(editing.action.includes('event')) {
      if(editing.id) await send('updateCalendarEvent',{eventId:editing.id,changes:{title:v.title,event_category:v.eventCategory,start_at:v.startAt,end_at:v.endAt,description:v.description}});
      else {
        const sem=(roleTestContextData?.semesters||[]).find(x=>x.semester_id===activeTestSemesterId);
        await send('createCalendarEvent',{semesterId:sem?.semester_id,title:v.title,eventCategory:v.eventCategory,startAt:v.startAt,endAt:v.endAt,description:v.description});
      }
    }
    roleLabEditing=null;
    await loadRoleTestContext();
    const editor=$('#roleLabEditor'); if(editor) editor.innerHTML='<div class="role-lab-success">Perubahan berjaya disimpan dalam sandbox sesi ujian.</div>';
  } catch(err) { if(message) message.textContent='Tidak berjaya: '+err.message; }
});

/* ---------------- STUDENT WORKSPACE ---------------- */
$('#joinBtn').addEventListener('click',async()=>{
  const code=$('#inviteCode').value.trim();
  $('#joinMessage').textContent='Memproses...';
  try{
    const result=await api('joinClass',{inviteCode:code});
    $('#joinMessage').textContent=result.message||'Kelas berjaya disertai.';
    const bootstrap=await api('bootstrap',{});
    await completeLogin(bootstrap);
  }
  catch(error){$('#joinMessage').textContent=error.message;}
});
document.querySelectorAll('.student-tab').forEach(button=>{
  button.addEventListener('click',()=>{
    document.querySelectorAll('.student-tab').forEach(item=>item.classList.toggle('active',item===button));
    document.querySelectorAll('.student-tab-content').forEach(item=>item.classList.add('hidden'));
    $('#student-tab-'+button.dataset.tab).classList.remove('hidden');
  });
});

async function logoutMySemester(){
  if(activeRoleTest) {
    const old=activeRoleTest;
    try { await api('stopRoleTest',{sessionId:old.sessionId}); } catch(error) { console.warn('Unable to close test session:',error); }
    activeRoleTest=null;
  }
  if(devToken) { try { await api('devLogout',{}); } catch(error) { console.warn('Unable to revoke development session:',error); } }
  idToken=null;devToken=null;currentUser=null;authenticatedUser=null;currentClass=null;adminData=null;
  isSystemAdminCurrent=false;
  roleTestContextData=null;activeTestSemesterId=null;workspaceData=null;
  show('#appView',false);show('#loginView',true);
  show('#studentView',false);show('#adminView',false);
  setNavigationAvailability(false,false,false);
  navigateTo('overview');
  if(window.google?.accounts?.id)google.accounts.id.disableAutoSelect();
}
async function refreshCurrentWorkspace() {
  if(activeRoleTest) return loadRoleTestContext();
  if(isSystemAdminCurrent) return loadAdminDashboard();
  return loadStudentWorkspace();
}
$('#logoutBtn').addEventListener('click',logoutMySemester);
$('#logoutBtnStudent').addEventListener('click',logoutMySemester);
$('#refreshAdminBtn').addEventListener('click',refreshCurrentWorkspace);
$('#clearCacheBtn')?.addEventListener('click',async()=>{
  const btn=$('#clearCacheBtn');
  btn.disabled=true;btn.textContent='Mengosongkan...';
  try {
    if('caches' in window) {
      const cacheNames=await caches.keys();
      await Promise.all(cacheNames.filter(name=>name.startsWith('mysemester-admin-')).map(name=>caches.delete(name)));
    }
    const r=await api('clearCache',{});
    showToast(r.message||'Cache berjaya dikosongkan.');
    await refreshCurrentWorkspace();
  } catch(err) {
    showToast('Gagal mengosongkan cache: '+err.message,true);
  } finally {
    btn.disabled=false;btn.textContent='Kosongkan cache';
  }
});
