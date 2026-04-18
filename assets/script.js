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
      contactForm.style.display = 'none';
      contactSuccess.classList.add('visible');
      window.scrollTo({ top: contactSuccess.offsetTop - 100, behavior: 'smooth' });
    });
  }

})();
