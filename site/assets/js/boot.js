/* Runs before the page paints: marks JS, remembers the centre, sends returning Bengaluru visitors to their centre. */
(function () {
  var d = document.documentElement, k = 'ssr-city';
  d.classList.add('js');
  try {
    var pick = localStorage.getItem(k + '-pick');
    if (d.hasAttribute('data-root') && pick === 'bangalore' && !/[?&]city=surat/.test(location.search)) {
      location.replace('/bangalore' + location.search + location.hash); return;
    }
    if (!d.hasAttribute('data-shared') && !d.hasAttribute('data-root')) localStorage.setItem(k, d.getAttribute('data-city'));
    if (d.hasAttribute('data-shared') && (pick || localStorage.getItem(k)) === 'bangalore') d.setAttribute('data-city', 'bangalore');
  } catch (e) { }
  setTimeout(function () { if (!window.__anim) d.classList.add('anim-off'); }, 2500);
})();
