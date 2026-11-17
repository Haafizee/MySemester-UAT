/**
 * MySemester Apps Script API
 * Deploy as Web App: Execute as Me; Who has access: Anyone.
 * Required Script Properties:
 * SPREADSHEET_ID, GOOGLE_CLIENT_ID, ADMIN_EMAIL
 * Time zone: Asia/Kuala_Lumpur
 */
const SYSTEM_ADMIN_EMAIL = 'mohamadhaafizee@gmail.com';
// Origin (scheme + host only, NO path) of the GitHub Pages site that receives the reply.
const ALLOWED_PARENT_ORIGIN = 'https://haafizee.github.io';

const APP = {
  TZ: 'Asia/Kuala_Lumpur',
  SHEETS: {
    Users:['user_id','google_sub','email','full_name','photo_url','account_status','created_at','last_login'],
    Roles:['role_id','role_name','description'],
    UserRoles:['user_role_id','user_id','role_id','class_id','semester_id','assigned_by','created_at'],
    Classes:['class_id','class_name','class_code','programme','institution','cohort','description','created_by','status','created_at','semester_limit'],
    ClassMembers:['membership_id','class_id','user_id','member_role','membership_status','joined_at','approved_by'],
    ClassInvitations:['invitation_id','class_id','invite_code','expires_at','max_uses','uses_count','status','created_by','created_at'],
    Semesters:['semester_id','class_id','semester_name','academic_session','semester_number','start_date','end_date','status','created_at'],
    Subjects:['subject_id','subject_code','subject_name','credit_hour','description','created_at'],
    SemesterSubjects:['semester_subject_id','semester_id','subject_id','lecturer_user_id','subject_color','status','pic_user_id','offering_name'],
    LecturerDirectory:['registration_id','class_id','full_name','email','status','linked_user_id','registered_by','created_at','updated_at'],
    StudentSemesterSubjects:['selection_id','user_id','semester_id','subject_id','semester_subject_id','status','selected_at'],
    ScheduleSeries:['series_id','semester_subject_id','day_of_week','start_time','end_time','room','delivery_mode','recurrence_start','recurrence_end','status','created_by'],
    ClassSessions:['session_id','semester_subject_id','series_id','session_date','start_time','end_time','room','lecturer_user_id','delivery_mode','session_type','status','version','verification_status','updated_by','updated_at'],
    ScheduleChangeRequests:['request_id','session_id','requested_by','request_type','proposed_data_json','reason','approval_status','reviewed_by','reviewed_at','created_at'],
    ScheduleHistory:['history_id','session_id','version','previous_data_json','updated_data_json','change_reason','verification_status','changed_by','verified_by','changed_at'],
    Assignments:['assignment_id','semester_subject_id','assignment_code','title','assignment_type','description','marks_percentage','start_date','due_at','submission_method','submission_format_json','status','created_by','published_at','updated_at'],
    AssignmentResources:['assignment_resource_id','assignment_id','resource_id','resource_role','display_order'],
    AssignmentHistory:['history_id','assignment_id','old_data_json','new_data_json','change_reason','changed_by','changed_at'],
    StudentAssignmentProgress:['progress_id','assignment_id','user_id','progress_status','progress_percentage','personal_due_at','personal_notes','actual_completed_at','recorded_mark','updated_at'],
    AssignmentChecklists:['checklist_id','assignment_id','user_id','title','is_completed','due_at','sort_order','created_at'],
    SubmissionRecords:['submission_id','assignment_id','user_id','resource_id','submitted_at','submission_status','lecturer_feedback','recorded_mark'],
    Folders:['folder_id','semester_id','semester_subject_id','parent_folder_id','folder_name','created_by','visibility','created_at'],
    Resources:['resource_id','folder_id','semester_subject_id','assignment_id','uploaded_by','resource_name','resource_type','storage_provider','storage_file_id','mime_type','file_size','description','visibility','created_at'],
    CalendarEvents:['event_id','semester_id','semester_subject_id','title','event_category','description','start_at','end_at','source_type','source_id','visibility','created_by','updated_at'],
    Notifications:['notification_id','user_id','class_id','title','message','notification_type','reference_type','reference_id','is_read','created_at','read_at'],
    NotificationPreferences:['preference_id','user_id','reminder_days_json','push_enabled','email_enabled','updated_at'],
    PushSubscriptions:['subscription_id','user_id','endpoint','keys_json','created_at','updated_at'],
    PersonalTasks:['task_id','user_id','semester_id','semester_subject_id','title','description','due_at','status','priority','created_at','updated_at'],
    PersonalNotes:['note_id','user_id','semester_id','semester_subject_id','title','content','created_at','updated_at'],
    AuditLogs:['log_id','user_id','action','entity_type','entity_id','old_data_json','new_data_json','created_at'],
    PermissionMatrix:['role','permission_id','enabled','updated_by','updated_at'],
    RoleTestSessions:['session_id','token_hash','admin_user_id','class_id','role','test_user_id','test_email','status','expires_at','created_at','closed_at','sandbox_enabled'],
    RoleTestAccounts:['test_user_id','session_id','admin_user_id','class_id','role','display_name','email','status','created_at','expires_at'],
    RoleTestData:['session_id','sheet_name','operation','record_id','row_json','patch_json','created_at'],
    RoleTestAudit:['audit_id','session_id','admin_user_id','test_user_id','role','action','entity_type','entity_id','result','created_at']
  }
};

const ROLE_PERMISSION_DEFS = [
  {id:'class.activate',label:'Aktifkan kelas',group:'Pengurusan Kelas',description:'Aktifkan kelas selepas konfigurasi semester dipenuhi.',implemented:true},
  {id:'class.view',label:'Lihat ruang kerja kelas',group:'Umum',description:'Akses dashboard dan maklumat kelas.',implemented:true},
  {id:'semester.view',label:'Lihat semester dan subjek',group:'Akademik',description:'Lihat semester, subjek dan maklumat pensyarah.',implemented:true},
  {id:'semester.manage',label:'Urus semester',group:'Akademik',description:'Tambah atau kemas kini semester kelas.',implemented:true},
  {id:'subject.offerings.manage',label:'Urus tawaran subjek',group:'Akademik',description:'Cipta tawaran subjek dan tetapkan pensyarah, PIC serta kumpulan.',implemented:true},
  {id:'schedule.view',label:'Lihat jadual kelas',group:'Jadual',description:'Lihat sesi dan perubahan jadual.',implemented:true},
  {id:'schedule.edit',label:'Cadang / kemas kini jadual',group:'Jadual',description:'Rekod pindaan jadual; pindaan kekal tertakluk kepada pengesahan.',implemented:true},
  {id:'schedule.verify',label:'Sahkan perubahan jadual',group:'Jadual',description:'Sahkan atau tolak perubahan jadual.',implemented:true},
  {id:'schedule.delete',label:'Arkibkan sesi jadual',group:'Jadual',description:'Arkibkan sesi jadual tanpa memadam sejarah.',implemented:true},
  {id:'pb.view',label:'Lihat Penilaian Berterusan',group:'Penilaian Berterusan',description:'Lihat PB dan arahan tugasan.',implemented:true},
  {id:'pb.create',label:'Cipta / terbitkan PB',group:'Penilaian Berterusan',description:'Cipta dan terbitkan tugasan PB.',implemented:true},
  {id:'pb.edit',label:'Ubah PB',group:'Penilaian Berterusan',description:'Ubah butiran PB yang diterbitkan.',implemented:true},
  {id:'pb.delete',label:'Arkibkan PB',group:'Penilaian Berterusan',description:'Arkibkan tugasan tanpa memadam sejarah dan markah.',implemented:true},
  {id:'pb.progress.update',label:'Kemas kini kemajuan sendiri',group:'Penilaian Berterusan',description:'Ubah kemajuan tugasan akaun sendiri sahaja.',implemented:true},
  {id:'pb.marks.manage',label:'Rekod / kemas kini markah rasmi',group:'Penilaian Berterusan',description:'Rekod markah rasmi bagi pelajar dalam kelas.',implemented:true},
  {id:'resources.view',label:'Lihat nota dan sumber',group:'Sumber Pembelajaran',description:'Lihat bahan pembelajaran yang dibenarkan.',implemented:true},
  {id:'resources.manage',label:'Urus nota dan sumber',group:'Sumber Pembelajaran',description:'Urus pautan sumber pembelajaran (muat naik fail terus memerlukan storan awan).',implemented:true},
  {id:'resources.delete',label:'Arkibkan sumber',group:'Sumber Pembelajaran',description:'Arkibkan sumber pembelajaran kelas.',implemented:true},
  {id:'calendar.view',label:'Lihat kalendar dan tarikh penting',group:'Kalendar',description:'Lihat tarikh PB dan acara kelas.',implemented:true},
  {id:'calendar.create',label:'Tambah acara kalendar',group:'Kalendar',description:'Tambah tarikh penting kelas.',implemented:true},
  {id:'calendar.edit',label:'Ubah acara kalendar',group:'Kalendar',description:'Ubah acara kalendar sedia ada.',implemented:true},
  {id:'calendar.delete',label:'Arkibkan acara kalendar',group:'Kalendar',description:'Arkibkan acara tanpa memadam sejarah.',implemented:true},
  {id:'members.view',label:'Lihat ahli kelas',group:'Pengurusan Kelas',description:'Lihat senarai ahli kelas dan peranan.',implemented:true},
  {id:'members.roles.manage',label:'Urus peranan ahli kelas',group:'Pengurusan Kelas',description:'Tetapkan KO, PIC, pensyarah atau pelajar dalam kelas.',implemented:true},
  {id:'reports.view',label:'Lihat laporan dan pemantauan',group:'Pemantauan',description:'Lihat ringkasan aktiviti dan laporan kelas.',implemented:true},
  {id:'notifications.manage',label:'Urus notifikasi kelas',group:'Pemantauan',description:'Urus notifikasi dan hebahan kelas.',implemented:true}
];
const ROLE_PERMISSION_ROLES = ['student','pic','lecturer','ko','class_admin'];
const ROLE_PERMISSION_DEFAULTS = {
  student:['class.view','semester.view','schedule.view','pb.view','pb.progress.update','resources.view','calendar.view'],
  pic:['class.view','semester.view','schedule.view','schedule.edit','schedule.delete','pb.view','resources.view','calendar.view','calendar.create','members.view','reports.view'],
  lecturer:['class.view','semester.view','subject.offerings.manage','schedule.view','schedule.edit','schedule.verify','schedule.delete','pb.view','pb.create','pb.edit','pb.delete','pb.marks.manage','resources.view','resources.manage','resources.delete','calendar.view','calendar.create','calendar.edit','calendar.delete','members.view','reports.view'],
  ko:['class.view','semester.view','semester.manage','subject.offerings.manage','schedule.view','schedule.edit','schedule.verify','schedule.delete','pb.view','pb.create','pb.edit','pb.delete','resources.view','resources.manage','resources.delete','calendar.view','calendar.create','calendar.edit','calendar.delete','members.view','members.roles.manage','reports.view','notifications.manage'],
  class_admin:['class.activate','class.view','semester.view','semester.manage','subject.offerings.manage','schedule.view','schedule.edit','schedule.verify','schedule.delete','pb.view','pb.create','pb.edit','pb.delete','pb.marks.manage','resources.view','resources.manage','resources.delete','calendar.view','calendar.create','calendar.edit','calendar.delete','members.view','members.roles.manage','reports.view','notifications.manage']
};
const ACTION_PERMISSION = {
  listSchedules:'schedule.view',
  createScheduleSession:'schedule.edit',
  updateSchedule:'schedule.edit',
  deleteSchedule:'schedule.delete',
  verifySchedule:'schedule.verify',
  listAssignments:'pb.view',
  createAssignment:'pb.create',
  updateProgress:'pb.progress.update',
  listResources:'resources.view',
  listCalendarEvents:'calendar.view',
  createCalendarEvent:'calendar.create',
  createSemester:'semester.manage',
  linkSemesterSubject:'semester.manage',
  createSubjectOffering:'subject.offerings.manage',
  selectStudentSubjectOffering:'semester.view',
  assignSemesterSubjectStaff:'semester.manage',
  activateClass:'class.activate',
  updateAssignment:'pb.edit',
  deleteAssignment:'pb.delete',
  recordAssignmentMark:'pb.marks.manage',
  createResourceLink:'resources.manage',
  updateResource:'resources.manage',
  deleteResource:'resources.delete',
  updateCalendarEvent:'calendar.edit',
  deleteCalendarEvent:'calendar.delete',
  listClassMembers:'members.view',
  manageClassMemberRole:'members.roles.manage',
  classReport:'reports.view',
  createClassNotification:'notifications.manage'
};
let TEST_CONTEXT_ = null;

function doGet(e) {
  const out = {
    ok: true,
    service: 'MySemester API',
    version: '1.4-subject-offerings',
    timezone: APP.TZ,
    transport: 'iframe-postMessage'
  };
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function classRoleForUser_(userId,classId) {
  if(TEST_CONTEXT_&&userId===TEST_CONTEXT_.testUserId&&classId===TEST_CONTEXT_.classId) return TEST_CONTEXT_.role;
  const member=getRows_('ClassMembers').find(row=>row.user_id===userId&&row.class_id===classId&&row.membership_status==='active');
  return String(member?.member_role||'').toLowerCase();
}

/**
 * Receives the form POST from GitHub Pages and returns an HTML response
 * to the hidden iframe. The iframe posts the result to its parent page.
 * This removes the fragile JSONP polling request that was returning HTTP 403.
 */
function doPost(e) {
  let requestId = '';
  let result;
  let targetOrigin = ALLOWED_PARENT_ORIGIN;

  try {
    const raw = (e && e.parameter && e.parameter.payload) || '';
    if (!raw) throw new Error('Missing payload');

    const req = JSON.parse(raw);
    requestId = String(req.requestId || '');
    if (!/^[A-Za-z0-9_-]{12,80}$/.test(requestId)) {
      throw new Error('Invalid request ID');
    }

    if (req.origin) {
      targetOrigin = resolveParentOrigin_(req.origin);
    }

    result = route_(req);
    if (!result || typeof result !== 'object') result = {ok:true, data:result};
    if (result.ok === undefined) result.ok = true;
  } catch (err) {
    result = {ok:false, error:String(err && err.message ? err.message : err)};
  }

  return iframeResponse_(requestId, result, targetOrigin);
}

function resolveParentOrigin_(origin) {
  const o = String(origin || '').trim();
  if (o === ALLOWED_PARENT_ORIGIN) return o;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) || devModeEnabled_()) {
    return o;
  }
  return ALLOWED_PARENT_ORIGIN;
}

function iframeResponse_(requestId, result, targetOrigin) {
  const message = {
    type: 'MYSTER_POST_RESPONSE',
    requestId: String(requestId || ''),
    result: result
  };

  // Escape characters that could terminate the inline script element.
  const json = JSON.stringify(message)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  const origin = targetOrigin || (devModeEnabled_() ? '*' : ALLOWED_PARENT_ORIGIN);

  const html =
    '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>' +
    // Apps Script serves this page inside its own wrapper iframe, so window.parent is
    // Google's wrapper, NOT the GitHub Pages site. window.top is the real page.
    'var m=' + json + ';' +
    'try{window.top.postMessage(m, ' + JSON.stringify(origin) + ');}catch(e){}' +
    '</script>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('MySemester response')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupDatabase() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Set SPREADSHEET_ID in Script Properties first.');
  const ss = SpreadsheetApp.openById(id);
  Object.keys(APP.SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = APP.SHEETS[name];
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  });
  const defaultRoles = [
    ['ROLE_ADMIN','admin','System administrator'],
    ['ROLE_KO','ko','Class coordinator'],
    ['ROLE_PIC','pic','Class PIC'],
    ['ROLE_LECTURER','lecturer','Lecturer'],
    ['ROLE_STUDENT','student','Student']
  ];
  const existingRoleIds = getRows_('Roles').map(r => r.role_id);
  defaultRoles.forEach(role => {
    if (!existingRoleIds.includes(role[0])) append_('Roles',role);
  });
  ensureRolePermissionMatrix_();
  return 'MySemester database initialized.';
}

function route_(req) {
  TEST_CONTEXT_ = null;
  ROW_CACHE_ = {};
  const action = String(req.action || '');

  // Development login is deliberately separate from Google OAuth and is disabled
  // unless DEV_MODE=true is explicitly configured in Script Properties.
  if (action === 'devLogin') return devLogin_(req.data || {});
  if (action === 'devLogout') {
    const devUser = authenticateDevSession_(req.devToken);
    CacheService.getScriptCache().remove('DEV_AUTH_' + sha256_(String(req.devToken || '')));
    return {ok:true,message:'Development session closed.'};
  }

  const authenticated = req.devToken
    ? authenticateDevSession_(req.devToken)
    : authenticate_(req.idToken);
  ensureExtendedSheets_();
  if (authenticated.authMode !== 'dev') {
    ensureUser_(authenticated, action === 'bootstrap');
    linkPreRegisteredLecturers_(authenticated);
  }

  // A temporary role identity is accepted only when the real, verified caller is
  // the configured System Admin and the session token belongs to that admin.
  const session = req.testSessionToken ? getRoleTestSessionByToken_(req.testSessionToken, authenticated.userId) : null;
  const user = Object.assign({}, authenticated);
  TEST_CONTEXT_ = null;
  if (session) {
    TEST_CONTEXT_ = {
      sessionId:session.session_id, adminUserId:session.admin_user_id,
      classId:session.class_id, role:session.role, testUserId:session.test_user_id,
      testEmail:session.test_email,
      sandboxEnabled:session.sandbox_enabled===undefined?true:toBool_(session.sandbox_enabled)
    };
    user.userId = session.test_user_id;
    user.email = session.test_email;
    user.name = 'MySemester Test ' + session.role.toUpperCase();
  }

  try {
    if (!session && action.indexOf('roleTest') === 0 && action !== 'roleTestStart') {
      // Admin-only management calls are authorized in their handlers.
    }
    enforceActionPermission_(user, action, req.data || {});
    const result = dispatchAction_(user, action, req.data || {});
    if (TEST_CONTEXT_) {
      const entityId=result && (result.assignmentId||result.eventId||result.semesterId||result.sessionId||result.classId) || '';
      roleTestLog_(action, 'SUCCESS', action, entityId, req.data || {});
    }
    return result;
  } catch (err) {
    if (TEST_CONTEXT_) roleTestLog_(action, 'FAILED', action, '', {error:String(err && err.message || err),request:req.data||{}});
    throw err;
  } finally {
    TEST_CONTEXT_ = null;
  }
}

function dispatchAction_(u, action, d) {
  switch (action) {
    case 'bootstrap': return bootstrap_(u);
    case 'adminDashboard': return adminDashboard_(u);
    case 'adminCreateInvitation': return adminCreateInvitation_(u,d);
    case 'adminAssignClassRole': return adminAssignClassRole_(u,d);
    case 'adminRegisterLecturer': return adminRegisterLecturer_(u,d);
    case 'adminUpdateUserStatus': return adminUpdateUserStatus_(u,d);
    case 'adminListData': return adminListData_(u,d);
    case 'adminCreateData': return adminCreateData_(u,d);
    case 'adminUpdateData': return adminUpdateData_(u,d);
    case 'adminDeleteData': return adminDeleteData_(u,d);
    case 'joinClass': return joinClass_(u,d);
    case 'createClass': return createClass_(u,d);
    case 'activateClass': return activateClass_(u,d);
    case 'createSemester': return createSemester_(u,d);
    case 'linkSemesterSubject': return linkSemesterSubject_(u,d);
    case 'createSubjectOffering': return createSubjectOffering_(u,d);
    case 'selectStudentSubjectOffering': return selectStudentSubjectOffering_(u,d);
    case 'assignSemesterSubjectStaff': return assignSemesterSubjectStaff_(u,d);
    case 'listSchedules': return listSchedules_(u,d);
    case 'createScheduleSession': return createScheduleSession_(u,d);
    case 'updateSchedule': return updateSchedule_(u,d);
    case 'deleteSchedule': return deleteSchedule_(u,d);
    case 'verifySchedule': return verifySchedule_(u,d);
    case 'listAssignments': return listAssignments_(u,d);
    case 'updateProgress': return updateProgress_(u,d);
    case 'createAssignment': return createAssignment_(u,d);
    case 'listResources': return listResources_(u,d);
    case 'listCalendarEvents': return listCalendarEvents_(u,d);
    case 'createCalendarEvent': return createCalendarEvent_(u,d);
    case 'getRoleMatrix': return getRoleMatrix_(u);
    case 'saveRoleMatrix': return saveRoleMatrix_(u,d);
    case 'startRoleTest': return startRoleTest_(u,d);
    case 'stopRoleTest': return stopRoleTest_(u,d);
    case 'setRoleTestSandbox': return setRoleTestSandbox_(u,d);
    case 'roleTestStatus': return roleTestStatus_(u,d);
    case 'listRoleTestSessions': return listRoleTestSessions_(u,d);
    case 'clearRoleTestData': return clearRoleTestData_(u,d);
    case 'roleTestContext': return roleTestContext_(u,d);
    case 'updateAssignment': return updateAssignment_(u,d);
    case 'deleteAssignment': return deleteAssignment_(u,d);
    case 'recordAssignmentMark': return recordAssignmentMark_(u,d);
    case 'createResourceLink': return createResourceLink_(u,d);
    case 'updateResource': return updateResource_(u,d);
    case 'deleteResource': return deleteResource_(u,d);
    case 'updateCalendarEvent': return updateCalendarEvent_(u,d);
    case 'deleteCalendarEvent': return deleteCalendarEvent_(u,d);
    case 'listClassMembers': return listClassMembers_(u,d);
    case 'manageClassMemberRole': return manageClassMemberRole_(u,d);
    case 'classReport': return classReport_(u,d);
    case 'createClassNotification': return createClassNotification_(u,d);
    case 'clearCache': return clearCache_(u);
    default: throw new Error('Unknown action: ' + action);
  }
}


/* ---------------- SYSTEM ADMIN: FULL BUSINESS-DATA CRUD ---------------- */
const ADMIN_DATA_TABLES_ = [
  'Users','UserRoles','Classes','ClassMembers','ClassInvitations','Semesters',
  'Subjects','SemesterSubjects','LecturerDirectory','StudentSemesterSubjects','ScheduleSeries','ClassSessions',
  'ScheduleChangeRequests','ScheduleHistory','Assignments','AssignmentResources',
  'AssignmentHistory','StudentAssignmentProgress','AssignmentChecklists',
  'SubmissionRecords','Folders','Resources','CalendarEvents','Notifications',
  'NotificationPreferences','PersonalTasks','PersonalNotes'
];
const ADMIN_READONLY_TABLES_ = ['ScheduleHistory','AssignmentHistory'];
const ADMIN_PROTECTED_FIELDS_ = {
  Users:['google_sub','photo_url'],
  AuditLogs:['log_id'],
  RoleTestSessions:['token_hash'],
  RoleTestAccounts:['session_id','admin_user_id'],
  PushSubscriptions:['endpoint','keys_json']
};
function adminAssertTable_(name) {
  const table=String(name||'');
  if(!ADMIN_DATA_TABLES_.includes(table)) throw new Error('Jadual ini tidak dibuka untuk CRUD umum. Gunakan fungsi pentadbiran khusus.');
  if(!APP.SHEETS[table]) throw new Error('Skema jadual tidak ditemui: '+table);
  return table;
}
function adminListData_(u,d) {
  requireSystemAdmin_(u);
  const table=adminAssertTable_(d.table);
  const cols=APP.SHEETS[table];
  const key=cols[0];
  const rows=getRows_(table);
  const q=String(d.search||'').trim().toLowerCase();
  const filtered=q?rows.filter(row=>cols.some(col=>String(row[col]??'').toLowerCase().includes(q))):rows;
  const limit=Math.min(250,Math.max(1,Number(d.limit)||100));
  return {ok:true,table:table,key:key,columns:cols,total:filtered.length,
    records:filtered.slice(0,limit)};
}
function adminCreateData_(u,d) {
  requireSystemAdmin_(u);
  const table=adminAssertTable_(d.table);
  if(ADMIN_READONLY_TABLES_.includes(table)) throw new Error('Jadual sejarah ialah rekod audit append-only dan tidak boleh dicipta melalui editor umum.');
  const cols=APP.SHEETS[table], key=cols[0];
  const record=d.record&&typeof d.record==='object'&&!Array.isArray(d.record)?d.record:{};
  const id=String(record[key]||'').trim();
  if(!id) throw new Error('Medan ID utama ('+key+') wajib diisi.');
  if(findBy_(table,key,id)) throw new Error('ID sudah wujud: '+id);
  const protectedFields=ADMIN_PROTECTED_FIELDS_[table]||[];
  const row=cols.map(col=>protectedFields.includes(col)?'':(record[col]===undefined?'':record[col]));
  append_(table,row);
  audit_(u.userId,'ADMIN_CREATE_RECORD',table,id,null,record);
  return {ok:true,message:'Rekod berjaya dicipta.',id:id};
}
function adminUpdateData_(u,d) {
  requireSystemAdmin_(u);
  const table=adminAssertTable_(d.table);
  if(ADMIN_READONLY_TABLES_.includes(table)) throw new Error('Jadual sejarah tidak boleh diubah. Sejarah baharu direkodkan secara automatik.');
  const cols=APP.SHEETS[table], key=cols[0];
  const id=String(d.id||'').trim();
  const current=findBy_(table,key,id);
  if(!current) throw new Error('Rekod tidak ditemui: '+id);
  if(table==='Users' && id===u.userId && d.patch && d.patch.account_status && d.patch.account_status!=='active')
    throw new Error('Akaun System Administrator semasa tidak boleh dinyahaktifkan.');
  const patch=d.patch&&typeof d.patch==='object'&&!Array.isArray(d.patch)?d.patch:{};
  const protectedFields=[key,...(ADMIN_PROTECTED_FIELDS_[table]||[])];
  const safePatch={};
  Object.keys(patch).forEach(col=>{
    if(cols.includes(col) && !protectedFields.includes(col)) safePatch[col]=patch[col];
  });
  if(!Object.keys(safePatch).length) throw new Error('Tiada medan yang boleh dikemas kini.');
  const before=Object.assign({},current);
  if(table==='ClassSessions') {
    const nextVersion=(Number(current.version)||1)+1;
    safePatch.version=nextVersion;
    safePatch.verification_status='PENDING';
    safePatch.updated_by=u.userId;
    safePatch.updated_at=now_();
    append_('ScheduleHistory',[id_('SCH'),id,nextVersion,JSON.stringify(before),
      JSON.stringify(Object.assign({},current,safePatch)),'Pindaan oleh System Admin; menunggu pengesahan.',
      'PENDING',u.userId,'',now_()]);
  }
  if(table==='Assignments') {
    safePatch.updated_at=now_();
    append_('AssignmentHistory',[id_('ASH'),id,JSON.stringify(before),
      JSON.stringify(Object.assign({},current,safePatch)),'Pindaan oleh System Admin.',
      u.userId,now_()]);
  }
  updateById_(table,key,id,safePatch);
  audit_(u.userId,'ADMIN_UPDATE_RECORD',table,id,before,safePatch);
  return {ok:true,message:table==='ClassSessions'?'Jadual dikemas kini; status pengesahan ditetapkan kepada PENDING.':'Rekod berjaya dikemas kini.'};
}
function adminDeleteData_(u,d) {
  requireSystemAdmin_(u);
  const table=adminAssertTable_(d.table);
  if(ADMIN_READONLY_TABLES_.includes(table)) throw new Error('Jadual sejarah tidak boleh dipadam.');
  const cols=APP.SHEETS[table], key=cols[0];
  const id=String(d.id||'').trim();
  const current=findBy_(table,key,id);
  if(!current) throw new Error('Rekod tidak ditemui: '+id);
  if(table==='Users' && id===u.userId) throw new Error('System Administrator tidak boleh memadam akaun sendiri.');
  if(table==='UserRoles' && current.user_id===u.userId && String(current.role_id).toUpperCase()==='ROLE_ADMIN')
    throw new Error('Peranan System Administrator tidak boleh dipadam daripada akaun semasa.');
  // Preserve linked academic history by archiving key records instead of hard deletion.
  if(table==='ClassSessions') {
    const nextVersion=(Number(current.version)||1)+1;
    const patch={status:'cancelled',version:nextVersion,verification_status:'PENDING',
      updated_by:u.userId,updated_at:now_()};
    append_('ScheduleHistory',[id_('SCH'),id,nextVersion,JSON.stringify(current),
      JSON.stringify(patch),'Sesi diarkibkan oleh System Admin.','PENDING',u.userId,'',now_()]);
    updateById_(table,key,id,patch);
  } else if(table==='Assignments') {
    const patch={status:'cancelled',updated_at:now_()};
    append_('AssignmentHistory',[id_('ASH'),id,JSON.stringify(current),
      JSON.stringify(patch),'PB diarkibkan oleh System Admin.',u.userId,now_()]);
    updateById_(table,key,id,patch);
  } else if(table==='Resources') {
    updateById_(table,key,id,{visibility:'archived'});
  } else if(table==='Users') {
    updateById_(table,key,id,{account_status:'inactive'});
  } else {
    const sh=ss_().getSheetByName(table);
    const values=sh.getDataRange().getValues();
    const keyCol=values[0].indexOf(key);
    let deleted=false;
    for(let r=1;r<values.length;r++){
      if(String(values[r][keyCol])===id){sh.deleteRow(r+1);deleted=true;break;}
    }
    if(!deleted) throw new Error('Rekod gagal dipadam.');
    invalidateRowsCache_(table);
  }
  audit_(u.userId,'ADMIN_DELETE_RECORD',table,id,current,{archived:true});
  return {ok:true,message:'Rekod dipadam atau diarkibkan mengikut jenis data; sejarah dikekalkan.'};
}

function isConfiguredSystemAdmin_(u) {
  const props=PropertiesService.getScriptProperties();
  if (u && u.authMode==='dev' && String(props.getProperty('DEV_MODE')||'').toLowerCase()==='true') {
    return isSystemAdmin_(u.userId);
  }
  const adminEmail = String(props.getProperty('ADMIN_EMAIL') || SYSTEM_ADMIN_EMAIL).trim().toLowerCase();
  return !!u && String(u.email || '').toLowerCase() === adminEmail && isSystemAdmin_(u.userId);
}

function requireSystemAdmin_(u) {
  if (!isConfiguredSystemAdmin_(u)) throw new Error('System Administrator access required.');
}

function ensureExtendedSheets_() {
  const cache = CacheService.getScriptCache();
  if (cache.get('EXTENDED_SHEETS_READY_V5') === '1') return;

  const spreadsheet=ss_();
  ['PermissionMatrix','RoleTestSessions','RoleTestAccounts','RoleTestData','RoleTestAudit','LecturerDirectory','StudentSemesterSubjects'].forEach(name=>{
    let sh=spreadsheet.getSheetByName(name);
    if(!sh) {
      sh=spreadsheet.insertSheet(name);
      const headers=APP.SHEETS[name];
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    } else if(sh.getLastRow()===0) {
      const headers=APP.SHEETS[name];
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    }
  });
  [['RoleTestSessions','sandbox_enabled'],['SemesterSubjects','pic_user_id'],['SemesterSubjects','offering_name'],
    ['Classes','semester_limit']].forEach(([name,header])=>{
    const sheet=spreadsheet.getSheetByName(name);
    const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
    let column=headers.indexOf(header)+1;
    if(column===0) {
      column=sheet.getLastColumn()+1;
      sheet.getRange(1,column).setValue(header);
      if(name==='RoleTestSessions' && sheet.getLastRow()>1) {
        sheet.getRange(2,column,sheet.getLastRow()-1,1).setValue(true);
      }
      column=sheet.getLastColumn();
      invalidateRowsCache_(name);
    }
    if(name==='Classes' && sheet.getLastRow()>1) {
      const classRows=getRows_('Classes');
      const semesterRows=getRows_('Semesters');
      const limits=classRows.map(row=>{
        const existing=Number(row.semester_limit);
        if(Number.isSafeInteger(existing)&&existing>=1) return existing;
        const classSemesters=semesterRows.filter(semester=>semester.class_id===row.class_id);
        const highestNumber=classSemesters.reduce((highest,semester)=>Math.max(highest,Number(semester.semester_number)||0),0);
        return Math.max(3,classSemesters.length,highestNumber);
      });
      sheet.getRange(2,column,limits.length,1).setValues(limits.map(limit=>[limit]));
    }
    invalidateRowsCache_(name);
  });
  try { cache.put('EXTENDED_SHEETS_READY_V5', '1', 21600); } catch(e){}
}

function ensureRolePermissionMatrix_() {
  ensureExtendedSheets_();
  const cache = CacheService.getScriptCache();
  if (cache.get('ROLE_MATRIX_READY_V2') === '1') return;

  const existing = getRows_('PermissionMatrix');
  const toAppend = [];
  ROLE_PERMISSION_ROLES.forEach(role => ROLE_PERMISSION_DEFS.forEach(def => {
    if (!existing.some(x => String(x.role) === role && String(x.permission_id) === def.id)) {
      toAppend.push([role,def.id,(ROLE_PERMISSION_DEFAULTS[role] || []).includes(def.id), 'SYSTEM', now_()]);
    }
  }));
  if (toAppend.length) {
    const sh = ss_().getSheetByName('PermissionMatrix');
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, toAppend[0].length).setValues(toAppend);
    invalidateRowsCache_('PermissionMatrix');
  }
  try { cache.put('ROLE_MATRIX_READY_V2', '1', 21600); } catch(e){}
}

function getRoleMatrix_(u) {
  requireSystemAdmin_(u);
  ensureRolePermissionMatrix_();
  const rows = getRows_('PermissionMatrix');
  return {ok:true,roles:ROLE_PERMISSION_ROLES,permissions:ROLE_PERMISSION_DEFS,
    matrix:ROLE_PERMISSION_ROLES.map(role => ({
      role:role,
      permissions:ROLE_PERMISSION_DEFS.map(def => {
        const row=rows.find(x=>String(x.role)===role && String(x.permission_id)===def.id);
        return {permissionId:def.id,enabled:row ? toBool_(row.enabled) : false};
      })
    }))};
}

function saveRoleMatrix_(u,d) {
  requireSystemAdmin_(u);
  ensureRolePermissionMatrix_();
  const cells=Array.isArray(d.cells)?d.cells:[];
  if (!cells.length || cells.length > ROLE_PERMISSION_ROLES.length * ROLE_PERMISSION_DEFS.length) throw new Error('Invalid permission matrix payload.');
  const validIds=ROLE_PERMISSION_DEFS.map(x=>x.id);

  const sh=ss_().getSheetByName('PermissionMatrix');
  const values=sh.getDataRange().getValues();
  const headers=values[0];
  const rCol=headers.indexOf('role'), pCol=headers.indexOf('permission_id'), eCol=headers.indexOf('enabled'), uCol=headers.indexOf('updated_by'), tCol=headers.indexOf('updated_at');
  const now=now_();
  const map={};
  for(let i=1;i<values.length;i++) {
    map[String(values[i][rCol])+':'+String(values[i][pCol])]=i;
  }
  const toAppend=[];
  cells.forEach(cell=>{
    const role=String(cell.role||'');
    const pid=String(cell.permissionId||'');
    if (!ROLE_PERMISSION_ROLES.includes(role) || !validIds.includes(pid)) throw new Error('Unknown role or permission in matrix.');
    const key=role+':'+pid;
    if(map[key]!==undefined) {
      const idx=map[key];
      values[idx][eCol]=!!cell.enabled;
      if(uCol>=0) values[idx][uCol]=u.userId;
      if(tCol>=0) values[idx][tCol]=now;
    } else {
      toAppend.push([role,pid,!!cell.enabled,u.userId,now]);
    }
  });

  if(values.length>1) {
    sh.getRange(1,1,values.length,headers.length).setValues(values);
  }
  if(toAppend.length) {
    sh.getRange(sh.getLastRow()+1,1,toAppend.length,toAppend[0].length).setValues(toAppend);
  }
  invalidateRowsCache_('PermissionMatrix');
  audit_(u.userId,'UPDATE_ROLE_PERMISSION_MATRIX','PermissionMatrix','ALL',null,{cells:cells.length});
  return {ok:true,message:'Matriks kebenaran berjaya disimpan.',updated:cells.length};
}

function updateComposite_(sheetName,role,permissionId,patch) {
  const sh=ss_().getSheetByName(sheetName), values=sh.getDataRange().getValues(), headers=values[0];
  const rCol=headers.indexOf('role'), pCol=headers.indexOf('permission_id');
  for(let i=1;i<values.length;i++) if(String(values[i][rCol])===role && String(values[i][pCol])===permissionId) {
    Object.keys(patch).forEach(k=>{const c=headers.indexOf(k);if(c>=0)sh.getRange(i+1,c+1).setValue(patch[k]);});
    invalidateRowsCache_(sheetName); return;
  }
  throw new Error('Permission matrix cell not found.');
}

function isPermissionEnabled_(role, permissionId) {
  const row=getRows_('PermissionMatrix').find(x=>String(x.role)===String(role) && String(x.permission_id)===String(permissionId));
  return !!row && toBool_(row.enabled);
}

function roleHasPermission_(role, permissionId) {
  if (!isPermissionEnabled_(role,'class.view')) return false;
  const dependencies={
    'semester.view':['class.view'],
    'semester.manage':['class.view'],
    'subject.offerings.manage':['class.view','semester.view'],
    'schedule.view':['class.view','semester.view'],
    'schedule.edit':['class.view','semester.view','schedule.view'],
    'schedule.verify':['class.view','semester.view','schedule.view'],
    'schedule.delete':['class.view','semester.view','schedule.view'],
    'pb.view':['class.view','semester.view'],
    'pb.create':['class.view','semester.view','pb.view'],
    'pb.edit':['class.view','semester.view','pb.view'],
    'pb.delete':['class.view','semester.view','pb.view'],
    'pb.progress.update':['class.view','semester.view','pb.view'],
    'pb.marks.manage':['class.view','semester.view','pb.view'],
    'resources.view':['class.view','semester.view'],
    'resources.manage':['class.view','semester.view','resources.view'],
    'resources.delete':['class.view','semester.view','resources.view'],
    'calendar.view':['class.view','semester.view'],
    'calendar.create':['class.view','semester.view','calendar.view'],
    'calendar.edit':['class.view','semester.view','calendar.view'],
    'calendar.delete':['class.view','semester.view','calendar.view'],
    'members.view':['class.view'],
    'members.roles.manage':['class.view','members.view'],
    'reports.view':['class.view'],
    'notifications.manage':['class.view']
  };
  if (!isPermissionEnabled_(role,permissionId)) return false;
  return (dependencies[permissionId]||[]).every(dep=>isPermissionEnabled_(role,dep));
}

function enforceActionPermission_(u, action, d) {
  const permissionId=ACTION_PERMISSION[action];
  if (!permissionId) return;
  if (!TEST_CONTEXT_ && isSystemAdmin_(u.userId)) return;
  let classId=d.classId || '';
  if (action==='updateSchedule' || action==='verifySchedule' || action==='deleteSchedule') {
    const session=findBy_('ClassSessions','session_id',d.sessionId);
    const ss=session && findBy_('SemesterSubjects','semester_subject_id',session.semester_subject_id);
    const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
    classId=sem ? sem.class_id : '';
  } else if (action==='createScheduleSession' || action==='createAssignment' || action==='createResourceLink') {
    const ss=findBy_('SemesterSubjects','semester_subject_id',d.semesterSubjectId);
    const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
    classId=sem ? sem.class_id : '';
  } else if (action==='linkSemesterSubject' || action==='createSubjectOffering') {
    const sem=findBy_('Semesters','semester_id',d.semesterId);
    classId=sem ? sem.class_id : classId;
  } else if (action==='selectStudentSubjectOffering') {
    const sem=findBy_('Semesters','semester_id',d.semesterId);
    classId=sem ? sem.class_id : classId;
  } else if (action==='assignSemesterSubjectStaff') {
    const ss=findBy_('SemesterSubjects','semester_subject_id',d.semesterSubjectId);
    const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
    classId=sem ? sem.class_id : '';
  } else if (action==='createCalendarEvent' || action==='createSemester') {
    const sem=action==='createCalendarEvent' ? findBy_('Semesters','semester_id',d.semesterId) : null;
    classId=sem ? sem.class_id : classId;
  } else if (action==='updateAssignment' || action==='deleteAssignment' || action==='recordAssignmentMark') {
    const a=findBy_('Assignments','assignment_id',d.assignmentId);
    const ss=a && findBy_('SemesterSubjects','semester_subject_id',a.semester_subject_id);
    const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
    classId=sem ? sem.class_id : '';
  } else if (action==='updateResource' || action==='deleteResource') {
    const r=findBy_('Resources','resource_id',d.resourceId);
    const ss=r && findBy_('SemesterSubjects','semester_subject_id',r.semester_subject_id);
    const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
    classId=sem ? sem.class_id : '';
  } else if (action==='updateCalendarEvent' || action==='deleteCalendarEvent') {
    const ev=findBy_('CalendarEvents','event_id',d.eventId);
    const sem=ev && findBy_('Semesters','semester_id',ev.semester_id);
    classId=sem ? sem.class_id : '';
  } else if (action==='updateProgress') {
    const a=findBy_('Assignments','assignment_id',d.assignmentId);
    const ss=a && findBy_('SemesterSubjects','semester_subject_id',a.semester_subject_id);
    const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
    classId=sem ? sem.class_id : '';
  }
  if (!classId) throw new Error('Class context is required to check role permissions.');
  let role='';
  if (TEST_CONTEXT_) {
    if (String(classId)!==String(TEST_CONTEXT_.classId)) throw new Error('Test account is limited to its selected class.');
    role=TEST_CONTEXT_.role;
  } else {
    const member=getRows_('ClassMembers').find(x=>x.user_id===u.userId && x.class_id===classId && x.membership_status==='active');
    if (!member) throw new Error('Active class membership required.');
    role=String(member.member_role).toLowerCase();
    if (role==='admin') role='class_admin';
  }
  if (!roleHasPermission_(role,permissionId)) throw new Error('Permission denied by active role matrix: '+permissionId+' ('+role+'). Check this permission and its parent permissions.');
  if(role==='lecturer'||role==='pic') {
    const semesterSubjectId=lecturerActionSubjectId_(action,d);
    if(['createScheduleSession','updateSchedule','verifySchedule','deleteSchedule','createAssignment','updateAssignment',
      'deleteAssignment','recordAssignmentMark','createResourceLink','updateResource','deleteResource',
      'createCalendarEvent','updateCalendarEvent','deleteCalendarEvent'].includes(action)) {
      if(!semesterSubjectId) throw new Error('Tindakan ini mesti dikaitkan dengan subjek yang ditugaskan.');
      requireAssignedRoleSubject_(role,user.userId,semesterSubjectId,action==='createScheduleSession');
    }
  } else if(role==='student' && action==='updateProgress') {
    const assignment=findBy_('Assignments','assignment_id',d.assignmentId);
    if(assignment && (!studentVisibleSemesterSubjectIds_(assignment.semester_subject_id).includes(assignment.semester_subject_id)||
      !studentSelectedSemesterSubjectIds_(u.userId,findBy_('SemesterSubjects','semester_subject_id',assignment.semester_subject_id)?.semester_id).includes(assignment.semester_subject_id))) {
      throw new Error('Pilih tawaran subjek ini sebelum mengemas kini kemajuan.');
    }
  } else if(role==='student' && action==='selectStudentSubjectOffering') {
    if(!TEST_CONTEXT_&&!getRows_('ClassMembers').some(member=>member.user_id===u.userId&&member.class_id===classId&&member.membership_status==='active'&&String(member.member_role).toLowerCase()==='student')) {
      throw new Error('Hanya pelajar kelas boleh memilih tawaran subjek.');
    }
  }
}

function lecturerActionSubjectId_(action,d) {
  if(['createScheduleSession','createAssignment','createResourceLink'].includes(action)) return d.semesterSubjectId||'';
  if(['updateSchedule','verifySchedule','deleteSchedule'].includes(action)) {
    return findBy_('ClassSessions','session_id',d.sessionId)?.semester_subject_id||'';
  }
  if(['updateAssignment','deleteAssignment','recordAssignmentMark'].includes(action)) {
    return findBy_('Assignments','assignment_id',d.assignmentId)?.semester_subject_id||'';
  }
  if(['updateResource','deleteResource'].includes(action)) {
    return findBy_('Resources','resource_id',d.resourceId)?.semester_subject_id||'';
  }
  if(action==='createCalendarEvent') return d.semesterSubjectId||'';
  if(action==='updateCalendarEvent'||action==='deleteCalendarEvent') return findBy_('CalendarEvents','event_id',d.eventId)?.semester_subject_id||'';
  return '';
}

function lecturerScheduleSubjectIds_(userId) {
  return assignedSemesterSubjectIds_('lecturer',userId).filter(semesterSubjectHasSchedule_);
}

function requireLecturerScheduleSubject_(userId,semesterSubjectId) {
  if(!lecturerScheduleSubjectIds_(userId).includes(semesterSubjectId)) {
    throw new Error('Pensyarah hanya boleh mengurus subjek yang ditugaskan kepadanya dan mempunyai jadual aktif.');
  }
}

function activeClassMemberHasRole_(userId,classId,role) {
  const user=findBy_('Users','user_id',userId);
  return !!user&&user.account_status==='active'&&getRows_('ClassMembers').some(member=>
    member.user_id===userId&&member.class_id===classId&&member.membership_status==='active'&&
    String(member.member_role||'').toLowerCase()===role);
}

function assignmentResourceLinks_(assignments) {
  const assignmentById=Object.fromEntries(assignments.map(item=>[item.assignment_id,item]));
  const resourceById=Object.fromEntries(getRows_('Resources').map(item=>[item.resource_id,item]));
  return getRows_('AssignmentResources').filter(link=>{
    const assignment=assignmentById[link.assignment_id],resource=resourceById[link.resource_id];
    return !!assignment&&!!resource&&assignment.semester_subject_id===resource.semester_subject_id&&
      resource.visibility!=='personal'&&resource.visibility!=='archived';
  });
}

function semesterSubjectHasSchedule_(semesterSubjectId) {
  return getRows_('ClassSessions').some(row=>row.semester_subject_id===semesterSubjectId&&
    !['cancelled','archived'].includes(String(row.status||'').toLowerCase())) ||
    getRows_('ScheduleSeries').some(row=>row.semester_subject_id===semesterSubjectId&&
      !['cancelled','archived'].includes(String(row.status||'').toLowerCase()));
}

function studentVisibleSemesterSubjectIds_(semesterSubjectId) {
  const links=getRows_('SemesterSubjects').filter(row=>!semesterSubjectId||row.semester_subject_id===semesterSubjectId);
  return links.filter(link=>{
    if(String(link.status||'active').toLowerCase()!=='active'||!link.lecturer_user_id||!link.pic_user_id) return false;
    const semester=findBy_('Semesters','semester_id',link.semester_id);
    return !!semester &&
      activeClassMemberHasRole_(link.lecturer_user_id,semester.class_id,'lecturer') &&
      activeClassMemberHasRole_(link.pic_user_id,semester.class_id,'pic') &&
      semesterSubjectHasSchedule_(link.semester_subject_id);
  }).map(link=>link.semester_subject_id);
}

function studentSelectedSemesterSubjectIds_(userId,semesterId) {
  return getRows_('StudentSemesterSubjects').filter(row=>row.user_id===userId&&
    (!semesterId||row.semester_id===semesterId)&&String(row.status||'selected')==='selected')
    .map(row=>row.semester_subject_id);
}

function activeUserHasClassRole_(userId,classId,role) {
  if(TEST_CONTEXT_&&userId===TEST_CONTEXT_.testUserId&&classId===TEST_CONTEXT_.classId) {
    return TEST_CONTEXT_.role===role;
  }
  return activeClassMemberHasRole_(userId,classId,role);
}

function assignedSemesterSubjectIds_(role,userId) {
  const field=role==='lecturer'?'lecturer_user_id':'pic_user_id';
  const semesters=getRows_('Semesters');
  const testSession=TEST_CONTEXT_&&TEST_CONTEXT_.role===role;
  const links=getRows_('SemesterSubjects').filter(link=>{
    const semester=semesters.find(item=>item.semester_id===link.semester_id);
    if(!semester||!link.semester_subject_id||String(link.status||'active').toLowerCase()!=='active') return false;
    if(testSession) {
      if(semester.class_id!==TEST_CONTEXT_.classId||!link[field]) return false;
      if(link[field]===TEST_CONTEXT_.testUserId) return true;
      return activeClassMemberHasRole_(link[field],semester.class_id,role);
    }
    return link[field]===userId&&activeClassMemberHasRole_(userId,semester.class_id,role);
  });
  return links.map(link=>link.semester_subject_id);
}

function requireAssignedRoleSubject_(role,userId,semesterSubjectId,allowUnscheduled) {
  const ids=role==='lecturer'&&!allowUnscheduled?lecturerScheduleSubjectIds_(userId):assignedSemesterSubjectIds_(role,userId);
  if(!ids.includes(semesterSubjectId)) {
    throw new Error(role==='lecturer'
      ?'Pensyarah hanya boleh mengurus subjek yang ditugaskan kepadanya'+(allowUnscheduled?'.':' dan mempunyai jadual aktif.')
      :'PIC hanya boleh mengurus subjek yang ditugaskan kepadanya.');
  }
}

function startRoleTest_(u,d) {
  requireSystemAdmin_(u);
  const classId=required_(d.classId,'Class');
  const role=String(d.role||'').toLowerCase();
  if (!ROLE_PERMISSION_ROLES.includes(role)) throw new Error('Select KO, PIC, Lecturer, Student or Class Admin.');
  const c=findBy_('Classes','class_id',classId);
  if (!c) throw new Error('Selected class not found.');
  const sid=id_('RTS'), testUserId='TST_'+role.toUpperCase()+'_'+Utilities.getUuid().replace(/-/g,'').slice(0,10).toUpperCase();
  const testEmail='test+'+testUserId.toLowerCase()+'@mysemester.invalid';
  const token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  const expires=new Date(Date.now()+4*60*60*1000);
  const expiresAt=Utilities.formatDate(expires,APP.TZ,"yyyy-MM-dd'T'HH:mm:ss");
  append_('RoleTestSessions',[sid,sha256_(token),u.userId,classId,role,testUserId,testEmail,'active',expiresAt,now_(),'',true]);
  append_('RoleTestAccounts',[testUserId,sid,u.userId,classId,role,'MySemester Test '+role.toUpperCase(),testEmail,'active',now_(),expiresAt]);
  append_('RoleTestAudit',[id_('RTA'),sid,u.userId,testUserId,role,'START_TEST_SESSION','RoleTestSessions',sid,'SUCCESS',now_()]);
  audit_(u.userId,'START_ROLE_TEST','RoleTestSessions',sid,null,{classId:classId,role:role,testUserId:testUserId});
  return {ok:true,sessionId:sid,testSessionToken:token,classId:classId,role:role,
    testUser:{id:testUserId,email:testEmail,name:'MySemester Test '+role.toUpperCase()},
    expiresAt:expiresAt,sandboxEnabled:true,message:'Akaun ujian sementara diwujudkan. Semua perubahan disimpan dalam sandbox ujian sahaja.'};
}

function getRoleTestSessionByToken_(token,adminUserId) {
  const hash=sha256_(String(token||''));
  const session=getRows_('RoleTestSessions').find(x=>x.token_hash===hash && x.admin_user_id===adminUserId && x.status==='active');
  if (!session) throw new Error('Test session is invalid, closed or does not belong to this System Admin.');
  if (new Date(session.expires_at).getTime() < Date.now()) {
    updateById_('RoleTestSessions','session_id',session.session_id,{status:'expired',closed_at:now_()});
    updateById_('RoleTestAccounts','test_user_id',session.test_user_id,{status:'expired'});
    throw new Error('Temporary test account has expired. Start a new role test.');
  }
  return session;
}

function setRoleTestSandbox_(u,d) {
  requireSystemAdmin_(u);
  const session=getRows_('RoleTestSessions').find(x=>x.session_id===d.sessionId && x.admin_user_id===u.userId && x.status==='active');
  if(!session) throw new Error('Active test session not found.');
  if(typeof d.sandboxEnabled!=='boolean') throw new Error('Sandbox mode must be enabled or disabled.');
  updateById_('RoleTestSessions','session_id',session.session_id,{sandbox_enabled:d.sandboxEnabled});
  append_('RoleTestAudit',[id_('RTA'),session.session_id,u.userId,session.test_user_id,session.role,
    d.sandboxEnabled?'ENABLE_SANDBOX':'DISABLE_SANDBOX','RoleTestSessions',session.session_id,'SUCCESS',now_()]);
  audit_(u.userId,d.sandboxEnabled?'ENABLE_ROLE_TEST_SANDBOX':'DISABLE_ROLE_TEST_SANDBOX',
    'RoleTestSessions',session.session_id,{sandbox_enabled:toBool_(session.sandbox_enabled)},{sandbox_enabled:d.sandboxEnabled});
  return {ok:true,sandboxEnabled:d.sandboxEnabled,message:d.sandboxEnabled?'Sandbox diaktifkan.':'Mod terus-simpan diaktifkan.'};
}

function stopRoleTest_(u,d) {
  requireSystemAdmin_(u);
  const session=getRows_('RoleTestSessions').find(x=>x.session_id===d.sessionId && x.admin_user_id===u.userId && x.status==='active');
  if (!session) throw new Error('Active test session not found.');
  updateById_('RoleTestSessions','session_id',session.session_id,{status:'closed',closed_at:now_()});
  updateById_('RoleTestAccounts','test_user_id',session.test_user_id,{status:'closed'});
  append_('RoleTestAudit',[id_('RTA'),session.session_id,u.userId,session.test_user_id,session.role,'STOP_TEST_SESSION','RoleTestSessions',session.session_id,'SUCCESS',now_()]);
  audit_(u.userId,'STOP_ROLE_TEST','RoleTestSessions',session.session_id,null,{status:'closed'});
  return {ok:true,message:'Akaun ujian ditamatkan. Data sandbox kekal untuk audit sehingga dipadam oleh System Admin.'};
}

function listRoleTestSessions_(u,d) {
  requireSystemAdmin_(u);
  const sessions=getRows_('RoleTestSessions').filter(x=>x.admin_user_id===u.userId);
  sessions.forEach(session=>{
    if(session.status==='active' && new Date(session.expires_at).getTime()<Date.now()) {
      updateById_('RoleTestSessions','session_id',session.session_id,{status:'expired',closed_at:now_()});
      updateById_('RoleTestAccounts','test_user_id',session.test_user_id,{status:'expired'});
      session.status='expired';
    }
  });
  return {ok:true,items:sessions.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,50)};
}

function roleTestStatus_(u,d) {
  requireSystemAdmin_(u);
  const session=getRows_('RoleTestSessions').find(x=>x.session_id===d.sessionId && x.admin_user_id===u.userId);
  if (!session) throw new Error('Test session not found.');
  const logs=getRows_('RoleTestAudit').filter(x=>x.session_id===session.session_id).slice(-100).reverse();
  const dataCount=getRows_('RoleTestData').filter(x=>x.session_id===session.session_id).length;
  return {ok:true,session:session,logs:logs,sandboxOperations:dataCount};
}

function clearRoleTestData_(u,d) {
  requireSystemAdmin_(u);
  const session=getRows_('RoleTestSessions').find(x=>x.session_id===d.sessionId && x.admin_user_id===u.userId);
  if (!session) throw new Error('Test session not found.');
  const sh=ss_().getSheetByName('RoleTestData');
  const values=sh.getDataRange().getValues();
  if(values.length>1) {
    const keep=[values[0],...values.slice(1).filter(r=>String(r[0])!==String(session.session_id))];
    sh.clearContents();
    sh.getRange(1,1,keep.length,keep[0].length).setValues(keep);
  }
  invalidateRowsCache_('RoleTestData');
  append_('RoleTestAudit',[id_('RTA'),session.session_id,u.userId,session.test_user_id,session.role,'CLEAR_TEST_SANDBOX','RoleTestData',session.session_id,'SUCCESS',now_()]);
  return {ok:true,message:'Sandbox ujian telah dikosongkan.'};
}

function deleteSchedule_(u,d) {
  const row=findBy_('ClassSessions','session_id',d.sessionId);
  if(!row) throw new Error('Schedule session not found.');
  updateById_('ClassSessions','session_id',row.session_id,{status:'cancelled',updated_by:u.userId,updated_at:now_()});
  audit_(u.userId,'ARCHIVE_SCHEDULE','ClassSessions',row.session_id,row,{status:'cancelled'});
  return {ok:true,message:'Sesi jadual diarkibkan dalam sandbox.'};
}
function deleteAssignment_(u,d) {
  const row=findBy_('Assignments','assignment_id',d.assignmentId);
  if(!row) throw new Error('PB not found.');
  updateById_('Assignments','assignment_id',row.assignment_id,{status:'cancelled',updated_at:now_()});
  audit_(u.userId,'ARCHIVE_ASSIGNMENT','Assignments',row.assignment_id,row,{status:'cancelled'});
  return {ok:true,message:'PB diarkibkan; sejarah dan markah dikekalkan.'};
}
function deleteResource_(u,d) {
  const row=findBy_('Resources','resource_id',d.resourceId);
  if(!row) throw new Error('Resource not found.');
  updateById_('Resources','resource_id',row.resource_id,{visibility:'archived'});
  audit_(u.userId,'ARCHIVE_RESOURCE','Resources',row.resource_id,row,{visibility:'archived'});
  return {ok:true,message:'Sumber diarkibkan dalam sandbox.'};
}
function deleteCalendarEvent_(u,d) {
  const row=findBy_('CalendarEvents','event_id',d.eventId);
  if(!row) throw new Error('Calendar event not found.');
  updateById_('CalendarEvents','event_id',row.event_id,{visibility:'archived',updated_at:now_()});
  audit_(u.userId,'ARCHIVE_CALENDAR_EVENT','CalendarEvents',row.event_id,row,{visibility:'archived'});
  return {ok:true,message:'Acara kalendar diarkibkan dalam sandbox.'};
}

function updateAssignment_(u,d) {
  const a=findBy_('Assignments','assignment_id',d.assignmentId);
  if(!a) throw new Error('Assignment not found.');
  const ss=findBy_('SemesterSubjects','semester_subject_id',a.semester_subject_id);
  const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
  if(!sem) throw new Error('Assignment semester not found.');
  requireClassMember_(u.userId,sem.class_id);
  const patch=d.changes||{}, allowed=['title','assignment_type','description','marks_percentage','start_date','due_at','submission_method','status'];
  const updated={}; allowed.forEach(k=>{if(patch[k]!==undefined) updated[k]=patch[k];});
  if(!Object.keys(updated).length) throw new Error('No supported PB fields supplied.');
  const old=Object.assign({},a);
  updated.updated_at=now_();
  updateById_('Assignments','assignment_id',a.assignment_id,updated);
  append_('AssignmentHistory',[id_('AH'),a.assignment_id,JSON.stringify(old),JSON.stringify(Object.assign({},old,updated)),d.reason||'PB updated',u.userId,now_()]);
  audit_(u.userId,'UPDATE_ASSIGNMENT','Assignments',a.assignment_id,old,updated);
  return {ok:true,message:'PB updated in the active workspace.',assignmentId:a.assignment_id};
}

function recordAssignmentMark_(u,d) {
  const a=findBy_('Assignments','assignment_id',d.assignmentId);
  if(!a) throw new Error('Assignment not found.');
  const ss=findBy_('SemesterSubjects','semester_subject_id',a.semester_subject_id);
  const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
  if(!sem) throw new Error('Assignment semester not found.');
  requireClassMember_(u.userId,sem.class_id);
  const studentId=required_(d.studentUserId,'Student user ID');
  const student=getRows_('ClassMembers').find(m=>m.class_id===sem.class_id && m.user_id===studentId && m.membership_status==='active' && String(m.member_role).toLowerCase()==='student');
  if(!student) throw new Error('Target must be an active student in this class.');
  const mark=Number(d.recordedMark);
  if(!isFinite(mark) || mark<0 || mark>100) throw new Error('Mark must be between 0 and 100.');
  const existing=getRows_('SubmissionRecords').find(x=>x.assignment_id===a.assignment_id && x.user_id===studentId);
  if(existing) updateById_('SubmissionRecords','submission_id',existing.submission_id,{recorded_mark:mark,lecturer_feedback:d.feedback||''});
  else append_('SubmissionRecords',[id_('SUB'),a.assignment_id,studentId,'','', 'marked',d.feedback||'',mark]);
  audit_(u.userId,'RECORD_OFFICIAL_MARK','SubmissionRecords',existing?existing.submission_id:a.assignment_id,null,{studentUserId:studentId,recordedMark:mark});
  return {ok:true,message:'Official mark recorded in the active workspace.',studentUserId:studentId,recordedMark:mark};
}

function createResourceLink_(u,d) {
  const ss=findBy_('SemesterSubjects','semester_subject_id',d.semesterSubjectId);
  const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
  if(!sem) throw new Error('Semester subject not found.');
  requireClassMember_(u.userId,sem.class_id);
  const url=required_(d.url,'Resource URL');
  if(!/^https:\/\//i.test(url)) throw new Error('Only HTTPS resource links are accepted.');
  const rid=id_('RES');
  append_('Resources',[rid,'',d.semesterSubjectId,'',u.userId,required_(d.resourceName,'Resource name'),'link','external_url',url,'text/uri-list',0,d.description||'','class',now_()]);
  audit_(u.userId,'CREATE_RESOURCE_LINK','Resources',rid,null,{resourceName:d.resourceName,url:url});
  return {ok:true,resourceId:rid,message:'Resource link added in the active workspace.'};
}

function updateResource_(u,d) {
  const resource=findBy_('Resources','resource_id',d.resourceId);
  if(!resource) throw new Error('Resource not found.');
  const ss=findBy_('SemesterSubjects','semester_subject_id',resource.semester_subject_id);
  const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
  if(!sem) throw new Error('Resource semester not found.');
  requireClassMember_(u.userId,sem.class_id);
  const patch=d.changes||{}, allowed=['resource_name','storage_file_id','description','visibility'];
  const updated={}; allowed.forEach(k=>{if(patch[k]!==undefined) updated[k]=patch[k];});
  if(!Object.keys(updated).length) throw new Error('No supported resource fields supplied.');
  const old=Object.assign({},resource);
  updateById_('Resources','resource_id',resource.resource_id,updated);
  audit_(u.userId,'UPDATE_RESOURCE','Resources',resource.resource_id,old,updated);
  return {ok:true,message:'Resource metadata updated.',resourceId:resource.resource_id};
}

function updateCalendarEvent_(u,d) {
  const ev=findBy_('CalendarEvents','event_id',d.eventId);
  if(!ev) throw new Error('Calendar event not found.');
  const sem=findBy_('Semesters','semester_id',ev.semester_id);
  if(!sem) throw new Error('Event semester not found.');
  requireClassMember_(u.userId,sem.class_id);
  const patch=d.changes||{}, allowed=['title','event_category','description','start_at','end_at','visibility'];
  const updated={}; allowed.forEach(k=>{if(patch[k]!==undefined) updated[k]=patch[k];});
  if(!Object.keys(updated).length) throw new Error('No supported calendar fields supplied.');
  updated.updated_at=now_();
  const old=Object.assign({},ev);
  updateById_('CalendarEvents','event_id',ev.event_id,updated);
  audit_(u.userId,'UPDATE_CALENDAR_EVENT','CalendarEvents',ev.event_id,old,updated);
  return {ok:true,message:'Calendar event updated.',eventId:ev.event_id};
}

function listClassMembers_(u,d) {
  const classId=required_(d.classId,'Class');
  requireClassMember_(u.userId,classId);
  const users=getRows_('Users');
  const items=getRows_('ClassMembers').filter(m=>m.class_id===classId && m.membership_status==='active' && (!TEST_CONTEXT_ || m.user_id!==TEST_CONTEXT_.testUserId)).map(m=>{
    const user=users.find(x=>x.user_id===m.user_id)||{};
    return {userId:m.user_id,name:user.full_name||'Test user',email:user.email||'',role:m.member_role,status:m.membership_status};
  });
  return {ok:true,items:items};
}

function manageClassMemberRole_(u,d) {
  const classId=required_(d.classId,'Class');
  requireClassMember_(u.userId,classId);
  const targetId=required_(d.targetUserId,'Target user ID');
  const role=String(d.memberRole||'').toLowerCase();
  if(!['student','pic','lecturer','ko'].includes(role)) throw new Error('Only student, PIC, lecturer or KO can be assigned here.');
  const member=getRows_('ClassMembers').find(x=>x.class_id===classId && x.user_id===targetId);
  if(!member) throw new Error('Class member not found.');
  if(isSystemAdmin_(targetId)) throw new Error('Cannot change the System Admin account.');
  if(TEST_CONTEXT_ && targetId===TEST_CONTEXT_.testUserId) throw new Error('The temporary test identity cannot change its own simulated role. Start a new role test instead.');
  if(TEST_CONTEXT_ && targetId===TEST_CONTEXT_.testUserId) throw new Error('The temporary test identity cannot change its own simulated role. End this test and start a new role session instead.');
  updateById_('ClassMembers','membership_id',member.membership_id,{member_role:role,membership_status:'active',approved_by:u.userId});
  audit_(u.userId,'MANAGE_CLASS_MEMBER_ROLE','ClassMembers',member.membership_id,{member_role:member.member_role},{member_role:role});
  return {ok:true,message:'Class member role updated.',targetUserId:targetId,memberRole:role};
}

function classReport_(u,d) {
  const classId=required_(d.classId,'Class');
  requireClassMember_(u.userId,classId);
  const semesters=getRows_('Semesters').filter(x=>x.class_id===classId);
  const semesterIds=semesters.map(x=>x.semester_id);
  const ss=getRows_('SemesterSubjects').filter(x=>semesterIds.includes(x.semester_id));
  const ssIds=ss.map(x=>x.semester_subject_id);
  const assignments=getRows_('Assignments').filter(x=>ssIds.includes(x.semester_subject_id));
  const sessions=getRows_('ClassSessions').filter(x=>ssIds.includes(x.semester_subject_id));
  const members=getRows_('ClassMembers').filter(x=>x.class_id===classId && x.membership_status==='active');
  const progress=getRows_('StudentAssignmentProgress').filter(x=>assignments.some(a=>a.assignment_id===x.assignment_id));
  return {ok:true,report:{semesterCount:semesters.length,subjectCount:ss.length,assignmentCount:assignments.length,
    scheduleSessionCount:sessions.length,memberCount:members.length,progressRecordCount:progress.length,
    completedProgressCount:progress.filter(x=>x.progress_status==='completed').length}};
}

function createClassNotification_(u,d) {
  const classId=required_(d.classId,'Class');
  requireClassMember_(u.userId,classId);
  const title=required_(d.title,'Notification title');
  const message=required_(d.message,'Notification message');
  notifyClass_(classId,title,message,d.notificationType||'announcement',d.referenceId||'');
  audit_(u.userId,'CREATE_CLASS_NOTIFICATION','Notifications',classId,null,{title:title,type:d.notificationType||'announcement'});
  return {ok:true,message:'Class notification created in the active workspace.'};
}

function roleTestContext_(u,d) {
  if (!TEST_CONTEXT_) throw new Error('Role test session required.');
  const classId=TEST_CONTEXT_.classId, sessionId=TEST_CONTEXT_.sessionId;
  const allSemesters=getRows_('Semesters');
  const semesters=allSemesters.filter(x=>x.class_id===classId);
  const semesterIds=semesters.map(x=>x.semester_id);
  const semesterSubjects=getRows_('SemesterSubjects').filter(x=>semesterIds.includes(x.semester_id));
  const role=TEST_CONTEXT_.role;
  const allowedIds=role==='student'?studentVisibleSemesterSubjectIds_(''):
    role==='lecturer'?assignedSemesterSubjectIds_('lecturer',TEST_CONTEXT_.testUserId):
    role==='pic'?assignedSemesterSubjectIds_('pic',TEST_CONTEXT_.testUserId):null;
  const visibleSemesterSubjects=allowedIds
    ?semesterSubjects.filter(x=>allowedIds.includes(x.semester_subject_id))
    :semesterSubjects;
  const selectedIds=role==='student'?studentSelectedSemesterSubjectIds_(TEST_CONTEXT_.testUserId,''):[];
  const subjectIds=visibleSemesterSubjects.map(x=>x.subject_id);
  const subjects=getRows_('Subjects').filter(x=>subjectIds.includes(x.subject_id));
  const ssIds=role==='student'?selectedIds:visibleSemesterSubjects.map(x=>x.semester_subject_id);
  const contentSsIds=role==='lecturer'
    ?visibleSemesterSubjects.filter(x=>semesterSubjectHasSchedule_(x.semester_subject_id)).map(x=>x.semester_subject_id)
    :ssIds;
  const allAssignments=getRows_('Assignments');
  const classSessions=getRows_('ClassSessions');
  const scheduleSeries=getRows_('ScheduleSeries');
  const allResources=getRows_('Resources');
  const allEvents=getRows_('CalendarEvents');
  const can=pid=>roleHasPermission_(TEST_CONTEXT_.role,pid);
  const members=can('members.view')?listClassMembers_({userId:TEST_CONTEXT_.testUserId},{classId:classId}).items:[];
  const progress=can('pb.view')?getRows_('StudentAssignmentProgress').filter(x=>x.user_id===TEST_CONTEXT_.testUserId && allAssignments.some(a=>a.assignment_id===x.assignment_id && contentSsIds.includes(a.semester_subject_id))):[];
  const visibleAssignmentIds=allAssignments.filter(x=>contentSsIds.includes(x.semester_subject_id)&&
    x.status!=='cancelled'&&(role!=='student'||x.status==='published')).map(x=>x.assignment_id);
  return {ok:true,classId:classId,role:TEST_CONTEXT_.role,sessionId:sessionId,
    permissions:{
      classView:can('class.view'),semesterView:can('semester.view'),
      scheduleView:can('schedule.view'),pbView:can('pb.view'),
      resourcesView:can('resources.view'),calendarView:can('calendar.view'),
      membersView:can('members.view'),reportsView:can('reports.view')
    },
    semesters:can('semester.view')?semesters:[],
    semesterSubjects:can('semester.view')?visibleSemesterSubjects:[],
    selectedSemesterSubjectIds:selectedIds,
    subjects:can('semester.view')?subjects:[],
    availableSubjects:can('semester.manage')||can('subject.offerings.manage')?getRows_('Subjects'):[],
    sessions:can('schedule.view')?classSessions.filter(x=>ssIds.includes(x.semester_subject_id)):[],
    scheduleSeries:can('schedule.view')?scheduleSeries.filter(x=>ssIds.includes(x.semester_subject_id)):[],
    assignments:can('pb.view')?allAssignments.filter(x=>contentSsIds.includes(x.semester_subject_id)&&
      x.status!=='cancelled'&&(role!=='student'||x.status==='published')):[],
    assignmentResources:can('pb.view')?assignmentResourceLinks_(allAssignments.filter(x=>visibleAssignmentIds.includes(x.assignment_id))):[],
    resources:can('resources.view')?allResources.filter(x=>contentSsIds.includes(x.semester_subject_id) && x.visibility!=='personal' && x.visibility!=='archived'):[],
    calendarEvents:can('calendar.view')?allEvents.filter(x=>semesterIds.includes(x.semester_id) &&
      x.visibility!=='personal' && x.visibility!=='archived' &&
      (role==='lecturer'||role==='pic'?!!x.semester_subject_id&&ssIds.includes(x.semester_subject_id):
        role==='student'?(!x.semester_subject_id||ssIds.includes(x.semester_subject_id)):
        !x.semester_subject_id||contentSsIds.includes(x.semester_subject_id))):[],
    members:members,ownProgress:progress,
    auditLogs:getRows_('RoleTestAudit').filter(x=>x.session_id===sessionId).slice(-50).reverse(),
    sandboxEnabled:TEST_CONTEXT_.sandboxEnabled,
    sandboxOperations:getRows_('RoleTestData').filter(x=>x.session_id===sessionId).length};
}

function roleTestLog_(action,result,entityType,entityId,details) {
  if (!TEST_CONTEXT_) return;
  const detailText=details ? ' | '+JSON.stringify(details).slice(0,1400) : '';
  append_('RoleTestAudit',[id_('RTA'),TEST_CONTEXT_.sessionId,TEST_CONTEXT_.adminUserId,TEST_CONTEXT_.testUserId,TEST_CONTEXT_.role,action,entityType||'',entityId||'',result+detailText,now_()]);
}

function toBool_(value) {
  return value===true || String(value).toLowerCase()==='true' || String(value)==='1' || String(value).toLowerCase()==='yes';
}
function sha256_(value) {
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8);
  return bytes.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}

function devModeEnabled_() {
  return String(PropertiesService.getScriptProperties().getProperty('DEV_MODE')||'').toLowerCase()==='true';
}

/**
 * Run hashDevelopmentPasswordProperty() once after temporarily setting DEV_LOGIN_PASSWORD
 * in Script Properties. The helper replaces the plaintext property with a SHA-256 hash.
 */
function hashDevelopmentPasswordProperty() {
  const props=PropertiesService.getScriptProperties();
  const raw=props.getProperty('DEV_LOGIN_PASSWORD');
  if(!raw || raw.length<12) throw new Error('Set DEV_LOGIN_PASSWORD to at least 12 characters first.');
  props.setProperty('DEV_LOGIN_PASSWORD_HASH',sha256_(raw));
  props.deleteProperty('DEV_LOGIN_PASSWORD');
  if(!props.getProperty('DEV_LOGIN_USERNAME')) props.setProperty('DEV_LOGIN_USERNAME','devadmin');
  props.setProperty('DEV_MODE','true');
  return 'Development login enabled. Plaintext password property removed.';
}
function disableDevelopmentLogin() {
  const props=PropertiesService.getScriptProperties();
  props.setProperty('DEV_MODE','false');
  props.deleteProperty('DEV_LOGIN_PASSWORD');
  props.deleteProperty('DEV_LOGIN_PASSWORD_HASH');
  return 'Development login disabled. Google OAuth remains available.';
}
function devLogin_(d) {
  if(!devModeEnabled_()) throw new Error('Manual login is disabled. Enable DEV_MODE in Apps Script Script Properties for development only.');
  const props=PropertiesService.getScriptProperties();
  const username=String(d.username||'').trim();
  const password=String(d.password||'');
  const expectedUser=String(props.getProperty('DEV_LOGIN_USERNAME')||'devadmin');
  const expectedHash=String(props.getProperty('DEV_LOGIN_PASSWORD_HASH')||'');
  const cache=CacheService.getScriptCache();
  const lockKey='DEV_LOGIN_LOCK';
  const lock=Number(cache.get(lockKey)||0);
  if(lock>=5) throw new Error('Terlalu banyak percubaan. Tunggu 15 minit sebelum cuba lagi.');
  if(username!==expectedUser || !expectedHash || sha256_(password)!==expectedHash) {
    const next=lock+1;
    cache.put(lockKey,String(next),900);
    throw new Error('Nama pengguna atau kata laluan tidak tepat.');
  }
  cache.remove(lockKey);
  const userId='DEV_ADMIN';
  ensureDevAdminAccount_();
  const userRow=findBy_('Users','user_id',userId);
  if(!userRow || userRow.account_status!=='active' || !isSystemAdmin_(userId)) {
    throw new Error('Akaun DEV_ADMIN belum aktif atau tiada peranan pentadbir.');
  }
  const token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  const user={userId:userId,email:'devadmin@mysemester.local',name:'MySemester Development Admin',picture:'',authMode:'dev'};
  cache.put('DEV_AUTH_'+sha256_(token),JSON.stringify(user),21600);
  return {ok:true,devToken:token,user:{id:userId,email:user.email,name:user.name,isSystemAdmin:true},workspace:'system_admin',isSystemAdmin:true,classes:[]};
}

function ensureDevAdminAccount_() {
  const userId='DEV_ADMIN';
  const now=now_();
  let userRow=findBy_('Users','user_id',userId);
  if(!userRow) {
    append_('Users',[userId,'DEV_ONLY_ADMIN','devadmin@mysemester.local','MySemester Development Admin','','active',now,now]);
  } else if(userRow.account_status!=='active') {
    updateById_('Users','user_id',userId,{account_status:'active',updated_at:now});
  }

  if(!findBy_('Roles','role_id','ROLE_ADMIN')) {
    append_('Roles',['ROLE_ADMIN','admin','System administrator']);
  }

  const hasAdminRole=getRows_('UserRoles').some(x=>x.user_id===userId && (String(x.role_id).toUpperCase()==='ROLE_ADMIN'||String(x.role_id).toLowerCase()==='admin'));
  if(!hasAdminRole) {
    append_('UserRoles',[id_('UR'),userId,'ROLE_ADMIN','','','DEVELOPMENT_SEED',now]);
  }
}
function authenticateDevSession_(token) {
  if(!devModeEnabled_()) throw new Error('Development login has been disabled.');
  if(!token) throw new Error('Development session is missing. Please sign in again.');
  const raw=CacheService.getScriptCache().get('DEV_AUTH_'+sha256_(String(token)));
  if(!raw) throw new Error('Development session expired. Please sign in again.');
  return JSON.parse(raw);
}

function authenticate_(idToken) {
  if (!idToken) throw new Error('Google sign-in required.');
  const cache=CacheService.getScriptCache();
  const cacheKey='GOOGLE_ID_' + sha256_(String(idToken));
  const cached=cache.get(cacheKey);
  if(cached) return JSON.parse(cached);
  const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
  const response = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
  if (response.getResponseCode() !== 200) throw new Error('Google token verification failed.');
  const info = JSON.parse(response.getContentText());
  const rawClientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
  // Script Properties may accidentally contain surrounding quotes or spaces.
  const clientId = String(rawClientId || '').trim().replace(/^['"]|['"]$/g, '');
  const tokenAud = String(info.aud || '').trim();

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is empty in Apps Script > Project Settings > Script Properties.');
  }
  if (tokenAud !== clientId) {
    const suffix = value => value ? value.slice(-14) : '(empty)';
    throw new Error(
      'Google Client ID mismatch. Token audience ends with [' + suffix(tokenAud) +
      '] but Apps Script GOOGLE_CLIENT_ID ends with [' + suffix(clientId) +
      ']. Compare the full values; do not share the full ID publicly.'
    );
  }
  if (!info.email_verified || !info.sub || !info.email) throw new Error('Verified Google account required.');
  const identity={sub:String(info.sub),email:String(info.email).toLowerCase(),name:String(info.name || info.email),picture:String(info.picture || '')};
  const tokenTtl=Number(info.expires_in||((Number(info.exp||0)-Math.floor(Date.now()/1000))||3300));
  cache.put(cacheKey,JSON.stringify(identity),Math.min(3300,Math.max(60,tokenTtl-60)));
  return identity;
}

function ensureUser_(u, updateLastLogin) {
  const existing = findBy_('Users','email',u.email);
  const now = now_();
  if (existing) {
    if (existing.account_status !== 'active') throw new Error('Account is inactive. Contact system administrator.');
    if (existing.google_sub && !subMatches_(existing.google_sub, u.sub)) {
      throw new Error('Google identity does not match the registered account.');
    }
    const patch={};
    if (u.name && existing.full_name!==u.name) patch.full_name=u.name;
    if (u.picture!==undefined && existing.photo_url!==u.picture) patch.photo_url=u.picture;
    if (u.sub && existing.google_sub!==u.sub) patch.google_sub=u.sub;
    if (updateLastLogin) patch.last_login=now;
    if (Object.keys(patch).length) updateById_('Users','user_id',existing.user_id,patch);
    u.userId = existing.user_id;
  } else {
    u.userId = id_('USR');
    ss_().getSheetByName('Users').getRange('B:B').setNumberFormat('@'); // keep google_sub as text
    append_('Users',[u.userId,u.sub,u.email,u.name,u.picture,'active',now,now]);
    audit_(u.userId,'REGISTER','Users',u.userId,null,{email:u.email});
  }

  // Grant the system administrator role only to the verified Google identity
  // whose email exactly matches the configured administrator address.
  const adminEmail = String(
    PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || SYSTEM_ADMIN_EMAIL
  ).trim().toLowerCase();

  if (u.email.toLowerCase() === adminEmail) {
    ensureSystemAdminRole_(u.userId);
  }
}

/** Compares Google subject IDs; tolerates Sheets having converted the stored ID to a number. */
function subMatches_(stored, actual) {
  const a = String(stored).trim(), b = String(actual).trim();
  if (a === b) return true;
  if (/^[\d.]+(e\+?\d+)?$/i.test(a)) return Number(a) === Number(b);
  return false;
}

function ensureSystemAdminRole_(userId) {
  let adminRole = findBy_('Roles','role_id','ROLE_ADMIN');
  if (!adminRole) {
    adminRole = getRows_('Roles').find(r => String(r.role_name).toLowerCase() === 'admin');
  }
  if (!adminRole) {
    append_('Roles',['ROLE_ADMIN','admin','System administrator']);
    adminRole = {role_id:'ROLE_ADMIN',role_name:'admin'};
  }
  const roleId = adminRole.role_id || 'ROLE_ADMIN';
  const assigned = getRows_('UserRoles').some(r =>
    r.user_id === userId && (r.role_id === roleId || r.role_id === 'ROLE_ADMIN')
  );
  if (!assigned) {
    append_('UserRoles',[id_('UR'),userId,roleId,'','','SYSTEM',now_()]);
    audit_(userId,'GRANT_SYSTEM_ADMIN','UserRoles',userId,null,{role_id:roleId});
  }
}

function bootstrap_(u) {
  const memberships = getRows_('ClassMembers').filter(r => r.user_id === u.userId && r.membership_status === 'active');
  const allSemesters = getRows_('Semesters');
  const allSemesterSubjects = getRows_('SemesterSubjects');
  const allSubjects = getRows_('Subjects');
  const allUsers = getRows_('Users');
  const classes = memberships.map(m => {
    const c = findBy_('Classes','class_id',m.class_id);
    const role=String(m.member_role||'').toLowerCase()==='admin'?'class_admin':String(m.member_role||'').toLowerCase();
    if (!c || !roleHasPermission_(role,'class.view')) return null;
    const semesters = allSemesters.filter(s => s.class_id === c.class_id);
    const semesterIds = semesters.map(s => s.semester_id);
    let semesterSubjects = allSemesterSubjects.filter(ss => semesterIds.includes(ss.semester_id));
    if(role==='student') {
      const visibleIds=new Set(studentVisibleSemesterSubjectIds_(''));
      semesterSubjects=semesterSubjects.filter(ss=>visibleIds.has(ss.semester_subject_id));
    } else if(role==='lecturer'||role==='pic') {
      const visibleIds=new Set(assignedSemesterSubjectIds_(role,u.userId));
      semesterSubjects=semesterSubjects.filter(ss=>visibleIds.has(ss.semester_subject_id));
    }
    const selectedIds=role==='student'?studentSelectedSemesterSubjectIds_(u.userId,''):[];
    return {
      classId:c.class_id,className:c.class_name,classCode:c.class_code,
      memberRole:m.member_role,status:c.status,
      semesters:semesters.map(s=>({
        semesterId:s.semester_id,semesterName:s.semester_name,
        academicSession:s.academic_session,semesterNumber:s.semester_number,status:s.status
      })),
      permissions:ROLE_PERMISSION_DEFS.filter(permission=>roleHasPermission_(role,permission.id)).map(permission=>permission.id),
      availableSubjects:roleHasPermission_(role,'semester.manage')||roleHasPermission_(role,'subject.offerings.manage')?allSubjects:[],
      selectedSemesterSubjectIds:selectedIds,
      semesterSubjects:roleHasPermission_(role,'semester.view') ? semesterSubjects.map(ss=>{
        const subject=allSubjects.find(x=>x.subject_id===ss.subject_id)||{};
        const lecturer=allUsers.find(x=>x.user_id===ss.lecturer_user_id)||{};
        return {
          semesterSubjectId:ss.semester_subject_id,semesterId:ss.semester_id,
          subjectId:ss.subject_id,subjectCode:subject.subject_code||'',
          subjectName:subject.subject_name||'',lecturerUserId:ss.lecturer_user_id||'',
          lecturerName:lecturer.full_name||'',lecturerEmail:lecturer.email||'',
          picUserId:ss.pic_user_id||'',subjectColor:ss.subject_color||'',
          offeringName:ss.offering_name||''
        };
      }) : []
    };
  }).filter(Boolean);
  const isSystemAdmin = isSystemAdmin_(u.userId);
  return {
    ok:true,
    user:{id:u.userId,email:u.email,name:u.name,picture:u.picture,isSystemAdmin:isSystemAdmin},
    isSystemAdmin:isSystemAdmin,
    workspace:isSystemAdmin ? 'system_admin' : 'student',
    classes:classes
  };
}

function isSystemAdmin_(userId) {
  const roleRows = getRows_('Roles');
  return getRows_('UserRoles').some(r => {
    if (r.user_id !== userId) return false;
    const role = roleRows.find(x => x.role_id === r.role_id);
    return String(r.role_id).toUpperCase() === 'ROLE_ADMIN' ||
      (role && String(role.role_name).toLowerCase() === 'admin');
  });
}

function adminDashboard_(u) {
  requireRole_(u.userId,['admin']);
  const allSemesters = getRows_('Semesters');
  const allMembers = getRows_('ClassMembers').filter(m => m.membership_status === 'active');
  const allInvites = getRows_('ClassInvitations').filter(i => i.status === 'active');
  const allUsers = getRows_('Users');
  const lecturerDirectory=getRows_('LecturerDirectory');
  const classes = getRows_('Classes').map(c => {
    const semesters = allSemesters.filter(s => s.class_id === c.class_id);
    const members = allMembers.filter(m => m.class_id === c.class_id);
    const invites = allInvites.filter(i => i.class_id === c.class_id);
    return {
      classId:c.class_id,className:c.class_name,classCode:c.class_code,
      programme:c.programme,institution:c.institution,cohort:c.cohort,
      description:c.description,status:c.status,createdAt:c.created_at,
      semesterLimit:Number.isSafeInteger(Number(c.semester_limit))&&Number(c.semester_limit)>=1
        ?Number(c.semester_limit):Math.max(3,semesters.length),
      semesterCount:semesters.length,memberCount:members.length,activeInviteCount:invites.length,
      lecturers:lecturerDirectory.filter(item=>item.class_id===c.class_id).map(item=>({
        registrationId:item.registration_id,fullName:item.full_name,email:item.email,
        status:item.status,linkedUserId:item.linked_user_id||'',
        linkedName:(allUsers.find(user=>user.user_id===item.linked_user_id)||{}).full_name||''
      })),
      semesters:semesters.map(s=>({
        semesterId:s.semester_id,semesterName:s.semester_name,
        academicSession:s.academic_session,semesterNumber:s.semester_number,
        startDate:s.start_date,endDate:s.end_date,status:s.status
      }))
    };
  });
  const users = getRows_('Users').map(x => ({
    userId:x.user_id,email:x.email,fullName:x.full_name,
    accountStatus:x.account_status,lastLogin:x.last_login
  }));
  const memberships = getRows_('ClassMembers').filter(m=>m.membership_status==='active');
  return {
    ok:true,
    stats:{
      totalClasses:classes.length,
      activeClasses:classes.filter(c=>c.status==='active').length,
      draftClasses:classes.filter(c=>c.status==='draft').length,
      totalUsers:users.length,
      activeMembers:memberships.length
    },
    classes:classes,
    users:users
  };
}

function adminCreateInvitation_(u,d) {
  requireRole_(u.userId,['admin']);
  const c=findBy_('Classes','class_id',d.classId);
  if(!c) throw new Error('Class not found.');
  if(c.status!=='active') throw new Error('Activate the class before creating an invitation code.');
  const code=String(d.inviteCode||randomCode_()).trim().toUpperCase();
  if(findBy_('ClassInvitations','invite_code',code)) throw new Error('Invitation code already exists.');
  const maxUses=Math.max(0,Number(d.maxUses||0));
  const expiresAt=d.expiresAt||'';
  const inviteId=id_('INV');
  append_('ClassInvitations',[inviteId,c.class_id,code,expiresAt,maxUses,0,'active',u.userId,now_()]);
  audit_(u.userId,'CREATE_CLASS_INVITATION','ClassInvitations',inviteId,null,{classId:c.class_id,code:code});
  return {ok:true,invitationId:inviteId,inviteCode:code};
}

function adminAssignClassRole_(u,d) {
  requireRole_(u.userId,['admin']);
  const c=findBy_('Classes','class_id',d.classId);
  if(!c) throw new Error('Class not found.');
  const target=findBy_('Users','email',String(d.email||'').trim().toLowerCase());
  if(!target) throw new Error('User has not registered with Google yet. Ask them to sign in once first.');
  const role=String(d.memberRole||'').toLowerCase();
  const allowed=['admin','ko','pic','lecturer','student'];
  if(!allowed.includes(role)) throw new Error('Invalid class role.');
  const existing=getRows_('ClassMembers').find(m=>m.class_id===c.class_id&&m.user_id===target.user_id);
  if(existing) {
    updateById_('ClassMembers','membership_id',existing.membership_id,{member_role:role,membership_status:'active',approved_by:u.userId});
  } else {
    append_('ClassMembers',[id_('MEM'),c.class_id,target.user_id,role,'active',now_(),u.userId]);
  }
  audit_(u.userId,'ASSIGN_CLASS_ROLE','ClassMembers',target.user_id,null,{classId:c.class_id,email:target.email,role:role});
  return {ok:true,message:'Peranan '+role+' diberikan kepada '+target.email+'.'};
}

function adminRegisterLecturer_(u,d) {
  requireRole_(u.userId,['admin']);
  const classId=required_(d.classId,'Class');
  if(!findBy_('Classes','class_id',classId)) throw new Error('Class not found.');
  const fullName=required_(d.fullName,'Lecturer name');
  const email=required_(d.email,'Lecturer email').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid lecturer email.');
  if(getRows_('LecturerDirectory').some(row=>row.class_id===classId&&String(row.email).toLowerCase()===email)) {
    throw new Error('This lecturer email is already registered for the class.');
  }
  const user=findBy_('Users','email',email);
  if(user&&user.account_status!=='active') throw new Error('The existing account is inactive; reactivate it before registering this lecturer.');
  const membership=user&&getRows_('ClassMembers').find(row=>row.class_id===classId&&row.user_id===user.user_id);
  if(membership&&String(membership.member_role).toLowerCase()!=='lecturer') {
    throw new Error('This account already has a different class role. Resolve that role before registering it as a lecturer.');
  }
  const registrationId=id_('LDR');
  append_('LecturerDirectory',[registrationId,classId,fullName,email,'pending','',u.userId,now_(),now_()]);
  let status='pending',linkedUserId='';
  if(user) {
    if(membership) updateById_('ClassMembers','membership_id',membership.membership_id,{membership_status:'active',approved_by:u.userId});
    else append_('ClassMembers',[id_('MEM'),classId,user.user_id,'lecturer','active',now_(),u.userId]);
    status='linked';linkedUserId=user.user_id;
    updateById_('LecturerDirectory','registration_id',registrationId,{status,linked_user_id:linkedUserId,updated_at:now_()});
  }
  audit_(u.userId,'REGISTER_CLASS_LECTURER','LecturerDirectory',registrationId,null,{classId,fullName,email,status});
  return {ok:true,registrationId,status,message:status==='linked'
    ?'Pensyarah dipautkan kepada akaun Google sedia ada.'
    :'Pensyarah dipra-daftar. Minta pensyarah log masuk menggunakan emel Google ini untuk melengkapkan pautan.'};
}

function linkPreRegisteredLecturers_(user) {
  const registrations=getRows_('LecturerDirectory').filter(row=>
    String(row.email||'').trim().toLowerCase()===String(user.email||'').trim().toLowerCase()&&row.status==='pending');
  registrations.forEach(registration=>{
    const membership=getRows_('ClassMembers').find(row=>
      row.class_id===registration.class_id&&row.user_id===user.userId);
    if(membership&&String(membership.member_role).toLowerCase()!=='lecturer') {
      updateById_('LecturerDirectory','registration_id',registration.registration_id,
        {status:'conflict',linked_user_id:user.userId,updated_at:now_()});
      audit_(user.userId,'LECTURER_REGISTRATION_CONFLICT','LecturerDirectory',registration.registration_id,
        {status:'pending'},{status:'conflict',classRole:membership.member_role});
      return;
    }
    if(membership) updateById_('ClassMembers','membership_id',membership.membership_id,
      {membership_status:'active',approved_by:'LECTURER_DIRECTORY'});
    else append_('ClassMembers',[id_('MEM'),registration.class_id,user.userId,'lecturer','active',now_(),'LECTURER_DIRECTORY']);
    updateById_('LecturerDirectory','registration_id',registration.registration_id,
      {status:'linked',linked_user_id:user.userId,updated_at:now_()});
    audit_(user.userId,'LINK_PRE_REGISTERED_LECTURER','LecturerDirectory',registration.registration_id,
      {status:'pending'},{status:'linked',userId:user.userId});
  });
}

function adminUpdateUserStatus_(u,d) {
  requireRole_(u.userId,['admin']);
  const target=findBy_('Users','user_id',d.userId);
  if(!target) throw new Error('User not found.');
  if(target.user_id===u.userId && d.accountStatus!=='active') throw new Error('You cannot deactivate your own administrator account.');
  const status=String(d.accountStatus||'').toLowerCase();
  if(!['active','inactive'].includes(status)) throw new Error('Invalid account status.');
  updateById_('Users','user_id',target.user_id,{account_status:status});
  audit_(u.userId,'UPDATE_USER_STATUS','Users',target.user_id,{account_status:target.account_status},{account_status:status});
  return {ok:true,message:'User status updated.'};
}

function joinClass_(u,d) {
  if(TEST_CONTEXT_) throw new Error('Temporary role accounts are locked to the selected test class and cannot join other classes.');
  const code = String(d.inviteCode || '').trim().toUpperCase();
  if (!code) throw new Error('Enter a class invite code.');
  const inv = findBy_('ClassInvitations','invite_code',code);
  if (!inv || inv.status !== 'active') throw new Error('Invalid or inactive class code.');
  const inviteClass=findBy_('Classes','class_id',inv.class_id);
  if (!inviteClass || inviteClass.status !== 'active') throw new Error('This class is not yet active.');
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) throw new Error('Class code has expired.');
  if (Number(inv.max_uses || 0) > 0 && Number(inv.uses_count || 0) >= Number(inv.max_uses)) throw new Error('Class code usage limit reached.');
  const existing = getRows_('ClassMembers').find(r=>r.class_id===inv.class_id && r.user_id===u.userId);
  if (existing && existing.membership_status==='active') throw new Error('You are already a member of this class.');
  if (!existing) append_('ClassMembers',[id_('MEM'),inv.class_id,u.userId,'student','active',now_(),'']);
  const n = Number(inv.uses_count || 0) + 1;
  updateById_('ClassInvitations','invitation_id',inv.invitation_id,{uses_count:n});
  audit_(u.userId,'JOIN_CLASS','Classes',inv.class_id,null,{inviteCode:code});
  return {ok:true,message:'Successfully joined class.',classId:inv.class_id};
}

function createClass_(u,d) {
  requireRole_(u.userId,['admin']);
  const name = required_(d.className,'Class name');
  const semesterLimit=Number(d.semesterLimit);
  if(!Number.isSafeInteger(semesterLimit)||semesterLimit<1) throw new Error('Tetapkan bilangan semester yang sah (sekurang-kurangnya 1).');
  const classId=id_('CLS'), code=(d.classCode || randomCode_()).toUpperCase();
  if (findBy_('Classes','class_code',code)) throw new Error('Class code already exists.');
  append_('Classes',[classId,name,code,d.programme||'',d.institution||'',d.cohort||'',d.description||'',u.userId,'draft',now_(),semesterLimit]);
  append_('ClassMembers',[id_('MEM'),classId,u.userId,'admin','active',now_(),u.userId]);
  audit_(u.userId,'CREATE_CLASS','Classes',classId,null,{name:name,code:code,semesterLimit:semesterLimit});
  return {ok:true,classId:classId,classCode:code,semesterLimit:semesterLimit};
}

function activateClass_(u,d) {
  requireClassRole_(u.userId,d.classId,['admin']);
  const classRow=findBy_('Classes','class_id',d.classId);
  if(!classRow) throw new Error('Class not found.');
  const semesters=getRows_('Semesters').filter(s=>s.class_id===d.classId);
  const count=semesters.length;
  const limit=Number(classRow.semester_limit)||3;
  const semesterNumbers=semesters.map(semester=>Number(semester.semester_number));
  const completeSequence=count===limit&&new Set(semesterNumbers).size===limit&&
    semesterNumbers.every(number=>Number.isInteger(number)&&number>=1&&number<=limit);
  if(!completeSequence) throw new Error('Kelas perlu mempunyai semester bernombor 1 hingga '+limit+' sebelum diaktifkan (kini '+count+').');
  updateById_('Classes','class_id',d.classId,{status:'active'});
  audit_(u.userId,'ACTIVATE_CLASS','Classes',d.classId,null,{semesterCount:count,semesterLimit:limit});
  return {ok:true,message:'Class activated.'};
}

function createSemester_(u,d) {
  requireClassRole_(u.userId,d.classId,['admin','ko']);
  const classRow=findBy_('Classes','class_id',required_(d.classId,'Class'));
  if(!classRow) throw new Error('Class not found.');
  const semesters=getRows_('Semesters').filter(s=>s.class_id===d.classId);
  const limit=Number(classRow.semester_limit)||3;
  if(semesters.length>=limit) throw new Error('Had semester kelas telah dicapai ('+limit+').');
  const existingNumbers=new Set(semesters.map(semester=>Number(semester.semester_number)));
  let nextSemesterNumber=1;
  while(existingNumbers.has(nextSemesterNumber)&&nextSemesterNumber<=limit) nextSemesterNumber++;
  const semesterNumber=d.semesterNumber===undefined||d.semesterNumber===null||d.semesterNumber===''
    ?nextSemesterNumber:Number(d.semesterNumber);
  if(!Number.isSafeInteger(semesterNumber)||semesterNumber<1||semesterNumber>limit) {
    throw new Error('Nombor semester mesti antara 1 hingga '+limit+'.');
  }
  if(semesterNumber!==nextSemesterNumber) throw new Error('Tambah semester mengikut turutan. Nombor seterusnya ialah '+nextSemesterNumber+'.');
  const semId=id_('SEM');
  append_('Semesters',[semId,d.classId,required_(d.semesterName,'Semester name'),d.academicSession||'',semesterNumber,d.startDate||'',d.endDate||'','upcoming',now_()]);
  audit_(u.userId,'CREATE_SEMESTER','Semesters',semId,null,d);
  return {ok:true,semesterId:semId};
}

function assignSemesterSubjectStaff_(u,d) {
  const semesterSubject=findBy_('SemesterSubjects','semester_subject_id',required_(d.semesterSubjectId,'Semester subject'));
  if(!semesterSubject) throw new Error('Semester-subject mapping not found.');
  const semester=findBy_('Semesters','semester_id',semesterSubject.semester_id);
  if(!semester) throw new Error('Semester not found.');
  if(TEST_CONTEXT_ && String(semester.class_id)!==String(TEST_CONTEXT_.classId)) {
    throw new Error('Test account is limited to its selected class.');
  }
  if(!TEST_CONTEXT_ && !isSystemAdmin_(u.userId)) requireClassMember_(u.userId,semester.class_id);
  const patch={};
  [['lecturerUserId','lecturer_user_id','lecturer'],['picUserId','pic_user_id','pic']].forEach(([input,field,role])=>{
    if(d[input]===undefined) return;
    const targetId=String(d[input]||'').trim();
    if(targetId && !activeClassMemberHasRole_(targetId,semester.class_id,role)) {
      throw new Error('Pilih ahli kelas aktif dengan peranan '+(role==='lecturer'?'pensyarah':'PIC')+'.');
    }
    patch[field]=targetId;
  });
  if(!Object.keys(patch).length) throw new Error('Tiada penetapan pensyarah atau PIC untuk disimpan.');
  const previous={lecturer_user_id:semesterSubject.lecturer_user_id||'',pic_user_id:semesterSubject.pic_user_id||''};
  updateById_('SemesterSubjects','semester_subject_id',semesterSubject.semester_subject_id,patch);
  let updatedSchedules=0;
  if(patch.lecturer_user_id!==undefined&&previous.lecturer_user_id!==patch.lecturer_user_id) {
    getRows_('ClassSessions').filter(row=>row.semester_subject_id===semesterSubject.semester_subject_id&&
      String(row.lecturer_user_id||'')!==patch.lecturer_user_id).forEach(session=>{
      const old=Object.assign({},session),version=Number(session.version||1)+1;
      const changes={lecturer_user_id:patch.lecturer_user_id,version,updated_by:u.userId,updated_at:now_(),verification_status:'PENDING'};
      updateById_('ClassSessions','session_id',session.session_id,changes);
      append_('ScheduleHistory',[id_('SH'),session.session_id,version,JSON.stringify(old),
        JSON.stringify(Object.assign({},old,changes)),'Penetapan pensyarah subjek dikemas kini','PENDING',u.userId,'',now_()]);
      updatedSchedules++;
    });
  }
  audit_(u.userId,'ASSIGN_SEMESTER_SUBJECT_STAFF','SemesterSubjects',semesterSubject.semester_subject_id,previous,patch);
  return {ok:true,message:'Penetapan pensyarah dan PIC berjaya dikemas kini.',semesterSubjectId:semesterSubject.semester_subject_id,updatedSchedules};
}

function linkSemesterSubject_(u,d) {
  const semester=findBy_('Semesters','semester_id',required_(d.semesterId,'Semester'));
  if(!semester) throw new Error('Semester not found.');
  if(TEST_CONTEXT_ && String(semester.class_id)!==String(TEST_CONTEXT_.classId)) {
    throw new Error('Test account is limited to its selected class.');
  }
  if(!TEST_CONTEXT_ && !isSystemAdmin_(u.userId)) requireClassMember_(u.userId,semester.class_id);
  const subject=findBy_('Subjects','subject_id',required_(d.subjectId,'Subject'));
  if(!subject) throw new Error('Subject not found.');
  if(getRows_('SemesterSubjects').some(row=>row.semester_id===semester.semester_id&&row.subject_id===subject.subject_id)) {
    throw new Error('Subject is already linked to this semester.');
  }
  const semesterSubjectId=id_('SS');
  append_('SemesterSubjects',[semesterSubjectId,semester.semester_id,subject.subject_id,'',d.subjectColor||'#DCEBFF','active','','Kumpulan A']);
  audit_(u.userId,'LINK_SUBJECT_TO_SEMESTER','SemesterSubjects',semesterSubjectId,null,{
    semester_id:semester.semester_id,subject_id:subject.subject_id
  });
  return {ok:true,message:'Subjek dipautkan kepada semester. Tetapkan pensyarah, PIC dan jadual sebelum pelajar dapat melihatnya.',semesterSubjectId:semesterSubjectId};
}

function createSubjectOffering_(u,d) {
  const semester=findBy_('Semesters','semester_id',required_(d.semesterId,'Semester'));
  if(!semester) throw new Error('Semester not found.');
  if(TEST_CONTEXT_&&String(semester.class_id)!==String(TEST_CONTEXT_.classId)) throw new Error('Test account is limited to its selected class.');
  const isAdmin=!TEST_CONTEXT_&&isSystemAdmin_(u.userId);
  const member=TEST_CONTEXT_?null:getRows_('ClassMembers').find(row=>
    row.user_id===u.userId&&row.class_id===semester.class_id&&row.membership_status==='active');
  if(!isAdmin&&!TEST_CONTEXT_&&!member) throw new Error('Active class membership required.');
  const role=TEST_CONTEXT_?TEST_CONTEXT_.role:String(member?.member_role||'').toLowerCase();
  const normalizedRole=role==='admin'?'class_admin':role;
  if(!isAdmin&&!roleHasPermission_(normalizedRole,'subject.offerings.manage')) {
    throw new Error('Permission denied: subject.offerings.manage.');
  }
  if(normalizedRole==='lecturer'&&d.lecturerUserId&&String(d.lecturerUserId)!==String(u.userId)) {
    throw new Error('Pensyarah hanya boleh memilih akaunnya sendiri untuk tawaran ini.');
  }
  const lecturerUserId=normalizedRole==='lecturer'?u.userId:required_(d.lecturerUserId,'Lecturer');
  const picUserId=required_(d.picUserId,'PIC');
  if(!activeUserHasClassRole_(lecturerUserId,semester.class_id,'lecturer')) throw new Error('Pensyarah mesti akaun aktif dengan peranan Pensyarah dalam kelas ini.');
  if(!activeUserHasClassRole_(picUserId,semester.class_id,'pic')) throw new Error('PIC mesti ahli aktif berperanan PIC dalam kelas ini.');
  const offeringName=required_(d.offeringName,'Offering / group name');
  let subject=d.subjectId?findBy_('Subjects','subject_id',d.subjectId):null;
  if(d.subjectId&&!subject) throw new Error('Subject not found.');
  if(!subject) {
    const subjectCode=required_(d.subjectCode,'Subject code').trim().toUpperCase();
    const subjectName=required_(d.subjectName,'Subject name');
    if(getRows_('Subjects').some(row=>String(row.subject_code||'').trim().toUpperCase()===subjectCode)) {
      throw new Error('Subject code already exists. Select the catalog subject instead.');
    }
    subject={subject_id:id_('SUB'),subject_code:subjectCode,subject_name:subjectName,
      credit_hour:Number(d.creditHour||0),description:String(d.subjectDescription||''),created_at:now_()};
    append_('Subjects',[subject.subject_id,subject.subject_code,subject.subject_name,subject.credit_hour,subject.description,subject.created_at]);
    invalidateRowsCache_('Subjects');
  }
  const existing=getRows_('SemesterSubjects').filter(row=>row.semester_id===semester.semester_id&&row.subject_id===subject.subject_id);
  if(existing.some(row=>String(row.offering_name||'').trim().toLowerCase()===offeringName.toLowerCase())) {
    throw new Error('This offering name already exists for the subject in this semester.');
  }
  const semesterSubjectId=id_('SS');
  const row=[semesterSubjectId,semester.semester_id,subject.subject_id,lecturerUserId,
    d.subjectColor||'#DCEBFF','active',picUserId,offeringName];
  append_('SemesterSubjects',row);
  audit_(u.userId,'CREATE_SUBJECT_OFFERING','SemesterSubjects',semesterSubjectId,null,{
    semesterId:semester.semester_id,subjectId:subject.subject_id,lecturerUserId,picUserId,offeringName
  });
  return {ok:true,message:'Tawaran subjek berjaya diwujudkan. Tambah jadual untuk membolehkan pelajar memilihnya.',
    semesterSubjectId,subjectId:subject.subject_id};
}

function selectStudentSubjectOffering_(u,d) {
  const semester=findBy_('Semesters','semester_id',required_(d.semesterId,'Semester'));
  if(!semester) throw new Error('Semester not found.');
  if(TEST_CONTEXT_&&String(semester.class_id)!==String(TEST_CONTEXT_.classId)) throw new Error('Test account is limited to its selected class.');
  if(!TEST_CONTEXT_&&!getRows_('ClassMembers').some(member=>member.user_id===u.userId&&
    member.class_id===semester.class_id&&member.membership_status==='active'&&String(member.member_role).toLowerCase()==='student')) {
    throw new Error('Only an active student in this class can choose an offering.');
  }
  const subjectId=required_(d.subjectId,'Subject');
  const semesterSubjectId=String(d.semesterSubjectId||'');
  let offering=null;
  if(semesterSubjectId) {
    offering=findBy_('SemesterSubjects','semester_subject_id',semesterSubjectId);
    if(!offering||offering.semester_id!==semester.semester_id||offering.subject_id!==subjectId||
      !studentVisibleSemesterSubjectIds_(semesterSubjectId).includes(semesterSubjectId)) {
      throw new Error('This subject offering is unavailable for student selection.');
    }
  }
  const existing=getRows_('StudentSemesterSubjects').find(row=>
    row.user_id===u.userId&&row.semester_id===semester.semester_id&&row.subject_id===subjectId);
  const status=offering?'selected':'inactive';
  const selectedAt=offering?now_():'';
  if(existing) updateById_('StudentSemesterSubjects','selection_id',existing.selection_id,{
    semester_subject_id:offering?offering.semester_subject_id:'',status,selected_at:selectedAt
  });
  else append_('StudentSemesterSubjects',[id_('SSS'),u.userId,semester.semester_id,subjectId,
    offering?offering.semester_subject_id:'',status,selectedAt]);
  audit_(u.userId,'SELECT_STUDENT_SUBJECT_OFFERING','StudentSemesterSubjects',
    existing?existing.selection_id:u.userId,{semesterId:semester.semester_id,subjectId},
    {semesterSubjectId:offering?offering.semester_subject_id:'',status});
  return {ok:true,message:offering?'Pilihan pensyarah dan kumpulan disimpan.':'Pilihan tawaran subjek dibatalkan.'};
}

function listSchedules_(u,d) {
  requireClassMember_(u.userId,d.classId);
  const semester=findBy_('Semesters','semester_id',d.semesterId);
  if (!semester || semester.class_id!==d.classId) throw new Error('Semester not found in this class.');
  const ssIds=getRows_('SemesterSubjects').filter(x=>x.semester_id===d.semesterId).map(x=>x.semester_subject_id);
  const memberRole=classRoleForUser_(u.userId,d.classId);
  const allowedIds=memberRole==='lecturer'?assignedSemesterSubjectIds_('lecturer',u.userId):
    memberRole==='pic'?assignedSemesterSubjectIds_('pic',u.userId):
    memberRole==='student'?studentSelectedSemesterSubjectIds_(u.userId,d.semesterId):ssIds;
  const rows=getRows_('ClassSessions').filter(x=>allowedIds.includes(x.semester_subject_id)&&ssIds.includes(x.semester_subject_id));
  const series=getRows_('ScheduleSeries').filter(x=>allowedIds.includes(x.semester_subject_id)&&ssIds.includes(x.semester_subject_id));
  return {ok:true,items:rows,series:series};
}

function createScheduleSession_(u,d) {
  const ss=findBy_('SemesterSubjects','semester_subject_id',d.semesterSubjectId);
  const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
  if(!sem) throw new Error('Semester subject not found.');
  requireClassMember_(u.userId,sem.class_id);
  const sessionId=id_('SES');
  const row=[sessionId,d.semesterSubjectId,'',required_(d.sessionDate,'Session date'),
    required_(d.startTime,'Start time'),required_(d.endTime,'End time'),d.room||'',
    ss.lecturer_user_id||'',d.deliveryMode||'Bersemuka',d.sessionType||'Kuliah','active',1,'PENDING',u.userId,now_()];
  append_('ClassSessions',row);
  append_('ScheduleHistory',[id_('SH'),sessionId,1,'',JSON.stringify(row),'Sesi jadual baharu','PENDING',u.userId,'',now_()]);
  audit_(u.userId,'CREATE_SCHEDULE_SESSION','ClassSessions',sessionId,null,d);
  notifyClass_(sem.class_id,'Sesi jadual baharu','Sesi jadual baharu telah direkodkan dan menunggu pengesahan.','schedule',sessionId);
  return {ok:true,message:'Schedule session created in the active workspace and pending verification.',sessionId:sessionId};
}

function updateSchedule_(u,d) {
  const session=findBy_('ClassSessions','session_id',d.sessionId);
  if (!session) throw new Error('Session not found.');
  const ss=findBy_('SemesterSubjects','semester_subject_id',session.semester_subject_id);
  const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
  requireClassRole_(u.userId,sem.class_id,['admin','ko','pic','lecturer']);
  const old=Object.assign({},session);
  const patch=d.changes||{};
  const allowed=['session_date','start_time','end_time','room','lecturer_user_id','delivery_mode','session_type','status'];
  const updated={};
  allowed.forEach(k=>{if (patch[k] !== undefined) updated[k]=patch[k];});
  if (!Object.keys(updated).length) throw new Error('No schedule fields supplied.');
  const version=Number(session.version||1)+1;
  updated.version=version; updated.updated_by=u.userId; updated.updated_at=now_(); updated.verification_status='PENDING';
  updateById_('ClassSessions','session_id',session.session_id,updated);
  append_('ScheduleHistory',[id_('SH'),session.session_id,version,JSON.stringify(old),JSON.stringify(Object.assign({},old,updated)),d.reason||'Schedule update','PENDING',u.userId,'',now_()]);
  audit_(u.userId,'UPDATE_SCHEDULE','ClassSessions',session.session_id,old,updated);
  notifyClass_(sem.class_id,'Jadual dikemas kini','Jadual kelas telah dikemas kini. Status pengesahan: menunggu semakan.','schedule',session.session_id);
  return {ok:true,message:'Schedule updated. Verification remains pending.',version:version};
}

function verifySchedule_(u,d) {
  const session=findBy_('ClassSessions','session_id',d.sessionId);
  if (!session) throw new Error('Session not found.');
  const ss=findBy_('SemesterSubjects','semester_subject_id',session.semester_subject_id);
  const sem=findBy_('Semesters','semester_id',ss.semester_id);
  requireClassRole_(u.userId,sem.class_id,['admin','ko','lecturer']);
  const status=(d.status==='VERIFIED')?'VERIFIED':'REJECTED';
  updateById_('ClassSessions','session_id',session.session_id,{verification_status:status});
  const hist=getRows_('ScheduleHistory').filter(x=>x.session_id===session.session_id).sort((a,b)=>Number(b.version)-Number(a.version))[0];
  if (hist) updateById_('ScheduleHistory','history_id',hist.history_id,{verification_status:status,verified_by:u.userId});
  audit_(u.userId,'VERIFY_SCHEDULE','ClassSessions',session.session_id,null,{verification_status:status,comment:d.comment||''});
  return {ok:true,status:status};
}

function listAssignments_(u,d) {
  requireClassMember_(u.userId,d.classId);
  const semester=findBy_('Semesters','semester_id',d.semesterId);
  if (!semester || semester.class_id!==d.classId) throw new Error('Semester not found in this class.');
  const ssIds=getRows_('SemesterSubjects').filter(x=>x.semester_id===d.semesterId).map(x=>x.semester_subject_id);
  const role=classRoleForUser_(u.userId,d.classId);
  const allowedIds=role==='lecturer'?lecturerScheduleSubjectIds_(u.userId):
    role==='pic'?assignedSemesterSubjectIds_('pic',u.userId):
    role==='student'?studentSelectedSemesterSubjectIds_(u.userId,d.semesterId):ssIds;
  const items=getRows_('Assignments').filter(x=>allowedIds.includes(x.semester_subject_id)&&ssIds.includes(x.semester_subject_id) &&
    x.status!=='cancelled'&&(role!=='student'||x.status==='published'));
  const assignmentIds=items.map(x=>x.assignment_id);
  const progress=getRows_('StudentAssignmentProgress')
    .filter(x=>x.user_id===u.userId && assignmentIds.includes(x.assignment_id));
  const assignmentResources=assignmentResourceLinks_(items);
  return {ok:true,items:items,progress:progress,assignmentResources:assignmentResources};
}

function createAssignment_(u,d) {
  const ss=findBy_('SemesterSubjects','semester_subject_id',d.semesterSubjectId);
  const sem=ss && findBy_('Semesters','semester_id',ss.semester_id);
  if (!sem) throw new Error('Semester subject not found.');
  requireClassRole_(u.userId,sem.class_id,['admin','ko','lecturer']);
  const aid=id_('PB');
  const row=[aid,d.semesterSubjectId,d.assignmentCode||aid,d.title,d.assignmentType||'Other',d.description||'',Number(d.marksPercentage||0),d.startDate||'',d.dueAt||'',d.submissionMethod||'Manual',JSON.stringify(d.submissionFormat||[]),'published',u.userId,now_(),now_()];
  append_('Assignments',row);
  audit_(u.userId,'CREATE_ASSIGNMENT','Assignments',aid,null,d);
  notifyClass_(sem.class_id,'PB baharu: '+d.title,'Tugasan baharu telah diterbitkan.','assignment',aid);
  return {ok:true,assignmentId:aid};
}

function updateProgress_(u,d) {
  const a=findBy_('Assignments','assignment_id',d.assignmentId);
  if (!a) throw new Error('Assignment not found.');
  const semesterSubject=findBy_('SemesterSubjects','semester_subject_id',a.semester_subject_id);
  const semester=semesterSubject&&findBy_('Semesters','semester_id',semesterSubject.semester_id);
  if (!semester) throw new Error('Assignment semester not found.');
  requireClassMember_(u.userId,semester.class_id);
  const exists=getRows_('StudentAssignmentProgress').find(x=>x.assignment_id===a.assignment_id && x.user_id===u.userId);
  const patch=d.progress||{};
  const status=['not_started','in_progress','nearly_done','completed'].includes(patch.progress_status)?patch.progress_status:'in_progress';
  const pct=Math.max(0,Math.min(100,Number(patch.progress_percentage||0)));
  if (exists) updateById_('StudentAssignmentProgress','progress_id',exists.progress_id,{progress_status:status,progress_percentage:pct,personal_due_at:patch.personal_due_at||'',personal_notes:patch.personal_notes||'',actual_completed_at:status==='completed'?now_():'',updated_at:now_()});
  else append_('StudentAssignmentProgress',[id_('PRG'),a.assignment_id,u.userId,status,pct,patch.personal_due_at||'',patch.personal_notes||'',status==='completed'?now_():'','',now_()]);
  return {ok:true,message:'Personal progress saved.'};
}

function listResources_(u,d) {
  requireClassMember_(u.userId,d.classId);
  const semesterSubject=findBy_('SemesterSubjects','semester_subject_id',d.semesterSubjectId);
  const semester=semesterSubject&&findBy_('Semesters','semester_id',semesterSubject.semester_id);
  if (!semester || semester.class_id!==d.classId) throw new Error('Subject not found in this class.');
  const role=classRoleForUser_(u.userId,d.classId);
  if(role==='lecturer'||role==='pic') requireAssignedRoleSubject_(role,u.userId,d.semesterSubjectId);
  if(role==='student'&&(!studentVisibleSemesterSubjectIds_(d.semesterSubjectId).includes(d.semesterSubjectId)||
    !studentSelectedSemesterSubjectIds_(u.userId,semesterSubject.semester_id).includes(d.semesterSubjectId))) {
    throw new Error('Pilih tawaran subjek ini sebelum membuka sumber pembelajaran.');
  }
  const rows=getRows_('Resources').filter(r=>r.semester_subject_id===d.semesterSubjectId && r.visibility!=='personal' && r.visibility!=='archived');
  return {ok:true,items:rows};
}

function listCalendarEvents_(u,d) {
  requireClassMember_(u.userId,d.classId);
  const semester=findBy_('Semesters','semester_id',d.semesterId);
  if (!semester || semester.class_id!==d.classId) throw new Error('Semester not found in this class.');
  const role=classRoleForUser_(u.userId,d.classId);
  const allowedIds=role==='lecturer'?lecturerScheduleSubjectIds_(u.userId):
    role==='pic'?assignedSemesterSubjectIds_('pic',u.userId):
    role==='student'?studentSelectedSemesterSubjectIds_(u.userId,d.semesterId):null;
  const scopedRole=role==='lecturer'||role==='pic';
  const items=getRows_('CalendarEvents')
    .filter(x=>x.semester_id===d.semesterId && x.visibility!=='personal' && x.visibility!=='archived' &&
      (scopedRole?!!x.semester_subject_id&&allowedIds.includes(x.semester_subject_id):
        role==='student'?(!x.semester_subject_id||allowedIds.includes(x.semester_subject_id)):
        !allowedIds||allowedIds.length>0&&(!x.semester_subject_id||allowedIds.includes(x.semester_subject_id))));
  return {ok:true,items:items};
}

function createCalendarEvent_(u,d) {
  const sem=findBy_('Semesters','semester_id',d.semesterId);
  requireClassRole_(u.userId,sem.class_id,['admin','ko','pic','lecturer']);
  const eid=id_('EV');
  append_('CalendarEvents',[eid,d.semesterId,d.semesterSubjectId||'',required_(d.title,'Event title'),d.eventCategory||'academic',d.description||'',d.startAt||'',d.endAt||'',d.sourceType||'manual',d.sourceId||'','class',u.userId,now_()]);
  return {ok:true,eventId:eid};
}

/* Helpers */
let SS_CACHE_=null;
let ROW_CACHE_={};
const CACHE_PREFIX_='MS_ROWS_';

function ss_(){if(!SS_CACHE_)SS_CACHE_=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));return SS_CACHE_;}

function invalidateRowsCache_(name) {
  if(!ROW_CACHE_) ROW_CACHE_={};
  const cache=CacheService.getScriptCache();
  if(name) {
    delete ROW_CACHE_['RAW:'+name];
    Object.keys(ROW_CACHE_).filter(k=>k.endsWith(':'+name)).forEach(k=>delete ROW_CACHE_[k]);
    try { cache.remove(CACHE_PREFIX_+name); } catch(e){}
  } else {
    ROW_CACHE_={};
    try {
      const keys=Object.keys(APP.SHEETS).map(n=>CACHE_PREFIX_+n);
      keys.push('EXTENDED_SHEETS_READY','EXTENDED_SHEETS_READY_V3','EXTENDED_SHEETS_READY_V4',
        'EXTENDED_SHEETS_READY_V5','ROLE_MATRIX_READY','ROLE_MATRIX_READY_V2');
      cache.removeAll(keys);
    } catch(e){}
  }
}

function clearCache_(u) {
  requireRole_(u.userId,['admin']);
  invalidateRowsCache_();
  return {ok:true,message:'Cache berjaya dikosongkan. Data terkini daripada Google Sheets sedia digunakan.'};
}

function rawRows_(name){
  const key='RAW:'+name;
  if(ROW_CACHE_ && ROW_CACHE_[key]) return ROW_CACHE_[key];

  // Try cross-request cache
  const cache=CacheService.getScriptCache();
  const cacheKey=CACHE_PREFIX_+name;
  try {
    const cached=cache.get(cacheKey);
    if(cached) {
      const parsed=JSON.parse(cached);
      if(Array.isArray(parsed)) {
        ROW_CACHE_[key]=parsed;
        return parsed;
      }
    }
  } catch(e){}

  const sh=ss_().getSheetByName(name);
  if(!sh) return (ROW_CACHE_[key]=[]);
  const values=sh.getDataRange().getValues();
  if(values.length<2) return (ROW_CACHE_[key]=[]);
  const headers=values.shift();
  const rows=values.filter(r=>r.some(v=>v!=='')).map(r=>{
    const o={};
    headers.forEach((h,i)=>o[h]=r[i] instanceof Date?Utilities.formatDate(r[i],APP.TZ,"yyyy-MM-dd'T'HH:mm:ss"):r[i]);
    return o;
  });

  ROW_CACHE_[key]=rows;

  // Cache in ScriptCache if size permits (<100KB)
  try {
    const json=JSON.stringify(rows);
    if(json.length<95000) cache.put(cacheKey,json,300); // 5 minutes TTL
  } catch(e){}

  return rows;
}
function getRows_(name){
  const contextKey=TEST_CONTEXT_?TEST_CONTEXT_.sessionId:'LIVE';
  const cacheKey=contextKey+':'+name;
  if(ROW_CACHE_ && ROW_CACHE_[cacheKey]) return ROW_CACHE_[cacheKey];
  let rows=rawRows_(name).map(r=>Object.assign({},r));
  const overlaySheets=['RoleTestData','RoleTestSessions','RoleTestAccounts','RoleTestAudit'];
  if(TEST_CONTEXT_ && overlaySheets.indexOf(name)<0 && name!=='PermissionMatrix') {
    const headers=APP.SHEETS[name]||[];
    if(TEST_CONTEXT_.sandboxEnabled) {
      rawRows_('RoleTestData').filter(x=>x.session_id===TEST_CONTEXT_.sessionId && x.sheet_name===name).forEach(op=>{
        if(op.operation==='APPEND') {
          try { const arr=JSON.parse(op.row_json||'[]'); const obj={}; headers.forEach((h,i)=>obj[h]=arr[i]===undefined?'':arr[i]); rows.push(obj); } catch(e) {}
        } else if(op.operation==='PATCH') {
          const target=rows.find(r=>String(r[headers[0]])===String(op.record_id));
          if(target) { try { Object.assign(target,JSON.parse(op.patch_json||'{}')); } catch(e) {} }
        }
      });
    }
    if(name==='ClassMembers') {
      rows.push({
        membership_id:'TESTMEM_'+TEST_CONTEXT_.sessionId,class_id:TEST_CONTEXT_.classId,
        user_id:TEST_CONTEXT_.testUserId,member_role:TEST_CONTEXT_.role==='class_admin'?'admin':TEST_CONTEXT_.role,
        membership_status:'active',joined_at:now_(),approved_by:TEST_CONTEXT_.adminUserId
      });
      // Companion student identity is a sandbox-only target for lecturer mark-entry tests.
      if(TEST_CONTEXT_.role!=='student') rows.push({
        membership_id:'TESTMEM_STUDENT_'+TEST_CONTEXT_.sessionId,class_id:TEST_CONTEXT_.classId,
        user_id:'TST_STUDENT_COMPANION_'+TEST_CONTEXT_.sessionId,member_role:'student',
        membership_status:'active',joined_at:now_(),approved_by:TEST_CONTEXT_.adminUserId
      });
    }
    if(name==='Users') {
      rows.push({
        user_id:TEST_CONTEXT_.testUserId,google_sub:'TEST_ONLY',email:TEST_CONTEXT_.testEmail,
        full_name:'MySemester Test '+TEST_CONTEXT_.role.toUpperCase(),photo_url:'',
        account_status:'active',created_at:now_(),last_login:now_()
      });
      if(TEST_CONTEXT_.role!=='student') rows.push({
        user_id:'TST_STUDENT_COMPANION_'+TEST_CONTEXT_.sessionId,google_sub:'TEST_ONLY',
        email:'student-companion+'+TEST_CONTEXT_.sessionId.toLowerCase()+'@mysemester.invalid',
        full_name:'MySemester Test Student (sandbox)',photo_url:'',account_status:'active',
        created_at:now_(),last_login:now_()
      });
    }
  }
  ROW_CACHE_[cacheKey]=rows;
  return rows;
}
function append_(name,row){
  if(TEST_CONTEXT_ && TEST_CONTEXT_.sandboxEnabled && ['RoleTestData','RoleTestSessions','RoleTestAccounts','RoleTestAudit','PermissionMatrix'].indexOf(name)<0) {
    appendRaw_('RoleTestData',[TEST_CONTEXT_.sessionId,name,'APPEND',String(row[0]||''),JSON.stringify(row),'',now_()]);
    invalidateRowsCache_(name);
    return;
  }
  appendRaw_(name,row);
}
function appendRaw_(name,row){ss_().getSheetByName(name).appendRow(row);invalidateRowsCache_(name);}
function findBy_(name,key,value){return getRows_(name).find(r=>String(r[key])===String(value))||null;}
function updateById_(name,key,id,patch){
  if(TEST_CONTEXT_ && TEST_CONTEXT_.sandboxEnabled && ['RoleTestData','RoleTestSessions','RoleTestAccounts','RoleTestAudit','PermissionMatrix'].indexOf(name)<0) {
    const existing=getRows_(name).find(r=>String(r[key])===String(id));
    if(!existing) throw new Error('Record not found in '+name);
    appendRaw_('RoleTestData',[TEST_CONTEXT_.sessionId,name,'PATCH',String(id),'',JSON.stringify(patch),now_()]);
    invalidateRowsCache_(name);
    return;
  }
  const sh=ss_().getSheetByName(name), data=sh.getDataRange().getValues(), headers=data[0], keyCol=headers.indexOf(key);
  for(let i=1;i<data.length;i++){
    if(String(data[i][keyCol])===String(id)){
      const updated=data[i].slice();
      Object.keys(patch).forEach(k=>{const c=headers.indexOf(k);if(c>=0)updated[c]=patch[k];});
      sh.getRange(i+1,1,1,headers.length).setValues([updated]);
      invalidateRowsCache_(name);return;
    }
  }
  throw new Error('Record not found in '+name);
}
function id_(prefix){return prefix+'_'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase();}
function now_(){return Utilities.formatDate(new Date(),APP.TZ,"yyyy-MM-dd'T'HH:mm:ss");}
function randomCode_(){return Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();}
function required_(v,label){if(v===undefined||v===null||String(v).trim()==='')throw new Error(label+' is required.');return String(v).trim();}
function requireRole_(userId,roles){const roleRows=getRows_('Roles');const assigned=getRows_('UserRoles').filter(x=>x.user_id===userId).map(x=>{const rr=roleRows.find(r=>r.role_id===x.role_id);return rr?String(rr.role_name).toLowerCase():String(x.role_id).toLowerCase();});const memberships=getRows_('ClassMembers').filter(x=>x.user_id===userId&&x.membership_status==='active').map(x=>String(x.member_role).toLowerCase());const all=assigned.concat(memberships);if(!roles.some(x=>all.includes(x)))throw new Error('Permission denied.');}
function requireClassMember_(userId,classId){
  if(TEST_CONTEXT_ && userId===TEST_CONTEXT_.testUserId) {
    if(String(classId)!==String(TEST_CONTEXT_.classId)) throw new Error('Temporary test account is limited to its selected class.');
    return;
  }
  if(isSystemAdmin_(userId))return;
  const m=getRows_('ClassMembers').find(x=>x.user_id===userId&&x.class_id===classId&&x.membership_status==='active');
  if(!m)throw new Error('Active class membership required.');
}
function requireClassRole_(userId,classId,roles){
  // Role authorization is enforced centrally by ACTION_PERMISSION and the editable matrix.
  // This helper now verifies membership/scope only; the roles argument is retained for compatibility.
  requireClassMember_(userId,classId);
}
function notifyClass_(classId,title,message,type,ref){
  getRows_('ClassMembers').filter(m=>m.class_id===classId&&m.membership_status==='active').forEach(m=>append_('Notifications',[id_('NTF'),m.user_id,classId,title,message,type,'',ref,false,now_(),'']));
}
function audit_(uid,action,type,eid,oldData,newData){append_('AuditLogs',[id_('LOG'),uid,action,type,eid,oldData?JSON.stringify(oldData):'',newData?JSON.stringify(newData):'',now_()]);}


/**
 * Development-only deterministic demo dataset.
 * Creates 20 Users (including DEV_ADMIN), 1 class, 3 semesters, 6 subjects,
 * 18 semester-subject links and 20 records for the main CRUD modules.
 * Safe to run repeatedly: stable IDs prevent duplicate seeding.
 */
function seedDevelopmentDemoData() {
  if(!devModeEnabled_()) throw new Error('Set Script Property DEV_MODE=true before seeding demo data.');
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('DEMO_SEED_VERSION')==='2') return 'Demo data already seeded.';
  setupDatabase();
  const now=now_(), classId='DEMO_CLASS_2026', adminId='DEV_ADMIN';
  const userRows=[];
  userRows.push([adminId,'DEV_ONLY_ADMIN','devadmin@mysemester.local','MySemester Development Admin','','active',now,now]);
  const demoUsers=[];
  const addUser=(id,role,name,email)=>demoUsers.push({id,role,name,email});
  addUser('DEMO_KO_01','ko','Aina Farhana','aina.ko@example.test');
  addUser('DEMO_PIC_01','pic','Muhammad Danish','danish.pic@example.test');
  addUser('DEMO_PIC_02','pic','Nur Izzati','izzati.pic@example.test');
  for(let i=1;i<=4;i++) addUser('DEMO_LECT_'+String(i).padStart(2,'0'),'lecturer',['Amir Hakim','Siti Hajar','Farid Azman','Nurul Syafiqah'][i-1],`lecturer${i}@example.test`);
  for(let i=1;i<=12;i++) addUser('DEMO_STU_'+String(i).padStart(2,'0'),'student',['Adam','Aqil','Aisyah','Balqis','Danish','Farah','Haziq','Iman','Jannah','Kamal','Luqman','Mira'][i-1]+' Demo',`student${i}@example.test`);
  demoUsers.forEach(x=>userRows.push([x.id,'DEMO_ONLY_'+x.id,x.email,x.name,'','active',now,now]));
  const usersSh=ss_().getSheetByName('Users');
  const existingUsers=getRows_('Users').map(x=>x.user_id);
  const newUsers=userRows.filter(r=>!existingUsers.includes(r[0]));
  if(newUsers.length) usersSh.getRange(usersSh.getLastRow()+1,1,newUsers.length,newUsers[0].length).setValues(newUsers);
  invalidateRowsCache_('Users');

  if(!findBy_('Roles','role_id','ROLE_ADMIN')) append_('Roles',['ROLE_ADMIN','admin','System administrator']);
  if(!getRows_('UserRoles').some(x=>x.user_id===adminId && x.role_id==='ROLE_ADMIN'))
    append_('UserRoles',[id_('UR'),adminId,'ROLE_ADMIN','','','DEVELOPMENT_SEED',now]);

  if(!findBy_('Classes','class_id',classId))
    append_('Classes',[classId,'Kohort Demo MySemester 2026','DEMO26','Diploma Teknologi Maklumat','Institut Demo','Ambilan 2026','Dataset demonstrasi pembangunan',adminId,'active',now,3]);

  const semesterRows=[];
  for(let i=1;i<=3;i++) semesterRows.push([`DEMO_SEM_${i}`,classId,`Semester ${i}`,'2026/2027',i,`2026-0${i*2}-01`,`2026-${String(i*2+1).padStart(2,'0')}-30`,'active',now]);
  const semSh=ss_().getSheetByName('Semesters');
  const semExisting=getRows_('Semesters').map(x=>x.semester_id);
  const semNew=semesterRows.filter(r=>!semExisting.includes(r[0]));
  if(semNew.length) semSh.getRange(semSh.getLastRow()+1,1,semNew.length,semNew[0].length).setValues(semNew);
  invalidateRowsCache_('Semesters');

  const subjectDefs=[
    ['DEMO_SUB_01','IT101','Programming Fundamentals',3],
    ['DEMO_SUB_02','IT102','Database Management',3],
    ['DEMO_SUB_03','IT103','Computer Networking',3],
    ['DEMO_SUB_04','IT104','Mobile Application Development',3],
    ['DEMO_SUB_05','IT105','Web Development',3],
    ['DEMO_SUB_06','IT106','Cloud Computing',3]
  ];
  const subSh=ss_().getSheetByName('Subjects'), subExist=getRows_('Subjects').map(x=>x.subject_id);
  const subNew=subjectDefs.filter(r=>!subExist.includes(r[0])).map(r=>[...r,'Subjek demonstrasi MySemester',now]);
  if(subNew.length) subSh.getRange(subSh.getLastRow()+1,1,subNew.length,subNew[0].length).setValues(subNew);
  invalidateRowsCache_('Subjects');

  const lecturerIds=['DEMO_LECT_01','DEMO_LECT_02','DEMO_LECT_03','DEMO_LECT_04'];
  const picIds=['DEMO_PIC_01','DEMO_PIC_02'];
  const ssRows=[];
  let ssIndex=0;
  for(let sem=1;sem<=3;sem++) for(let sub=1;sub<=6;sub++) {
    ssIndex++;
    ssRows.push([`DEMO_SS_${String(ssIndex).padStart(2,'0')}`,`DEMO_SEM_${sem}`,`DEMO_SUB_${String(sub).padStart(2,'0')}`,
      lecturerIds[(sub-1)%4],['#dbeafe','#dcfce7','#fef3c7','#fce7f3'][(sub-1)%4],'active',
      picIds[(sub-1)%picIds.length],'Kumpulan A']);
  }
  const ssSh=ss_().getSheetByName('SemesterSubjects'), ssExist=getRows_('SemesterSubjects').map(x=>x.semester_subject_id);
  const ssNew=ssRows.filter(r=>!ssExist.includes(r[0]));
  if(ssNew.length) ssSh.getRange(ssSh.getLastRow()+1,1,ssNew.length,ssNew[0].length).setValues(ssNew);
  ssRows.filter(row=>ssExist.includes(row[0])).forEach(row=>updateById_('SemesterSubjects','semester_subject_id',row[0],{
    lecturer_user_id:row[3],subject_color:row[4],status:row[5],pic_user_id:row[6],offering_name:row[7]
  }));
  invalidateRowsCache_('SemesterSubjects');

  const roleMembers=demoUsers.map(x=>[id_('MEM'),classId,x.id,x.role,'active',now,adminId]);
  const cmSh=ss_().getSheetByName('ClassMembers'), memberExisting=getRows_('ClassMembers').map(x=>x.user_id);
  const cmNew=roleMembers.filter(r=>!memberExisting.includes(r[2]));
  if(cmNew.length) cmSh.getRange(cmSh.getLastRow()+1,1,cmNew.length,cmNew[0].length).setValues(cmNew);
  invalidateRowsCache_('ClassMembers');

  const sessions=[], assignments=[], resources=[], events=[], progress=[], submissions=[], notifications=[];
  const subjectLinkIds=ssRows.map(x=>x[0]);
  const studentIds=demoUsers.filter(x=>x.role==='student').map(x=>x.id);
  for(let i=1;i<=20;i++) {
    const ssid=subjectLinkIds[(i-1)%subjectLinkIds.length];
    const day=String((i%27)+1).padStart(2,'0');
    const date=`2026-11-${day}`;
    sessions.push([`DEMO_SESSION_${String(i).padStart(2,'0')}`,ssid,'',date,i%2?'09:00':'14:00',i%2?'11:00':'16:00',`Makmal ${((i-1)%4)+1}`,lecturerIds[(i-1)%4],i%3?'Bersemuka':'Dalam talian',i%2?'Kuliah':'Amali','scheduled',1,'VERIFIED',adminId,now]);
    assignments.push([`DEMO_PB_${String(i).padStart(2,'0')}`,ssid,`PB-${String(i).padStart(2,'0')}`,`Tugasan Demonstrasi ${i}`,['Amali','Projek','Kuiz','Laporan'][i%4],`Arahan demonstrasi untuk tugasan ${i}.`,[10,15,20,25][i%4],`2026-10-${String((i%27)+1).padStart(2,'0')}`,`2026-11-${day}`,'LMS','{}','published',lecturerIds[(i-1)%4],now,now]);
    resources.push([`DEMO_RES_${String(i).padStart(2,'0')}`,'',ssid,'',lecturerIds[(i-1)%4],`Nota Demonstrasi ${i}`,'link','external',`https://example.test/resources/${i}`,'text/html',0,`Sumber contoh ${i}`,'class',now]);
    events.push([`DEMO_EVENT_${String(i).padStart(2,'0')}`,`DEMO_SEM_${((i-1)%3)+1}`,ssid,`Acara Akademik ${i}`,['academic','deadline','assessment'][i%3],`Acara demonstrasi ${i}.`,`2026-11-${day}T09:00:00`,`2026-11-${day}T10:00:00`,'manual','', 'class',adminId,now]);
    const stu=studentIds[(i-1)%studentIds.length];
    progress.push([`DEMO_PROGRESS_${String(i).padStart(2,'0')}`,`DEMO_PB_${String(i).padStart(2,'0')}`,stu,['not_started','in_progress','nearly_done','completed'][i%4],(i*5)%101,'2026-11-30',`Catatan ujian ${i}`,i%4===0?now:'',[i%4===0?75+i%20:''],now]);
    submissions.push([`DEMO_SUBMISSION_${String(i).padStart(2,'0')}`,`DEMO_PB_${String(i).padStart(2,'0')}`,stu,'',now,['submitted','reviewed','late'][i%3],`Maklum balas demonstrasi ${i}`,i%2?75+i%20:'']);
    notifications.push([`DEMO_NOTIF_${String(i).padStart(2,'0')}`,stu,classId,`Hebahan Demo ${i}`,`Ini notifikasi demonstrasi nombor ${i}.`,'announcement','','',false,now,'']);
  }
  const lecturerDirectory=demoUsers.filter(user=>user.role==='lecturer').map((user,index)=>
    [`DEMO_LDR_${String(index+1).padStart(2,'0')}`,classId,user.name,user.email,'linked',user.id,adminId,now,now]);
  const scheduledOfferingIds=new Set(sessions.map(row=>row[1]));
  const studentSelections=[];
  studentIds.forEach(studentId=>ssRows.filter(row=>scheduledOfferingIds.has(row[0])).forEach(row=>
    studentSelections.push([`DEMO_SEL_${studentId}_${row[0]}`,studentId,row[1],row[2],row[0],'selected',now])));
  const bulk={
    LecturerDirectory:lecturerDirectory,
    StudentSemesterSubjects:studentSelections,
    ClassSessions:sessions,Assignments:assignments,Resources:resources,CalendarEvents:events,
    StudentAssignmentProgress:progress,SubmissionRecords:submissions,Notifications:notifications
  };
  Object.keys(bulk).forEach(name=>{
    const sh=ss_().getSheetByName(name), key=APP.SHEETS[name][0], existing=getRows_(name).map(x=>String(x[key]));
    const fresh=bulk[name].filter(r=>!existing.includes(String(r[0])));
    if(fresh.length) sh.getRange(sh.getLastRow()+1,1,fresh.length,fresh[0].length).setValues(fresh);
    invalidateRowsCache_(name);
  });
  props.setProperty('DEMO_SEED_VERSION','2');
  return {ok:true,usersCreated:newUsers.length,totalDemoUsers:20,classId:classId,semesters:3,subjects:6,scheduleSessions:20,assignments:20,resources:20,calendarEvents:20,studentProgress:20};
}

/** Run manually after setting Script Properties. */
function testDatabaseConnection(){return {spreadsheet:ss_().getName(),tabs:ss_().getSheets().length,timezone:APP.TZ};}


/**
 * Check that the configured administrator email is correct.
 * Run manually from the Apps Script editor after setting Script Properties.
 */
function checkSystemAdminConfiguration() {
  const configured = String(
    PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || SYSTEM_ADMIN_EMAIL
  ).trim().toLowerCase();
  return {
    adminEmail: configured,
    timezone: APP.TZ,
    spreadsheet: ss_().getName(),
    message: 'Admin will be granted automatically after this Google account signs in successfully.'
  };
}