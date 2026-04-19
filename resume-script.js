/* ════════════════════════════════════════════════════════
   Resume — Print / Download controller
   ════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  const btn = document.getElementById('btn-download');

  if (btn) {
    btn.addEventListener('click', () => {
      window.print();
    });
  }

});
