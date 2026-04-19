/* shared script.js — Trasporti Leonardo Group */

(function () {
  'use strict';

  /* === SCROLL REVEAL === */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('visible');
    });
  } else if (window.IntersectionObserver) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -32px 0px' });

    document.querySelectorAll('.reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* === HEADER SCROLL ELEVATION === */
  var header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    }, { passive: true });
  }

  /* === MOBILE MENU === */
  var menuBtn = document.getElementById('mobile-menu-btn');
  var mobileNav = document.getElementById('mobile-nav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var isOpen = mobileNav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    // Close on nav link click
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* === ACTIVE NAV LINK === */
  var currentPath = window.location.pathname;
  document.querySelectorAll('.nav-desktop a, #mobile-nav a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href && href !== '/' && currentPath.startsWith(href)) {
      link.classList.add('active');
    } else if (href === '/' && currentPath === '/') {
      link.classList.add('active');
    }
  });

  /* === FAQ ACCORDION === */
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* === CONTACT FORM === */
  var contactForm = document.getElementById('contact-form');
  var contactSuccess = document.getElementById('form-success');
  if (contactForm && contactSuccess) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Clear previous errors
      contactForm.querySelectorAll('.form-field--error').forEach(function (el) {
        el.classList.remove('form-field--error');
      });
      contactForm.querySelectorAll('.form-error-text').forEach(function (el) {
        el.style.display = 'none';
        el.textContent = '';
      });
      var submitErrEl = contactForm.querySelector('.form-submit-error');
      if (submitErrEl) submitErrEl.remove();

      // Build payload
      var fd = new FormData(contactForm);
      var payload = {
        nome:     (fd.get('nome') || '').trim(),
        azienda:  (fd.get('azienda') || '').trim() || null,
        telefono: (fd.get('telefono') || '').trim(),
        email:    (fd.get('email') || '').trim() || null,
        partenza: (fd.get('partenza') || '').trim(),
        scarico:  (fd.get('scarico') || '').trim(),
        servizio: (fd.get('servizio') || '').trim() || null,
        merce:    (fd.get('merce') || '').trim() || null,
        note:     (fd.get('note') || '').trim() || null,
        urgente:   contactForm.querySelector('#urgente') ? contactForm.querySelector('#urgente').checked : false,
        tail_lift: contactForm.querySelector('#tail_lift') ? contactForm.querySelector('#tail_lift').checked : false
      };
      var palletsVal = parseInt(fd.get('pallets'), 10);
      if (!isNaN(palletsVal)) payload.pallets = palletsVal;
      var pesoVal = parseInt(fd.get('peso_kg'), 10);
      if (!isNaN(pesoVal)) payload.peso_kg = pesoVal;

      // Submit state
      var submitBtn = contactForm.querySelector('[type="submit"]');
      var originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Invio in corso…';
      }

      fetch('/api/quotes/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
      .then(function (r) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnHtml; }

        if (r.status === 200 && r.data.ok) {
          contactForm.style.display = 'none';
          contactSuccess.classList.add('visible');
          window.scrollTo({ top: contactSuccess.offsetTop - 100, behavior: 'smooth' });
          return;
        }

        // Validation errors from API (422)
        var errors = (r.data && r.data.errors) ? r.data.errors : [];
        var fieldMap = { nome: 'nome', telefono: 'telefono', email: 'email',
                         partenza: 'partenza', scarico: 'scarico',
                         pallets: 'pallets', peso_kg: 'peso_kg' };
        var handled = [];

        errors.forEach(function (msg) {
          var colon = msg.indexOf(':');
          var fieldKey = colon > -1 ? msg.substring(0, colon).trim() : '';
          var text = colon > -1 ? msg.substring(colon + 1).trim() : msg;
          if (fieldMap[fieldKey]) {
            var input = contactForm.querySelector('#' + fieldMap[fieldKey]);
            var errorEl = document.getElementById(fieldMap[fieldKey] + '-error');
            if (input) input.classList.add('form-field--error');
            if (errorEl) { errorEl.textContent = text; errorEl.style.display = 'block'; }
            handled.push(fieldKey);
          }
        });

        // Any unhandled errors → show generic message below submit
        var unhandled = errors.filter(function (msg) {
          var colon = msg.indexOf(':');
          var k = colon > -1 ? msg.substring(0, colon).trim() : '';
          return !fieldMap[k];
        });
        if (unhandled.length || (!errors.length && !r.data.ok)) {
          var p = document.createElement('p');
          p.className = 'form-submit-error';
          p.textContent = unhandled.length ? unhandled.join(' — ') : 'Si è verificato un errore. Riprova o chiamaci direttamente.';
          submitBtn.parentNode.insertBefore(p, submitBtn.nextSibling);
        }
      })
      .catch(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnHtml; }
        var p = document.createElement('p');
        p.className = 'form-submit-error';
        p.textContent = 'Connessione non riuscita. Riprova o chiamaci direttamente.';
        submitBtn.parentNode.insertBefore(p, submitBtn.nextSibling);
      });
    });
  }

  /* === ANIMATED BACKGROUND PATHS === */
  if (!reducedMotion) {
    var bgTargets = [];
    var heroEl = document.getElementById('hero');
    if (heroEl) bgTargets.push(heroEl);
    document.querySelectorAll('.page-hero').forEach(function (el) { bgTargets.push(el); });

    if (bgTargets.length) {
      var kfStyle = document.createElement('style');
      kfStyle.textContent = '@keyframes bgPathFlow{0%{stroke-dashoffset:0}100%{stroke-dashoffset:-2500}}';
      document.head.appendChild(kfStyle);

      function makeBgSVG(position) {
        var ns = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 696 316');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        for (var i = 0; i < 36; i++) {
          var p = position;
          var d = 'M-' + (380 - i*5*p) + ' -' + (189 + i*6) +
                  'C-' + (380 - i*5*p) + ' -' + (189 + i*6) +
                  ' -' + (312 - i*5*p) + ' ' + (216 - i*6) +
                  ' '  + (152 - i*5*p) + ' ' + (343 - i*6) +
                  'C'  + (616 - i*5*p) + ' ' + (470 - i*6) +
                  ' '  + (684 - i*5*p) + ' ' + (875 - i*6) +
                  ' '  + (684 - i*5*p) + ' ' + (875 - i*6);
          var path = document.createElementNS(ns, 'path');
          path.setAttribute('d', d);
          path.setAttribute('stroke', 'currentColor');
          path.setAttribute('stroke-width', '' + (0.5 + i * 0.03));
          path.setAttribute('fill', 'none');
          var dash = 150 + i * 8;
          var opacity = Math.min(0.8, 0.06 + i * 0.022);
          var dur = (22 + i * 0.4).toFixed(1);
          var delay = -(i * 0.7).toFixed(1);
          path.style.cssText = 'stroke-dasharray:' + dash + ' 2500;' +
            'stroke-opacity:' + opacity.toFixed(2) + ';' +
            'animation:bgPathFlow ' + dur + 's linear infinite;' +
            'animation-delay:' + delay + 's;';
          svg.appendChild(path);
        }
        return svg;
      }

      bgTargets.forEach(function (target) {
        var container = document.createElement('div');
        container.className = 'bg-paths-container';
        container.style.color = 'var(--black)';
        container.appendChild(makeBgSVG(1));
        container.appendChild(makeBgSVG(-1));
        target.insertBefore(container, target.firstChild);
      });
    }
  }

  /* Also ensure hero-inner sits above bg paths */
  var heroInner = document.querySelector('#hero .hero-inner');
  if (heroInner) heroInner.style.position = 'relative';

  /* === ROUTES CAROUSEL === */
  (function () {
    var track = document.getElementById('routes-track');
    var prevBtn = document.getElementById('routes-prev');
    var nextBtn = document.getElementById('routes-next');
    var dotsWrap = document.getElementById('routes-dots');
    if (!track || !prevBtn || !nextBtn || !dotsWrap) return;

    var cards = Array.prototype.slice.call(track.querySelectorAll('.routes-card'));
    var total = cards.length;
    var current = 0;

    for (var d = 0; d < total; d++) {
      var dot = document.createElement('button');
      dot.className = 'routes-carousel__dot' + (d === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Tratta ' + (d + 1));
      dot.setAttribute('data-i', d);
      dotsWrap.appendChild(dot);
    }
    var dots = dotsWrap.querySelectorAll('.routes-carousel__dot');

    function syncDots(i) {
      dots.forEach(function (dot, idx) {
        dot.classList.toggle('active', idx === i);
      });
    }

    function scrollTo(i) {
      current = Math.max(0, Math.min(total - 1, i));
      var firstLeft = cards[0] ? cards[0].offsetLeft : 0;
      var target = cards[current];
      if (target) {
        track.scrollTo({ left: target.offsetLeft - firstLeft, behavior: 'smooth' });
      }
      syncDots(current);
    }

    prevBtn.addEventListener('click', function () { scrollTo(current - 1); });
    nextBtn.addEventListener('click', function () { scrollTo(current + 1); });
    dotsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-i]');
      if (btn) scrollTo(parseInt(btn.getAttribute('data-i'), 10));
    });

    var scrollTimer;
    track.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var firstLeft = cards[0] ? cards[0].offsetLeft : 0;
        var sl = track.scrollLeft;
        var best = 0, bestDist = Infinity;
        cards.forEach(function (c, idx) {
          var dist = Math.abs(c.offsetLeft - firstLeft - sl);
          if (dist < bestDist) { bestDist = dist; best = idx; }
        });
        if (best !== current) { current = best; syncDots(current); }
      }, 80);
    }, { passive: true });
  }());

  /* === ITALY REGIONS MAP (D3) === */
  (function () {
    var container = document.getElementById('italy-map');
    var legend = document.getElementById('italy-legend');
    var tooltip = document.getElementById('map-tooltip');
    if (!container || typeof d3 === 'undefined') return;

    var regions = {
      'Lombardia':       'Milano e provincia — hub Nord principale',
      'Emilia-Romagna':  'Bologna, Rimini, asse adriatico',
      'Toscana':         'Firenze e principali centri',
      'Umbria':          'Tratte interne Centro Italia',
      'Marche':          'San Benedetto del Tronto, Ancona',
      'Lazio':           'Roma e provincia',
      'Abruzzo':         'Pescara — hub adriatico principale',
    };

    var w = container.offsetWidth || 300;
    var h = Math.round(w * 1.45);

    var svg = d3.select('#italy-map').append('svg')
      .attr('viewBox', '0 0 ' + w + ' ' + h)
      .attr('width', w).attr('height', h);

    var proj = d3.geoMercator()
      .center([12.5, 41.8])
      .scale(w * 3.3)
      .translate([w * 0.44, h * 0.50]);

    var pathGen = d3.geoPath().projection(proj);

    var geoUrl = 'https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_regions.geojson';

    d3.json(geoUrl).then(function (data) {
      svg.selectAll('path')
        .data(data.features)
        .enter().append('path')
        .attr('d', pathGen)
        .attr('class', function (d) {
          var n = d.properties.reg_name;
          return regions[n] ? 'italy-region active' : 'italy-region';
        })
        .on('mouseenter', function (event, d) {
          var n = d.properties.reg_name;
          if (!regions[n] || !tooltip) return;
          d3.select(this).classed('hovered', true);
          tooltip.innerHTML = '<strong>' + n + '</strong>' + regions[n];
          tooltip.style.left = (event.clientX + 14) + 'px';
          tooltip.style.top  = (event.clientY - 40) + 'px';
          tooltip.classList.add('visible');
        })
        .on('mousemove', function (event) {
          if (!tooltip) return;
          tooltip.style.left = (event.clientX + 14) + 'px';
          tooltip.style.top  = (event.clientY - 40) + 'px';
        })
        .on('mouseleave', function () {
          d3.select(this).classed('hovered', false);
          if (tooltip) tooltip.classList.remove('visible');
        });

      if (legend) {
        Object.keys(regions).forEach(function (name) {
          var item = document.createElement('div');
          item.className = 'italy-legend-item';
          item.innerHTML =
            '<div class="italy-legend-dot"></div>' +
            '<div><p class="italy-legend-name">' + name + '</p>' +
            '<p class="italy-legend-desc">' + regions[name] + '</p></div>';
          legend.appendChild(item);
        });
      }
    }).catch(function () {
      if (container) container.innerHTML =
        '<p style="font-size:0.875rem;color:var(--text-muted);">Mappa non disponibile in questo momento.</p>';
    });
  }());

  /* === ANIMATED BORDER BUTTONS (vanilla) === */
  function initAnimatedBorderButtons() {
    var animatedButtons = document.querySelectorAll('.btn-animated-border');
    if (!animatedButtons.length) return;

    animatedButtons.forEach(function (btn) {
      var computed = window.getComputedStyle(btn);
      var radius = computed.borderTopLeftRadius;

      if (radius && radius !== '0px') {
        btn.style.setProperty('--ab-radius', radius);
      }

      var customDuration = btn.getAttribute('data-ab-duration');
      if (customDuration) {
        btn.style.setProperty('--ab-duration', customDuration);
      }
    });
  }

  initAnimatedBorderButtons();

  /* === STICKY FOOTER (vanilla) === */
  function initStickyFooter() {
    var stickyFooter = document.querySelector('.sticky-footer-shell');
    if (!stickyFooter) return;

    var animatedBlocks = stickyFooter.querySelectorAll('[data-sf-animate]');
    if (!animatedBlocks.length) return;

    if (reducedMotion || !window.IntersectionObserver) {
      animatedBlocks.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -20px 0px' });

    animatedBlocks.forEach(function (el) {
      var delay = el.getAttribute('data-sf-delay');
      if (delay) {
        el.style.setProperty('--sf-delay', delay);
      }
      observer.observe(el);
    });
  }

  initStickyFooter();

  /* === ISOMETRIC WAVE GRID BG (vanilla) === */
  function initIsoWaveBackgrounds() {
    var targets = document.querySelectorAll('.section-light, .section-gray');
    if (!targets.length) return;

    function hexToRgb(hex) {
      var clean = (hex || '').trim().replace('#', '');
      if (clean.length === 3) {
        clean = clean.split('').map(function (c) { return c + c; }).join('');
      }
      if (clean.length !== 6) return null;
      var value = parseInt(clean, 16);
      if (Number.isNaN(value)) return null;
      return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255
      };
    }

    targets.forEach(function (section) {
      if (section.querySelector('.iso-wave-canvas')) return;

      section.classList.add('iso-wave-section');

      var canvas = document.createElement('canvas');
      canvas.className = 'iso-wave-canvas';
      canvas.setAttribute('aria-hidden', 'true');

      var overlay = document.createElement('div');
      overlay.className = 'iso-wave-overlay';
      overlay.setAttribute('aria-hidden', 'true');

      section.insertBefore(canvas, section.firstChild);
      section.insertBefore(overlay, canvas.nextSibling);

      var ctx = canvas.getContext('2d');
      if (!ctx) return;

      var rootStyles = getComputedStyle(document.documentElement);
      var silverVar = rootStyles.getPropertyValue('--silver');
      var whiteVar = rootStyles.getPropertyValue('--white');
      var silverRgb = hexToRgb(silverVar) || { r: 184, g: 190, b: 199 };
      var whiteRgb = hexToRgb(whiteVar) || { r: 255, g: 255, b: 255 };

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var width = 0;
      var height = 0;
      var gridGap = 44;
      var time = 0;
      var rafId;
      var mouse = { x: -1000, y: -1000, tx: -1000, ty: -1000 };

      function resize() {
        width = section.clientWidth;
        height = section.clientHeight;
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function lerp(a, b, t) {
        return a + (b - a) * t;
      }

      function draw(staticFrame) {
        ctx.clearRect(0, 0, width, height);

        if (!staticFrame) {
          mouse.x = lerp(mouse.x, mouse.tx, 0.12);
          mouse.y = lerp(mouse.y, mouse.ty, 0.12);
          time += 0.011;
        }

        var rows = Math.ceil(height / gridGap) + 4;
        var cols = Math.ceil(width / gridGap) + 4;

        for (var y = 0; y <= rows; y++) {
          ctx.beginPath();

          for (var x = 0; x <= cols; x++) {
            var baseX = x * gridGap - gridGap * 1.5;
            var baseY = y * gridGap - gridGap * 1.5;

            var wave = Math.sin(x * 0.25 + time) * Math.cos(y * 0.22 + time * 0.9) * 9;

            var dx = baseX - mouse.x;
            var dy = baseY - mouse.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var maxDist = 230;
            var force = Math.max(0, (maxDist - dist) / maxDist);
            var interaction = -(force * force) * 36;

            var finalX = baseX;
            var finalY = baseY + wave + interaction;

            if (x === 0) {
              ctx.moveTo(finalX, finalY);
            } else {
              ctx.lineTo(finalX, finalY);
            }
          }

          var ratio = y / Math.max(1, rows);
          var r = Math.round(whiteRgb.r + (silverRgb.r - whiteRgb.r) * ratio);
          var g = Math.round(whiteRgb.g + (silverRgb.g - whiteRgb.g) * ratio);
          var b = Math.round(whiteRgb.b + (silverRgb.b - whiteRgb.b) * ratio);
          var alpha = 0.16 + ratio * 0.24;
          ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        if (!staticFrame) {
          rafId = requestAnimationFrame(function () { draw(false); });
        }
      }

      function onMove(e) {
        var rect = section.getBoundingClientRect();
        mouse.tx = e.clientX - rect.left;
        mouse.ty = e.clientY - rect.top;
      }

      function onLeave() {
        mouse.tx = -1000;
        mouse.ty = -1000;
      }

      resize();
      if (reducedMotion) {
        draw(true);
      } else {
        draw(false);
      }

      window.addEventListener('resize', resize);
      section.addEventListener('mousemove', onMove);
      section.addEventListener('mouseleave', onLeave);

      section.__isoWaveCleanup = function () {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        section.removeEventListener('mousemove', onMove);
        section.removeEventListener('mouseleave', onLeave);
      };
    });
  }

  initIsoWaveBackgrounds();

  /* === EDITABLE CHIP === */
  (function () {
    document.querySelectorAll('[data-editable-chip]').forEach(function (chip) {
      var input = chip.querySelector('.editable-chip__input');
      var editBtn = chip.querySelector('.editable-chip__btn--edit');
      var saveBtn = chip.querySelector('.editable-chip__btn--save');
      if (!input || !editBtn || !saveBtn) return;

      editBtn.classList.add('ec-visible');
      saveBtn.classList.add('ec-hidden');

      function startEdit() {
        chip.classList.add('editing');
        input.readOnly = false;
        requestAnimationFrame(function () { input.focus(); input.select(); });
        editBtn.classList.remove('ec-visible');
        editBtn.classList.add('ec-hidden');
        saveBtn.classList.remove('ec-hidden');
        saveBtn.classList.add('ec-visible');
      }

      function stopEdit() {
        if (!input.value.trim()) input.value = '';
        chip.classList.remove('editing');
        input.readOnly = true;
        saveBtn.classList.remove('ec-visible');
        saveBtn.classList.add('ec-hidden');
        editBtn.classList.remove('ec-hidden');
        editBtn.classList.add('ec-visible');
        chip.dispatchEvent(new CustomEvent('chip:save', { detail: { value: input.value } }));
      }

      chip.addEventListener('click', function () {
        if (!chip.classList.contains('editing')) startEdit();
      });
      editBtn.addEventListener('click', function (e) { e.stopPropagation(); startEdit(); });
      saveBtn.addEventListener('click', function (e) { e.stopPropagation(); stopEdit(); });
      input.addEventListener('click', function (e) { e.stopPropagation(); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); stopEdit(); }
        if (e.key === 'Escape') { input.value = input.defaultValue || ''; stopEdit(); }
      });
    });
  }());

  /* === ADDRESS AUTOCOMPLETE (Photon / OpenStreetMap) === */
  (function () {
    var PHOTON    = 'https://photon.komoot.io/api/';
    var DELAY_MS  = 320;
    var MIN_CHARS = 3;
    // Bounding box: Italia
    var BBOX      = '6.614,35.492,18.521,47.092';

    function safeEsc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function buildLabel(p) {
      // Line 1: name (if different from street) or street+number
      // Line 2: city + province/state
      var top = [];
      var sub = [];

      if (p.name && p.name !== p.street) top.push(p.name);
      if (p.street) {
        var s = p.street + (p.housenumber ? ' ' + p.housenumber : '');
        top.push(s);
      }
      if (!top.length && p.city)  top.push(p.city);
      if (!top.length && p.county) top.push(p.county);

      var city = p.city || p.town || p.village || p.municipality;
      if (city) sub.push(city);
      if (p.postcode) sub.push(p.postcode);
      if (p.state && p.state !== city) sub.push(p.state);

      var l1 = top.length ? '<strong>' + safeEsc(top.join(', ')) + '</strong>' : '';
      var l2 = sub.length ? '<span class="ac-sub">' + safeEsc(sub.join(' — ')) + '</span>' : '';
      return l1 + l2;
    }

    function buildValue(p) {
      var parts = [];
      if (p.name && p.name !== p.street) parts.push(p.name);
      if (p.street) parts.push(p.street + (p.housenumber ? ' ' + p.housenumber : ''));
      var city = p.city || p.town || p.village || p.municipality;
      if (city) parts.push(city);
      return parts.join(', ');
    }

    function initField(input) {
      if (!input) return;

      // Wrap input
      var wrap = document.createElement('div');
      wrap.className = 'autocomplete-wrapper';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);

      // Dropdown
      var dd = document.createElement('div');
      dd.className = 'autocomplete-dropdown';
      dd.setAttribute('role', 'listbox');
      wrap.appendChild(dd);

      var timer    = null;
      var results  = [];
      var active   = -1;

      function close() {
        dd.classList.remove('open');
        active = -1;
      }

      function render(features) {
        dd.innerHTML = '';
        results = features;
        active  = -1;
        if (!features.length) { close(); return; }

        features.forEach(function (f, i) {
          var item = document.createElement('div');
          item.className = 'autocomplete-item';
          item.setAttribute('role', 'option');
          item.innerHTML = buildLabel(f.properties);
          item.addEventListener('mousedown', function (e) {
            e.preventDefault();
            pick(i);
          });
          dd.appendChild(item);
        });
        dd.classList.add('open');
      }

      function pick(i) {
        if (!results[i]) return;
        input.value = buildValue(results[i].properties);
        close();
        input.dispatchEvent(new Event('change'));
        input.focus();
      }

      function highlight(i) {
        var items = dd.querySelectorAll('.autocomplete-item');
        items.forEach(function (el) { el.classList.remove('ac-active'); });
        active = i;
        if (i >= 0 && items[i]) {
          items[i].classList.add('ac-active');
          items[i].scrollIntoView({ block: 'nearest' });
        }
      }

      input.addEventListener('input', function () {
        clearTimeout(timer);
        var q = input.value.trim();
        if (q.length < MIN_CHARS) { close(); return; }

        dd.innerHTML = '<div class="autocomplete-loading">Ricerca…</div>';
        dd.classList.add('open');

        timer = setTimeout(function () {
          var url = PHOTON + '?q=' + encodeURIComponent(q) +
                    '&limit=5&lang=it&bbox=' + BBOX;
          fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) { render(data.features || []); })
            .catch(function () { close(); });
        }, DELAY_MS);
      });

      input.addEventListener('keydown', function (e) {
        if (!dd.classList.contains('open')) return;
        var len = results.length;
        if (e.key === 'ArrowDown')  { e.preventDefault(); highlight(Math.min(active + 1, len - 1)); }
        else if (e.key === 'ArrowUp')   { e.preventDefault(); highlight(Math.max(active - 1, 0)); }
        else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(active); }
        else if (e.key === 'Escape')    { close(); }
      });

      input.addEventListener('blur', function () {
        setTimeout(close, 160);
      });
    }

    initField(document.getElementById('partenza'));
    initField(document.getElementById('scarico'));

    document.addEventListener('click', function (e) {
      document.querySelectorAll('.autocomplete-dropdown.open').forEach(function (el) {
        if (!el.parentNode.contains(e.target)) el.classList.remove('open');
      });
    });
  }());

})();
