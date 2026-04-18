(function () {
  'use strict';

  var wrapper  = document.querySelector('.cinematic-wrapper');
  var bgText   = document.querySelector('.cinematic-bg-text');
  var body     = document.querySelector('.cinematic-body');
  var bottom   = document.querySelector('.cinematic-bottom');
  var backTop  = document.getElementById('cinematic-back-top');

  if (!wrapper) return;

  /* === SCROLL REVEAL + PARALLAX === */
  var ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  function update() {
    ticking = false;
    var rect     = wrapper.getBoundingClientRect();
    var vh       = window.innerHeight;
    var progress = 1 - rect.top / vh;   // 0 at top edge entering, 1 when fully in view

    if (progress > 0.25) {
      if (body)   body.classList.add('visible');
      if (bottom) bottom.classList.add('visible');
    } else {
      if (body)   body.classList.remove('visible');
      if (bottom) bottom.classList.remove('visible');
    }

    if (bgText) {
      bgText.classList.toggle('visible', progress > 0.15);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  /* === MAGNETIC PILLS === */
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var bounds;

      el.addEventListener('mouseenter', function () {
        bounds = el.getBoundingClientRect();
      });

      el.addEventListener('mousemove', function (e) {
        if (!bounds) bounds = el.getBoundingClientRect();
        var cx = bounds.left + bounds.width  / 2;
        var cy = bounds.top  + bounds.height / 2;
        var dx = (e.clientX - cx) * 0.22;
        var dy = (e.clientY - cy) * 0.22;
        el.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      });

      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform 500ms cubic-bezier(0.25, 1, 0.5, 1)';
        el.style.transform  = '';
        setTimeout(function () { el.style.transition = ''; }, 520);
      });
    });
  }

  /* === BACK TO TOP === */
  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

}());
