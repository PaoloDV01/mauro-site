(function () {
  'use strict';

  var wrapper = document.getElementById('hi-wrapper');
  var s1      = document.getElementById('hi-s1');
  var s2      = document.getElementById('hi-s2');

  if (!wrapper || !s1 || !s2) return;

  var ticking = false;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function update() {
    ticking = false;

    var scrollY   = window.scrollY;
    var viewH     = window.innerHeight;
    /* Scrollable range = wrapper height (200dvh) minus one viewport.
       On browsers supporting dvh this is accurate; fallback: 100vh. */
    var scrollMax = wrapper.offsetHeight - viewH;
    if (scrollMax <= 0) return;

    var p = clamp(scrollY / scrollMax, 0, 1); // 0 → 1 over the 100vh runway

    /* ------ Screen 1 exit -----------------------------------------------
       Starts fading at 35 % scroll progress, fully gone at 72 %. */
    var exit1  = clamp((p - 0.35) / 0.37, 0, 1);
    s1.style.opacity   = 1 - exit1;
    s1.style.transform = 'scale(' + (1 - exit1 * 0.04) + ') translateY(' + (-exit1 * 26) + 'px)';

    /* ------ Screen 2 enter -----------------------------------------------
       Starts appearing at 48 %, fully visible at 84 %. */
    var enter2 = clamp((p - 0.48) / 0.36, 0, 1);
    s2.style.opacity       = enter2;
    s2.style.transform     = 'translateY(' + ((1 - enter2) * 38) + 'px)';
    /* Only interactive when sufficiently visible */
    s2.style.pointerEvents = enter2 > 0.4 ? 'auto' : 'none';
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update);

  /* Run once immediately to set correct initial state */
  update();

  /* === Magnetic pills ===
     Subtle cursor-following tilt on service pill buttons. */
  var noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!noMotion) {
    document.querySelectorAll('[data-hi-mag]').forEach(function (el) {
      var b;

      el.addEventListener('mouseenter', function () {
        b = el.getBoundingClientRect();
      });

      el.addEventListener('mousemove', function (e) {
        if (!b) b = el.getBoundingClientRect();
        var dx = (e.clientX - b.left - b.width  / 2) * 0.17;
        var dy = (e.clientY - b.top  - b.height / 2) * 0.17;
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });

      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform 480ms cubic-bezier(0.25,1,0.5,1)';
        el.style.transform  = '';
        setTimeout(function () { el.style.transition = ''; }, 500);
      });
    });
  }

}());
