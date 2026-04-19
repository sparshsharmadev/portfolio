/* Handle PDF download trigger */

document.addEventListener('DOMContentLoaded', () => {

  const btn = document.getElementById('btn-download');

  if (btn) {
    btn.addEventListener('click', () => {
      window.print();
    });
  }

});
