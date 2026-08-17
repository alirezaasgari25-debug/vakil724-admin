const SUPABASE_URL = 'https://faxftylyeoqqcuhqhrzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheGZ0eWx5ZW9xcWN1aHFocnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjUwNTksImV4cCI6MjEwMDA0MTA1OX0.SNADVX0ryc7K2tB3ofsI95jgSah_qlSFBe8G7ydyGZg';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let PROFILE = null;
let performanceChartInstance = null;
let categoryChartInstance = null;

const ICONS = {
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M5 7l-3 6a3 3 0 0 0 6 0l-3-6ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6ZM5 7h14M8 21h8"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="17.5" cy="8.5" r="2.7"/><path d="M15 14.2c2.8.3 5 2.5 5 5.8"/></svg>',
  coins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3V6"/><path d="M3 12v6c0 1.7 2.7 3 6 3s6-1.3 6-3v-6"/><ellipse cx="17" cy="12" rx="4" ry="2.2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h4l2 3h4l2-3h4M4 12l1.5-6h13L20 12M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/></svg>',
};

const CATEGORY_COLORS = {
  'کیفری': '#3B82F6',
  'حقوقی': '#10B981',
  'خانواده': '#F59E0B',
  'تجاری': '#8B5CF6',
  'کار': '#EC4899',
};
const CATEGORY_FALLBACK = '#94A3B8';

function toast(msg, isError) {
  const el = document.querySelector('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => el.classList.remove('show'), 3000);
}
function escapeHtml(str) {
  return (str == null ? '' : String(str)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toPersianDigits(input) {
  return String(input).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
function formatDate(iso) {
  if (!iso) return '—';
  return toPersianDigits(new Date(iso).toLocaleDateString('fa-IR'));
}
function formatMoney(n) { return toPersianDigits(Number(n || 0).toLocaleString('en-US')); }
function initials(name) { return (name || '؟').trim().charAt(0); }

const STATUS_LABELS = {
  new: 'در انتظار پذیرش', accepted: 'درحال انجام', rejected: 'رد شده',
  pending_confirmation: 'در انتظار تایید', disputed: 'در حال بررسی', done: 'مختومه'
};
const VERIFY_LABELS = {
  not_submitted: 'هنوز ارسال نشده', pending: 'در انتظار بررسی', approved: 'تایید شده', rejected: 'رد شده'
};

function updateClock() {
  const now = new Date();
  const h = toPersianDigits(String(now.getHours()).padStart(2, '0'));
  const m = toPersianDigits(String(now.getMinutes()).padStart(2, '0'));
  const s = toPersianDigits(String(now.getSeconds()).padStart(2, '0'));
  document.querySelector('#digital-clock').textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

async function showApp() {
  document.querySelector('#login-screen').classList.add('hidden');
  document.querySelector('#app').classList.remove('hidden');
  document.querySelector('#user-name').textContent = PROFILE.full_name;
  document.querySelector('#user-role').textContent = PROFILE.title;
  document.querySelector('#user-avatar').textContent = initials(PROFILE.full_name);
  applyRolePermissions();
  navigate('dashboard');
  refreshNotifBadge();
}
function showLogin() {
  document.querySelector('#login-screen').classList.remove('hidden');
  document.querySelector('#app').classList.add('hidden');
}
async function logout() {
  await sb.auth.signOut();
  PROFILE = null;
  showLogin();
}
function applyRolePermissions() {
  const isCeo = PROFILE && PROFILE.role === 'ceo';
  document.querySelector('#menu-transactions').classList.toggle('hidden', !isCeo);
}

document.querySelector('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorBox = document.querySelector('#login-error');
  errorBox.style.display = 'none';

  const username = e.target.username.value.trim();
  const password = e.target.password.value;
  const email = username + '@vakil724.com';

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error('نام کاربری یا رمز عبور اشتباه است');

    const { data: adminProfile, error: profileError } = await sb
      .from('admin_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !adminProfile) throw new Error('این حساب دسترسی به پنل مدیریت ندارد');

    PROFILE = adminProfile;
    showApp();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  }
});

document.querySelector('#logout-btn').addEventListener('click', logout);
document.querySelector('#menu-logout').addEventListener('click', logout);
document.querySelector('#notif-btn').addEventListener('click', () => navigate('support'));

document.querySelector('#sidebar-toggle')?.addEventListener('click', () => {
  document.querySelector('#sidebar').classList.toggle('collapsed');
});
document.querySelector('#user-chip').addEventListener('click', (e) => {
  document.querySelector('#user-menu').classList.toggle('open');
  e.stopPropagation();
});
document.addEventListener('click', () => document.querySelector('#user-menu').classList.remove('open'));
document.querySelector('#user-menu').addEventListener('click', (e) => e.stopPropagation());

const darkPref = localStorage.getItem('admin_dark') === '1';
if (darkPref) document.body.classList.add('dark');
function toggleDark() {
  document.body.classList.toggle('dark');
  localStorage.setItem('admin_dark', document.body.classList.contains('dark') ? '1' : '0');
}
document.querySelector('#dark-toggle').addEventListener('click', toggleDark);
document.querySelector('#settings-dark-toggle')?.addEventListener('click', toggleDark);

const PAGE_TITLES = {
  dashboard: 'داشبورد', cases: 'پرونده‌ها', lawyers: 'وکلاء',
  clients: 'موکلان', transactions: 'تراکنش‌ها', reports: 'گزارش‌ها', settings: 'تنظیمات',
  users: 'مدیریت کاربران', support: 'پشتیبانی'
};

function navigate(view) {
  if (view === 'transactions' && !(PROFILE && PROFILE.role === 'ceo')) {
    toast('شما به این بخش دسترسی ندارید', true);
    view = 'dashboard';
  }
  document.querySelectorAll('.side-link[data-view]').forEach(l => l.classList.toggle('active', l.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.id !== 'view-' + view));
  document.querySelector('#page-title').textContent = PAGE_TITLES[view] || '';

  if (view === 'dashboard') loadDashboard();
  if (view === 'cases') loadCases();
  if (view === 'lawyers') loadLawyers();
  if (view === 'clients') loadClients();
  if (view === 'transactions') loadTransactions();
  if (view === 'reports') loadReports();
  if (view === 'users') loadUsers();
  if (view === 'support') loadSupport();
}
document.querySelectorAll('.side-link[data-view]').forEach(l => l.addEventListener('click', () => navigate(l.dataset.view)));
document.querySelectorAll('.dropdown-item[data-view]').forEach(l => l.addEventListener('click', () => navigate(l.dataset.view)));
document.querySelectorAll('.quick-btn[data-view]').forEach(l => l.addEventListener('click', () => navigate(l.dataset.view)));

async function refreshNotifBadge() {
  const { count, error } = await sb
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) return;

  const notifBadge = document.querySelector('#notif-badge');
  const supportBadge = document.querySelector('#support-badge');
  [notifBadge, supportBadge].forEach(b => {
    if (count > 0) {
      b.textContent = toPersianDigits(count);
      b.classList.remove('hidden');
    } else {
      b.classList.add('hidden');
    }
  });
}

async function loadDashboard() {
  document.querySelector('#stat-cards').innerHTML = '<p style="padding:20px;color:#888">در حال بارگذاری...</p>';

  const lawyersRes = await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'lawyer');
  const clientsRes = await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client');
  const casesRes = await sb.from('cases').select('*').order('created_at', { ascending: false });

  if (lawyersRes.error || clientsRes.error || casesRes.error) {
    const err = lawyersRes.error || clientsRes.error || casesRes.error;
    document.querySelector('#stat-cards').innerHTML = '<p style="padding:20px;color:#c0392b">خطا: ' + escapeHtml(err.message) + '</p>';
    return;
  }

  const lawyersCount = lawyersRes.count || 0;
  const clientsCount = clientsRes.count || 0;
  const allCases = casesRes.data || [];

  const pendingCases = allCases.filter(c => c.status === 'new');
  const activeCases = allCases.filter(c => c.status === 'accepted' || c.status === 'pending_confirmation');
  const doneCases = allCases.filter(c => c.status === 'done');

  let totalCommission = 0;
  doneCases.forEach(c => totalCommission += Number(c.commission_amount || 0));

  const cards = [
    { label: 'کل پرونده‌ها', value: toPersianDigits(allCases.length), icon: ICONS.folder, color: '#2563eb' },
    { label: 'در انتظار پذیرش وکیل', value: toPersianDigits(pendingCases.length), icon: ICONS.clock, color: '#d97706' },
    { label: 'درحال انجام', value: toPersianDigits(activeCases.length), icon: ICONS.scale, color: '#7c3aed' },
    { label: 'کل وکلای ثبت‌شده', value: toPersianDigits(lawyersCount), icon: ICONS.user, color: '#0891b2' },
    { label: 'کل موکلان ثبت‌شده', value: toPersianDigits(clientsCount), icon: ICONS.users, color: '#db2777' },
  ];

  if (PROFILE.role === 'ceo') {
    cards.push({ label: 'کل کمیسیون (تومان)', value: formatMoney(totalCommission), icon: ICONS.coins, color: '#b08d3e' });
  }

  document.querySelector('#stat-cards').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-icon" style="color:${c.color}">${c.icon}</div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${escapeHtml(c.label)}</div>
    </div>
  `).join('');

  document.querySelector('#pending-total').textContent = toPersianDigits(pendingCases.length);
  document.querySelector('#pending-active').textContent = toPersianDigits(activeCases.length);
  document.querySelector('#pending-done').textContent = toPersianDigits(doneCases.length);

  const recentBox = document.querySelector('#recent-activity');
  const recent = allCases.slice(0, 6);

  if (recent.length === 0) {
    recentBox.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:10px 0">هنوز فعالیتی ثبت نشده است</p>';
  } else {
    const activityMeta = (status) => {
      if (status === 'new') return { icon: ICONS.inbox, color: '#2563eb' };
      if (status === 'done') return { icon: ICONS.check, color: '#059669' };
      if (status === 'accepted') return { icon: ICONS.scale, color: '#7c3aed' };
      return { icon: ICONS.folder, color: '#78716c' };
    };
    const activityText = (c) => {
      if (c.status === 'new') return `پرونده‌ی جدید «${escapeHtml(c.case_type)}» ثبت شد`;
      if (c.status === 'done') return `پرونده‌ی «${escapeHtml(c.case_type)}» مختومه شد`;
      if (c.status === 'accepted') return `پرونده‌ی «${escapeHtml(c.case_type)}» توسط وکیل پذیرفته شد`;
      return `به‌روزرسانی در پرونده‌ی «${escapeHtml(c.case_type)}»`;
    };

    recentBox.innerHTML = recent.map(c => {
      const meta = activityMeta(c.status);
      return `
      <div class="activity-item">
        <div class="activity-icon" style="color:${meta.color}">${meta.icon}</div>
        <div class="activity-text">${activityText(c)}</div>
        <div class="activity-time">${formatDate(c.created_at)}</div>
      </div>
    `;
    }).join('');
  }

  renderPerformanceChart(allCases);
  renderCategoryChart(allCases);
  renderTopProvinces(allCases);
}

function renderPerformanceChart(allCases) {
  const days = [];
  const counts = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(toPersianDigits(new Date(d).toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' })));
    counts.push(allCases.filter(c => (c.created_at || '').slice(0, 10) === key).length);
  }

  const ctx = document.getElementById('performanceChart');
  if (!ctx) return;
  if (performanceChartInstance) performanceChartInstance.destroy();

  Chart.defaults.font.family = "'Vazirmatn', sans-serif";
  performanceChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'پرونده ثبت‌شده',
        data: counts,
        backgroundColor: '#1A1E2F',
        borderRadius: 8,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { borderDash: [5, 5], color: '#F1F5F9' }, ticks: { precision: 0 } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderCategoryChart(allCases) {
  const counts = {};
  allCases.forEach(c => {
    const type = c.case_type || 'سایر';
    counts[type] = (counts[type] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const values = Object.values(counts);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = labels.map(l => CATEGORY_COLORS[l] || CATEGORY_FALLBACK);

  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  if (categoryChartInstance) categoryChartInstance.destroy();

  if (total === 0) {
    document.querySelector('#category-legend').innerHTML = '<span style="color:var(--text-muted);font-size:12px">داده‌ای وجود ندارد</span>';
    return;
  }

  categoryChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } }
  });

  document.querySelector('#category-legend').innerHTML = labels.map((l, i) => {
    const pct = Math.round((values[i] / total) * 100);
    return `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${escapeHtml(l)} (${toPersianDigits(pct)}٪)</div>`;
  }).join('');
}

function renderTopProvinces(allCases) {
  const tbody = document.querySelector('#top-provinces-body');
  if (!tbody) return;

  const counts = {};
  allCases.forEach(c => {
    const p = c.province;
    if (!p) return;
    counts[p] = (counts[p] || 0) + 1;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:#999">داده‌ای وجود ندارد</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map(([province, count]) => `
    <tr>
      <td>${escapeHtml(province)}</td>
      <td>${toPersianDigits(count)}</td>
      <td>${toPersianDigits(Math.round((count / total) * 100))}٪</td>
    </tr>
  `).join('');
}

async function loadCases() {
  const tbody = document.querySelector('#cases-body');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">در حال بارگذاری...</td></tr>';

  const { data: cases, error } = await sb.from('cases').select('*').order('created_at', { ascending: false });
  if (error) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;padding:20px">خطا: ' + escapeHtml(error.message) + '</td></tr>';
    return;
  }

  const { data: profiles } = await sb.from('profiles').select('phone, first_name, last_name');
  const nameByPhone = {};
  (profiles || []).forEach(p => nameByPhone[p.phone] = `${p.first_name || ''} ${p.last_name || ''}`.trim());

  const { data: conversations } = await sb.from('conversations').select('case_id, lawyer_phone');
  const lawyerPhoneByCaseId = {};
  (conversations || []).forEach(conv => lawyerPhoneByCaseId[conv.case_id] = conv.lawyer_phone);

  if (!cases || cases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">هنوز پرونده‌ای ثبت نشده است</td></tr>';
    return;
  }

  tbody.innerHTML = cases.map(c => {
    const lawyerPhone = lawyerPhoneByCaseId[c.id];
    const lawyerName = lawyerPhone ? (nameByPhone[lawyerPhone] || lawyerPhone) : 'هنوز پذیرفته نشده';

    return `
    <tr>
      <td>${escapeHtml(c.case_type)}</td>
      <td>${escapeHtml(nameByPhone[c.client_phone] || c.client_phone || '—')}</td>
      <td>${escapeHtml(lawyerName)}</td>
      <td>${escapeHtml(STATUS_LABELS[c.status] || c.status)}</td>
      <td>${formatMoney(c.price)} تومان</td>
      <td>${formatDate(c.created_at)}</td>
    </tr>
  `;
  }).join('');
}

async function loadLawyers() {
  const tbody = document.querySelector('#lawyers-body');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">در حال بارگذاری...</td></tr>';

  const { data, error } = await sb.from('profiles').select('*').eq('role', 'lawyer').order('created_at', { ascending: false });
  if (error) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;padding:20px">خطا: ' + escapeHtml(error.message) + '</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">هنوز وکیلی ثبت‌نام نکرده است</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(l => `
    <tr>
      <td>${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</td>
      <td>${escapeHtml(l.specialties || '—')}</td>
      <td>${escapeHtml(l.main_province || '—')}</td>
      <td dir="ltr" style="text-align:right">${toPersianDigits(escapeHtml(l.phone))}</td>
      <td>${escapeHtml(VERIFY_LABELS[l.verification_status] || l.verification_status || '—')}</td>
      <td>${l.availability_status === 'available' ? 'آماده دریافت' : 'در دسترس نیست'}</td>
    </tr>
  `).join('');
}

async function loadClients() {
  const tbody = document.querySelector('#clients-body');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">در حال بارگذاری...</td></tr>';

  const { data, error } = await sb.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false });
  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#c0392b;padding:20px">خطا: ' + escapeHtml(error.message) + '</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999">هنوز موکلی ثبت‌نام نکرده است</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr>
      <td>${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</td>
      <td dir="ltr" style="text-align:right">${toPersianDigits(escapeHtml(c.national_code || '—'))}</td>
      <td dir="ltr" style="text-align:right">${toPersianDigits(escapeHtml(c.phone))}</td>
      <td>${escapeHtml(VERIFY_LABELS[c.verification_status] || c.verification_status || '—')}</td>
      <td>${formatDate(c.created_at)}</td>
    </tr>
  `).join('');
}

async function loadTransactions() {
  const clientBody = document.querySelector('#client-payments-body');
  const lawyerBody = document.querySelector('#transactions-body');
  clientBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">در حال بارگذاری...</td></tr>';
  lawyerBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">در حال بارگذاری...</td></tr>';

  const { data: allCases, error } = await sb.from('cases').select('*').order('created_at', { ascending: false });
  if (error) {
    clientBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#c0392b;padding:20px">خطا: ' + escapeHtml(error.message) + '</td></tr>';
    lawyerBody.innerHTML = '';
    return;
  }

  const { data: profiles } = await sb.from('profiles').select('phone, first_name, last_name');
  const nameByPhone = {};
  (profiles || []).forEach(p => nameByPhone[p.phone] = `${p.first_name || ''} ${p.last_name || ''}`.trim());

  const clientPayments = (allCases || []).filter(c => c.price);
  const totalClientPayments = clientPayments.reduce((sum, c) => sum + Number(c.price || 0), 0);

  if (clientPayments.length === 0) {
    clientBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#999">هنوز پرداختی از موکلین ثبت نشده است</td></tr>';
  } else {
    clientBody.innerHTML = clientPayments.map(c => `
      <tr>
        <td>${escapeHtml(c.case_type)}</td>
        <td>${escapeHtml(nameByPhone[c.client_phone] || c.client_phone || '—')}</td>
        <td>${formatMoney(c.price)} تومان</td>
        <td>${formatDate(c.created_at)}</td>
      </tr>
    `).join('');
  }

  const doneCases = (allCases || []).filter(c => c.status === 'done');
  const totalCommission = doneCases.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
  const paidCommission = doneCases.filter(c => c.commission_paid).reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
  const unpaidCommission = totalCommission - paidCommission;

  document.querySelector('#transactions-summary').innerHTML = `
    <div class="stat-card"><div class="stat-icon" style="color:#b08d3e">${ICONS.coins}</div><div class="stat-value">${formatMoney(totalClientPayments)}</div><div class="stat-label">کل درآمد از موکلین (تومان)</div></div>
    <div class="stat-card"><div class="stat-icon" style="color:#059669">${ICONS.check}</div><div class="stat-value">${formatMoney(paidCommission)}</div><div class="stat-label">کمیسیون دریافت‌شده (تومان)</div></div>
    <div class="stat-card"><div class="stat-icon" style="color:#d97706">${ICONS.clock}</div><div class="stat-value">${formatMoney(unpaidCommission)}</div><div class="stat-label">کمیسیون در انتظار (تومان)</div></div>
  `;

  if (doneCases.length === 0) {
    lawyerBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">هنوز پرونده‌ی مختومه‌ای وجود ندارد</td></tr>';
    return;
  }

  lawyerBody.innerHTML = doneCases.map(c => `
    <tr>
      <td>${escapeHtml(c.case_type)}</td>
      <td>—</td>
      <td>${formatMoney(c.commission_amount)} تومان</td>
      <td>${c.commission_paid ? '<span style="color:#059669">پرداخت‌شده</span>' : '<span style="color:#d97706">در انتظار</span>'}</td>
      <td>${formatDate(c.finished_at)}</td>
      <td>${c.commission_paid ? '—' : `<button class="btn btn-outline btn-sm" onclick="markCommissionPaid('${c.id}')">علامت‌گذاری پرداخت‌شده</button>`}</td>
    </tr>
  `).join('');
}

async function markCommissionPaid(caseId) {
  const { error } = await sb.from('cases').update({ commission_paid: true }).eq('id', caseId);
  if (error) {
    toast('خطا: ' + error.message, true);
    return;
  }
  toast('با موفقیت ثبت شد');
  loadTransactions();
}

async function loadReports() {
  const { data: cases, error } = await sb.from('cases').select('status');
  const tbody = document.querySelector('#reports-status-body');

  if (error) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#c0392b;padding:20px">خطا: ' + escapeHtml(error.message) + '</td></tr>';
    return;
  }

  const total = (cases || []).length;
  const counts = {};
  (cases || []).forEach(c => counts[c.status] = (counts[c.status] || 0) + 1);

  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:#999">داده‌ای وجود ندارد</td></tr>';
    return;
  }

  tbody.innerHTML = Object.entries(counts).map(([status, count]) => `
    <tr>
      <td>${escapeHtml(STATUS_LABELS[status] || status)}</td>
      <td>${toPersianDigits(count)}</td>
      <td>${toPersianDigits(((count / total) * 100).toFixed(0))}%</td>
    </tr>
  `).join('');
}

async function loadUsers() {
  const tbody = document.querySelector('#users-body');
  const { data, error } = await sb.from('admin_profiles').select('*');

  if (error) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#c0392b;padding:20px">خطا: ' + escapeHtml(error.message) + '</td></tr>';
    return;
  }

  tbody.innerHTML = (data || []).map(u => `
    <tr>
      <td>${escapeHtml(u.full_name)}</td>
      <td>${escapeHtml(u.username)}</td>
      <td>${escapeHtml(u.title || '—')}</td>
      <td>${u.role === 'ceo' ? 'مدیرعامل' : 'مدیر بخش حقوقی'}</td>
    </tr>
  `).join('');
}

async function loadSupport() {
  const tbody = document.querySelector('#support-body');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">در حال بارگذاری...</td></tr>';

  const { data, error } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#c0392b;padding:20px">خطا: ' + escapeHtml(error.message) + '</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999">هنوز پیامی ثبت نشده است</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${!m.is_read ? '<span class="badge" style="margin-left:4px">جدید</span>' : ''}${escapeHtml(m.name)}</td>
      <td dir="ltr" style="text-align:right">${toPersianDigits(escapeHtml(m.phone))}</td>
      <td style="max-width:280px">${escapeHtml(m.message)}</td>
      <td>${formatDate(m.created_at)}</td>
      <td>${!m.is_read ? `<button class="btn btn-outline btn-sm" onclick="markMessageRead('${m.id}')">خوانده شد</button>` : '—'}</td>
    </tr>
  `).join('');
}

async function markMessageRead(id) {
  const { error } = await sb.from('contact_messages').update({ is_read: true }).eq('id', id);
  if (error) {
    toast('خطا: ' + error.message, true);
    return;
  }
  loadSupport();
  refreshNotifBadge();
}

(async function init() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    const { data: adminProfile } = await sb
      .from('admin_profiles')
      .select('*')
      .eq('id', data.session.user.id)
      .single();

    if (adminProfile) {
      PROFILE = adminProfile;
      showApp();
      return;
    }
  }
  showLogin();
})();