/* ==========================================================================
   LAPMS - demonstration dataset

   Everything here is FICTIONAL. It is generated deterministically (seeded PRNG)
   so every reviewer sees the same school, and it mirrors the table structure in
   section 11 of the requirements document.
   ========================================================================== */
(function (global) {
  'use strict';

  var R = U.rng(20260913);

  // ---------- Reference lists ----------
  var STATUSES = {
    present:  { key: 'present',  label: 'Present',  short: 'P', icon: '✓', cls: 'present',  tone: 'good' },
    late:     { key: 'late',     label: 'Late',     short: 'L', icon: '◴', cls: 'late',     tone: 'warning' },
    absent:   { key: 'absent',   label: 'Absent',   short: 'A', icon: '✕', cls: 'absent',   tone: 'critical' },
    excused:  { key: 'excused',  label: 'Excused',  short: 'E', icon: '✉', cls: 'excused',  tone: 'serious' },
    activity: { key: 'activity', label: 'School activity', short: 'S', icon: '⚑', cls: 'activity', tone: 'accent' }
  };
  var STATUS_ORDER = ['present', 'late', 'absent', 'excused', 'activity'];

  var BEHAVIOUR = {
    excellent: { key: 'excellent', label: 'Excellent', icon: '★', rank: 5 },
    good:      { key: 'good',      label: 'Good',      icon: '✓', rank: 4 },
    fair:      { key: 'fair',      label: 'Fair',      icon: '○', rank: 3 },
    bad:       { key: 'bad',       label: 'Bad',       icon: '▲', rank: 2 },
    worst:     { key: 'worst',     label: 'Worst',     icon: '!', rank: 1 }
  };
  var BEHAVIOUR_ORDER = ['excellent', 'good', 'fair', 'bad', 'worst'];

  var SUBJECTS = ['English', 'Kiswahili', 'Mathematics', 'Science', 'Social Studies'];
  var PERIODS = [
    { period: 1, start: '08:00' }, { period: 2, start: '09:00' },
    { period: 3, start: '10:30' }, { period: 4, start: '11:30' }
  ];

  // ---------- Source rows ----------
  var CLASS_ROWS = [
    { id: 'c-1', form: 'Grade 4', stream: 'Simba', room: 'Block A, Room 1' },
    { id: 'c-2', form: 'Grade 5', stream: 'Chui',  room: 'Block A, Room 4' },
    { id: 'c-3', form: 'Grade 6', stream: 'Twiga', room: 'Block B, Room 2' },
    { id: 'c-4', form: 'Grade 7', stream: 'Ndovu', room: 'Block C, Room 1' },
    { id: 'c-5', form: 'Grade 7', stream: 'Nyati', room: 'Block C, Room 2' }
  ];

  var LEARNER_ROWS = [
    // Grade 4 Simba
    ['Amani Wekesa', 'c-1', 'sg1'], ['Brian Kiptoo', 'c-1'], ['Cynthia Adhiambo', 'c-1'],
    ['Daniel Mutiso', 'c-1'], ['Esther Chebet', 'c-1', 'sg2'], ['Faith Nekesa', 'c-1'],
    ['George Omondi', 'c-1'], ['Halima Yusuf', 'c-1', 'sg4'], ['Ian Macharia', 'c-1'],
    ['Joy Wairimu', 'c-1'], ['Kevin Barasa', 'c-1'],
    // Grade 5 Chui
    ['Lucy Njoki', 'c-2'], ['Martin Ochieng', 'c-2', 'sg3'], ['Nancy Kerubo', 'c-2'],
    ['Oscar Mwangi', 'c-2', 'sg5'], ['Purity Chelimo', 'c-2'], ['Collins Odhiambo', 'c-2'],
    ['Rachel Wambui', 'c-2'], ['Samuel Kiprop', 'c-2'], ['Tabitha Mueni', 'c-2'],
    ['Victor Simiyu', 'c-2'], ['Winnie Atieno', 'c-2'],
    // Grade 6 Twiga
    ['Abdi Yusuf', 'c-3', 'sg4'], ['Beatrice Nyambura', 'c-3'], ['Charles Kimani', 'c-3'],
    ['Dorcas Chepkoech', 'c-3'], ['Elijah Mutua', 'c-3'], ['Florence Akinyi', 'c-3'],
    ['Gideon Rotich', 'c-3'], ['Hellen Wanjala', 'c-3'], ['Isaac Mwenda', 'c-3'],
    ['Janet Ochieng', 'c-3', 'sg3'], ['Kelvin Otieno', 'c-3'],
    // Grade 7 Ndovu
    ['Linet Chepngeno', 'c-4'], ['Michael Kilonzo', 'c-4'], ['Naomi Auma', 'c-4'],
    ['Owen Mwangi', 'c-4', 'sg5'], ['Pauline Kavata', 'c-4'], ['Reuben Chebet', 'c-4', 'sg2'],
    ['Sharon Wekesa', 'c-4', 'sg1'], ['Tony Muriuki', 'c-4'], ['Mercy Anyango', 'c-4'],
    ['Vincent Karanja', 'c-4'], ['Zawadi Mwikali', 'c-4'],
    ['Agnes Wafula', 'c-5'], ['Brian Cheruiyot', 'c-5'], ['Doreen Nafula', 'c-5'],
    ['Eric Wanyama', 'c-5'], ['Grace Chemutai', 'c-5'], ['Henry Mutugi', 'c-5'],
    ['Jane Wangui', 'c-5'], ['Peter Lagat', 'c-5'], ['Sarah Nekesa', 'c-5']
  ];

  var PARENT_FIRST = ['Mary', 'Joseph', 'Agnes', 'Patrick', 'Rose', 'Stephen', 'Jane', 'Simon',
    'Lydia', 'Charles', 'Priscilla', 'Bernard', 'Eunice', 'Julius', 'Monica', 'Anthony',
    'Beatrice', 'Francis', 'Caroline', 'Douglas', 'Emily', 'Geoffrey', 'Hilda', 'Kennedy',
    'Irene', 'Lawrence', 'Naomi', 'Paul', 'Regina', 'Timothy', 'Sylvia', 'Wilson',
    'Teresia', 'Evans', 'Maureen', 'Dennis', 'Josphine', 'Amos', 'Zipporah'];

  var RELATIONSHIPS = ['Mother', 'Father', 'Guardian', 'Mother', 'Father'];

  var TEACHER_ROWS = [
    { name: 'Margaret Achieng', staffNo: 'TSC/44821', classId: 'c-1', subjects: ['English'] },
    { name: 'Peter Kamau',      staffNo: 'TSC/51037', classId: 'c-2', subjects: ['Kiswahili'] },
    { name: 'Grace Wanjiru',    staffNo: 'TSC/38915', classId: 'c-3', subjects: ['Science'] },
    { name: 'Samuel Otieno',    staffNo: 'TSC/60244', classId: 'c-4', subjects: ['Social Studies'] },
    { name: 'Alice Njeri',      staffNo: 'TSC/47702', classId: null,  subjects: ['Mathematics'] },
    { name: 'David Kiplagat',   staffNo: 'TSC/52890', classId: 'c-5', subjects: ['English'] },
    { name: 'Ruth Mwangi',      staffNo: 'TSC/41336', classId: null,  subjects: ['Science'] },
    { name: 'Joseph Omollo',    staffNo: 'TSC/58017', classId: null,  subjects: ['Kiswahili'] }
  ];

  // Who teaches what, where. Every class is shared by several teachers.
  var SUBJECT_ASSIGNMENTS = [
    ['c-1', 't-1', 'English'], ['c-1', 't-8', 'Kiswahili'], ['c-1', 't-5', 'Mathematics'],
    ['c-1', 't-7', 'Science'], ['c-1', 't-4', 'Social Studies'],
    ['c-2', 't-2', 'Kiswahili'], ['c-2', 't-6', 'English'], ['c-2', 't-5', 'Mathematics'],
    ['c-2', 't-7', 'Science'], ['c-2', 't-4', 'Social Studies'],
    ['c-3', 't-3', 'Science'], ['c-3', 't-1', 'English'], ['c-3', 't-8', 'Kiswahili'],
    ['c-3', 't-5', 'Mathematics'], ['c-3', 't-4', 'Social Studies'],
    ['c-4', 't-4', 'Social Studies'], ['c-4', 't-6', 'English'], ['c-4', 't-8', 'Kiswahili'],
    ['c-4', 't-5', 'Mathematics'], ['c-4', 't-3', 'Science'],
    ['c-5', 't-6', 'English'], ['c-5', 't-2', 'Kiswahili'], ['c-5', 't-5', 'Mathematics'],
    ['c-5', 't-7', 'Science'], ['c-5', 't-4', 'Social Studies']
  ];

  var POSITIVE_NOTES = [
    'Helped a classmate who was struggling with the group task.',
    'Excellent participation in the reading lesson this morning.',
    'Handed in all assignments on time this week.',
    'Volunteered to lead the class clean-up.',
    'Very respectful and attentive throughout the double lesson.',
    'Showed real improvement in group presentations.',
    'Encouraged a new learner and helped them settle in.'
  ];
  var NEUTRAL_NOTES = [
    'Steady work this week, participation could improve slightly.',
    'Completing tasks, but needs reminders to start on time.',
    'Quiet in class discussions; will encourage participation.'
  ];
  var CONCERN_NOTES = [
    'Repeatedly arriving without the required exercise book.',
    'Disrupted the lesson twice today; spoke with the learner afterwards.',
    'Incomplete homework three times this week.',
    'Left the classroom during the lesson without permission.'
  ];

  var PARENT_NOTE_DEPART = [
    'Left home at the usual time, walking with the neighbour.',
    'Dropped at the gate by the school van.',
    'Left a little late this morning, traffic on the main road.',
    'Walking with the elder sibling today.',
    ''
  ];
  var PARENT_NOTE_ARRIVE = [
    'Arrived home safely.',
    'Home, slightly late - the van was delayed.',
    'Home and already doing homework.',
    ''
  ];

  // ---------- Helpers ----------
  function pick(arr) { return arr[Math.floor(R() * arr.length)]; }
  function chance(p) { return R() < p; }
  function between(a, b) { return a + Math.floor(R() * (b - a + 1)); }
  function timeStr(h, m) { return U.pad(h) + ':' + U.pad(m); }

  /** The school day the app should treat as "current": today, or the last weekday. */
  function currentSchoolDay() {
    var d = U.today();
    while (U.isWeekend(d)) d = U.addDays(d, -1);
    return d;
  }

  // ==========================================================================
  // Build
  // ==========================================================================
  function build() {
    var db = {
      version: 4,
      generatedAt: new Date().toISOString(),
      school: {
        id: 's-1',
        name: 'Mwangaza Primary School',
        motto: 'Elimu ni Mwanga',
        county: 'Nakuru County',
        address: 'P.O. Box 1184, Nakuru',
        phone: '+254 700 000 000',
        email: 'office@mwangaza.sc.ke'
      },
      settings: {
        term: 'Term 3, 2026',
        schoolStart: '07:30',
        schoolEnd: '16:00',
        attendanceCutoff: '08:30',
        lateAfter: '07:45',
        notifyParentOnAbsent: true,
        notifyParentOnLate: true,
        notifyOnMissingRegister: true,
        releaseConfirmation: false
      },
      users: [], classes: [], teachers: [], teacherAssignments: [],
      lessons: [], lessonAttendance: [],
      learners: [], parents: [], parentLinks: [],
      attendance: [], movements: [], behaviour: [], comments: [],
      notifications: [], auditLogs: []
    };

    var uid = 0, nid = 0, aid = 0;
    function newUser(name, role, phone, email) {
      uid += 1;
      var u = {
        id: 'u-' + uid, name: name, role: role,
        phone: phone, email: email,
        status: 'active', createdAt: '2026-01-08'
      };
      db.users.push(u);
      return u;
    }
    function log(userId, action, record, date, time) {
      db.auditLogs.push({
        id: 'log-' + (++aid), userId: userId, action: action, record: record,
        date: date || currentSchoolDay(), time: time || timeStr(between(7, 16), between(0, 59))
      });
    }
    function notify(recipientId, type, title, message, date, time, link) {
      db.notifications.push({
        id: 'n-' + (++nid), recipientId: recipientId, type: type,
        title: title, message: message, date: date, time: time,
        read: false, link: link || null
      });
    }

    // --- Administrator ---
    var head = newUser('Josephine Mwende', 'admin', '+254 722 114 556', 'head@mwangaza.sc.ke');
    head.title = 'Head Teacher';
    var deputy = newUser('Anne Chepkorir', 'admin', '+254 733 908 121', 'deputy@mwangaza.sc.ke');
    deputy.title = 'Deputy Head Teacher';

    // --- Classes & teachers ---
    CLASS_ROWS.forEach(function (c) {
      db.classes.push({ id: c.id, form: c.form, name: c.form, stream: c.stream, room: c.room,
        year: 2026, label: c.form + ' ' + c.stream });
    });

    TEACHER_ROWS.forEach(function (t, i) {
      var user = newUser(t.name, 'teacher',
        '+254 7' + between(10, 99) + ' ' + between(100, 999) + ' ' + between(100, 999),
        t.name.toLowerCase().replace(/\s+/g, '.') + '@mwangaza.sc.ke');
      var teacher = { id: 't-' + (i + 1), userId: user.id, name: t.name, staffNo: t.staffNo, subjects: t.subjects };
      db.teachers.push(teacher);
      if (t.classId) {
        db.teacherAssignments.push({ id: 'ta-' + (i + 1) + 'a', teacherId: teacher.id, classId: t.classId, role: 'Class teacher' });
      }
    });
    SUBJECT_ASSIGNMENTS.forEach(function (a, i) {
      db.teacherAssignments.push({ id: 'ta-s' + (i + 1), teacherId: a[1], classId: a[0], role: a[2] });
    });

    function classTeacherUserId(classId) {
      var ta = db.teacherAssignments.filter(function (a) { return a.classId === classId && a.role === 'Class teacher'; })[0];
      if (!ta) return head.id;
      var t = db.teachers.filter(function (x) { return x.id === ta.teacherId; })[0];
      return t ? t.userId : head.id;
    }

    // --- Learners, parents, links ---
    var siblingParent = {};   // siblingGroup -> parentId
    var pcount = 0;
    LEARNER_ROWS.forEach(function (row, i) {
      var name = row[0], classId = row[1], sg = row[2];
      var surname = name.split(' ').slice(-1)[0];
      var learner = {
        id: 'l-' + (i + 1),
        admissionNo: 'ADM/2026/' + U.pad(i + 1) + (i + 1 < 10 ? '' : ''),
        name: name,
        classId: classId,
        photo: null,
        status: 'active',
        dateOfBirth: (2026 - (classId === 'c-1' ? 10 : classId === 'c-2' ? 11 : classId === 'c-3' ? 12 : 13)) + '-' + U.pad(between(1, 12)) + '-' + U.pad(between(1, 28)),
        emergencyContact: '+254 7' + between(10, 99) + ' ' + between(100, 999) + ' ' + between(100, 999),
        reliability: 0.82 + R() * 0.12   // internal: drives generated attendance
      };
      learner.admissionNo = 'ADM/2026/' + U.pad(i + 1);
      db.learners.push(learner);

      var parentId = sg ? siblingParent[sg] : null;
      if (!parentId) {
        pcount += 1;
        var pname = PARENT_FIRST[(pcount - 1) % PARENT_FIRST.length] + ' ' + surname;
        var puser = newUser(pname, 'parent',
          '+254 7' + between(10, 99) + ' ' + between(100, 999) + ' ' + between(100, 999),
          pname.toLowerCase().replace(/\s+/g, '.') + '@example.co.ke');
        var parent = { id: 'p-' + pcount, userId: puser.id, name: pname, phone: puser.phone, email: puser.email };
        db.parents.push(parent);
        parentId = parent.id;
        if (sg) siblingParent[sg] = parentId;
      }
      db.parentLinks.push({
        id: 'pl-' + (i + 1),
        parentId: parentId,
        learnerId: learner.id,
        relationship: RELATIONSHIPS[i % RELATIONSHIPS.length],
        authorized: true,
        verifiedOn: '2026-01-12'
      });
    });

    // ------------------------------------------------------------------
    // Attendance, movements, behaviour over the term to date
    // ------------------------------------------------------------------
    var current = currentSchoolDay();
    var days = U.schoolDays(current, 25);       // oldest first, includes `current`
    var past = days.slice(0, days.length - 1);
    var dayInProgress = (current === U.today());
    var nowH = new Date().getHours();
    var arrivalsDue = !dayInProgress || nowH >= 16;

    var PENDING_CLASS = 'c-1';  // the demo teacher's outstanding register

    var arec = 0, mrec = 0, brec = 0, crec = 0;

    function markDay(date, learner, isCurrent) {
      // The non-present mass is split so that absence and lateness actually occur:
      // late 42%, absent 33%, excused 18%, school activity 7% of it.
      var p = learner.reliability;
      var rest = 1 - p;
      var r = R();
      var status;
      if (r < p) status = 'present';
      else if (r < p + rest * 0.42) status = 'late';
      else if (r < p + rest * 0.75) status = 'absent';
      else if (r < p + rest * 0.93) status = 'excused';
      else status = 'activity';

      var time = null;
      if (status === 'present') time = timeStr(7, between(10, 44));
      else if (status === 'late') time = timeStr(between(7, 8), between(46, 59));
      else if (status === 'activity') time = timeStr(7, between(15, 40));

      db.attendance.push({
        id: 'a-' + (++arec),
        learnerId: learner.id,
        date: date,
        status: status,
        time: time,
        markedBy: classTeacherUserId(learner.classId),
        markedAt: timeStr(8, between(5, 40)),
        note: status === 'excused' ? pick(['Medical appointment, letter received.', 'Family bereavement.', 'Attending a clinic visit.', 'Permission granted by the class teacher.']) : null
      });
      return status;
    }

    function moveDay(date, learner, status, isCurrent) {
      var parentLink = db.parentLinks.filter(function (l) { return l.learnerId === learner.id; })[0];
      var parent = db.parents.filter(function (p) { return p.id === parentLink.parentId; })[0];

      var confirmsDeparture = status === 'absent' ? chance(0.15) : chance(isCurrent ? 0.86 : 0.74);
      if (confirmsDeparture) {
        db.movements.push({
          id: 'm-' + (++mrec), learnerId: learner.id, date: date, type: 'departure',
          time: timeStr(6, between(20, 59)), confirmedBy: parent.userId,
          comment: chance(0.35) ? pick(PARENT_NOTE_DEPART) : ''
        });
      }
      var arrivalPossible = status !== 'absent' && (!isCurrent || arrivalsDue);
      if (arrivalPossible && chance(isCurrent ? 0.62 : 0.70)) {
        db.movements.push({
          id: 'm-' + (++mrec), learnerId: learner.id, date: date, type: 'arrival',
          time: timeStr(between(16, 17), between(0, 59)), confirmedBy: parent.userId,
          comment: chance(0.3) ? pick(PARENT_NOTE_ARRIVE) : ''
        });
      }
    }

    days.forEach(function (date) {
      var isCurrent = date === current;
      db.learners.forEach(function (learner) {
        var registerTaken = !(isCurrent && learner.classId === PENDING_CLASS);
        var status = registerTaken ? markDay(date, learner, isCurrent) : 'unmarked';
        moveDay(date, learner, status, isCurrent);
      });
    });

    // The current school day is what every dashboard opens on, so make sure it
    // shows the full range of states rather than whatever the draw produced.
    (function shapeCurrentDay() {
      var want = [
        { status: 'absent', n: 2, note: null },
        { status: 'excused', n: 1, note: 'Medical appointment, letter received.' },
        { status: 'activity', n: 1, note: null }
      ];
      var pool = db.attendance.filter(function (a) { return a.date === current && a.status === 'present'; });
      var step = Math.max(1, Math.floor(pool.length / 9));
      var at = step;
      want.forEach(function (w) {
        for (var i = 0; i < w.n && at < pool.length; i++, at += step) {
          var rec = pool[at];
          rec.status = w.status;
          rec.note = w.note;
          rec.time = w.status === 'activity' ? timeStr(7, between(15, 40)) : null;
        }
      });
      // Someone arriving late is the most common real case - guarantee one.
      if (pool.length > 2) {
        var lateRec = pool[pool.length - 2];
        lateRec.status = 'late';
        lateRec.time = timeStr(8, between(2, 25));
        lateRec.note = null;
      }
    })();

    // ------------------------------------------------------------------
    // Lessons, and who attended each one
    // Any teacher assigned to a class records their own lesson; the daily
    // register stays with the class teacher.
    // ------------------------------------------------------------------
    var lessonDays = days.slice(-20);
    var lrec = 0, larec = 0;

    lessonDays.forEach(function (date) {
      db.classes.forEach(function (cls) {
        var subjectRows = db.teacherAssignments.filter(function (a) {
          return a.classId === cls.id && a.role !== 'Class teacher';
        });
        if (!subjectRows.length) return;

        // Four periods a day, rotating through the class's subjects.
        PERIODS.forEach(function (slot, idx) {
          var a = subjectRows[(idx + lessonDays.indexOf(date)) % subjectRows.length];
          var teacher = db.teachers.filter(function (t) { return t.id === a.teacherId; })[0];
          if (!teacher) return;

          var lesson = {
            id: 'ls-' + (++lrec),
            classId: cls.id,
            teacherId: teacher.id,
            subject: a.role,
            date: date,
            period: slot.period,
            startsAt: slot.start,
            room: cls.room,
            recordedBy: teacher.userId,
            recordedAt: slot.start
          };
          db.lessons.push(lesson);

          db.learners.filter(function (l) { return l.classId === cls.id; }).forEach(function (learner) {
            var day = db.attendance.filter(function (x) {
              return x.learnerId === learner.id && x.date === date;
            })[0];
            var status;
            if (!day) status = 'present';
            else if (day.status === 'absent') status = 'absent';
            else if (day.status === 'excused') status = 'excused';
            else if (day.status === 'activity') status = 'excused';
            else status = chance(0.94) ? 'present' : (chance(0.6) ? 'late' : 'absent');

            db.lessonAttendance.push({
              id: 'la-' + (++larec),
              lessonId: lesson.id,
              learnerId: learner.id,
              status: status
            });
          });
        });
      });
    });

    // Behaviour records - weighted towards positive observations
    db.learners.forEach(function (learner) {
      var n = between(0, 3);
      for (var i = 0; i < n; i++) {
        var date = past[between(0, past.length - 1)];
        var r = R(), category, note;
        if (r < 0.32) { category = 'excellent'; note = pick(POSITIVE_NOTES); }
        else if (r < 0.60) { category = 'good'; note = pick(POSITIVE_NOTES); }
        else if (r < 0.80) { category = 'fair'; note = pick(NEUTRAL_NOTES); }
        else if (r < 0.93) { category = 'bad'; note = pick(CONCERN_NOTES); }
        else { category = 'worst'; note = pick(CONCERN_NOTES); }
        db.behaviour.push({
          id: 'b-' + (++brec), learnerId: learner.id, date: date,
          time: timeStr(between(8, 15), between(0, 59)),
          category: category, comment: note,
          recordedBy: classTeacherUserId(learner.classId),
          sharedWithParent: true
        });
      }
    });

    // A few parent/teacher comment threads
    var threadSeeds = [
      { learner: 'l-1', text: 'Good morning teacher. Amani had a slight stomach upset last night but is feeling better and has gone to school.', reply: 'Thank you for letting me know. I will keep an eye on him and send word if anything changes.' },
      { learner: 'l-13', text: 'Martin says he did not understand yesterday’s Kiswahili assignment. Is there anything we can do at home?', reply: 'Noted. I will go through it with him again on Thursday and share a short practice sheet.' },
      { learner: 'l-27', text: 'We have spoken with Elijah at home about the homework. Thank you for raising it early.', reply: null },
      { learner: 'l-41', text: 'Tony will be collected at 3pm on Friday for a hospital appointment.', reply: 'Received. I have recorded it and the office has been informed.' },
      { learner: 'l-39', text: 'Reuben left home at 6:30 today with his brother. Please confirm he arrived.', reply: 'He is here and was marked present at 7:22.' }
    ];
    threadSeeds.forEach(function (t, i) {
      var link = db.parentLinks.filter(function (l) { return l.learnerId === t.learner; })[0];
      var parent = db.parents.filter(function (p) { return p.id === link.parentId; })[0];
      var learner = db.learners.filter(function (l) { return l.id === t.learner; })[0];
      var date = past[past.length - 1 - (i % 4)];
      var rootId = 'cm-' + (++crec);
      db.comments.push({
        id: rootId, learnerId: t.learner, date: date, time: timeStr(between(6, 9), between(0, 59)),
        authorId: parent.userId, text: t.text, replyTo: null,
        rating: ['excellent', 'good', 'fair', 'good', 'excellent'][i % 5]
      });
      if (t.reply) {
        db.comments.push({
          id: 'cm-' + (++crec), learnerId: t.learner, date: date, time: timeStr(between(10, 15), between(0, 59)),
          authorId: classTeacherUserId(learner.classId), text: t.reply, replyTo: rootId
        });
      }
    });

    // ------------------------------------------------------------------
    // Notifications derived from the records above
    // ------------------------------------------------------------------
    function parentUserFor(learnerId) {
      var link = db.parentLinks.filter(function (l) { return l.learnerId === learnerId; })[0];
      if (!link) return null;
      var p = db.parents.filter(function (x) { return x.id === link.parentId; })[0];
      return p ? p.userId : null;
    }

    db.attendance.filter(function (a) { return a.date === current || a.date === past[past.length - 1]; })
      .forEach(function (a) {
        var learner = db.learners.filter(function (l) { return l.id === a.learnerId; })[0];
        var pu = parentUserFor(a.learnerId);
        if (!pu) return;
        if (a.status === 'absent') {
          notify(pu, 'absent', 'Marked absent',
            learner.name + ' was marked absent on ' + U.shortDate(a.date) + '. Please contact the class teacher if this is unexpected.',
            a.date, a.markedAt, 'attendance');
        } else if (a.status === 'late') {
          notify(pu, 'late', 'Marked late',
            learner.name + ' arrived at ' + a.time + ' on ' + U.shortDate(a.date) + '.',
            a.date, a.markedAt, 'attendance');
        }
      });

    db.behaviour.filter(function (b) { return b.category === 'worst' || b.category === 'bad'; })
      .slice(0, 10)
      .forEach(function (b) {
        var learner = db.learners.filter(function (l) { return l.id === b.learnerId; })[0];
        var pu = parentUserFor(b.learnerId);
        if (pu) {
          notify(pu, 'behaviour', 'Behaviour note recorded',
            'A note was recorded for ' + learner.name + ': ' + BEHAVIOUR[b.category].label + '.',
            b.date, b.time, 'behaviour');
        }
      });

    // Register not taken - to the class teacher and to administrators
    var pendingTeacherUser = classTeacherUserId(PENDING_CLASS);
    var pendingClass = db.classes.filter(function (c) { return c.id === PENDING_CLASS; })[0];
    notify(pendingTeacherUser, 'register', 'Register not yet taken',
      'Attendance for ' + pendingClass.label + ' has not been recorded for ' + U.shortDate(current) + '.',
      current, db.settings.attendanceCutoff, 'attendance');
    [head.id, deputy.id].forEach(function (a) {
      notify(a, 'register', 'Register outstanding',
        pendingClass.label + ' has no attendance record for ' + U.shortDate(current) + '.',
        current, db.settings.attendanceCutoff, 'attendance');
    });

    // School-wide announcement
    db.users.forEach(function (u) {
      notify(u.id, 'announcement', 'Term 3 parents’ meeting',
        'The Term 3 parents’ meeting will be held on Saturday at 9:00 a.m. in the school hall.',
        past[past.length - 2], '15:00', null);
    });

    // Teacher replies awaiting parents
    db.comments.filter(function (c) { return c.replyTo; }).forEach(function (c) {
      var pu = parentUserFor(c.learnerId);
      var learner = db.learners.filter(function (l) { return l.id === c.learnerId; })[0];
      if (pu) {
        notify(pu, 'reply', 'Teacher replied to your comment',
          'A teacher responded to your message about ' + learner.name + '.', c.date, c.time, 'messages');
      }
    });

    // Mark older notifications as read so the unread counts look plausible
    db.notifications.forEach(function (n) {
      if (n.date < past[past.length - 1]) n.read = true;
    });

    // ------------------------------------------------------------------
    // Audit trail
    // ------------------------------------------------------------------
    log(head.id, 'Created academic term', db.settings.term, days[0], '08:02');
    log(head.id, 'Registered class', 'Grade 7 Ndovu', days[0], '08:11');
    log(head.id, 'Linked parent to learner', 'Mary Wekesa → Amani Wekesa, Sharon Wekesa', days[0], '09:24');
    db.teachers.forEach(function (t, i) {
      log(head.id, 'Assigned teacher', t.name + ' → ' + (t.subjects[0] === 'Class teacher' ? db.classes[i] ? db.classes[i].label : 'class' : t.subjects[0]), days[1], timeStr(9, 10 + i));
    });
    past.slice(-6).forEach(function (d) {
      db.classes.forEach(function (c) {
        log(classTeacherUserId(c.id), 'Submitted attendance register', c.label + ' — ' + U.shortDate(d), d, timeStr(8, between(5, 40)));
      });
    });
    log(deputy.id, 'Exported attendance report', 'Whole school — ' + db.settings.term, past[past.length - 1], '16:20');
    log(head.id, 'Updated school settings', 'Attendance cut-off set to ' + db.settings.attendanceCutoff, past[past.length - 3], '11:05');
    log(head.id, 'Deactivated user account', 'Former staff account', past[past.length - 8], '10:41');
    db.auditLogs.sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });

    // Remove the internal generation-only field
    db.learners.forEach(function (l) { delete l.reliability; });

    db.meta = {
      currentSchoolDay: current,
      pendingClassId: PENDING_CLASS,
      termDays: days
    };
    return db;
  }

  global.SEED = {
    build: build,
    currentSchoolDay: currentSchoolDay,
    STATUSES: STATUSES,
    STATUS_ORDER: STATUS_ORDER,
    BEHAVIOUR: BEHAVIOUR,
    BEHAVIOUR_ORDER: BEHAVIOUR_ORDER
  };
})(window);
