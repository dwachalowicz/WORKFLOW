// Apply theme before first paint to prevent flash
(function() {
  var theme = localStorage.getItem('gryf-theme');
  if (theme !== 'light') {
    document.documentElement.classList.add('dark');
  }
})();
