const SUPABASE_URL = 'https://faxftylyeoqqcuhqhrzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheGZ0eWx5ZW9xcWN1aHFocnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjUwNTksImV4cCI6MjEwMDA0MTA1OX0.SNADVX0ryc7K2tB3ofsI95jgSah_qlSFBe8G7ydyGZg';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let PROFILE = null;
let performanceChartInstance = null;
let categoryChartInstance = null;

function toast(msg, isError) {
  const el = document.querySelector('#toast');
  el.textContent = msg;
  el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-xs z-50 transition-all text-white ' + (isError ? 'bg-red-600' : 'bg-brand-dark');
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}
function escapeHtml(str) {
  return (str == null ? '' : String(str)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toPersianDigits(input) { return String(input).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }
function formatDate(iso) { if (!iso) return '—'; return toPersianDigits(new Date(iso).toLocaleDateString('fa-IR')); }
function formatMoney(n) { return toPersianDigits(Number(n || 0).toLocaleString('en-US')); }
function initials(name) { return (name || '؟').trim().charAt(0); }

const STATUS_LABELS = {
  new: 'در انتظار پذیرش', accepted: 'درحال انجام', rejected: 'رد شده',
  pending_confirmation: 'در انتظار تایید', disputed: 'در حال بررسی', done: 'مختومه'
};
const VERIFY_LABELS = { not_submitted: 'هنوز ارسال نشده', pending: 'در انتظار بررسی', approved: 'تایید شده', rejected: 'رد شده' };
const CATEGORY_COLORS = { 'کیفری': '#3B82F6', 'حقوقی': '#10B981', 'خانواده': '#F59E0B', 'تجاری': '#8B5CF6', 'کار': '#EC4899' };
const CATEGORY_FALLBACK = '#94A3B8';

function updateClock() {
  const now = new Date();
  const h = toPersianDigits(String(now.getHours()).padStart(2, '0'));
  const m = toPersianDigits(String(now.getMinutes()).padStart(2, '0'));
  const s = toPersianDigits(String(now.getSeconds()).padStart(2, '0'));
  const el = document.querySelector('#digital-clock');
  if (el) {
    const iconHtml = '<svg class="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
    el.innerHTML = iconHtml + `${h}:${m}:${s}`;
  }
}
setInterval(updateClock, 1000);
updateClock();

async function showApp() {
  document.querySelector('#login-screen').classList.add('hidden-view');
  document.querySelector('#app').classList.remove('hidden-view');
  document.querySelector('#user-name').textContent = PROFILE.full_name;
  document.querySelector('#user-role').textContent = PROFILE.title;
  document.querySelector('#user-avatar').textContent = initials(PROFILE.full_name);
  document.querySelector('#header-name').textContent = PROFILE.full_name;
  document.querySelector('#header-avatar').textContent = initials(PROFILE.full_name);
  applyRolePermissions();
  navigate('dashboard');
  refreshNotifBadge();
}
function showLogin() {
  document.querySelector('#login-screen').classList.remove('hidden-view');
  document.querySelector('#app').classList.add('hidden-view');
}
async function logout() {
  await sb.auth.signOut();
  PROFILE = null;
  showLogin();
}
function applyRolePermissions() {
  const isCeo = PROFILE && PROFILE.role === 'ceo';
  document.querySelector('#menu-transactions').classList.toggle('hidden-view', !isCeo);
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

    const { data: adminProfile, error: profileError } = await sb.from('admin_profiles').select('*').eq('id', data.user.id).single();
    if (profileError || !adminProfile) throw new Error('این حساب دسترسی به پنل مدیریت ندارد');

    PROFILE = adminProfile;
    showApp();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  }
});

document.querySelector('#logout-btn').addEventListener('click', logout);

const PAGE_TITLES = {
  dashboard: 'داشبورد', cases: 'پرونده‌ها', lawyers: 'وکلاء', clients: 'موکلان',
  transactions: 'تراکنش‌ها', reports: 'گزارش‌ها', settings: 'تنظیمات', users: 'مدیریت کاربران', support: 'پشتیبانی'
};

function navigate(view) {
  if (view === 'transactions' && !(PROFILE && PROFILE.role === 'ceo')) {
    toast('شما به این بخش دسترسی ندارید', true);
    view = 'dashboard';
  }
  document.querySelectorAll('.nav-link[data-view]').forEach(l => {
    const active = l.dataset.view === view;
    l.classList.toggle('bg-white/10', active);
    l.classList.toggle('text-[#D4AF37]', active);
  });
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden-view', v.id !== 'view-' + view));

  if (view === 'dashboard') loadDashboard();
  if (view === 'cases') loadCases();
  if (view === 'lawyers') loadLawyers();
  if (view === 'clients') loadClients();
  if (view === 'transactions') loadTransactions();
  if (view === 'reports') loadReports();
  if (view === 'users') loadUsers();
  if (view === 'support') loadSupport();
}
document.querySelectorAll('.nav-link[data-view]').forEach(l => l.addEventListener('click', (e) => { e.preventDefault(); navigate(l.dataset.view); }));

async function refreshNotifBadge() {
  const { count, error } = await sb.from('contact_messages').select('id', { count: 'exact', head: true }).eq('is_read', false);
  if (error) return;
  const supportBadge = document.querySelector('#support-badge');
  if (count > 0) { supportBadge.textContent = toPersianDigits(count); supportBadge.classList.remove('hidden-view'); }
  else { supportBadge.classList.add('hidden-view'); }
}

// ===== ۸ کارت آماری دقیقاً مثل طراحی اصلی =====
function trendBadge(percent, isUp) {
  const color = isUp ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50';
  const arrow = isUp
    ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>'
    : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>';
  return `<span class="text-[10px] font-bold ${color} px-2 py-1 rounded-full flex items-center gap-1">${arrow}${toPersianDigits(percent)}٪</span>`;
}

function dashboardStatCards({ casesToday, activeCount, unansweredCount, lawyersOnline, failedPayments, incomeToday, incomeMonth, clientsOnline }) {
  return `
  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start">
      <div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
      ${trendBadge(20, true)}
    </div>
    <div class="text-right">
      <p class="text-xs text-gray-500 font-medium mb-1">ثبت پرونده امروز</p>
      <div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(casesToday)}</h3><span class="text-[10px] text-gray-400">پرونده</span></div>
    </div>
  </div>

  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start">
      <div class="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
      ${trendBadge(16, true)}
    </div>
    <div class="text-right">
      <p class="text-xs text-gray-500 font-medium mb-1">پرونده فعال</p>
      <div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(activeCount)}</h3><span class="text-[10px] text-gray-400">پرونده</span></div>
    </div>
  </div>

  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start">
      <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
      ${trendBadge(8, false)}
    </div>
    <div class="text-right">
      <p class="text-xs text-gray-500 font-medium mb-1">پرونده بدون پاسخ</p>
      <div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(unansweredCount)}</h3><span class="text-[10px] text-gray-400">پرونده</span></div>
    </div>
  </div>

  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start">
      <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg></div>
      ${trendBadge(18, true)}
    </div>
    <div class="text-right">
      <p class="text-xs text-gray-500 font-medium mb-1">وکلای آنلاین</p>
      <div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(lawyersOnline)}</h3><span class="text-[10px] text-gray-400">وکیل</span></div>
    </div>
  </div>

  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start">
      <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg></div>
      ${trendBadge(12, false)}
    </div>
    <div class="text-right">
      <p class="text-xs text-gray-500 font-medium mb-1">پرداخت ناموفق</p>
      <div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(failedPayments)}</h3><span class="text-[10px] text-gray-400">پرداخت</span></div>
    </div>
  </div>

  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start">
      <div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
      ${trendBadge(32, true)}
    </div>
    <div class="text-right">
      <p class="text-xs text-gray-500 font-medium mb-1">درآمد امروز</p>
      <div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${formatMoney(incomeToday)}</h3><span class="text-[10px] text-gray-400">تومان</span></div>
    </div>
  </div>

  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start">
      <div class="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
      <span class="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>${toPersianDigits(8)}٪</span>
    </div>
    <div class="text-right">
      <p class="text-xs text-gray-500 font-medium mb-1">درآمد این ماه</p>
      <div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${formatMoney(incomeMonth)}</h3><span class="text-[10px] text-gray-400">تومان</span></div>
    </div>
  </div>

  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start">
      <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></div>
      ${trendBadge(24, true)}
    </div>
    <div class="text-right">
      <p class="text-xs text-gray-500 font-medium mb-1">موکلان آنلاین</p>
      <div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(clientsOnline)}</h3><span class="text-[10px] text-gray-400">موکل</span></div>
    </div>
  </div>`;
}

async function loadDashboard() {
  document.querySelector('#stat-cards').innerHTML = '<p class="p-5 text-gray-400 text-sm">در حال بارگذاری...</p>';

  const lawyersRes = await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'lawyer');
  const clientsRes = await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client');
  const casesRes = await sb.from('cases').select('*').order('created_at', { ascending: false });

  if (lawyersRes.error || clientsRes.error || casesRes.error) {
    const err = lawyersRes.error || clientsRes.error || casesRes.error;
    document.querySelector('#stat-cards').innerHTML = '<p class="p-5 text-red-600 text-sm">خطا: ' + escapeHtml(err.message) + '</p>';
    return;
  }

  const allCases = casesRes.data || [];
  const today = new Date().toISOString().slice(0, 10);
  const casesToday = allCases.filter(c => (c.created_at || '').slice(0, 10) === today).length;
  const activeCases = allCases.filter(c => c.status === 'accepted' || c.status === 'pending_confirmation');
  const unansweredCases = allCases.filter(c => c.status === 'new');
  const monthStart = new Date(); monthStart.setDate(1);
  const incomeToday = allCases.filter(c => (c.created_at || '').slice(0, 10) === today).reduce((s, c) => s + Number(c.price || 0), 0);
  const incomeMonth = allCases.filter(c => new Date(c.created_at) >= monthStart).reduce((s, c) => s + Number(c.price || 0), 0);

  document.querySelector('#stat-cards').innerHTML = dashboardStatCards({
    casesToday,
    activeCount: activeCases.length,
    unansweredCount: unansweredCases.length,
    lawyersOnline: lawyersRes.count || 0,
    failedPayments: 0,
    incomeToday,
    incomeMonth,
    clientsOnline: clientsRes.count || 0,
  });

  document.querySelector('#pending-total') && (document.querySelector('#pending-total').textContent = toPersianDigits(unansweredCases.length));

  renderPerformanceChart(allCases);
  renderCategoryChart(allCases);
  renderTopProvinces(allCases);
}

function renderPerformanceChart(allCases) {
  const days = [], regDataset = [], acceptDataset = [], incomeDataset = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(toPersianDigits(new Date(d).toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' })));
    const dayCases = allCases.filter(c => (c.created_at || '').slice(0, 10) === key);
    regDataset.push(dayCases.length);
    acceptDataset.push(dayCases.filter(c => c.status === 'accepted' || c.status === 'done').length);
    incomeDataset.push(dayCases.reduce((s, c) => s + Number(c.price || 0), 0) / 1000000);
  }
  const ctx = document.getElementById('performanceChart');
  if (!ctx) return;
  if (performanceChartInstance) performanceChartInstance.destroy();
  Chart.defaults.font.family = "'Vazirmatn', sans-serif";
  performanceChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        { label: 'درآمد (میلیون تومان)', data: incomeDataset, backgroundColor: '#1A1E2F', borderRadius: 10, barPercentage: 0.6, categoryPercentage: 0.8 },
        { label: 'پذیرش پرونده', data: acceptDataset, backgroundColor: '#D4AF37', borderRadius: 10, barPercentage: 0.6, categoryPercentage: 0.8 },
        { label: 'ثبت پرونده', data: regDataset, backgroundColor: '#85d6b9', borderRadius: 10, barPercentage: 0.6, categoryPercentage: 0.8 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', align: 'start', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } } },
      scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5], color: '#F1F5F9' } }, x: { grid: { display: false } } },
      interaction: { mode: 'index', intersect: false }
    }
  });
}

function renderCategoryChart(allCases) {
  const counts = {};
  allCases.forEach(c => { const t = c.case_type || 'سایر'; counts[t] = (counts[t] || 0) + 1; });
  const labels = Object.keys(counts);
  const values = Object.values(counts);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = labels.map(l => CATEGORY_COLORS[l] || CATEGORY_FALLBACK);

  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  if (categoryChartInstance) categoryChartInstance.destroy();

  const legend = document.querySelector('#category-legend');
  if (total === 0) { legend.innerHTML = '<span class="text-gray-400 text-xs">داده‌ای وجود ندارد</span>'; return; }

  categoryChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
  });

  legend.innerHTML = labels.map((l, i) => {
    const pct = Math.round((values[i] / total) * 100);
    return `<div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" style="background:${colors[i]}"></span>${escapeHtml(l)} (${toPersianDigits(pct)}٪)</div>`;
  }).join('');
}

function renderTopProvinces(allCases) {
  const tbody = document.querySelector('#top-provinces-body');
  if (!tbody) return;
  const counts = {};
  allCases.forEach(c => { if (c.province) counts[c.province] = (counts[c.province] || 0) + 1; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400">داده‌ای وجود ندارد</td></tr>';
    return;
  }
  tbody.innerHTML = sorted.map(([p, count], i) => `
    <tr class="bg-white border-b${i === sorted.length - 1 ? ' border-b-0' : ''}">
      <td class="px-4 py-3 font-medium text-gray-900">${escapeHtml(p)}</td>
      <td class="px-4 py-3">${toPersianDigits(count)}</td>
      <td class="px-4 py-3 text-brand-green">${toPersianDigits(Math.round((count / total) * 100))}٪</td>
    </tr>`).join('');
}

async function loadCases() {
  const tbody = document.querySelector('#cases-body');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6">در حال بارگذاری...</td></tr>';

  const { data: cases, error } = await sb.from('cases').select('*').order('created_at', { ascending: false });
  if (error) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }

  const { data: profiles } = await sb.from('profiles').select('phone, first_name, last_name');
  const nameByPhone = {};
  (profiles || []).forEach(p => nameByPhone[p.phone] = `${p.first_name || ''} ${p.last_name || ''}`.trim());

  const { data: conversations } = await sb.from('conversations').select('case_id, lawyer_phone');
  const lawyerPhoneByCaseId = {};
  (conversations || []).forEach(conv => lawyerPhoneByCaseId[conv.case_id] = conv.lawyer_phone);

  if (!cases || cases.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">هنوز پرونده‌ای ثبت نشده است</td></tr>'; return; }

  tbody.innerHTML = cases.map(c => {
    const lawyerPhone = lawyerPhoneByCaseId[c.id];
    const lawyerName = lawyerPhone ? (nameByPhone[lawyerPhone] || lawyerPhone) : 'هنوز پذیرفته نشده';
    return `<tr class="border-b border-gray-50 hover:bg-gray-50">
      <td class="px-4 py-3">${escapeHtml(c.case_type)}</td>
      <td class="px-4 py-3">${escapeHtml(nameByPhone[c.client_phone] || c.client_phone || '—')}</td>
      <td class="px-4 py-3">${escapeHtml(lawyerName)}</td>
      <td class="px-4 py-3">${escapeHtml(STATUS_LABELS[c.status] || c.status)}</td>
      <td class="px-4 py-3">${formatMoney(c.price)} تومان</td>
      <td class="px-4 py-3">${formatDate(c.created_at)}</td>
    </tr>`;
  }).join('');
}

async function loadLawyers() {
  const tbody = document.querySelector('#lawyers-body');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6">در حال بارگذاری...</td></tr>';

  const { data, error } = await sb.from('profiles').select('*').eq('role', 'lawyer').order('created_at', { ascending: false });
  if (error) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }
  if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">هنوز وکیلی ثبت‌نام نکرده است</td></tr>'; return; }

  tbody.innerHTML = data.map(l => `<tr class="border-b border-gray-50 hover:bg-gray-50">
    <td class="px-4 py-3">${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</td>
    <td class="px-4 py-3">${escapeHtml(l.specialties || '—')}</td>
    <td class="px-4 py-3">${escapeHtml(l.main_province || '—')}</td>
    <td class="px-4 py-3" dir="ltr">${toPersianDigits(escapeHtml(l.phone))}</td>
    <td class="px-4 py-3">${escapeHtml(VERIFY_LABELS[l.verification_status] || l.verification_status || '—')}</td>
    <td class="px-4 py-3">${l.availability_status === 'available' ? 'آماده دریافت' : 'در دسترس نیست'}</td>
  </tr>`).join('');
}

async function loadClients() {
  const tbody = document.querySelector('#clients-body');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6">در حال بارگذاری...</td></tr>';

  const { data, error } = await sb.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false });
  if (error) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }
  if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-400">هنوز موکلی ثبت‌نام نکرده است</td></tr>'; return; }

  tbody.innerHTML = data.map(c => `<tr class="border-b border-gray-50 hover:bg-gray-50">
    <td class="px-4 py-3">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</td>
    <td class="px-4 py-3" dir="ltr">${toPersianDigits(escapeHtml(c.national_code || '—'))}</td>
    <td class="px-4 py-3" dir="ltr">${toPersianDigits(escapeHtml(c.phone))}</td>
    <td class="px-4 py-3">${escapeHtml(VERIFY_LABELS[c.verification_status] || c.verification_status || '—')}</td>
    <td class="px-4 py-3">${formatDate(c.created_at)}</td>
  </tr>`).join('');
}

async function loadTransactions() {
  const clientBody = document.querySelector('#client-payments-body');
  const lawyerBody = document.querySelector('#transactions-body');
  clientBody.innerHTML = '<tr><td colspan="4" class="text-center py-6">در حال بارگذاری...</td></tr>';
  lawyerBody.innerHTML = '<tr><td colspan="6" class="text-center py-6">در حال بارگذاری...</td></tr>';

  const { data: allCases, error } = await sb.from('cases').select('*').order('created_at', { ascending: false });
  if (error) { clientBody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; lawyerBody.innerHTML = ''; return; }

  const { data: profiles } = await sb.from('profiles').select('phone, first_name, last_name');
  const nameByPhone = {};
  (profiles || []).forEach(p => nameByPhone[p.phone] = `${p.first_name || ''} ${p.last_name || ''}`.trim());

  const clientPayments = (allCases || []).filter(c => c.price);
  const totalClientPayments = clientPayments.reduce((s, c) => s + Number(c.price || 0), 0);

  clientBody.innerHTML = clientPayments.length === 0
    ? '<tr><td colspan="4" class="text-center py-6 text-gray-400">هنوز پرداختی از موکلین ثبت نشده است</td></tr>'
    : clientPayments.map(c => `<tr class="border-b border-gray-50 hover:bg-gray-50">
        <td class="px-4 py-3">${escapeHtml(c.case_type)}</td>
        <td class="px-4 py-3">${escapeHtml(nameByPhone[c.client_phone] || c.client_phone || '—')}</td>
        <td class="px-4 py-3">${formatMoney(c.price)} تومان</td>
        <td class="px-4 py-3">${formatDate(c.created_at)}</td>
      </tr>`).join('');

  const doneCases = (allCases || []).filter(c => c.status === 'done');
  const totalCommission = doneCases.reduce((s, c) => s + Number(c.commission_amount || 0), 0);
  const paidCommission = doneCases.filter(c => c.commission_paid).reduce((s, c) => s + Number(c.commission_amount || 0), 0);
  const unpaidCommission = totalCommission - paidCommission;

  document.querySelector('#transactions-summary').innerHTML = `
    <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100"><div class="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600 mb-3"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></div><h3 class="text-xl font-bold text-gray-900">${formatMoney(totalClientPayments)}</h3><p class="text-xs text-gray-500 mt-1">کل درآمد از موکلین (تومان)</p></div>
    <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100"><div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-3"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><h3 class="text-xl font-bold text-gray-900">${formatMoney(paidCommission)}</h3><p class="text-xs text-gray-500 mt-1">کمیسیون دریافت‌شده (تومان)</p></div>
    <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100"><div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 mb-3"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><h3 class="text-xl font-bold text-gray-900">${formatMoney(unpaidCommission)}</h3><p class="text-xs text-gray-500 mt-1">کمیسیون در انتظار (تومان)</p></div>
  `;

  lawyerBody.innerHTML = doneCases.length === 0
    ? '<tr><td colspan="6" class="text-center py-6 text-gray-400">هنوز پرونده‌ی مختومه‌ای وجود ندارد</td></tr>'
    : doneCases.map(c => `<tr class="border-b border-gray-50 hover:bg-gray-50">
        <td class="px-4 py-3">${escapeHtml(c.case_type)}</td>
        <td class="px-4 py-3">—</td>
        <td class="px-4 py-3">${formatMoney(c.commission_amount)} تومان</td>
        <td class="px-4 py-3">${c.commission_paid ? '<span class="text-green-600">پرداخت‌شده</span>' : '<span class="text-yellow-600">در انتظار</span>'}</td>
        <td class="px-4 py-3">${formatDate(c.finished_at)}</td>
        <td class="px-4 py-3">${c.commission_paid ? '—' : `<button class="text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50" onclick="markCommissionPaid('${c.id}')">علامت‌گذاری پرداخت‌شده</button>`}</td>
      </tr>`).join('');
}

async function markCommissionPaid(caseId) {
  const { error } = await sb.from('cases').update({ commission_paid: true }).eq('id', caseId);
  if (error) { toast('خطا: ' + error.message, true); return; }
  toast('با موفقیت ثبت شد');
  loadTransactions();
}

async function loadReports() {
  const { data: cases, error } = await sb.from('cases').select('status');
  const tbody = document.querySelector('#reports-status-body');
  if (error) { tbody.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }

  const total = (cases || []).length;
  const counts = {};
  (cases || []).forEach(c => counts[c.status] = (counts[c.status] || 0) + 1);
  if (total === 0) { tbody.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-gray-400">داده‌ای وجود ندارد</td></tr>'; return; }

  tbody.innerHTML = Object.entries(counts).map(([status, count]) => `<tr class="border-b border-gray-50">
    <td class="px-4 py-3">${escapeHtml(STATUS_LABELS[status] || status)}</td>
    <td class="px-4 py-3">${toPersianDigits(count)}</td>
    <td class="px-4 py-3">${toPersianDigits(((count / total) * 100).toFixed(0))}%</td>
  </tr>`).join('');
}

async function loadUsers() {
  const tbody = document.querySelector('#users-body');
  const { data, error } = await sb.from('admin_profiles').select('*');
  if (error) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }

  tbody.innerHTML = (data || []).map(u => `<tr class="border-b border-gray-50">
    <td class="px-4 py-3">${escapeHtml(u.full_name)}</td>
    <td class="px-4 py-3">${escapeHtml(u.username)}</td>
    <td class="px-4 py-3">${escapeHtml(u.title || '—')}</td>
    <td class="px-4 py-3">${u.role === 'ceo' ? 'مدیرعامل' : 'مدیر بخش حقوقی'}</td>
  </tr>`).join('');
}

async function loadSupport() {
  const tbody = document.querySelector('#support-body');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6">در حال بارگذاری...</td></tr>';

  const { data, error } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }
  if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-400">هنوز پیامی ثبت نشده است</td></tr>'; return; }

  tbody.innerHTML = data.map(m => `<tr class="border-b border-gray-50 hover:bg-gray-50">
    <td class="px-4 py-3">${!m.is_read ? '<span class="inline-block bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 ml-1">جدید</span>' : ''}${escapeHtml(m.name)}</td>
    <td class="px-4 py-3" dir="ltr">${toPersianDigits(escapeHtml(m.phone))}</td>
    <td class="px-4 py-3 max-w-[280px]">${escapeHtml(m.message)}</td>
    <td class="px-4 py-3">${formatDate(m.created_at)}</td>
    <td class="px-4 py-3">${!m.is_read ? `<button class="text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50" onclick="markMessageRead('${m.id}')">خوانده شد</button>` : '—'}</td>
  </tr>`).join('');
}

async function markMessageRead(id) {
  const { error } = await sb.from('contact_messages').update({ is_read: true }).eq('id', id);
  if (error) { toast('خطا: ' + error.message, true); return; }
  loadSupport();
  refreshNotifBadge();
}

(async function init() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    const { data: adminProfile } = await sb.from('admin_profiles').select('*').eq('id', data.session.user.id).single();
    if (adminProfile) { PROFILE = adminProfile; showApp(); return; }
  }
  showLogin();
})();