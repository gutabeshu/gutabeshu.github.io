/* ==============================================
   MODERN JS — Guta Wakbulcho Abeshu Website
   ============================================== */
(function () {
  'use strict';

  /* --- Dark Mode Toggle --- */
  var savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  window.toggleTheme = function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    /* Update toggle icon */
    var toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(function (t) {
      t.innerHTML = next === 'dark'
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
    });
  };

  /* Update toggle icon on load */
  document.addEventListener('DOMContentLoaded', function () {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(function (t) {
      t.innerHTML = isDark
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
    });
  });

  /* --- Sticky nav --- */
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  /* --- Mobile nav toggle --- */
  var mobileNav = document.getElementById('mobile-nav');
  var hamburger = document.getElementById('hamburger');
  var isOpen    = false;

  window.toggleMobileNav = function () {
    isOpen = !isOpen;
    if (mobileNav) mobileNav.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (hamburger) {
      var spans = hamburger.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.opacity   = '0';
        spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity   = '';
        spans[2].style.transform = '';
      }
    }
  };

  window.closeMobileNav = function () {
    isOpen = false;
    if (mobileNav) mobileNav.classList.remove('open');
    document.body.style.overflow = '';
    if (hamburger) {
      hamburger.querySelectorAll('span').forEach(function (s) {
        s.style.transform = '';
        s.style.opacity   = '';
      });
    }
  };

  /* --- Fade-up on scroll --- */
  var fadeEls = document.querySelectorAll('.fade-up');
  if ('IntersectionObserver' in window && fadeEls.length) {
    var fadeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = el.dataset.delay || (i * 80);
          setTimeout(function () { el.classList.add('visible'); }, parseInt(delay));
          fadeObserver.unobserve(el);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(function (el) { fadeObserver.observe(el); });
  } else {
    fadeEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* --- Animated counters --- */
  function animateCounter(el, target) {
    var duration = 1600;
    var start    = performance.now();
    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + '+';
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var statEls = document.querySelectorAll('.stat-num[data-target]');
  if ('IntersectionObserver' in window && statEls.length) {
    var statObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target, parseInt(entry.target.dataset.target, 10));
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statEls.forEach(function (el) { statObserver.observe(el); });
  }

  /* --- Active nav on scroll (single-page sections) --- */
  var sections   = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.nav-links a:not(.nav-cv)');
  if (sections.length && navAnchors.length) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      sections.forEach(function (sec) {
        var top = sec.offsetTop - 120;
        var bot = top + sec.offsetHeight;
        if (y >= top && y < bot) {
          navAnchors.forEach(function (a) {
            var match = a.getAttribute('href') === '#' + sec.id;
            a.classList.toggle('active', match);
          });
        }
      });
    }, { passive: true });
  }

  /* --- Publication filter --- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var pubCards   = document.querySelectorAll('.pub-card[data-year]');
  if (filterBtns.length && pubCards.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var filter = btn.dataset.filter;
        pubCards.forEach(function (card) {
          if (filter === 'all' || card.dataset.year === filter) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }

  /* --- CV sticky sidebar active link --- */
  var cvSections = document.querySelectorAll('.cv-section[id]');
  var cvNavLinks = document.querySelectorAll('.cv-nav-link');
  if (cvSections.length && cvNavLinks.length) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      cvSections.forEach(function (sec) {
        var top = sec.offsetTop - 140;
        var bot = top + sec.offsetHeight;
        if (y >= top && y < bot) {
          cvNavLinks.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + sec.id);
          });
        }
      });
    }, { passive: true });
  }

  /* --- Back-to-top button --- */
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      backToTop.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* --- Typing effect for hero role --- */
  var typedEl = document.getElementById('typed-role');
  if (typedEl) {
    var phrases = [
      'Computational Hydrologist',
      'AI/ML for Water Systems Researcher',
      'Earth System Modeling Specialist',
      'Transboundary Water Management Expert'
    ];
    var cursor = document.createElement('span');
    cursor.className = 'typed-cursor';
    typedEl.parentNode.insertBefore(cursor, typedEl.nextSibling);

    var phraseIdx = 0;
    var charIdx = 0;
    var isDeleting = false;
    var typingSpeed = 55;
    var pauseEnd = 2200;
    var pauseStart = 400;

    function typeStep() {
      var current = phrases[phraseIdx];
      if (!isDeleting) {
        typedEl.textContent = current.substring(0, charIdx + 1);
        charIdx++;
        if (charIdx === current.length) {
          setTimeout(function () { isDeleting = true; typeStep(); }, pauseEnd);
          return;
        }
        setTimeout(typeStep, typingSpeed);
      } else {
        typedEl.textContent = current.substring(0, charIdx - 1);
        charIdx--;
        if (charIdx === 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(typeStep, pauseStart);
          return;
        }
        setTimeout(typeStep, typingSpeed / 2);
      }
    }
    setTimeout(typeStep, 1200);
  }

})();
