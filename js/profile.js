// js/profile.js
// Путь: js/profile.js
import { auth, db } from './firebase-config.js';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp, // Импортируем Timestamp для проверки
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Элементы профиля
const userName = document.getElementById('user-name');
const userAddress = document.getElementById('user-address');
const userPhone = document.getElementById('user-phone');
const userEmail = document.getElementById('user-email');
const editProfileBtn = document.getElementById('edit-profile-btn');
const changePasswordBtn = document.getElementById('change-password-btn');
const logoutButton = document.getElementById('logout-btn');
const adminIcon = document.getElementById('admin-icon');
const orderHistoryContainer = document.getElementById('order-history');

// Обработка состояния аутентификации
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      userName.textContent = data.name || 'Не указано';
      userAddress.textContent = data.address || 'Не указано';
      userPhone.textContent = data.phoneNumber || 'Не указано';
      userEmail.textContent = data.email || 'Не указано';

      if (data.role === 'admin') {
        if (adminIcon) {
          adminIcon.style.display = 'flex';
        }
      } else {
        if (adminIcon) {
          adminIcon.style.display = 'none';
        }
      }

      // Загрузка истории заказов
      loadOrderHistory(user.uid);
    }
  } else {
    window.location.href = 'login.html';
  }
});

// Загрузка истории заказов
async function loadOrderHistory(userId) {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      orderHistoryContainer.innerHTML = '<p>У вас еще нет заказов.</p>';
      return;
    }

    orderHistoryContainer.innerHTML = ''; // Очистка контейнера

    querySnapshot.forEach((doc) => {
      const order = doc.data();
      const orderElement = document.createElement('div');
      orderElement.classList.add('order-item');

      // Проверка типа для timestamp
      let orderDate;
      if (order.timestamp instanceof Timestamp) {
        orderDate = order.timestamp.toDate().toLocaleString();
      } else if (order.timestamp && order.timestamp.seconds) {
        // Если timestamp - это объект с полем seconds
        orderDate = new Date(order.timestamp.seconds * 1000).toLocaleString();
      } else {
        orderDate = 'Не указано';
      }

      orderElement.innerHTML = `
        <h4>Заказ №${doc.id}</h4>
        <p>Дата заказа: ${orderDate}</p>
        <p>Сумма заказа: ${order.finalPrice.toFixed(2)} ₽</p>
        <p>Скидка: ${order.discount}%</p>
        <p>Статус оплаты: ${order.paymentMethod === 'card' ? 'Оплачено' : 'Оплата при доставке'}</p>
        <button class="view-details" data-id="${doc.id}">📄 Посмотреть детали</button>
      `;
      orderHistoryContainer.appendChild(orderElement);
    });

    // Делегирование событий для кнопок "Посмотреть детали"
    orderHistoryContainer.addEventListener('click', async (event) => {
      if (event.target.classList.contains('view-details')) {
        const orderId = event.target.getAttribute('data-id');
        await showOrderDetails(orderId);
      }
    });
  } catch (error) {
    console.error('Ошибка загрузки истории заказов:', error);
    orderHistoryContainer.innerHTML = '<p>Не удалось загрузить историю заказов.</p>';
  }
}

// Показать детали заказа
async function showOrderDetails(orderId) {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (orderDoc.exists()) {
      const order = orderDoc.data();
      const orderDetails = document.createElement('div');
      orderDetails.classList.add('order-details');
      let itemsHtml = '';

      // Используем Promise.all для загрузки всех товаров одновременно
      const itemPromises = order.items.map(async (item) => {
        const productDoc = await getDoc(doc(db, 'products', item.id));
        if (productDoc.exists()) {
          const product = productDoc.data();
          return `
            <div class="order-product">
              <p>${product.manufacturer} - ${product.name}</p>
              <p>Количество: ${item.quantity}</p>
              <p>Цена: ${product.price.toFixed(2)} ₽</p>
            </div>
          `;
        } else {
          return `<div class="order-product"><p>Товар с ID ${item.id} не найден.</p></div>`;
        }
      });

      const itemsHtmlArray = await Promise.all(itemPromises);
      itemsHtml = itemsHtmlArray.join('');

      orderDetails.innerHTML = `
        <h4>Детали заказа №${orderId}</h4>
        ${itemsHtml}
        <button class="close-details">❌ Закрыть</button>
      `;

      orderHistoryContainer.appendChild(orderDetails);

      const closeDetailsButton = orderDetails.querySelector('.close-details');
      closeDetailsButton.addEventListener('click', () => {
        orderDetails.remove();
      });
    } else {
      alert('❌ Заказ не найден.');
    }
  } catch (error) {
    console.error('Ошибка отображения деталей заказа:', error);
    alert('❌ Не удалось отобразить детали заказа.');
  }
}

// Кнопка редактирования профиля
if (editProfileBtn) {
  editProfileBtn.addEventListener('click', () => {
    showEditProfileForm();
  });
}

function showEditProfileForm() {
  if (document.getElementById('edit-profile-form')) return;

  const formHtml = `
    <div class="edit-profile-container">
      <h3>✏️ Изменить данные</h3>
      <form id="edit-profile-form">
        <input type="text" name="name" placeholder="👤 Имя" required>
        <input type="text" name="address" placeholder="🏠 Адрес доставки">
        <input type="tel" name="phoneNumber" placeholder="📞 Контактный номер">
        <button type="submit">💾 Сохранить</button>
        <button type="button" class="cancel-btn">❌ Отмена</button>
      </form>
    </div>
  `;
  const profileInfo = document.getElementById('profile-info');
  profileInfo.insertAdjacentHTML('beforeend', formHtml);

  const editForm = document.getElementById('edit-profile-form');
  editForm['name'].value = userName.textContent !== 'Не указано' ? userName.textContent : '';
  editForm['address'].value = userAddress.textContent !== 'Не указано' ? userAddress.textContent : '';
  editForm['phoneNumber'].value = userPhone.textContent !== 'Не указано' ? userPhone.textContent : '';

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = editForm['name'].value.trim();
    const address = editForm['address'].value.trim();
    const phoneNumber = editForm['phoneNumber'].value.trim();

    try {
      const user = auth.currentUser;
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: name,
        address: address,
        phoneNumber: phoneNumber,
      });

      alert('✅ Данные успешно обновлены!');
      userName.textContent = name;
      userAddress.textContent = address || 'Не указано';
      userPhone.textContent = phoneNumber || 'Не указано';

      editForm.parentElement.remove();
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
      alert('❌ Не удалось обновить данные. Попробуйте позже.');
    }
  });

  const cancelBtn = document.querySelector('.cancel-btn');
  cancelBtn.addEventListener('click', () => {
    const editFormContainer = document.getElementById('edit-profile-form').parentElement;
    if (editFormContainer) {
      editFormContainer.remove();
    }
  });
}

// Кнопка смены пароля
if (changePasswordBtn) {
  changePasswordBtn.addEventListener('click', () => {
    showChangePasswordForm();
  });
}

function showChangePasswordForm() {
  if (document.getElementById('change-password-form')) return;

  const formHtml = `
    <div class="change-password-container">
      <h3>🔒 Сменить пароль</h3>
      <form id="change-password-form">
        <input type="password" name="current-password" placeholder="🔑 Текущий пароль" required>
        <input type="password" name="new-password" placeholder="🔑 Новый пароль" required minlength="6">
        <button type="submit">🔑 Сменить</button>
        <button type="button" class="cancel-btn">❌ Отмена</button>
      </form>
    </div>
  `;
  const profileInfo = document.getElementById('profile-info');
  profileInfo.insertAdjacentHTML('beforeend', formHtml);

  const changePasswordForm = document.getElementById('change-password-form');
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = changePasswordForm['current-password'].value.trim();
    const newPassword = changePasswordForm['new-password'].value.trim();

    if (newPassword.length < 6) {
      alert('Пароль должен содержать минимум 6 символов.');
      return;
    }

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);
      alert('✅ Пароль успешно изменен!');
      changePasswordForm.parentElement.remove();
    } catch (error) {
      console.error('Ошибка смены пароля:', error);
      if (error.code === 'auth/wrong-password') {
        alert('❌ Неверный текущий пароль.');
      } else {
        alert('❌ Не удалось сменить пароль. Попробуйте позже.');
      }
    }
  });

  const cancelBtn = document.querySelector('.change-password-container .cancel-btn');
  cancelBtn.addEventListener('click', () => {
    const changePasswordFormContainer = document.getElementById('change-password-form').parentElement;
    if (changePasswordFormContainer) {
      changePasswordFormContainer.remove();
    }
  });
}

// Иконка администратора
if (adminIcon) {
  adminIcon.addEventListener('click', () => {
    window.location.href = 'admin.html';
  });
}

// Выход
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    try {
      await auth.signOut();
      alert('👋 Выход выполнен успешно!');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Ошибка выхода:', error);
      alert('❌ Не удалось выполнить выход. Попробуйте позже.');
    }
  });
}
