document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('theme-toggle'); // Кнопка переключения

  if (!themeToggleBtn) return;

  // Проверка текущей темы при загрузке страницы
  const currentTheme = localStorage.getItem('theme') || 'light';
  setTheme(currentTheme);

  themeToggleBtn.addEventListener('click', () => {
    // Переключение темы
    const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    setTheme(newTheme);
  });

  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark'); // Добавить класс тёмной темы
      themeToggleBtn.textContent = '🌞 Светлая тема'; // Изменить текст кнопки
    } else {
      document.body.classList.remove('dark'); // Удалить класс тёмной темы
      themeToggleBtn.textContent = '🌙 Тёмная тема'; // Изменить текст кнопки
    }
    localStorage.setItem('theme', theme); // Сохранить тему в Local Storage
  }
});
