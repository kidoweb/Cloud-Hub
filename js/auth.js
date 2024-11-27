// js/auth.js
// Путь: js/auth.js
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Инициализация элементов
function initElements() {
  const profileLink = document.getElementById('profile-link');
  const adminPanelLink = document.getElementById('admin-panel-link');
  const adminIcon = document.getElementById('admin-icon');

  if (!profileLink) {
    console.warn('Элемент с ID "profile-link" не найден.');
  }
  if (!adminPanelLink) {
    console.warn('Элемент с ID "admin-panel-link" не найден.');
  }
  if (!adminIcon) {
    console.warn('Элемент с ID "admin-icon" не найден.');
  }

  return { profileLink, adminPanelLink, adminIcon };
}

// Обновление данных пользователя
async function updateUserData(user) {
  const { profileLink, adminPanelLink, adminIcon } = initElements();

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Обновить ссылку профиля
      if (profileLink) {
        profileLink.textContent = `👤 ${userData.name || 'Профиль'}`;
        profileLink.href = 'profile.html';
      }

      // Показать элементы администратора, если пользователь является администратором
      if (userData.role === 'admin') {
        if (adminPanelLink) {
          adminPanelLink.style.display = 'inline-block';
        }
        if (adminIcon) {
          adminIcon.style.display = 'flex';
        }
      } else {
        if (adminPanelLink) {
          adminPanelLink.style.display = 'none';
        }
        if (adminIcon) {
          adminIcon.style.display = 'none';
        }
      }

      // Обновить счетчик корзины
      updateCartCount();
    } else {
      console.warn('Данные пользователя не найдены в Firestore.');
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных пользователя:', error);
  }
}

// Обработка состояния аутентификации
onAuthStateChanged(auth, (user) => {
  const { profileLink, adminPanelLink, adminIcon } = initElements();

  if (user) {
    updateUserData(user);
  } else {
    // Пользователь не авторизован
    if (profileLink) {
      profileLink.textContent = '🔑 Вход/Регистрация';
      profileLink.href = 'login.html';
    }
    // Скрыть элементы администратора
    if (adminPanelLink) {
      adminPanelLink.style.display = 'none';
    }
    if (adminIcon) {
      adminIcon.style.display = 'none';
    }
    // Обнулить счетчик корзины
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
      cartCount.textContent = '0';
    }
  }
});

// Функция обновления количества товаров в корзине
function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    fetchCartFromDB()
      .then((count) => {
        cartCount.textContent = count;
      })
      .catch(() => {
        cartCount.textContent = '0';
      });
  }
}

// Функция получения количества товаров в корзине из БД
async function fetchCartFromDB() {
  const user = auth.currentUser;
  if (!user) return '0';

  try {
    const cartDoc = await getDoc(doc(db, 'carts', user.uid));
    if (cartDoc.exists()) {
      const cart = cartDoc.data().items || [];
      return cart.reduce((total, item) => total + item.quantity, 0).toString();
    }
  } catch (error) {
    console.error('Ошибка при получении данных корзины:', error);
    return '0';
  }

  return '0';
}

// Регистрация нового пользователя
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = registerForm['name'].value.trim();
    const email = registerForm['email'].value.trim();
    const password = registerForm['password'].value.trim();

    if (name === '' || email === '' || password === '') {
      alert('Пожалуйста, заполните все поля.');
      return;
    }

    if (password.length < 6) {
      alert('Пароль должен содержать минимум 6 символов.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Сохранение данных пользователя в Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: email,
        address: '',
        phoneNumber: '',
        role: 'user', // Роль по умолчанию
      });

      alert('🎉 Регистрация прошла успешно!');
      registerForm.reset();
      window.location.href = 'profile.html';
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      alert('❌ ' + error.message);
    }
  });
}

// Вход пользователя
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm['email'].value.trim();
    const password = loginForm['password'].value.trim();

    if (email === '' || password === '') {
      alert('Пожалуйста, заполните все поля.');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert('✅ Вход выполнен успешно!');
      loginForm.reset();
      window.location.href = 'profile.html';
    } catch (error) {
      console.error('Ошибка входа:', error);
      alert('❌ ' + error.message);
    }
  });
}

// Восстановление пароля
const resetForm = document.getElementById('reset-form');
if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetForm['email'].value.trim();

    if (email === '') {
      alert('Пожалуйста, введите ваш email.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert('📧 Ссылка для восстановления пароля отправлена на ваш email.');
      resetForm.reset();
    } catch (error) {
      console.error('Ошибка восстановления пароля:', error);
      alert('❌ ' + error.message);
    }
  });
}

// Выход пользователя
const logoutButton = document.getElementById('logout-btn');
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    try {
      await signOut(auth);
      alert('👋 Выход выполнен успешно!');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Ошибка выхода:', error);
      alert('❌ ' + error.message);
    }
  });
}
