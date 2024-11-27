// js/cart.js

// Подключение необходимых библиотек Firebase
import { db, auth } from './firebase-config.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Элементы
const cartItemsContainer = document.getElementById('cart-items');
const totalPriceElement = document.getElementById('total-price');
const discountElement = document.getElementById('discount');
const finalPriceElement = document.getElementById('final-price');
const checkoutButton = document.getElementById('checkout-button');
const orderForm = document.getElementById('order-form');
const cartCountElement = document.getElementById('cart-count');
const applyPromoButton = document.getElementById('apply-promo');
const promoCodeInput = document.getElementById('promo-code');
const notification = document.getElementById('notification'); // Убедитесь, что этот элемент есть в HTML

let promoDiscount = 0;

// Функция для отображения уведомлений
function showNotification(message, type = 'success') {
  if (notification) {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  } else {
    // Fallback to alert if notification элемент отсутствует
    alert(message);
  }
}

// Функция для загрузки корзины
async function loadCart() {
  try {
    if (!cartItemsContainer || !totalPriceElement || !checkoutButton || !discountElement || !finalPriceElement) {
      console.error('Один или несколько элементов не найдены в DOM.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      cartItemsContainer.innerHTML =
        "<tr><td colspan='6'>Пожалуйста, войдите в аккаунт, чтобы видеть содержимое корзины.</td></tr>";
      totalPriceElement.textContent = '0 р.';
      discountElement.textContent = '0 р.';
      finalPriceElement.textContent = '0 р.';
      checkoutButton.style.display = 'none';
      cartCountElement.textContent = '0';
      return;
    }

    const cartRef = doc(db, 'carts', user.uid);
    const cartSnap = await getDoc(cartRef);
    const cart = cartSnap.exists() ? cartSnap.data().items || [] : [];

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "<tr><td colspan='6'>Ваша корзина пуста.</td></tr>";
      totalPriceElement.textContent = '0 р.';
      discountElement.textContent = '0 р.';
      finalPriceElement.textContent = '0 р.';
      checkoutButton.style.display = 'none';
      cartCountElement.textContent = '0';
      return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;
    const fragment = document.createDocumentFragment();

    for (const item of cart) {
      const productDoc = await getDoc(doc(db, 'products', item.id));
      if (productDoc.exists()) {
        const product = productDoc.data();
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><img src="${product.imageUrl}" alt="${product.name}" width="80" loading="lazy"></td>
          <td>${product.manufacturer} - ${product.name}</td>
          <td>${product.price.toFixed(2)} р.</td>
          <td><input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="quantity-input"></td>
          <td>${(product.price * item.quantity).toFixed(2)} р.</td>
          <td><button class="remove-item" data-id="${item.id}">❌ Удалить</button></td>
        `;
        fragment.appendChild(row);
        total += product.price * item.quantity;
      }
    }

    // Применение скидки, если есть
    let discountAmount = 0;
    if (promoDiscount > 0) {
      discountAmount = total * (promoDiscount / 100);
      total -= discountAmount;

      // Добавление строки скидки
      const discountRow = document.createElement('tr');
      discountRow.innerHTML = `
        <td colspan="4" style="text-align: right;"><strong>Скидка (${promoDiscount}%):</strong></td>
        <td>-${discountAmount.toFixed(2)} р.</td>
        <td></td>
      `;
      fragment.appendChild(discountRow);
    }

    cartItemsContainer.appendChild(fragment);
    totalPriceElement.textContent = `${(total + discountAmount).toFixed(2)} р.`; // Общая сумма до скидки
    discountElement.textContent = `-${discountAmount.toFixed(2)} р.`; // Сумма скидки
    finalPriceElement.textContent = `${total.toFixed(2)} р.`; // Итоговая сумма после скидки
    checkoutButton.style.display = 'block';

    // Обновление счётчика корзины
    updateCartCount();

    // Настройка обработчиков событий
    setupCartEventListeners();
  } catch (error) {
    console.error('Ошибка загрузки корзины:', error);
    showNotification('❌ Произошла ошибка при загрузке корзины. Попробуйте позже.', 'error');
  }
}

// Настройка обработчиков событий в корзине
function setupCartEventListeners() {
  // Обработчик для изменения количества товара
  const quantityInputs = cartItemsContainer.querySelectorAll('.quantity-input');
  quantityInputs.forEach((input) => {
    input.addEventListener('change', async (e) => {
      const newQuantity = parseInt(e.target.value);
      const productId = e.target.getAttribute('data-id');
      if (newQuantity > 0) {
        await updateQuantity(productId, newQuantity);
      } else {
        e.target.value = 1;
        showNotification('❌ Количество не может быть меньше 1.', 'error');
      }
    });
  });

  // Обработчик для удаления товара
  const deleteButtons = cartItemsContainer.querySelectorAll('.remove-item');
  deleteButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const productId = button.getAttribute('data-id');
      await removeFromCart(productId);
    });
  });
}

// Обновление количества товара
async function updateQuantity(productId, quantity) {
  try {
    const user = auth.currentUser;
    if (user) {
      const cartRef = doc(db, 'carts', user.uid);
      const cartSnap = await getDoc(cartRef);
      const cart = cartSnap.exists() ? cartSnap.data().items || [] : [];
      const updatedCart = cart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      await setDoc(cartRef, { items: updatedCart });
      showNotification('✅ Количество обновлено.', 'success');
      loadCart();
    }
  } catch (error) {
    console.error('Ошибка обновления количества товара:', error);
    showNotification('❌ Произошла ошибка при обновлении количества товара.', 'error');
  }
}

// Удаление товара из корзины
async function removeFromCart(productId) {
  try {
    const user = auth.currentUser;
    if (user) {
      const cartRef = doc(db, 'carts', user.uid);
      const cartSnap = await getDoc(cartRef);
      const cart = cartSnap.exists() ? cartSnap.data().items || [] : [];
      const updatedCart = cart.filter((item) => item.id !== productId);
      await setDoc(cartRef, { items: updatedCart });
      showNotification('✅ Товар удалён из корзины.', 'success');
      loadCart();
    }
  } catch (error) {
    console.error('Ошибка удаления товара из корзины:', error);
    showNotification('❌ Произошла ошибка при удалении товара из корзины.', 'error');
  }
}

// Обновление количества товаров в корзине
async function updateCartCount() {
  try {
    const user = auth.currentUser;
    if (user) {
      const cartRef = doc(db, 'carts', user.uid);
      const cartSnap = await getDoc(cartRef);
      const cart = cartSnap.exists() ? cartSnap.data().items || [] : [];
      const totalCount = cart.reduce((total, item) => total + item.quantity, 0);
      cartCountElement.textContent = totalCount;
    } else {
      cartCountElement.textContent = '0';
    }
  } catch (error) {
    console.error('Ошибка обновления счётчика корзины:', error);
    showNotification('❌ Произошла ошибка при обновлении счётчика корзины.', 'error');
  }
}

// Применение промокода
if (applyPromoButton && promoCodeInput) {
  applyPromoButton.addEventListener('click', async () => {
    const promoCode = promoCodeInput.value.trim().toUpperCase();
    if (!promoCode) {
      showNotification('❌ Введите промокод.', 'error');
      return;
    }

    try {
      const promoDoc = await getDoc(doc(db, 'promocodes', promoCode));
      if (promoDoc.exists()) {
        const promoData = promoDoc.data();
        promoDiscount = promoData.discount || 0;
        showNotification(`✅ Промокод применён! Скидка: ${promoDiscount}%`, 'success');
        loadCart(); // Пересчёт корзины
      } else {
        showNotification('❌ Неверный промокод.', 'error');
      }
    } catch (error) {
      console.error('Ошибка применения промокода:', error);
      showNotification('❌ Попробуйте позже.', 'error');
    }
  });
}

// Обработчик для кнопки "Оформить заказ"
if (checkoutButton) {
  checkoutButton.addEventListener('click', () => {
    // Показать форму доставки
    const deliveryFormDiv = document.getElementById('delivery-form');
    if (deliveryFormDiv) {
      deliveryFormDiv.style.display = 'block';
      // Прокрутить страницу к форме доставки
      deliveryFormDiv.scrollIntoView({ behavior: 'smooth' });
    } else {
      showNotification('❌ Форма доставки не найдена.', 'error');
    }
  });
}

// Обработчик отправки формы заказа
if (orderForm) {
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      showNotification('🔒 Войдите в аккаунт для оформления заказа.', 'error');
      window.location.href = 'login.html';
      return;
    }

    // Получение данных корзины
    const cartRef = doc(db, 'carts', user.uid);
    const cartSnap = await getDoc(cartRef);
    const cartItems = cartSnap.exists() ? cartSnap.data().items || [] : [];
    if (cartItems.length === 0) {
      showNotification('❌ Ваша корзина пуста.', 'error');
      return;
    }

    // Расчёт общей стоимости с учётом скидки
    let totalPrice = 0;
    for (const item of cartItems) {
      const productDoc = await getDoc(doc(db, 'products', item.id));
      if (productDoc.exists()) {
        const product = productDoc.data();
        totalPrice += product.price * item.quantity;
      }
    }

    let discountAmount = 0;
    if (promoDiscount > 0) {
      discountAmount = totalPrice * (promoDiscount / 100);
      totalPrice -= discountAmount;
    }

    // Сбор данных доставки из формы
    const deliveryDetails = {};
    if (orderForm && orderForm instanceof HTMLFormElement) {
      const formData = new FormData(orderForm);
      formData.forEach((value, key) => {
        deliveryDetails[key] = value;
      });
    } else {
      showNotification('❌ Форма доставки не найдена или неверна.', 'error');
      return;
    }

    // Получение способа оплаты
    const paymentMethod = orderForm.querySelector('input[name="payment-method"]:checked').value;

    // Создание объекта заказа
    const orderData = {
      userId: user.uid,
      items: cartItems,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      discount: parseFloat(discountAmount.toFixed(2)),
      finalPrice: parseFloat(totalPrice.toFixed(2)),
      timestamp: new Date(),
      deliveryDetails: deliveryDetails,
      promoDiscount: promoDiscount, // Сохранение информации о скидке
    };

    if (paymentMethod === 'cash') {
      try {
        // Сохранение заказа в Firestore
        const ordersCollection = collection(db, 'orders');
        const newOrderRef = await addDoc(ordersCollection, orderData);

        // Очистка корзины
        await setDoc(cartRef, { items: [] });

        // Уведомление пользователя
        showNotification(`✅ Заказ успешно оформлен! ID заказа: ${newOrderRef.id}`, 'success');

        // Скрытие формы доставки
        const deliveryFormDiv = document.getElementById('delivery-form');
        if (deliveryFormDiv) {
          deliveryFormDiv.style.display = 'none';
        }

        // Обновление корзины и счётчика
        loadCart();
      } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        showNotification('❌ Произошла ошибка при оформлении заказа. Попробуйте позже.', 'error');
      }
    } else if (paymentMethod === 'card') {
      try {
        // Сохранение данных заказа в sessionStorage для передачи на страницу оплаты
        sessionStorage.setItem('orderData', JSON.stringify(orderData));

        // Перенаправление на страницу оплаты
        window.location.href = 'payment.html';
      } catch (error) {
        console.error('Ошибка при подготовке заказа к оплате:', error);
        showNotification('❌ Произошла ошибка при подготовке заказа к оплате. Попробуйте позже.', 'error');
      }
    } else {
      showNotification('❌ Неверный способ оплаты.', 'error');
    }
  });
}

// Инициализация корзины
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      loadCart();
      updateCartCount();
    } else {
      cartItemsContainer.innerHTML =
        "<tr><td colspan='6'>Пожалуйста, войдите в аккаунт, чтобы видеть содержимое корзины.</td></tr>";
      totalPriceElement.textContent = '0 р.';
      discountElement.textContent = '0 р.';
      finalPriceElement.textContent = '0 р.';
      checkoutButton.style.display = 'none';
      cartCountElement.textContent = '0';
    }
  });
});

// Обработка ошибок глобально
window.addEventListener('error', (event) => {
  console.error('Произошла ошибка:', event.error);
  showNotification('❌ Произошла ошибка при выполнении операции. Попробуйте снова.', 'error');
});
