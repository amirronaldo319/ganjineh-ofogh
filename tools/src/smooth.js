// Smooth wheel scrolling for desktop pointers, built on Lenis (MIT). Bundled to assets/js/smooth.min.js by tools/build-vendor.mjs.
//
// Deliberately narrow:
//  - off for reduced motion, lite mode, touch / coarse pointers (they keep native momentum scrolling) and when ?smooth=0 is in the URL
//  - Lenis owns the wheel only. In-page link glides stay with motion.js (it already drives window.scrollTo itself; Lenis follows native scroll events)
//  - modal dialogs (lightbox) and horizontal rails are never intercepted
//  - nothing else on the page depends on this file: if it fails to load, the site scrolls natively exactly as before
import Lenis from 'lenis';

(function () {
  var root = document.documentElement;
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  if (mq('(prefers-reduced-motion: reduce)') || root.hasAttribute('data-lite') || !mq('(hover: hover) and (pointer: fine)') || /[?&]smooth=0(&|$)/.test(location.search)) return;

  var lenis;
  try {
    lenis = new Lenis({
      autoRaf: true,            // Lenis runs the single animation-frame loop for wheel smoothing; motion.js keeps its own scroll-driven rAF
      smoothWheel: true,
      lerp: 0.12,
      wheelMultiplier: 0.95,
      syncTouch: false,
      anchors: false,
      prevent: function (node) { return !!(node.closest && node.closest('dialog, [data-lenis-prevent], .rail, textarea, select')); },
    });
  } catch (e) { return; }

  window.ofoghSmooth = lenis;   // handle for debugging / tests
  // Pause while a modal dialog is open (the lightbox locks the body itself).
  var obs = new MutationObserver(function () {
    var open = !!document.querySelector('dialog[open]');
    open ? lenis.stop() : lenis.start();
  });
  document.querySelectorAll('dialog').forEach(function (d) { obs.observe(d, { attributes: true, attributeFilter: ['open'] }); });
})();
