const SUPABASE_URL = 'https://faxftylyeoqqcuhqhrzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheGZ0eWx5ZW9xcWN1aHFocnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjUwNTksImV4cCI6MjEwMDA0MTA1OX0.SNADVX0ryc7K2tB3ofsI95jgSah_qlSFBe8G7ydyGZg';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let PROFILE = null;
let performanceChartInstance = null, categoryChartInstance = null;
let clientsLineChartInstance = null, clientsDonutChartInstance = null;
let financeYearChartInstance = null;
let clientsRawData = [], clientsCasesMap = {}, clientsCaseStatusMap = {};
let lawyersRawData = [], lawyersActiveCasesMap = {};
let casesRawData = [], casesNameByPhone = {}, casesLawyerByCaseId = {};
const IRAN_PROVINCES = ['آذربایجان شرقی', 'آذربایجان غربی', 'اردبیل', 'اصفهان', 'البرز', 'ایلام', 'بوشهر', 'تهران', 'چهارمحال و بختیاری', 'خراسان جنوبی', 'خراسان رضوی', 'خراسان شمالی', 'خوزستان', 'زنجان', 'سمنان', 'سیستان و بلوچستان', 'فارس', 'قزوین', 'قم', 'کردستان', 'کرمان', 'کرمانشاه', 'کهگیلویه و بویراحمد', 'گلستان', 'گیلان', 'لرستان', 'مازندران', 'مرکزی', 'هرمزگان', 'همدان', 'یزد'];

function toast(msg, isError) {
  const el = document.querySelector('#toast');
  el.textContent = msg;
  el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-xs z-50 transition-all text-white ' + (isError ? 'bg-red-600' : 'bg-brand-dark');
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}
function escapeHtml(str) { return (str == null ? '' : String(str)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toPersianDigits(input) { return String(input).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }
function formatDate(iso) { if (!iso) return '—'; return toPersianDigits(new Date(iso).toLocaleDateString('fa-IR')); }
function formatDateTime(iso) { if (!iso) return '—'; const d = new Date(iso); return toPersianDigits(d.toLocaleDateString('fa-IR')) + ' - ' + toPersianDigits(String(d.getHours()).padStart(2,'0')) + ':' + toPersianDigits(String(d.getMinutes()).padStart(2,'0')); }
function formatMoney(n) { return toPersianDigits(Number(n || 0).toLocaleString('en-US')); }
function initials(name) { return (name || '؟').trim().charAt(0); }

const STATUS_LABELS = { new: 'در انتظار پذیرش', accepted: 'فعال', rejected: 'رد شده', pending_confirmation: 'در حال بررسی', disputed: 'در حال بررسی', done: 'مختومه' };
const STATUS_COLORS = { new: 'bg-[#fce8e6] text-[#d93025]', accepted: 'bg-[#e6f4ea] text-[#1e8e3e]', pending_confirmation: 'bg-[#fef7e0] text-[#f29900]', disputed: 'bg-[#fef7e0] text-[#f29900]', done: 'bg-[#f3e8fd] text-[#9333ea]', rejected: 'bg-gray-100 text-gray-600' };
const VERIFY_LABELS = { not_submitted: 'هنوز ارسال نشده', pending: 'در انتظار بررسی', approved: 'تایید شده', rejected: 'رد شده' };
const CLIENT_STATUS_LABELS = { approved: 'فعال', pending: 'در انتظار', rejected: 'تعلیق‌شده', not_submitted: 'غیرفعال' };
const CLIENT_STATUS_COLORS = { approved: 'bg-green-50 text-green-700', pending: 'bg-gray-100 text-gray-600', rejected: 'bg-red-50 text-red-700', not_submitted: 'bg-yellow-50 text-yellow-700' };
const LAWYER_STATUS_LABELS = { approved: 'فعال', pending: 'در انتظار', rejected: 'تعلیق‌شده', not_submitted: 'غیرفعال' };
const LAWYER_STATUS_COLORS = { approved: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', rejected: 'bg-red-100 text-red-800', not_submitted: 'bg-gray-100 text-gray-800' };
const CATEGORY_COLORS = { 'کیفری': '#3B82F6', 'حقوقی': '#10B981', 'خانواده': '#F59E0B', 'تجاری': '#8B5CF6', 'کار': '#EC4899' };
const CATEGORY_FALLBACK = '#94A3B8';

function getShamsiDateString() {
  try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
  catch (e) { return ''; }
}
function updateClock() {
  const now = new Date();
  const h = toPersianDigits(String(now.getHours()).padStart(2, '0'));
  const m = toPersianDigits(String(now.getMinutes()).padStart(2, '0'));
  const s = toPersianDigits(String(now.getSeconds()).padStart(2, '0'));
  const el = document.querySelector('#digital-clock');
  if (el) {
    const iconHtml = '<svg class="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
    el.innerHTML = `<span class="flex items-center gap-2">${iconHtml}<span>${getShamsiDateString()}</span><span class="w-px h-4 bg-gray-200 mx-1"></span><span>${h}:${m}:${s}</span></span>`;
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
async function logout() { await sb.auth.signOut(); PROFILE = null; showLogin(); }
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

function navigate(view) {
  if (view === 'transactions' && !(PROFILE && PROFILE.role === 'ceo')) { toast('شما به این بخش دسترسی ندارید', true); view = 'dashboard'; }
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
  if (view === 'transactions') loadFinance();
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

// ===================== DASHBOARD =====================
function trendBadge(percent, isUp) {
  const color = isUp ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50';
  const arrow = isUp ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>';
  return `<span class="text-[10px] font-bold ${color} px-2 py-1 rounded-full flex items-center gap-1">${arrow}${toPersianDigits(percent)}٪</span>`;
}
function dashboardStatCards({ casesToday, activeCount, unansweredCount, lawyersOnline, failedPayments, incomeToday, incomeMonth, clientsOnline }) {
  return `
  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start"><div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>${trendBadge(20, true)}</div>
    <div class="text-right"><p class="text-xs text-gray-500 font-medium mb-1">ثبت پرونده امروز</p><div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(casesToday)}</h3><span class="text-[10px] text-gray-400">پرونده</span></div></div>
  </div>
  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start"><div class="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>${trendBadge(16, true)}</div>
    <div class="text-right"><p class="text-xs text-gray-500 font-medium mb-1">پرونده فعال</p><div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(activeCount)}</h3><span class="text-[10px] text-gray-400">پرونده</span></div></div>
  </div>
  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start"><div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>${trendBadge(8, false)}</div>
    <div class="text-right"><p class="text-xs text-gray-500 font-medium mb-1">پرونده بدون پاسخ</p><div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(unansweredCount)}</h3><span class="text-[10px] text-gray-400">پرونده</span></div></div>
  </div>
  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start"><div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg></div>${trendBadge(18, true)}</div>
    <div class="text-right"><p class="text-xs text-gray-500 font-medium mb-1">وکلای آنلاین</p><div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(lawyersOnline)}</h3><span class="text-[10px] text-gray-400">وکیل</span></div></div>
  </div>
  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start"><div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg></div>${trendBadge(12, false)}</div>
    <div class="text-right"><p class="text-xs text-gray-500 font-medium mb-1">پرداخت ناموفق</p><div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(failedPayments)}</h3><span class="text-[10px] text-gray-400">پرداخت</span></div></div>
  </div>
  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start"><div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>${trendBadge(32, true)}</div>
    <div class="text-right"><p class="text-xs text-gray-500 font-medium mb-1">درآمد امروز</p><div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${formatMoney(incomeToday)}</h3><span class="text-[10px] text-gray-400">تومان</span></div></div>
  </div>
  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start"><div class="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><span class="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>${toPersianDigits(8)}٪</span></div>
    <div class="text-right"><p class="text-xs text-gray-500 font-medium mb-1">درآمد این ماه</p><div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${formatMoney(incomeMonth)}</h3><span class="text-[10px] text-gray-400">تومان</span></div></div>
  </div>
  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
    <div class="flex justify-between items-start"><div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></div>${trendBadge(24, true)}</div>
    <div class="text-right"><p class="text-xs text-gray-500 font-medium mb-1">موکلان آنلاین</p><div class="flex items-baseline gap-1 justify-start flex-row-reverse"><h3 class="text-2xl font-bold text-gray-900">${toPersianDigits(clientsOnline)}</h3><span class="text-[10px] text-gray-400">موکل</span></div></div>
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
  document.querySelector('#stat-cards').innerHTML = dashboardStatCards({ casesToday, activeCount: activeCases.length, unansweredCount: unansweredCases.length, lawyersOnline: lawyersRes.count || 0, failedPayments: 0, incomeToday, incomeMonth, clientsOnline: clientsRes.count || 0 });
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
    data: { labels: days, datasets: [
      { label: 'درآمد (میلیون تومان)', data: incomeDataset, backgroundColor: '#1A1E2F', borderRadius: 10, barPercentage: 0.6, categoryPercentage: 0.8 },
      { label: 'پذیرش پرونده', data: acceptDataset, backgroundColor: '#D4AF37', borderRadius: 10, barPercentage: 0.6, categoryPercentage: 0.8 },
      { label: 'ثبت پرونده', data: regDataset, backgroundColor: '#85d6b9', borderRadius: 10, barPercentage: 0.6, categoryPercentage: 0.8 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'start', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } } }, scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5], color: '#F1F5F9' } }, x: { grid: { display: false } } }, interaction: { mode: 'index', intersect: false } }
  });
}
function renderCategoryChart(allCases) {
  const counts = {};
  allCases.forEach(c => { const t = c.case_type || 'سایر'; counts[t] = (counts[t] || 0) + 1; });
  const labels = Object.keys(counts), values = Object.values(counts);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = labels.map(l => CATEGORY_COLORS[l] || CATEGORY_FALLBACK);
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  if (categoryChartInstance) categoryChartInstance.destroy();
  const legend = document.querySelector('#category-legend');
  if (total === 0) { legend.innerHTML = '<span class="text-gray-400 text-xs">داده‌ای وجود ندارد</span>'; return; }
  categoryChartInstance = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } } });
  legend.innerHTML = labels.map((l, i) => { const pct = Math.round((values[i] / total) * 100); return `<div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" style="background:${colors[i]}"></span>${escapeHtml(l)} (${toPersianDigits(pct)}٪)</div>`; }).join('');
}
function renderTopProvinces(allCases) {
  const tbody = document.querySelector('#top-provinces-body');
  if (!tbody) return;
  const counts = {};
  allCases.forEach(c => { if (c.province) counts[c.province] = (counts[c.province] || 0) + 1; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (sorted.length === 0) { tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400">داده‌ای وجود ندارد</td></tr>'; return; }
  tbody.innerHTML = sorted.map(([p, count], i) => `<tr class="bg-white border-b${i === sorted.length - 1 ? ' border-b-0' : ''}"><td class="px-4 py-3 font-medium text-gray-900">${escapeHtml(p)}</td><td class="px-4 py-3">${toPersianDigits(count)}</td><td class="px-4 py-3 text-brand-green">${toPersianDigits(Math.round((count / total) * 100))}٪</td></tr>`).join('');
}

// ===================== CASES =====================
async function loadCases() {
  const tbody = document.querySelector('#cases-body');
  tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6">در حال بارگذاری...</td></tr>';
  document.querySelector('#cases-stat-cards').innerHTML = '<p class="p-5 text-gray-400 text-sm">در حال بارگذاری...</p>';

  const { data: cases, error } = await sb.from('cases').select('*').order('created_at', { ascending: false });
  if (error) { tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }

  const { data: profiles } = await sb.from('profiles').select('phone, first_name, last_name');
  casesNameByPhone = {};
  (profiles || []).forEach(p => casesNameByPhone[p.phone] = `${p.first_name || ''} ${p.last_name || ''}`.trim());

  const { data: conversations } = await sb.from('conversations').select('case_id, lawyer_phone');
  casesLawyerByCaseId = {};
  (conversations || []).forEach(conv => casesLawyerByCaseId[conv.case_id] = conv.lawyer_phone);

  casesRawData = cases || [];

  const provinceSelect = document.querySelector('#cases-province-filter');
  provinceSelect.innerHTML = '<option value="">همه استان‌ها</option>' + IRAN_PROVINCES.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');

  renderCasesStatCards();
  applyCasesFilters();
  if (casesRawData.length > 0) renderCaseDetail(casesRawData[0]); else document.querySelector('#case-detail-panel').innerHTML = '<p class="text-gray-400 text-sm text-center py-6">پرونده‌ای برای نمایش جزئیات وجود ندارد</p>';
}
function renderCasesStatCards() {
  const totalIncome = casesRawData.reduce((s, c) => s + Number(c.price || 0), 0);
  const closed = casesRawData.filter(c => c.status === 'done').length;
  const reviewing = casesRawData.filter(c => c.status === 'pending_confirmation' || c.status === 'disputed').length;
  const pending = casesRawData.filter(c => c.status === 'new').length;
  const active = casesRawData.filter(c => c.status === 'accepted').length;
  const total = casesRawData.length;
  const card = (label, value, unit, icon, bg, color) => `
  <div class="bg-white rounded-3xl p-5 shadow-soft border border-gray-100 flex flex-col justify-between">
    <div class="flex justify-between items-start mb-2"><div class="w-10 h-10 rounded-full ${bg} ${color} flex items-center justify-center"><i class="fa-solid ${icon}"></i></div><div class="text-left"><div class="text-xs text-gray-500 mb-1">${label}</div><div class="font-bold text-lg text-gray-900">${value}</div></div></div>
  </div>`;
  document.querySelector('#cases-stat-cards').innerHTML =
    card('درآمد پرونده‌ها', formatMoney(totalIncome), 'تومان', 'fa-dollar-sign', 'bg-amber-50', 'text-amber-500') +
    card('مختومه', toPersianDigits(closed), '', 'fa-check-double', 'bg-purple-50', 'text-purple-600') +
    card('در حال بررسی', toPersianDigits(reviewing), '', 'fa-file-lines', 'bg-blue-50', 'text-blue-500') +
    card('در انتظار پذیرش', toPersianDigits(pending), '', 'fa-clock', 'bg-orange-50', 'text-orange-500') +
    card('پرونده فعال', toPersianDigits(active), '', 'fa-play', 'bg-green-50', 'text-green-500') +
    card('کل پرونده‌ها', toPersianDigits(total), '', 'fa-folder-plus', 'bg-brand-dark/10', 'text-brand-dark');
}
function getFilteredCases() {
  const search = (document.querySelector('#cases-search').value || '').trim();
  const province = document.querySelector('#cases-province-filter').value;
  const category = document.querySelector('#cases-category-filter').value;
  const status = document.querySelector('#cases-status-filter').value;
  const dateFrom = document.querySelector('#cases-date-filter').value;
  const price = document.querySelector('#cases-price-filter').value;
  return casesRawData.filter(c => {
    if (search && !(c.case_type || '').includes(search) && !(casesNameByPhone[c.client_phone] || '').includes(search)) return false;
    if (province && c.province !== province) return false;
    if (category && c.case_type !== category) return false;
    if (status && c.status !== status) return false;
    if (dateFrom && new Date(c.created_at) < new Date(dateFrom)) return false;
    if (price) {
      const p = Number(c.price || 0);
      if (price === 'low' && !(p < 10000000)) return false;
      if (price === 'mid' && !(p >= 10000000 && p <= 50000000)) return false;
      if (price === 'high' && !(p > 50000000)) return false;
    }
    return true;
  });
}
function applyCasesFilters() {
  const tbody = document.querySelector('#cases-body');
  const filtered = getFilteredCases();
  document.querySelector('#cases-pagination-info').textContent = `نمایش ${toPersianDigits(filtered.length)} از ${toPersianDigits(casesRawData.length)} نتیجه`;
  if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-gray-400">پرونده‌ای یافت نشد</td></tr>'; return; }
  tbody.innerHTML = filtered.map(c => {
    const lawyerPhone = casesLawyerByCaseId[c.id];
    const lawyerName = lawyerPhone ? (casesNameByPhone[lawyerPhone] || lawyerPhone) : '-';
    return `<tr class="hover:bg-gray-50/50 transition-colors cursor-pointer" onclick='renderCaseDetail(casesRawData.find(x=>x.id==="${c.id}"))'>
      <td class="px-6 py-4 font-medium text-gray-900">${toPersianDigits(String(c.id).slice(0, 8))}</td>
      <td class="px-6 py-4 text-gray-700">${escapeHtml(c.case_type)}</td>
      <td class="px-6 py-4 text-gray-600">${escapeHtml(casesNameByPhone[c.client_phone] || c.client_phone || '—')}</td>
      <td class="px-6 py-4 text-gray-600">${escapeHtml(lawyerName)}</td>
      <td class="px-6 py-4 text-gray-600">${escapeHtml(c.province || '—')}</td>
      <td class="px-6 py-4 text-gray-600">${formatMoney(c.price)}</td>
      <td class="px-6 py-4 text-gray-500" dir="ltr">${formatDate(c.created_at)}</td>
      <td class="px-6 py-4"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}">${STATUS_LABELS[c.status] || c.status}</span></td>
      <td class="px-6 py-4"><div class="flex items-center justify-center gap-2">
        <button onclick="event.stopPropagation();renderCaseDetail(casesRawData.find(x=>x.id==='${c.id}'))" class="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-brand-dark transition flex items-center justify-center"><i class="fa-solid fa-eye"></i></button>
        <button onclick="event.stopPropagation();toast('این قابلیت به‌زودی اضافه می‌شود')" class="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 transition flex items-center justify-center"><i class="fa-solid fa-pen"></i></button>
        <button onclick="event.stopPropagation();toast('این قابلیت به‌زودی اضافه می‌شود')" class="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 transition flex items-center justify-center"><i class="fa-regular fa-comment-dots"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}
function renderCaseDetail(c) {
  if (!c) return;
  const lawyerPhone = casesLawyerByCaseId[c.id];
  const lawyerName = lawyerPhone ? (casesNameByPhone[lawyerPhone] || lawyerPhone) : null;
  const clientName = casesNameByPhone[c.client_phone] || c.client_phone || '—';
  const steps = [
    { label: 'ثبت پرونده توسط موکل', done: true, time: c.created_at },
    { label: 'پرداخت هزینه پرونده', done: !!c.price, time: c.price ? c.created_at : null },
    { label: 'تخصیص به وکیل', done: !!lawyerPhone, time: lawyerPhone ? c.created_at : null },
    { label: 'پذیرش توسط وکیل', done: c.status === 'accepted' || c.status === 'done', time: null },
    { label: c.status === 'done' ? 'مختومه' : 'در حال پیگیری', done: c.status === 'done', current: c.status !== 'done' }
  ];
  document.querySelector('#case-detail-panel').innerHTML = `
  <div class="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
    <h2 class="font-bold text-gray-800 text-lg flex items-center gap-3">پرونده شماره ${toPersianDigits(String(c.id).slice(0, 8))}<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}">${STATUS_LABELS[c.status] || c.status}</span></h2>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
    <div><h3 class="font-bold text-gray-900 mb-4 text-base">اطلاعات پرونده</h3>
      <div class="space-y-3 text-sm bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div class="flex justify-between"><span class="text-gray-500">موضوع پرونده:</span><span class="font-medium text-gray-900">${escapeHtml(c.case_type)}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">دسته‌بندی:</span><span class="font-medium text-gray-900">${escapeHtml(c.case_type)}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">زیر دسته:</span><span class="font-medium text-gray-900">${escapeHtml(c.subcategory || '—')}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">تاریخ ثبت:</span><span class="font-medium text-gray-900" dir="ltr">${formatDateTime(c.created_at)}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">استان:</span><span class="font-medium text-gray-900">${escapeHtml(c.province || '—')}</span></div>
      </div>
    </div>
    <div><h3 class="font-bold text-gray-900 mb-4 text-base">اشخاص مرتبط</h3>
      <div class="space-y-3">
        <div class="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100"><div class="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-xl"><i class="fa-regular fa-user"></i></div><div><div class="font-bold text-gray-900">${escapeHtml(clientName)} <span class="text-xs text-gray-500 font-normal mr-1">(موکل)</span></div><div class="text-xs text-gray-500 mt-1" dir="ltr">${toPersianDigits(c.client_phone || '—')}</div></div></div>
        ${lawyerName ? `<div class="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100"><div class="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-xl"><i class="fa-solid fa-user-tie"></i></div><div><div class="font-bold text-gray-900">${escapeHtml(lawyerName)} <span class="text-xs text-gray-500 font-normal mr-1">(وکیل)</span></div></div></div>` : `<div class="text-xs text-gray-400 p-3">هنوز وکیلی پذیرفته نشده است</div>`}
      </div>
    </div>
    <div><h3 class="font-bold text-gray-900 mb-4 text-base">وضعیت مالی</h3>
      <div class="flex items-center justify-between ${c.price ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'} p-4 rounded-2xl border">
        <div class="w-12 h-12 rounded-full bg-white ${c.price ? 'text-green-600' : 'text-gray-400'} flex items-center justify-center shadow-sm text-xl"><i class="fa-regular fa-credit-card"></i></div>
        <div class="text-left"><div class="flex items-center justify-end gap-2 text-sm mb-1"><span class="font-bold text-gray-900">${formatMoney(c.price)} تومان</span><span class="text-gray-500">مبلغ پرداختی:</span></div>
        <div class="flex items-center justify-end gap-2 text-sm"><span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${c.price ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">${c.price ? 'پرداخت کامل' : 'بدون پرداخت'}</span><span class="text-gray-500">وضعیت:</span></div></div>
      </div>
    </div>
    <div><h3 class="font-bold text-gray-900 mb-4 text-base">مسیر پرونده</h3>
      <div class="relative pr-2">
        ${steps.map((s, i) => `<div class="stepper-item ${s.done ? 'completed' : ''} relative ${i < steps.length - 1 ? 'pb-4' : ''} flex items-start gap-4">
          <div class="w-5 h-5 rounded-full ${s.done ? 'bg-brand-dark text-white' : s.current ? 'bg-white border-2 border-brand-dark text-brand-dark' : 'bg-gray-200'} flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_4px_white]"><div class="w-1.5 h-1.5 ${s.done ? 'bg-white' : 'bg-brand-dark'} rounded-full"></div></div>
          <div class="flex-1 flex flex-col pt-0.5"><span class="text-xs font-medium ${s.current ? 'font-bold text-brand-dark' : 'text-gray-900'}">${s.label}</span>${s.time ? `<span class="text-[10px] text-gray-500" dir="ltr">${formatDateTime(s.time)}</span>` : ''}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}
document.addEventListener('input', (e) => { if (e.target.id === 'cases-search') applyCasesFilters(); });
document.addEventListener('change', (e) => { if (['cases-province-filter', 'cases-category-filter', 'cases-status-filter', 'cases-date-filter', 'cases-price-filter'].includes(e.target.id)) applyCasesFilters(); });
document.addEventListener('click', (e) => {
  if (e.target.id === 'cases-apply-filter' || e.target.closest('#cases-apply-filter')) applyCasesFilters();
  if (e.target.id === 'cases-clear-filters' || e.target.closest('#cases-clear-filters')) {
    document.querySelector('#cases-search').value = '';
    document.querySelector('#cases-province-filter').value = '';
    document.querySelector('#cases-category-filter').value = '';
    document.querySelector('#cases-status-filter').value = '';
    document.querySelector('#cases-date-filter').value = '';
    document.querySelector('#cases-price-filter').value = '';
    applyCasesFilters();
  }
  if (e.target.id === 'cases-export-excel' || e.target.closest('#cases-export-excel')) {
    const filtered = getFilteredCases();
    const rows = filtered.map(c => ({ 'شماره پرونده': String(c.id).slice(0, 8), 'موضوع': c.case_type, 'موکل': casesNameByPhone[c.client_phone] || c.client_phone || '', 'استان': c.province || '', 'هزینه': c.price || 0, 'تاریخ ثبت': formatDate(c.created_at), 'وضعیت': STATUS_LABELS[c.status] || c.status }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'پرونده‌ها');
    XLSX.writeFile(wb, `پرونده‌ها-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
});

// ===================== LAWYERS =====================
async function loadLawyers() {
  const tbody = document.querySelector('#lawyers-body');
  tbody.innerHTML = '<tr><td colspan="11" class="text-center py-6">در حال بارگذاری...</td></tr>';
  document.querySelector('#lawyers-stat-cards').innerHTML = '<p class="p-5 text-gray-400 text-sm">در حال بارگذاری...</p>';
  const { data, error } = await sb.from('profiles').select('*').eq('role', 'lawyer').order('created_at', { ascending: false });
  if (error) { tbody.innerHTML = '<tr><td colspan="11" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }
  const { data: conversations } = await sb.from('conversations').select('lawyer_phone, cases(status)');
  lawyersActiveCasesMap = {};
  (conversations || []).forEach(conv => {
    const status = conv.cases?.status;
    if (status === 'accepted' || status === 'pending_confirmation') lawyersActiveCasesMap[conv.lawyer_phone] = (lawyersActiveCasesMap[conv.lawyer_phone] || 0) + 1;
  });
  lawyersRawData = data || [];
  const provinceSelect = document.querySelector('#lawyers-province-filter');
  provinceSelect.innerHTML = '<option value="">استان</option>' + IRAN_PROVINCES.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  const specialtySelect = document.querySelector('#lawyers-specialty-filter');
  const allSpecialties = new Set();
  lawyersRawData.forEach(l => (l.specialties || '').split('،').map(s => s.trim()).filter(Boolean).forEach(s => allSpecialties.add(s)));
  specialtySelect.innerHTML = '<option value="">تخصص</option>' + [...allSpecialties].sort().map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  document.querySelector('#lawyers-city-filter').innerHTML = '<option value="">شهر</option>';
  renderLawyersStatCards();
  applyLawyersFilters();
  renderLawyersActivityTimeline();
}
function renderLawyersStatCards() {
  const total = lawyersRawData.length;
  const active = lawyersRawData.filter(l => l.verification_status === 'approved').length;
  const pending = lawyersRawData.filter(l => l.verification_status === 'pending').length;
  const suspended = lawyersRawData.filter(l => l.verification_status === 'rejected').length;
  document.querySelector('#lawyers-stat-cards').innerHTML = `
  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start"><span class="text-gray-500 text-sm">کل وکلا</span><div class="bg-brand-dark/10 p-2 rounded-xl text-brand-dark"><i class="fa-solid fa-gavel"></i></div></div><div class="flex items-end justify-between"><span class="text-2xl font-bold text-gray-900">${toPersianDigits(total)}</span></div></div>
  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start"><span class="text-gray-500 text-sm">وکلای فعال</span><div class="bg-green-100 p-2 rounded-xl text-green-700"><i class="fa-solid fa-circle-check"></i></div></div><div class="flex items-end justify-between"><span class="text-2xl font-bold text-gray-900">${toPersianDigits(active)}</span></div></div>
  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start"><span class="text-gray-500 text-sm">در انتظار تایید</span><div class="bg-yellow-100 p-2 rounded-xl text-yellow-700"><i class="fa-regular fa-clock"></i></div></div><div class="flex items-end justify-between"><span class="text-2xl font-bold text-gray-900">${toPersianDigits(pending)}</span></div></div>
  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start"><span class="text-gray-500 text-sm">تعلیق شده</span><div class="bg-red-100 p-2 rounded-xl text-red-600"><i class="fa-solid fa-ban"></i></div></div><div class="flex items-end justify-between"><span class="text-2xl font-bold text-gray-900">${toPersianDigits(suspended)}</span></div></div>
  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start"><span class="text-gray-500 text-sm">آنلاین</span><div class="bg-blue-100 p-2 rounded-xl text-blue-600"><i class="fa-solid fa-wifi"></i></div></div><div class="flex items-end justify-between"><span class="text-2xl font-bold text-gray-900">—</span></div></div>
  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start"><span class="text-gray-500 text-sm">آفلاین</span><div class="bg-gray-100 p-2 rounded-xl text-gray-500"><i class="fa-solid fa-wifi" style="opacity:.4"></i></div></div><div class="flex items-end justify-between"><span class="text-2xl font-bold text-gray-900">—</span></div></div>`;
}
function getFilteredLawyers() {
  const search = (document.querySelector('#lawyers-search').value || '').trim();
  const province = document.querySelector('#lawyers-province-filter').value;
  const specialty = document.querySelector('#lawyers-specialty-filter').value;
  const status = document.querySelector('#lawyers-status-filter').value;
  return lawyersRawData.filter(l => {
    const fullName = `${l.first_name || ''} ${l.last_name || ''}`;
    if (search && !fullName.includes(search) && !(l.phone || '').includes(search) && !(l.license_number || '').includes(search)) return false;
    if (province && l.main_province !== province) return false;
    if (specialty && !(l.specialties || '').includes(specialty)) return false;
    if (status && l.verification_status !== status) return false;
    return true;
  });
}
function applyLawyersFilters() {
  const tbody = document.querySelector('#lawyers-body');
  const filtered = getFilteredLawyers();
  document.querySelector('#lawyers-pagination-info').textContent = `نمایش ${toPersianDigits(filtered.length)} از ${toPersianDigits(lawyersRawData.length)} نتیجه`;
  if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="11" class="text-center py-6 text-gray-400">وکیلی یافت نشد</td></tr>'; return; }
  tbody.innerHTML = filtered.map(l => {
    const vs = l.verification_status || 'not_submitted';
    const activeCases = lawyersActiveCasesMap[l.phone] || 0;
    const hasPhoto = l.profile_photo_url;
    return `<tr class="border-b border-gray-50 hover:bg-gray-50 transition group">
      <td class="px-4 py-3">${hasPhoto ? `<img class="w-10 h-10 rounded-full object-cover" src="${escapeHtml(l.profile_photo_url)}">` : `<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">${initials(`${l.first_name} ${l.last_name}`)}</div>`}</td>
      <td class="px-4 py-3 font-medium">${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</td>
      <td class="px-4 py-3 text-gray-500" dir="ltr">${toPersianDigits(escapeHtml(l.license_number || '—'))}</td>
      <td class="px-4 py-3">${escapeHtml(l.specialties || '—')}</td>
      <td class="px-4 py-3 text-sm">${escapeHtml(l.main_province || '—')}</td>
      <td class="px-4 py-3 text-sm">—</td>
      <td class="px-4 py-3 text-center font-semibold">${toPersianDigits(activeCases)}</td>
      <td class="px-4 py-3 text-center">—</td>
      <td class="px-4 py-3 text-sm text-gray-500">${l.last_active ? formatDate(l.last_active) : '—'}</td>
      <td class="px-4 py-3 text-center"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${LAWYER_STATUS_COLORS[vs]}">${LAWYER_STATUS_LABELS[vs]}</span></td>
      <td class="px-4 py-3"><div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onclick="viewLawyer('${l.phone}')" class="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-brand-dark/10 rounded-lg transition-colors"><i class="fa-regular fa-eye"></i></button>
        <button onclick="editLawyer('${l.phone}')" class="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-brand-dark/10 rounded-lg transition-colors"><i class="fa-regular fa-pen-to-square"></i></button>
        <button onclick="messageLawyer('${l.phone}')" class="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-brand-dark/10 rounded-lg transition-colors"><i class="fa-regular fa-comment-dots"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}
function viewLawyer(phone) {
  const l = lawyersRawData.find(x => x.phone === phone);
  if (!l) return;
  const activeCases = lawyersActiveCasesMap[phone] || 0;
  alert(`نام: ${l.first_name} ${l.last_name}\nشماره پروانه: ${l.license_number || '—'}\nتخصص: ${l.specialties || '—'}\nاستان: ${l.main_province || '—'}\nتلفن: ${l.phone}\nپرونده‌های فعال: ${activeCases}\nوضعیت: ${LAWYER_STATUS_LABELS[l.verification_status || 'not_submitted']}`);
}
function editLawyer(phone) { toast('این قابلیت به‌زودی اضافه می‌شود'); }
function messageLawyer(phone) { toast('این قابلیت به‌زودی اضافه می‌شود'); }
function exportLawyersToExcel() {
  const filtered = getFilteredLawyers();
  const rows = filtered.map(l => ({ 'نام': `${l.first_name || ''} ${l.last_name || ''}`, 'شماره پروانه': l.license_number || '', 'تخصص': l.specialties || '', 'استان': l.main_province || '', 'تلفن': l.phone || '', 'پرونده‌های فعال': lawyersActiveCasesMap[l.phone] || 0, 'وضعیت': LAWYER_STATUS_LABELS[l.verification_status || 'not_submitted'], 'آخرین ورود': l.last_active ? formatDate(l.last_active) : '' }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'وکلا');
  XLSX.writeFile(wb, `وکلا-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
function renderLawyersActivityTimeline() {
  const box = document.querySelector('#lawyers-activity-timeline');
  if (!box) return;
  const recentlyActive = [...lawyersRawData].filter(l => l.last_active).sort((a, b) => new Date(b.last_active) - new Date(a.last_active)).slice(0, 6);
  if (recentlyActive.length === 0) { box.innerHTML = '<p class="text-gray-400 text-xs">هنوز فعالیتی ثبت نشده است</p>'; return; }
  box.innerHTML = `<div class="absolute right-[11px] top-2 bottom-0 w-0.5 bg-gray-100"></div>` + recentlyActive.map(l => `
    <div class="relative flex gap-4 mb-6">
      <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center z-10 shrink-0 mt-0.5 ring-4 ring-white"><i class="fa-solid fa-right-to-bracket text-[11px]"></i></div>
      <div><p class="text-sm font-semibold text-gray-900">ورود به سیستم</p><p class="text-xs text-gray-500 mt-1">${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)} (${escapeHtml(l.main_province || '—')})</p><p class="text-[10px] text-gray-500 mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded-full">${formatDate(l.last_active)}</p></div>
    </div>`).join('');
}
document.addEventListener('input', (e) => { if (e.target.id === 'lawyers-search') applyLawyersFilters(); });
document.addEventListener('change', (e) => { if (['lawyers-province-filter', 'lawyers-city-filter', 'lawyers-specialty-filter', 'lawyers-status-filter', 'lawyers-online-filter', 'lawyers-rating-filter'].includes(e.target.id)) applyLawyersFilters(); });
document.addEventListener('click', (e) => {
  if (e.target.id === 'lawyers-clear-filters' || e.target.closest('#lawyers-clear-filters')) {
    document.querySelector('#lawyers-search').value = '';
    document.querySelector('#lawyers-province-filter').value = '';
    document.querySelector('#lawyers-city-filter').value = '';
    document.querySelector('#lawyers-specialty-filter').value = '';
    document.querySelector('#lawyers-status-filter').value = '';
    document.querySelector('#lawyers-online-filter').value = '';
    document.querySelector('#lawyers-rating-filter').value = '';
    applyLawyersFilters();
  }
  if (e.target.id === 'lawyers-apply-filter' || e.target.closest('#lawyers-apply-filter')) applyLawyersFilters();
  if (e.target.id === 'lawyers-export-excel' || e.target.closest('#lawyers-export-excel')) exportLawyersToExcel();
});

// ===================== CLIENTS =====================
async function loadClients() {
  const tbody = document.querySelector('#clients-body');
  tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6">در حال بارگذاری...</td></tr>';
  document.querySelector('#clients-stat-cards').innerHTML = '<p class="p-5 text-gray-400 text-sm">در حال بارگذاری...</p>';
  const { data: clients, error } = await sb.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false });
  if (error) { tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }
  const { data: cases } = await sb.from('cases').select('client_phone, price, status');
  clientsCasesMap = {}; clientsCaseStatusMap = {};
  (cases || []).forEach(c => {
    const phone = c.client_phone; if (!phone) return;
    if (!clientsCasesMap[phone]) clientsCasesMap[phone] = { count: 0, total: 0 };
    clientsCasesMap[phone].count += 1; clientsCasesMap[phone].total += Number(c.price || 0);
    if (!clientsCaseStatusMap[phone]) clientsCaseStatusMap[phone] = [];
    clientsCaseStatusMap[phone].push(c.status);
  });
  clientsRawData = clients || [];
  const provinceSelect = document.querySelector('#clients-province-filter');
  provinceSelect.innerHTML = '<option value="">همه استان‌ها</option>' + IRAN_PROVINCES.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  const citySelect = document.querySelector('#clients-city-filter');
  const cities = [...new Set(clientsRawData.map(c => c.residence_city).filter(Boolean))].sort();
  citySelect.innerHTML = '<option value="">همه شهرها</option>' + cities.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  renderClientsStatCards();
  applyClientsFilters();
  renderClientsLineChart();
  renderClientsDonutChart();
  renderClientsRecentList();
}
function renderClientsStatCards() {
  const total = clientsRawData.length;
  const active = clientsRawData.filter(c => c.verification_status === 'approved').length;
  const inactive = clientsRawData.filter(c => c.verification_status === 'not_submitted').length;
  const monthStart = new Date(); monthStart.setDate(1);
  const newThisMonth = clientsRawData.filter(c => new Date(c.created_at) >= monthStart).length;
  const totalPaid = Object.values(clientsCasesMap).reduce((s, v) => s + v.total, 0);
  document.querySelector('#clients-stat-cards').innerHTML = `
  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start flex-row-reverse"><div class="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500"><i class="fa-solid fa-coins text-lg"></i></div><div class="text-right flex-1 ml-2"><p class="text-xs text-gray-500 mb-1">مبلغ پرداختی کل</p><h3 class="text-xl font-bold">${formatMoney(totalPaid)}</h3><p class="text-[10px] text-gray-400">تومان</p></div></div></div>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start flex-row-reverse"><div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><i class="fa-regular fa-folder-open text-lg"></i></div><div class="text-right flex-1 ml-2"><p class="text-xs text-gray-500 mb-1">کل پرونده‌های ثبت‌شده</p><h3 class="text-xl font-bold">${toPersianDigits(Object.values(clientsCasesMap).reduce((s, v) => s + v.count, 0))}</h3></div></div></div>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start flex-row-reverse"><div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500"><i class="fa-solid fa-user-xmark text-lg"></i></div><div class="text-right flex-1 ml-2"><p class="text-xs text-gray-500 mb-1">موکلان غیرفعال</p><h3 class="text-xl font-bold">${toPersianDigits(inactive)}</h3></div></div></div>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start flex-row-reverse"><div class="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500"><i class="fa-regular fa-clock text-lg"></i></div><div class="text-right flex-1 ml-2"><p class="text-xs text-gray-500 mb-1">موکلان جدید این ماه</p><h3 class="text-xl font-bold">${toPersianDigits(newThisMonth)}</h3></div></div></div>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start flex-row-reverse"><div class="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500"><i class="fa-solid fa-user-check text-lg"></i></div><div class="text-right flex-1 ml-2"><p class="text-xs text-gray-500 mb-1">موکلان فعال</p><h3 class="text-xl font-bold">${toPersianDigits(active)}</h3></div></div></div>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32"><div class="flex justify-between items-start flex-row-reverse"><div class="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500"><i class="fa-solid fa-users text-lg"></i></div><div class="text-right flex-1 ml-2"><p class="text-xs text-gray-500 mb-1">کل موکلان</p><h3 class="text-xl font-bold">${toPersianDigits(total)}</h3></div></div></div>`;
}
function getFilteredClients() {
  const search = (document.querySelector('#clients-search').value || '').trim();
  const province = document.querySelector('#clients-province-filter').value;
  const city = document.querySelector('#clients-city-filter').value;
  const status = document.querySelector('#clients-status-filter').value;
  const dateFrom = document.querySelector('#clients-date-filter').value;
  const caseStatus = document.querySelector('#clients-case-status-filter').value;
  const payment = document.querySelector('#clients-payment-filter').value;
  return clientsRawData.filter(c => {
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`;
    if (search && !fullName.includes(search) && !(c.phone || '').includes(search) && !(c.national_code || '').includes(search)) return false;
    if (province && c.residence_province !== province) return false;
    if (city && c.residence_city !== city) return false;
    if (status && c.verification_status !== status) return false;
    if (dateFrom && new Date(c.created_at) < new Date(dateFrom)) return false;
    if (caseStatus) { const statuses = clientsCaseStatusMap[c.phone] || []; if (!statuses.includes(caseStatus)) return false; }
    if (payment) {
      const total = (clientsCasesMap[c.phone] || { total: 0 }).total;
      if (payment === 'none' && total !== 0) return false;
      if (payment === 'low' && !(total > 0 && total < 10000000)) return false;
      if (payment === 'mid' && !(total >= 10000000 && total <= 50000000)) return false;
      if (payment === 'high' && !(total > 50000000)) return false;
    }
    return true;
  });
}
function applyClientsFilters() {
  const tbody = document.querySelector('#clients-body');
  const filtered = getFilteredClients();
  document.querySelector('#clients-pagination-info').textContent = `نمایش ${toPersianDigits(filtered.length)} از ${toPersianDigits(clientsRawData.length)} نتیجه`;
  if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-gray-400">موکلی یافت نشد</td></tr>'; return; }
  tbody.innerHTML = filtered.map(c => {
    const stat = clientsCasesMap[c.phone] || { count: 0, total: 0 };
    const vs = c.verification_status || 'not_submitted';
    return `<tr class="border-b border-gray-50 hover:bg-gray-50 transition">
      <td class="px-4 py-4"><div class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">${initials(`${c.first_name} ${c.last_name}`)}</span><span class="font-bold text-gray-900 text-sm whitespace-nowrap">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</span></div></td>
      <td class="px-4 py-4 text-gray-600 text-sm text-center" dir="ltr">${toPersianDigits(escapeHtml(c.national_code || '—'))}</td>
      <td class="px-4 py-4 text-gray-600 text-sm text-center" dir="ltr">${toPersianDigits(escapeHtml(c.phone))}</td>
      <td class="px-4 py-4 text-gray-600 text-sm text-center">${escapeHtml(c.residence_province || '—')}</td>
      <td class="px-4 py-4 text-gray-600 text-sm text-center">${escapeHtml(c.residence_city || '—')}</td>
      <td class="px-4 py-4 text-gray-600 text-sm font-medium text-center">${toPersianDigits(stat.count)}</td>
      <td class="px-4 py-4 text-gray-600 text-sm text-center">${formatMoney(stat.total)}</td>
      <td class="px-4 py-4 text-center"><span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${CLIENT_STATUS_COLORS[vs]}">${CLIENT_STATUS_LABELS[vs]}</span></td>
      <td class="px-4 py-4"><div class="flex items-center justify-center gap-2">
        <button onclick="messageClient('${c.phone}')" class="text-gray-400 hover:text-brand-dark transition p-1.5 border border-gray-100 rounded-lg"><i class="fa-regular fa-envelope"></i></button>
        <button onclick="editClient('${c.phone}')" class="text-gray-400 hover:text-brand-dark transition p-1.5 border border-gray-100 rounded-lg"><i class="fa-regular fa-pen-to-square"></i></button>
        <button onclick="viewClient('${c.phone}')" class="text-gray-400 hover:text-brand-dark transition p-1.5 border border-gray-100 rounded-lg"><i class="fa-regular fa-eye"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}
function viewClient(phone) {
  const c = clientsRawData.find(x => x.phone === phone);
  if (!c) return;
  const stat = clientsCasesMap[phone] || { count: 0, total: 0 };
  alert(`نام: ${c.first_name} ${c.last_name}\nکد ملی: ${c.national_code || '—'}\nتلفن: ${c.phone}\nاستان: ${c.residence_province || '—'}\nشهر: ${c.residence_city || '—'}\nتعداد پرونده: ${stat.count}\nمبلغ پرداختی: ${formatMoney(stat.total)} تومان\nتاریخ ثبت‌نام: ${formatDate(c.created_at)}`);
}
function editClient(phone) { toast('این قابلیت به‌زودی اضافه می‌شود'); }
function messageClient(phone) { toast('این قابلیت به‌زودی اضافه می‌شود'); }
function exportClientsToExcel() {
  const filtered = getFilteredClients();
  const rows = filtered.map(c => { const stat = clientsCasesMap[c.phone] || { count: 0, total: 0 }; return { 'نام': `${c.first_name || ''} ${c.last_name || ''}`, 'کد ملی': c.national_code || '', 'تلفن': c.phone || '', 'استان': c.residence_province || '', 'شهر': c.residence_city || '', 'تعداد پرونده': stat.count, 'مبلغ پرداختی (تومان)': stat.total, 'وضعیت': CLIENT_STATUS_LABELS[c.verification_status || 'not_submitted'], 'تاریخ ثبت‌نام': formatDate(c.created_at) }; });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'موکلان');
  XLSX.writeFile(wb, `موکلان-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
document.addEventListener('input', (e) => { if (e.target.id === 'clients-search') applyClientsFilters(); });
document.addEventListener('change', (e) => { if (['clients-province-filter', 'clients-city-filter', 'clients-status-filter', 'clients-date-filter', 'clients-case-status-filter', 'clients-payment-filter'].includes(e.target.id)) applyClientsFilters(); });
document.addEventListener('click', (e) => {
  if (e.target.id === 'clients-clear-filters' || e.target.closest('#clients-clear-filters')) {
    document.querySelector('#clients-search').value = '';
    document.querySelector('#clients-province-filter').value = '';
    document.querySelector('#clients-city-filter').value = '';
    document.querySelector('#clients-status-filter').value = '';
    document.querySelector('#clients-date-filter').value = '';
    document.querySelector('#clients-case-status-filter').value = '';
    document.querySelector('#clients-payment-filter').value = '';
    applyClientsFilters();
  }
  if (e.target.id === 'clients-apply-filter' || e.target.closest('#clients-apply-filter')) applyClientsFilters();
  if (e.target.id === 'clients-export-excel' || e.target.closest('#clients-export-excel')) exportClientsToExcel();
});
function timeAgoLabel(iso) {
  if (!iso) return '—';
  const date = new Date(iso), now = new Date();
  const h = toPersianDigits(String(date.getHours()).padStart(2, '0'));
  const m = toPersianDigits(String(date.getMinutes()).padStart(2, '0'));
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return `امروز ${h}:${m}`;
  if (isYesterday) return `دیروز ${h}:${m}`;
  return formatDate(iso);
}
function renderClientsRecentList() {
  const box = document.querySelector('#clients-recent-list');
  if (!box) return;
  const recent = [...clientsRawData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
  if (recent.length === 0) { box.innerHTML = '<p class="text-gray-400 text-xs text-center">هنوز موکلی ثبت‌نام نکرده است</p>'; return; }
  box.innerHTML = recent.map(c => `<div class="flex justify-between items-center"><div class="flex items-center gap-3"><span class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">${initials(`${c.first_name} ${c.last_name}`)}</span><span class="font-bold text-sm">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</span></div><span class="text-xs text-gray-500">${timeAgoLabel(c.created_at)}</span></div>`).join('') + `<div class="mt-4 text-center"><a href="#" class="text-brand-dark text-xs font-medium hover:underline" data-view="clients">مشاهده همه</a></div>`;
  box.querySelector('a[data-view]')?.addEventListener('click', (e) => { e.preventDefault(); navigate('clients'); });
}
function renderClientsLineChart() {
  const ctx = document.getElementById('clientsLineChart');
  if (!ctx) return;
  if (clientsLineChartInstance) clientsLineChartInstance.destroy();
  const days = [], counts = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(toPersianDigits(new Date(d).toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' })));
    counts.push(clientsRawData.filter(c => (c.created_at || '').slice(0, 10) === key).length);
  }
  Chart.defaults.font.family = "'Vazirmatn', sans-serif";
  clientsLineChartInstance = new Chart(ctx.getContext('2d'), { type: 'line', data: { labels: days, datasets: [{ label: 'ثبت‌نام', data: counts, borderColor: '#10B981', borderWidth: 2, tension: 0.3, pointRadius: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: '#F3F4F6' } } } } });
}
function renderClientsDonutChart() {
  const ctx = document.getElementById('clientsDonutChart');
  if (!ctx) return;
  if (clientsDonutChartInstance) clientsDonutChartInstance.destroy();
  const counts = { approved: 0, pending: 0, rejected: 0, not_submitted: 0 };
  clientsRawData.forEach(c => { const vs = c.verification_status || 'not_submitted'; if (counts[vs] !== undefined) counts[vs]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const order = ['approved', 'pending', 'rejected', 'not_submitted'];
  const colors = ['#10B981', '#D1D5DB', '#EF4444', '#FACC15'];
  const legend = document.querySelector('#clients-donut-legend');
  if (total === 1 && Object.values(counts).every(v => v === 0)) { legend.innerHTML = '<span class="text-gray-400 text-xs">داده‌ای وجود ندارد</span>'; return; }
  clientsDonutChartInstance = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { labels: order.map(k => CLIENT_STATUS_LABELS[k]), datasets: [{ data: order.map(k => counts[k]), backgroundColor: colors, borderWidth: 0, cutout: '75%' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } } });
  legend.innerHTML = order.map((k, i) => { const pct = Math.round((counts[k] / total) * 100); return `<div class="flex items-center justify-between"><div class="flex items-center gap-2 text-gray-600"><span class="w-2.5 h-2.5 rounded-full" style="background:${colors[i]}"></span> ${CLIENT_STATUS_LABELS[k]}</div><span class="font-medium text-gray-700">${toPersianDigits(pct)}٪</span></div>`; }).join('');
}

// ===================== FINANCE =====================
async function loadFinance() {
  document.querySelector('#finance-summary-cards').innerHTML = '<p class="p-5 text-gray-400 text-sm">در حال بارگذاری...</p>';
  const { data: allCases, error } = await sb.from('cases').select('*').order('created_at', { ascending: false });
  if (error) { document.querySelector('#finance-summary-cards').innerHTML = '<p class="p-5 text-red-600 text-sm">خطا: ' + escapeHtml(error.message) + '</p>'; return; }

  const { data: profiles } = await sb.from('profiles').select('phone, first_name, last_name');
  const nameByPhone = {};
  (profiles || []).forEach(p => nameByPhone[p.phone] = `${p.first_name || ''} ${p.last_name || ''}`.trim());

  const paidCases = allCases.filter(c => c.price);
  const totalIncome = paidCases.reduce((s, c) => s + Number(c.price || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const incomeToday = paidCases.filter(c => (c.created_at || '').slice(0, 10) === today).reduce((s, c) => s + Number(c.price || 0), 0);
  const monthStart = new Date(); monthStart.setDate(1);
  const incomeMonth = paidCases.filter(c => new Date(c.created_at) >= monthStart).reduce((s, c) => s + Number(c.price || 0), 0);
  const doneCases = allCases.filter(c => c.status === 'done');
  const totalCommission = doneCases.reduce((s, c) => s + Number(c.commission_amount || 0), 0);
  const paidCommission = doneCases.filter(c => c.commission_paid).reduce((s, c) => s + Number(c.commission_amount || 0), 0);
  const unpaidCommission = totalCommission - paidCommission;
  const platformShare = totalIncome - totalCommission;

  const card = (label, value, unit, icon, bg, color) => `
  <div class="bg-white rounded-[24px] p-8 shadow-soft border border-gray-100 hover:shadow-md transition-all flex flex-col justify-between min-h-[160px]">
    <div class="flex justify-between items-start mb-4"><span class="text-xs text-gray-500 uppercase tracking-wider">${label}</span><div class="w-10 h-10 rounded-full ${bg} flex items-center justify-center ${color}"><i class="fa-solid ${icon} text-lg"></i></div></div>
    <div class="text-right"><div class="flex items-baseline gap-2 mb-2 justify-end"><h3 class="text-3xl font-extrabold text-gray-900">${value}</h3><span class="text-sm text-gray-500">${unit}</span></div></div>
  </div>`;
  document.querySelector('#finance-summary-cards').innerHTML =
    card('موجودی کل پلتفرم', formatMoney(totalIncome), 'تومان', 'fa-building-columns', 'bg-brand-dark/10', 'text-brand-dark') +
    card('درآمد امروز', formatMoney(incomeToday), 'تومان', 'fa-calendar-day', 'bg-[#D4AF37]/10', 'text-[#D4AF37]') +
    card('درآمد کل ماه جاری', formatMoney(incomeMonth), 'تومان', 'fa-chart-line', 'bg-brand-dark/10', 'text-brand-dark') +
    card('مجموع سهم وکلا (کل)', formatMoney(totalCommission), 'تومان', 'fa-users', 'bg-gray-100', 'text-gray-700') +
    card('مجموع سهم پلتفرم (کل)', formatMoney(platformShare), 'تومان', 'fa-chart-pie', 'bg-brand-dark/10', 'text-brand-dark') +
    card('تسویه‌های در انتظار', formatMoney(unpaidCommission), 'تومان', 'fa-hourglass-half', 'bg-orange-100', 'text-orange-600');

  document.querySelector('#finance-successful-count').textContent = toPersianDigits(paidCases.length);
  document.querySelector('#finance-pending-count').textContent = toPersianDigits(doneCases.filter(c => !c.commission_paid).length);
  document.querySelector('#finance-paid-cases-count').textContent = toPersianDigits(paidCases.length);
  document.querySelector('#finance-done-count').textContent = toPersianDigits(doneCases.length);

  const sparkline = (containerId, colorClass) => {
    const el = document.querySelector(containerId);
    if (!el) return;
    el.innerHTML = Array.from({ length: 7 }, () => `<div class="w-2 ${colorClass} rounded-full" style="height:${20 + Math.random() * 30}px"></div>`).join('');
  };
  sparkline('#finance-sparkline-1', 'bg-brand-dark/40');
  sparkline('#finance-sparkline-2', 'bg-[#D4AF37]/50');

  const tbody = document.querySelector('#finance-transactions-body');
  const recent = paidCases.slice(0, 6);
  tbody.innerHTML = recent.length === 0 ? '<tr><td colspan="5" class="text-center py-6 text-gray-400">هنوز تراکنشی ثبت نشده است</td></tr>' : recent.map(c => `
    <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td class="py-4 pl-4 font-mono text-sm text-gray-500">#${toPersianDigits(String(c.id).slice(0, 6))}</td>
      <td class="py-4 px-4 font-bold">${escapeHtml(nameByPhone[c.client_phone] || c.client_phone || '—')}</td>
      <td class="py-4 px-4">${formatMoney(c.price)}</td>
      <td class="py-4 px-4 text-gray-500">${formatDateTime(c.created_at)}</td>
      <td class="py-4 pr-4 text-left"><span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-dark/10 text-brand-dark text-xs font-bold"><span class="w-1.5 h-1.5 rounded-full bg-brand-dark"></span> موفق</span></td>
    </tr>`).join('');

  renderFinanceYearChart(allCases);
}
function renderFinanceYearChart(allCases) {
  const ctx = document.getElementById('financeYearChart');
  if (!ctx) return;
  if (financeYearChartInstance) financeYearChartInstance.destroy();
  const months = [], totalData = [], platformData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(toPersianDigits(new Date(d).toLocaleDateString('fa-IR', { month: 'long' })));
    const monthCases = allCases.filter(c => (c.created_at || '').slice(0, 7) === key);
    const total = monthCases.reduce((s, c) => s + Number(c.price || 0), 0) / 1000000;
    const platform = total - (monthCases.reduce((s, c) => s + Number(c.commission_amount || 0), 0) / 1000000);
    totalData.push(total);
    platformData.push(Math.max(platform, 0));
  }
  Chart.defaults.font.family = "'Vazirmatn', sans-serif";
  financeYearChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: { labels: months, datasets: [
      { label: 'درآمد کل (میلیون تومان)', data: totalData, backgroundColor: '#1A1E2F', borderRadius: 6 },
      { label: 'سهم پلتفرم (میلیون تومان)', data: platformData, backgroundColor: '#D4AF37', borderRadius: 6 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
  });
}

// ===================== REPORTS / USERS / SUPPORT =====================
async function loadReports() {
  const { data: cases, error } = await sb.from('cases').select('status');
  const tbody = document.querySelector('#reports-status-body');
  if (error) { tbody.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }
  const total = (cases || []).length;
  const counts = {};
  (cases || []).forEach(c => counts[c.status] = (counts[c.status] || 0) + 1);
  if (total === 0) { tbody.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-gray-400">داده‌ای وجود ندارد</td></tr>'; return; }
  tbody.innerHTML = Object.entries(counts).map(([status, count]) => `<tr class="border-b border-gray-50"><td class="px-4 py-3">${escapeHtml(STATUS_LABELS[status] || status)}</td><td class="px-4 py-3">${toPersianDigits(count)}</td><td class="px-4 py-3">${toPersianDigits(((count / total) * 100).toFixed(0))}%</td></tr>`).join('');
}
async function loadUsers() {
  const tbody = document.querySelector('#users-body');
  const { data, error } = await sb.from('admin_profiles').select('*');
  if (error) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-red-600">خطا: ' + escapeHtml(error.message) + '</td></tr>'; return; }
  tbody.innerHTML = (data || []).map(u => `<tr class="border-b border-gray-50"><td class="px-4 py-3">${escapeHtml(u.full_name)}</td><td class="px-4 py-3">${escapeHtml(u.username)}</td><td class="px-4 py-3">${escapeHtml(u.title || '—')}</td><td class="px-4 py-3">${u.role === 'ceo' ? 'مدیرعامل' : 'مدیر بخش حقوقی'}</td></tr>`).join('');
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
async function markCommissionPaid(caseId) {
  const { error } = await sb.from('cases').update({ commission_paid: true }).eq('id', caseId);
  if (error) { toast('خطا: ' + error.message, true); return; }
  toast('با موفقیت ثبت شد');
  loadFinance();
}

(async function init() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    const { data: adminProfile } = await sb.from('admin_profiles').select('*').eq('id', data.session.user.id).single();
    if (adminProfile) { PROFILE = adminProfile; showApp(); return; }
  }
  showLogin();
})();