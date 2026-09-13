/* ==========================================================================
   LAPMS - data store and ACCESS CONTROL LAYER

   Section 16 of the requirements: "every user sees only the information
   necessary for their role ... enforced technically at the database and
   application levels, not merely through the user interface."

   In this prototype every read and write goes through this module, and each
   one is scoped by the caller's session. No page queries raw records. In a
   production build the identical scoping lives in the API/database layer
   (row-level security + server-side authorisation); the UI never becomes the
   place where the rule is enforced.
   ========================================================================== */
(function (global) {
  'use strict';

  var DB_KEY = 'lapms.db.v1';
  var SESSION_KEY = 'lapms.session.v1';

  var memory = { db: null, session: null };
  var canPersist = (function () {
    try {
      localStorage.setItem('lapms.probe', '1');
      localStorage.removeItem('lapms.probe');
      return true;
    } catch (e) { return false; }
  })();

  function read(key) {
    if (!canPersist) return memory[key === DB_KEY ? 'db' : 'session'];
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function write(key, value) {
    if (!canPersist) { memory[key === DB_KEY ? 'db' : 'session'] = value; return; }
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { memory[key === DB_KEY ? 'db' : 'session'] = value; }
  }

  var _db = null;
  function db() {
    if (_db) return _db;
    _db = read(DB_KEY);
    if (!_db || _db.version !== 4) {
      _db = SEED.build();
      write(DB_KEY, _db);
    }
    return _db;
  }
  function save() { write(DB_KEY, _db); }
  function reset() {
    _db = SEED.build();
    write(DB_KEY, _db);
    return _db;
  }

  // ---------- Session ----------
  function session() { return read(SESSION_KEY); }
  function setSession(s) { write(SESSION_KEY, s); }
  function clearSession() {
    if (canPersist) { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }
    memory.session = null;
  }

  // ==========================================================================
  // Scope - the single place that decides what a session may see
  // ==========================================================================
  function scope(s) {
    var d = db();
    var out = { role: null, userId: null, user: null, classIds: [], learnerIds: [], markableClassIds: [], teacher: null, parent: null };
    if (!s || !s.userId) return out;

    var user = d.users.filter(function (u) { return u.id === s.userId && u.status === 'active'; })[0];
    if (!user) return out;

    out.userId = user.id;
    out.user = user;
    out.role = user.role;

    if (user.role === 'admin') {
      out.classIds = d.classes.map(function (c) { return c.id; });
      out.learnerIds = d.learners.map(function (l) { return l.id; });
      out.markableClassIds = out.classIds.slice();
      return out;
    }

    if (user.role === 'teacher') {
      var teacher = d.teachers.filter(function (t) { return t.userId === user.id; })[0];
      out.teacher = teacher || null;
      if (!teacher) return out;
      var assignments = d.teacherAssignments.filter(function (a) { return a.teacherId === teacher.id; });
      out.classIds = assignments.map(function (a) { return a.classId; });
      // Least privilege: only the class teacher may record the daily register.
      out.markableClassIds = assignments
        .filter(function (a) { return a.role === 'Class teacher'; })
        .map(function (a) { return a.classId; });
      out.learnerIds = d.learners
        .filter(function (l) { return out.classIds.indexOf(l.classId) !== -1; })
        .map(function (l) { return l.id; });
      return out;
    }

    if (user.role === 'parent') {
      var parent = d.parents.filter(function (p) { return p.userId === user.id; })[0];
      out.parent = parent || null;
      if (!parent) return out;
      out.learnerIds = d.parentLinks
        .filter(function (l) { return l.parentId === parent.id && l.authorized; })
        .map(function (l) { return l.learnerId; });
      var classIds = {};
      d.learners.forEach(function (l) { if (out.learnerIds.indexOf(l.id) !== -1) classIds[l.classId] = true; });
      out.classIds = Object.keys(classIds);
      return out;
    }

    return out;
  }

  function maySeeLearner(s, learnerId) {
    return scope(s).learnerIds.indexOf(learnerId) !== -1;
  }
  function mayMarkClass(s, classId) {
    return scope(s).markableClassIds.indexOf(classId) !== -1;
  }
  function isAdmin(s) { return scope(s).role === 'admin'; }

  function assertLearner(s, learnerId) {
    if (!maySeeLearner(s, learnerId)) {
      throw new Error('ACCESS_DENIED: this account is not authorised for learner ' + learnerId);
    }
  }

  // ==========================================================================
  // Reads - every one of these is scoped
  // ==========================================================================
  function learners(s, filter) {
    var d = db(), sc = scope(s);
    filter = filter || {};
    return d.learners.filter(function (l) {
      if (sc.learnerIds.indexOf(l.id) === -1) return false;
      if (filter.classId && l.classId !== filter.classId) return false;
      if (filter.status && l.status !== filter.status) return false;
      if (filter.q) {
        var q = filter.q.toLowerCase();
        if (l.name.toLowerCase().indexOf(q) === -1 && l.admissionNo.toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function learner(s, id) {
    if (!maySeeLearner(s, id)) return null;
    return db().learners.filter(function (l) { return l.id === id; })[0] || null;
  }

  function classes(s) {
    var d = db(), sc = scope(s);
    return d.classes.filter(function (c) { return sc.classIds.indexOf(c.id) !== -1; });
  }

  function classById(id) { return db().classes.filter(function (c) { return c.id === id; })[0] || null; }
  function userById(id) { return db().users.filter(function (u) { return u.id === id; })[0] || null; }
  function userName(id) { var u = userById(id); return u ? u.name : 'Unknown user'; }

  function classLabel(id) { var c = classById(id); return c ? c.label : '—'; }

  function attendance(s, filter) {
    var d = db(), sc = scope(s);
    filter = filter || {};
    return d.attendance.filter(function (a) {
      if (sc.learnerIds.indexOf(a.learnerId) === -1) return false;
      if (filter.learnerId && a.learnerId !== filter.learnerId) return false;
      if (filter.date && a.date !== filter.date) return false;
      if (filter.from && a.date < filter.from) return false;
      if (filter.to && a.date > filter.to) return false;
      if (filter.status && a.status !== filter.status) return false;
      if (filter.classId) {
        var l = d.learners.filter(function (x) { return x.id === a.learnerId; })[0];
        if (!l || l.classId !== filter.classId) return false;
      }
      return true;
    });
  }

  function attendanceFor(s, learnerId, date) {
    if (!maySeeLearner(s, learnerId)) return null;
    return db().attendance.filter(function (a) { return a.learnerId === learnerId && a.date === date; })[0] || null;
  }

  function movements(s, filter) {
    var d = db(), sc = scope(s);
    filter = filter || {};
    return d.movements.filter(function (m) {
      if (sc.learnerIds.indexOf(m.learnerId) === -1) return false;
      if (filter.learnerId && m.learnerId !== filter.learnerId) return false;
      if (filter.date && m.date !== filter.date) return false;
      if (filter.from && m.date < filter.from) return false;
      if (filter.to && m.date > filter.to) return false;
      if (filter.type && m.type !== filter.type) return false;
      if (filter.classId) {
        var l = d.learners.filter(function (x) { return x.id === m.learnerId; })[0];
        if (!l || l.classId !== filter.classId) return false;
      }
      return true;
    });
  }

  function movementFor(s, learnerId, date, type) {
    if (!maySeeLearner(s, learnerId)) return null;
    return db().movements.filter(function (m) {
      return m.learnerId === learnerId && m.date === date && m.type === type;
    })[0] || null;
  }

  function behaviour(s, filter) {
    var d = db(), sc = scope(s);
    filter = filter || {};
    return d.behaviour.filter(function (b) {
      if (sc.learnerIds.indexOf(b.learnerId) === -1) return false;
      // Parents see only entries the school has shared with them.
      if (sc.role === 'parent' && !b.sharedWithParent) return false;
      if (filter.learnerId && b.learnerId !== filter.learnerId) return false;
      if (filter.category && b.category !== filter.category) return false;
      if (filter.from && b.date < filter.from) return false;
      if (filter.to && b.date > filter.to) return false;
      if (filter.classId) {
        var l = d.learners.filter(function (x) { return x.id === b.learnerId; })[0];
        if (!l || l.classId !== filter.classId) return false;
      }
      return true;
    }).sort(function (a, b2) { return (b2.date + b2.time).localeCompare(a.date + a.time); });
  }

  function comments(s, filter) {
    var d = db(), sc = scope(s);
    filter = filter || {};
    return d.comments.filter(function (c) {
      if (sc.learnerIds.indexOf(c.learnerId) === -1) return false;
      if (filter.learnerId && c.learnerId !== filter.learnerId) return false;
      if (filter.classId) {
        var l = d.learners.filter(function (x) { return x.id === c.learnerId; })[0];
        if (!l || l.classId !== filter.classId) return false;
      }
      return true;
    }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
  }

  /** Comment threads (root comment + its replies) for the caller's scope. */
  function threads(s, filter) {
    var all = comments(s, filter);
    var roots = all.filter(function (c) { return !c.replyTo; });
    return roots.map(function (root) {
      return { root: root, replies: all.filter(function (c) { return c.replyTo === root.id; }) };
    }).sort(function (a, b) {
      var la = a.replies.length ? a.replies[a.replies.length - 1] : a.root;
      var lb = b.replies.length ? b.replies[b.replies.length - 1] : b.root;
      return (lb.date + lb.time).localeCompare(la.date + la.time);
    });
  }

  function notifications(s, onlyUnread) {
    var d = db(), sc = scope(s);
    if (!sc.userId) return [];
    return d.notifications
      .filter(function (n) { return n.recipientId === sc.userId && (!onlyUnread || !n.read); })
      .sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
  }

  function unreadCount(s) { return notifications(s, true).length; }

  /** The audit trail is administrator-only. */
  function auditLogs(s, filter) {
    if (!isAdmin(s)) return [];
    filter = filter || {};
    return db().auditLogs.filter(function (l) {
      if (filter.userId && l.userId !== filter.userId) return false;
      if (filter.q) {
        var q = filter.q.toLowerCase();
        if ((l.action + ' ' + l.record + ' ' + userName(l.userId)).toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  /** Staff & parent directory - administrators only (section 3: "other parents' information"). */
  function people(s, role) {
    if (!isAdmin(s)) return [];
    return db().users.filter(function (u) { return !role || u.role === role; });
  }

  function guardiansOf(s, learnerId) {
    if (!maySeeLearner(s, learnerId)) return [];
    var d = db();
    return d.parentLinks
      .filter(function (l) { return l.learnerId === learnerId; })
      .map(function (l) {
        var p = d.parents.filter(function (x) { return x.id === l.parentId; })[0];
        return p ? { parent: p, link: l } : null;
      })
      .filter(Boolean);
  }

  function childrenOf(s, parentId) {
    var d = db();
    return d.parentLinks
      .filter(function (l) { return l.parentId === parentId && l.authorized; })
      .map(function (l) { return d.learners.filter(function (x) { return x.id === l.learnerId; })[0]; })
      .filter(Boolean);
  }

  function teacherOfClass(classId) {
    var d = db();
    var ta = d.teacherAssignments.filter(function (a) { return a.classId === classId && a.role === 'Class teacher'; })[0];
    if (!ta) return null;
    return d.teachers.filter(function (t) { return t.id === ta.teacherId; })[0] || null;
  }

  // ==========================================================================
  // Writes - scoped, and every one leaves an audit entry
  // ==========================================================================
  function audit(s, action, record) {
    var sc = scope(s);
    db().auditLogs.unshift({
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      userId: sc.userId, action: action, record: record,
      date: U.today(), time: U.nowTime()
    });
  }

  function setAttendance(s, learnerId, date, status, time, note) {
    var d = db(), sc = scope(s);
    var l = learner(s, learnerId);
    if (!l) throw new Error('ACCESS_DENIED');
    if (!mayMarkClass(s, l.classId)) throw new Error('ACCESS_DENIED: not the class teacher for ' + classLabel(l.classId));

    var rec = d.attendance.filter(function (a) { return a.learnerId === learnerId && a.date === date; })[0];
    if (rec) {
      rec.status = status; rec.time = time || null; rec.note = note || null;
      rec.markedBy = sc.userId; rec.markedAt = U.nowTime();
    } else {
      rec = {
        id: 'a-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        learnerId: learnerId, date: date, status: status, time: time || null,
        markedBy: sc.userId, markedAt: U.nowTime(), note: note || null
      };
      d.attendance.push(rec);
    }
    return rec;
  }

  function submitRegister(s, classId, date) {
    var d = db();
    if (!mayMarkClass(s, classId)) throw new Error('ACCESS_DENIED');
    audit(s, 'Submitted attendance register', classLabel(classId) + ' — ' + U.shortDate(date));

    // Notify guardians of anyone absent or late, as section 9 requires.
    var sent = 0;
    learners(s, { classId: classId }).forEach(function (l) {
      var rec = d.attendance.filter(function (a) { return a.learnerId === l.id && a.date === date; })[0];
      if (!rec || (rec.status !== 'absent' && rec.status !== 'late')) return;
      guardiansOf(s, l.id).forEach(function (g) {
        d.notifications.unshift({
          id: 'n-' + Date.now() + '-' + (sent++),
          recipientId: g.parent.userId,
          type: rec.status,
          title: rec.status === 'absent' ? 'Marked absent' : 'Marked late',
          message: l.name + (rec.status === 'absent'
            ? ' was marked absent on ' + U.shortDate(date) + '. Please contact the class teacher if this is unexpected.'
            : ' arrived at ' + (rec.time || 'school') + ' on ' + U.shortDate(date) + '.'),
          date: date, time: U.nowTime(), read: false, link: 'attendance'
        });
      });
    });
    save();
    return sent;
  }

  function recordMovement(s, learnerId, date, type, time, comment) {
    var d = db(), sc = scope(s);
    if (sc.role !== 'parent') throw new Error('ACCESS_DENIED: only a linked guardian may confirm movement');
    assertLearner(s, learnerId);

    var rec = d.movements.filter(function (m) {
      return m.learnerId === learnerId && m.date === date && m.type === type;
    })[0];
    if (rec) {
      rec.time = time; rec.comment = comment || ''; rec.confirmedBy = sc.userId;
    } else {
      rec = {
        id: 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        learnerId: learnerId, date: date, type: type, time: time,
        confirmedBy: sc.userId, comment: comment || ''
      };
      d.movements.push(rec);
    }
    var l = learner(s, learnerId);
    audit(s, type === 'departure' ? 'Confirmed departure from home' : 'Confirmed arrival at home',
      l.name + ' — ' + U.shortDate(date) + ' ' + time);
    save();
    return rec;
  }

  function recordBehaviour(s, learnerId, date, category, comment, shareWithParent) {
    var d = db(), sc = scope(s);
    if (sc.role !== 'teacher' && sc.role !== 'admin') throw new Error('ACCESS_DENIED');
    assertLearner(s, learnerId);

    var rec = {
      id: 'b-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      learnerId: learnerId, date: date, time: U.nowTime(),
      category: category, comment: comment,
      recordedBy: sc.userId, sharedWithParent: shareWithParent !== false
    };
    d.behaviour.push(rec);

    var l = learner(s, learnerId);
    audit(s, 'Recorded behaviour entry', l.name + ' — ' + SEED.BEHAVIOUR[category].label);

    if (rec.sharedWithParent && (category === 'worst' || category === 'bad')) {
      guardiansOf(s, learnerId).forEach(function (g) {
        d.notifications.unshift({
          id: 'n-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          recipientId: g.parent.userId, type: 'behaviour',
          title: 'Behaviour note recorded',
          message: 'A note was recorded for ' + l.name + ': ' + SEED.BEHAVIOUR[category].label + '.',
          date: date, time: U.nowTime(), read: false, link: 'behaviour'
        });
      });
    }
    save();
    return rec;
  }

  function addComment(s, learnerId, text, replyTo) {
    var d = db(), sc = scope(s);
    assertLearner(s, learnerId);
    var rec = {
      id: 'cm-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      learnerId: learnerId, date: U.today(), time: U.nowTime(),
      authorId: sc.userId, text: text, replyTo: replyTo || null
    };
    d.comments.push(rec);
    var l = learner(s, learnerId);
    audit(s, replyTo ? 'Replied to a comment' : 'Added a comment', l.name);

    // Route the notification to the other side of the conversation.
    if (sc.role === 'parent') {
      var t = teacherOfClass(l.classId);
      if (t) {
        d.notifications.unshift({
          id: 'n-' + Date.now() + '-c', recipientId: t.userId, type: 'comment',
          title: 'New parent comment', message: 'A guardian commented about ' + l.name + '.',
          date: rec.date, time: rec.time, read: false, link: 'messages'
        });
      }
    } else {
      guardiansOf(s, learnerId).forEach(function (g) {
        d.notifications.unshift({
          id: 'n-' + Date.now() + '-' + g.parent.id, recipientId: g.parent.userId, type: 'reply',
          title: 'Teacher replied to your comment',
          message: 'A teacher responded to your message about ' + l.name + '.',
          date: rec.date, time: rec.time, read: false, link: 'messages'
        });
      });
    }
    save();
    return rec;
  }

  // ---------- Administrator-only writes ----------
  function assertAdmin(s) {
    if (!isAdmin(s)) throw new Error('ACCESS_DENIED: administrators only');
  }

  function nextId(prefix, list) {
    var n = 0;
    list.forEach(function (x) {
      var v = parseInt(String(x.id).split('-')[1], 10);
      if (!isNaN(v) && v > n) n = v;
    });
    return prefix + '-' + (n + 1);
  }

  function addLearner(s, data) {
    assertAdmin(s);
    var d = db();
    var learner = {
      id: nextId('l', d.learners),
      admissionNo: data.admissionNo,
      name: data.name,
      classId: data.classId,
      photo: null,
      status: 'active',
      dateOfBirth: data.dateOfBirth || '',
      emergencyContact: data.emergencyContact || ''
    };
    d.learners.push(learner);
    audit(s, 'Registered learner', learner.name + ' — ' + learner.admissionNo + ', ' + classLabel(learner.classId));

    if (data.guardianName && data.guardianPhone) {
      var user = {
        id: nextId('u', d.users), name: data.guardianName, role: 'parent',
        phone: data.guardianPhone, email: data.guardianEmail || '',
        status: 'active', createdAt: U.today()
      };
      d.users.push(user);
      var parent = { id: nextId('p', d.parents), userId: user.id, name: user.name, phone: user.phone, email: user.email };
      d.parents.push(parent);
      d.parentLinks.push({
        id: nextId('pl', d.parentLinks), parentId: parent.id, learnerId: learner.id,
        relationship: data.relationship || 'Guardian', authorized: true, verifiedOn: U.today()
      });
      audit(s, 'Linked parent to learner', parent.name + ' → ' + learner.name);
    }
    save();
    return learner;
  }

  function setLearnerStatus(s, learnerId, status) {
    assertAdmin(s);
    var l = db().learners.filter(function (x) { return x.id === learnerId; })[0];
    if (!l) return null;
    l.status = status;
    audit(s, 'Changed learner status', l.name + ' → ' + status);
    save();
    return l;
  }

  function addClass(s, form, stream, room) {
    assertAdmin(s);
    var d = db();
    var clash = d.classes.filter(function (c) {
      return (c.form || c.name) === form && c.stream === stream;
    })[0];
    if (clash) throw new Error(form + ' ' + stream + ' already exists');
    var cls = {
      id: nextId('c', d.classes), form: form, name: form, stream: stream, room: room || '',
      year: new Date().getFullYear(), label: form + ' ' + stream
    };
    d.classes.push(cls);
    audit(s, 'Registered class', cls.label + (room ? ' in ' + room : ''));
    save();
    return cls;
  }

  function updateClass(s, classId, patch) {
    assertAdmin(s);
    var c = db().classes.filter(function (x) { return x.id === classId; })[0];
    if (!c) return null;
    if (patch.form !== undefined) { c.form = patch.form; c.name = patch.form; }
    if (patch.stream !== undefined) c.stream = patch.stream;
    if (patch.room !== undefined) c.room = patch.room;
    c.label = (c.form || c.name) + ' ' + c.stream;
    audit(s, 'Updated class', c.label + (c.room ? ' in ' + c.room : ''));
    save();
    return c;
  }

  function assignTeacher(s, teacherId, classId, role) {
    assertAdmin(s);
    var d = db();
    var existing = d.teacherAssignments.filter(function (a) {
      return a.teacherId === teacherId && a.classId === classId;
    })[0];
    if (existing) { existing.role = role; }
    else {
      d.teacherAssignments.push({ id: nextId('ta', d.teacherAssignments), teacherId: teacherId, classId: classId, role: role });
    }
    var t = d.teachers.filter(function (x) { return x.id === teacherId; })[0];
    audit(s, 'Assigned teacher', (t ? t.name : teacherId) + ' → ' + classLabel(classId) + ' (' + role + ')');
    save();
  }

  function removeAssignment(s, assignmentId) {
    assertAdmin(s);
    var d = db();
    var i = d.teacherAssignments.map(function (a) { return a.id; }).indexOf(assignmentId);
    if (i === -1) return;
    var a = d.teacherAssignments[i];
    var t = d.teachers.filter(function (x) { return x.id === a.teacherId; })[0];
    d.teacherAssignments.splice(i, 1);
    audit(s, 'Removed teacher assignment', (t ? t.name : a.teacherId) + ' — ' + classLabel(a.classId));
    save();
  }

  function setUserStatus(s, userId, status) {
    assertAdmin(s);
    var sc = scope(s);
    if (userId === sc.userId) throw new Error('You cannot deactivate your own account');
    var u = userById(userId);
    if (!u) return null;
    u.status = status;
    audit(s, status === 'active' ? 'Reactivated user account' : 'Deactivated user account', u.name);
    save();
    return u;
  }

  function setLinkAuthorization(s, linkId, authorized) {
    assertAdmin(s);
    var d = db();
    var link = d.parentLinks.filter(function (x) { return x.id === linkId; })[0];
    if (!link) return null;
    link.authorized = authorized;
    var p = d.parents.filter(function (x) { return x.id === link.parentId; })[0];
    var l = d.learners.filter(function (x) { return x.id === link.learnerId; })[0];
    audit(s, authorized ? 'Authorised guardian link' : 'Withdrew guardian link',
      (p ? p.name : '?') + ' → ' + (l ? l.name : '?'));
    save();
    return link;
  }

  function updateSettings(s, patch) {
    assertAdmin(s);
    var d = db();
    var changed = [];
    Object.keys(patch).forEach(function (k) {
      if (d.settings[k] !== patch[k]) { changed.push(k + ' = ' + patch[k]); d.settings[k] = patch[k]; }
    });
    if (changed.length) audit(s, 'Updated school settings', changed.join(', '));
    save();
    return d.settings;
  }

  function updateSchool(s, patch) {
    assertAdmin(s);
    var d = db();
    Object.keys(patch).forEach(function (k) { d.school[k] = patch[k]; });
    audit(s, 'Updated school profile', d.school.name);
    save();
    return d.school;
  }

  function markNotificationRead(s, id) {
    var sc = scope(s);
    var n = db().notifications.filter(function (x) { return x.id === id && x.recipientId === sc.userId; })[0];
    if (n) { n.read = true; save(); }
    return n;
  }
  function markAllRead(s) {
    var sc = scope(s);
    db().notifications.forEach(function (n) { if (n.recipientId === sc.userId) n.read = true; });
    save();
  }

  function updateContact(s, patch) {
    var sc = scope(s);
    if (!sc.user) return null;
    ['phone', 'email'].forEach(function (k) {
      if (patch[k] !== undefined) sc.user[k] = patch[k];
    });
    if (sc.parent) { sc.parent.phone = sc.user.phone; sc.parent.email = sc.user.email; }
    audit(s, 'Updated own contact details', sc.user.name);
    save();
    return sc.user;
  }


  // ==========================================================================
  // Lessons - any teacher assigned to a class records their own lesson
  // ==========================================================================

  /** Classes this session may record a lesson for (any assignment, not just class teacher). */
  function teachableClassIds(s) { return scope(s).classIds.slice(); }

  /** The subjects this session is assigned to teach in a class. */
  function mySubjects(s, classId) {
    var sc = scope(s), d = db();
    if (sc.role === 'admin') {
      return d.teacherAssignments.filter(function (a) {
        return a.classId === classId && a.role !== 'Class teacher';
      }).map(function (a) { return a.role; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; });
    }
    if (!sc.teacher) return [];
    return d.teacherAssignments.filter(function (a) {
      return a.classId === classId && a.teacherId === sc.teacher.id && a.role !== 'Class teacher';
    }).map(function (a) { return a.role; });
  }

  function mayTeach(s, classId, subject) {
    if (isAdmin(s)) return true;
    return mySubjects(s, classId).indexOf(subject) !== -1;
  }

  function lessons(s, filter) {
    var d = db(), sc = scope(s);
    filter = filter || {};
    return d.lessons.filter(function (ls) {
      if (sc.classIds.indexOf(ls.classId) === -1) return false;
      if (filter.classId && ls.classId !== filter.classId) return false;
      if (filter.date && ls.date !== filter.date) return false;
      if (filter.from && ls.date < filter.from) return false;
      if (filter.to && ls.date > filter.to) return false;
      if (filter.subject && ls.subject !== filter.subject) return false;
      if (filter.mine && sc.teacher && ls.teacherId !== sc.teacher.id) return false;
      return true;
    }).sort(function (a, b) {
      return (b.date + b.period).localeCompare ? (b.date).localeCompare(a.date) || a.period - b.period
                                               : a.period - b.period;
    });
  }

  function lessonById(s, id) {
    return lessons(s, {}).filter(function (l) { return l.id === id; })[0] || null;
  }

  /** Attendance rows for one lesson, scoped to learners the session may see. */
  function lessonRoll(s, lessonId) {
    var d = db(), sc = scope(s);
    return d.lessonAttendance.filter(function (r) {
      return r.lessonId === lessonId && sc.learnerIds.indexOf(r.learnerId) !== -1;
    });
  }

  function lessonAttendanceFor(s, lessonId, learnerId) {
    if (!maySeeLearner(s, learnerId)) return null;
    return db().lessonAttendance.filter(function (r) {
      return r.lessonId === lessonId && r.learnerId === learnerId;
    })[0] || null;
  }

  /** Lessons attended and missed by one learner over a period. */
  function lessonStats(s, learnerId, from, to) {
    if (!maySeeLearner(s, learnerId)) return null;
    var d = db();
    var inRange = {};
    d.lessons.forEach(function (l) {
      if (l.date >= from && l.date <= to) inRange[l.id] = l;
    });
    var counts = { present: 0, late: 0, absent: 0, excused: 0 };
    var bySubject = {};
    d.lessonAttendance.forEach(function (r) {
      var l = inRange[r.lessonId];
      if (!l || r.learnerId !== learnerId) return;
      if (counts[r.status] === undefined) return;
      counts[r.status] += 1;
      var b = bySubject[l.subject] || (bySubject[l.subject] = { attended: 0, missed: 0 });
      if (r.status === 'present' || r.status === 'late') b.attended += 1; else b.missed += 1;
    });
    var attended = counts.present + counts.late;
    var missed = counts.absent + counts.excused;
    var total = attended + missed;
    return {
      counts: counts, attended: attended, missed: missed, total: total,
      rate: total ? U.pct(attended, total) : null, bySubject: bySubject
    };
  }

  // ==========================================================================
  // Writes
  // ==========================================================================
  function createLesson(s, classId, subject, date, period) {
    var d = db(), sc = scope(s);
    if (!mayTeach(s, classId, subject)) {
      throw new Error('ACCESS_DENIED: you are not assigned to teach ' + subject + ' in ' + classLabel(classId));
    }
    var existing = d.lessons.filter(function (l) {
      return l.classId === classId && l.date === date && l.period === period && l.subject === subject;
    })[0];
    if (existing) return existing;

    var cls = classById(classId);
    var teacher = sc.teacher;
    var lesson = {
      id: 'ls-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      classId: classId, teacherId: teacher ? teacher.id : null, subject: subject,
      date: date, period: period, startsAt: null, room: cls ? cls.room : '',
      recordedBy: sc.userId, recordedAt: U.nowTime()
    };
    d.lessons.push(lesson);
    audit(s, 'Opened a lesson register', classLabel(classId) + ' - ' + subject + ', period ' + period + ', ' + U.shortDate(date));
    save();
    return lesson;
  }

  /** Mark one learner in one lesson. */
  function setLessonAttendance(s, lessonId, learnerId, status) {
    var d = db(), sc = scope(s);
    var lesson = d.lessons.filter(function (l) { return l.id === lessonId; })[0];
    if (!lesson) throw new Error('NOT_FOUND');
    if (!mayTeach(s, lesson.classId, lesson.subject)) throw new Error('ACCESS_DENIED');
    if (!maySeeLearner(s, learnerId)) throw new Error('ACCESS_DENIED');

    var rec = d.lessonAttendance.filter(function (r) {
      return r.lessonId === lessonId && r.learnerId === learnerId;
    })[0];
    if (rec) { rec.status = status; }
    else {
      rec = {
        id: 'la-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        lessonId: lessonId, learnerId: learnerId, status: status
      };
      d.lessonAttendance.push(rec);
    }
    return rec;
  }

  /** Mark many learners in one lesson at once. */
  function setLessonAttendanceMany(s, lessonId, learnerIds, status) {
    var n = 0;
    learnerIds.forEach(function (id) {
      try { setLessonAttendance(s, lessonId, id, status); n += 1; } catch (e) {}
    });
    if (n) {
      var lesson = db().lessons.filter(function (l) { return l.id === lessonId; })[0];
      audit(s, 'Marked ' + U.plural(n, 'learner') + ' ' + status,
        (lesson ? classLabel(lesson.classId) + ' - ' + lesson.subject : 'lesson') + ', ' + U.shortDate(lesson ? lesson.date : U.today()));
      save();
    }
    return n;
  }

  /** Mark many learners on the daily register at once. */
  function setAttendanceMany(s, learnerIds, date, status, time) {
    var n = 0;
    learnerIds.forEach(function (id) {
      try { setAttendance(s, id, date, status, time || null, null); n += 1; } catch (e) {}
    });
    if (n) { audit(s, 'Marked ' + U.plural(n, 'learner') + ' ' + status, U.shortDate(date)); save(); }
    return n;
  }

  /** A learner's rating for a period: the teachers' and the guardians' view. */
  function ratings(s, learnerId, from, to) {
    if (!maySeeLearner(s, learnerId)) return null;
    var d = db();
    function summarise(rows) {
      if (!rows.length) return { key: null, label: '-', count: 0 };
      var total = 0;
      rows.forEach(function (r) { total += SEED.BEHAVIOUR[r].rank; });
      var mean = total / rows.length;
      var key = SEED.BEHAVIOUR_ORDER.filter(function (k) {
        return SEED.BEHAVIOUR[k].rank === Math.max(1, Math.min(5, Math.round(mean)));
      })[0];
      return { key: key, label: SEED.BEHAVIOUR[key].label, count: rows.length, mean: Math.round(mean * 10) / 10 };
    }
    var teacherRows = d.behaviour.filter(function (b) {
      return b.learnerId === learnerId && b.date >= from && b.date <= to && SEED.BEHAVIOUR[b.category];
    }).map(function (b) { return b.category; });

    var parentRows = d.comments.filter(function (c) {
      if (c.learnerId !== learnerId || c.date < from || c.date > to || !c.rating) return false;
      var u = userById(c.authorId);
      return u && u.role === 'parent';
    }).map(function (c) { return c.rating; });

    return { teacher: summarise(teacherRows), parent: summarise(parentRows) };
  }

  function rateComment(s, commentId, rating) {
    var sc = scope(s);
    var c = db().comments.filter(function (x) { return x.id === commentId && x.authorId === sc.userId; })[0];
    if (!c) throw new Error('ACCESS_DENIED');
    c.rating = rating;
    save();
    return c;
  }

  /** Rooms in use, for the class editor. */
  function rooms() {
    var seen = {};
    db().classes.forEach(function (c) { if (c.room) seen[c.room] = true; });
    return Object.keys(seen).sort();
  }

  /** Classes grouped by form, so a form can hold many streams. */
  function classesByForm(s) {
    var out = {}, order = [];
    classes(s).forEach(function (c) {
      var f = c.form || c.name;
      if (!out[f]) { out[f] = []; order.push(f); }
      out[f].push(c);
    });
    return order.map(function (f) { return { form: f, classes: out[f] }; });
  }

  // ==========================================================================
  // Aggregates for dashboards and reports
  // ==========================================================================
  function daySummary(s, date, classId) {
    var roster = learners(s, classId ? { classId: classId } : {});
    var counts = { present: 0, late: 0, absent: 0, excused: 0, activity: 0, unmarked: 0 };
    var recs = attendance(s, { date: date, classId: classId });
    var byLearner = {};
    recs.forEach(function (r) { byLearner[r.learnerId] = r; });
    roster.forEach(function (l) {
      var r = byLearner[l.id];
      if (r && counts[r.status] !== undefined) counts[r.status] += 1;
      else counts.unmarked += 1;
    });
    counts.total = roster.length;
    counts.marked = counts.total - counts.unmarked;
    counts.inSchool = counts.present + counts.late + counts.activity;
    return counts;
  }

  function movementSummary(s, date, classId) {
    var roster = learners(s, classId ? { classId: classId } : {});
    var ids = {};
    roster.forEach(function (l) { ids[l.id] = true; });
    var recs = movements(s, { date: date });
    var dep = 0, arr = 0;
    var seen = { departure: {}, arrival: {} };
    recs.forEach(function (m) {
      if (!ids[m.learnerId]) return;
      if (seen[m.type][m.learnerId]) return;
      seen[m.type][m.learnerId] = true;
      if (m.type === 'departure') dep += 1; else arr += 1;
    });
    return { total: roster.length, departures: dep, arrivals: arr };
  }

  function classComparison(s, date) {
    return classes(s).map(function (c) {
      var sum = daySummary(s, date, c.id);
      return {
        classId: c.id,
        label: c.label,
        counts: sum,
        rate: sum.marked ? U.pct(sum.inSchool, sum.marked) : null,
        registerTaken: sum.marked > 0
      };
    });
  }

  function learnerStats(s, learnerId, from, to) {
    if (!maySeeLearner(s, learnerId)) return null;
    var recs = attendance(s, { learnerId: learnerId, from: from, to: to });
    var c = { present: 0, late: 0, absent: 0, excused: 0, activity: 0 };
    recs.forEach(function (r) { if (c[r.status] !== undefined) c[r.status] += 1; });
    var total = recs.length;
    var inSchool = c.present + c.late + c.activity;
    return {
      counts: c, total: total, inSchool: inSchool,
      rate: total ? U.pct(inSchool, total) : null,
      records: recs
    };
  }

  /** Learners the school should follow up: absent today, or repeatedly late/absent. */
  function followUps(s, date) {
    var d = db();
    var from = U.addDays(date, -21);
    return learners(s, {}).map(function (l) {
      var rec = attendanceFor(s, l.id, date);
      var recent = attendance(s, { learnerId: l.id, from: from, to: date });
      var absences = recent.filter(function (r) { return r.status === 'absent'; }).length;
      var lates = recent.filter(function (r) { return r.status === 'late'; }).length;
      // A register that has not been taken is a class-level issue, reported
      // separately - it is not a concern about the individual learner.
      var reasons = [];
      if (rec && rec.status === 'absent') reasons.push('Absent today');
      if (absences >= 3) reasons.push(absences + ' absences in 3 weeks');
      if (lates >= 4) reasons.push(lates + ' late arrivals in 3 weeks');
      return { learner: l, today: rec, absences: absences, lates: lates, reasons: reasons };
    }).filter(function (r) { return r.reasons.length; })
      .sort(function (a, b) { return (b.absences * 2 + b.lates) - (a.absences * 2 + a.lates); });
  }

  function behaviourSummary(s, filter) {
    var recs = behaviour(s, filter || {});
    var counts = {};
    SEED.BEHAVIOUR_ORDER.forEach(function (k) { counts[k] = 0; });
    recs.forEach(function (b) { if (counts[b.category] !== undefined) counts[b.category] += 1; });
    return { counts: counts, total: recs.length, records: recs };
  }

  function termDays(upTo) {
    var d = db();
    var days = d.meta.termDays.slice();
    if (upTo) days = days.filter(function (x) { return x <= upTo; });
    return days;
  }

  function currentSchoolDay() { return db().meta.currentSchoolDay; }

  global.Store = {
    db: db, save: save, reset: reset,
    session: session, setSession: setSession, clearSession: clearSession,
    scope: scope, isAdmin: isAdmin, maySeeLearner: maySeeLearner, mayMarkClass: mayMarkClass,
    learners: learners, learner: learner, classes: classes, classById: classById,
    classLabel: classLabel, userById: userById, userName: userName,
    attendance: attendance, attendanceFor: attendanceFor,
    movements: movements, movementFor: movementFor,
    behaviour: behaviour, comments: comments, threads: threads,
    notifications: notifications, unreadCount: unreadCount,
    auditLogs: auditLogs, people: people,
    guardiansOf: guardiansOf, childrenOf: childrenOf, teacherOfClass: teacherOfClass,
    setAttendance: setAttendance, submitRegister: submitRegister,
    recordMovement: recordMovement, recordBehaviour: recordBehaviour,
    addComment: addComment, markNotificationRead: markNotificationRead,
    markAllRead: markAllRead, updateContact: updateContact, audit: audit,
    addLearner: addLearner, setLearnerStatus: setLearnerStatus,
    addClass: addClass, updateClass: updateClass, assignTeacher: assignTeacher, removeAssignment: removeAssignment,
    setUserStatus: setUserStatus, setLinkAuthorization: setLinkAuthorization,
    updateSettings: updateSettings, updateSchool: updateSchool,
    daySummary: daySummary, movementSummary: movementSummary,
    classComparison: classComparison, learnerStats: learnerStats,
    followUps: followUps, behaviourSummary: behaviourSummary,
    termDays: termDays, currentSchoolDay: currentSchoolDay,
    lessons: lessons, lessonById: lessonById, lessonRoll: lessonRoll,
    lessonAttendanceFor: lessonAttendanceFor, lessonStats: lessonStats,
    mySubjects: mySubjects, mayTeach: mayTeach, teachableClassIds: teachableClassIds,
    createLesson: createLesson, setLessonAttendance: setLessonAttendance,
    setLessonAttendanceMany: setLessonAttendanceMany, setAttendanceMany: setAttendanceMany,
    ratings: ratings, rateComment: rateComment, rooms: rooms, classesByForm: classesByForm,
    canPersist: canPersist
  };
})(window);
