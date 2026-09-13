/* ==========================================================================
   LAPMS - demonstration sign-in

   This prototype does NOT implement authentication. Accounts are selected from
   a list so the role-based behaviour can be reviewed. A production build uses
   server-side credential verification, password policy, session/token issue and
   optional two-factor authentication (section 12 of the requirements).
   ========================================================================== */
(function (global) {
  'use strict';

  function base() { return document.documentElement.dataset.base || ''; }

  var HOME = {
    admin: 'app/admin-dashboard.html',
    teacher: 'app/teacher-dashboard.html',
    parent: 'app/parent-dashboard.html'
  };

  function byName(name) {
    return Store.db().users.filter(function (u) { return u.name === name; })[0] || null;
  }

  /** The accounts offered on the sign-in page, with a note on what each shows. */
  function demoAccounts() {
    var d = Store.db();
    var out = [];

    function add(name, blurb) {
      var u = byName(name);
      if (!u) return;
      var sub = '';
      if (u.role === 'teacher') {
        var t = d.teachers.filter(function (x) { return x.userId === u.id; })[0];
        var asg = t ? d.teacherAssignments.filter(function (a) { return a.teacherId === t.id; }) : [];
        sub = asg.map(function (a) { return Store.classLabel(a.classId) + ' (' + a.role + ')'; }).join(' · ');
      } else if (u.role === 'parent') {
        var p = d.parents.filter(function (x) { return x.userId === u.id; })[0];
        var kids = p ? Store.childrenOf({ userId: u.id }, p.id) : [];
        sub = kids.map(function (k) { return k.name + ' — ' + Store.classLabel(k.classId); }).join(' · ');
      } else {
        sub = u.title || 'School administration';
      }
      out.push({ user: u, blurb: blurb, sub: sub });
    }

    add('Josephine Mwende', 'Whole-school view: every class, every learner, reports and the audit trail.');
    add('Margaret Achieng', 'Class teacher. Today’s register for her class is still outstanding.');
    add('Alice Njeri', 'Subject teacher. Two classes only, and no authority to take the register.');
    add('Mary Wekesa', 'Guardian of two learners in different classes.');
    add('Joseph Kiptoo', 'Guardian of one learner.');
    return out;
  }

  function login(userId) {
    var u = Store.userById(userId);
    if (!u || u.status !== 'active') return false;
    Store.setSession({ userId: u.id, role: u.role, startedAt: new Date().toISOString() });
    Store.audit({ userId: u.id }, 'Signed in', u.name + ' (' + u.role + ')');
    Store.save();
    location.href = base() + HOME[u.role];
    return true;
  }

  function logout() {
    var s = Store.session();
    if (s) { Store.audit(s, 'Signed out', Store.userName(s.userId)); Store.save(); }
    Store.clearSession();
    location.href = base() + 'login.html';
  }

  /** Page guard. Returns the scope, or redirects and returns null. */
  function require(roles) {
    var s = Store.session();
    var sc = Store.scope(s);
    if (!sc.userId) { location.replace(base() + 'login.html'); return null; }
    if (roles && roles.indexOf(sc.role) === -1) {
      location.replace(base() + HOME[sc.role]);
      return null;
    }
    return sc;
  }

  function homeFor(role) { return base() + (HOME[role] || 'login.html'); }

  global.Auth = {
    demoAccounts: demoAccounts,
    login: login,
    logout: logout,
    require: require,
    homeFor: homeFor,
    base: base
  };
})(window);
