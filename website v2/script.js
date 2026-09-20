const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
function setTheme(theme) {
  root.dataset.theme = theme;
  themeButton.textContent = theme === 'dark' ? '☼' : '☾';
  themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101722' : '#f8faff';
}
try { setTheme(localStorage.getItem('wtw-landing-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')); } catch { setTheme('light'); }
themeButton.addEventListener('click', () => { const theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; setTheme(theme); try { localStorage.setItem('wtw-landing-theme', theme); } catch {} });
document.querySelectorAll('.routine').forEach(button => button.addEventListener('click', () => {
  const done = button.classList.toggle('done');
  button.setAttribute('aria-pressed', String(done));
  button.querySelector('.check').textContent = done ? '✓' : '';
  const count = document.querySelectorAll('.routine.done').length;
  const percent = count * 25;
  document.getElementById('completion-count').textContent = `${count} of 4`;
  document.getElementById('progress-fill').style.width = `${percent}%`;
  document.querySelector('.ring').style.background = `conic-gradient(var(--blue) ${percent}%,var(--soft) 0)`;
  document.getElementById('ring-count').innerHTML = `${percent}<small>%</small>`;
  document.getElementById('progress-message').textContent = count === 4 ? 'Look at you go!' : count === 0 ? 'A fresh start awaits.' : "You're showing up.";
}));
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(element => { element.classList.add('js-reveal'); observer.observe(element); });
}
