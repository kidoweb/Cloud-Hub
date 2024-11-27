// js/payment.js

// Подключение необходимых библиотек Firebase
import { db, auth } from './firebase-config.js';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Элементы
const paymentForm = document.getElementById('payment-form');
const errorContainer = document.getElementById('payment-error'); // Убедитесь, что этот элемент существует в HTML
const notification = document.getElementById('notification'); // Убедитесь, что этот элемент существует в HTML

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

// Функция безопасного парсинга JSON
function safeParseJSON(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка парсинга JSON:', error);
    return null;
  }
}

// Функция валидации данных карты
function validateCard(number, expiry, cvv) {
  const cardNumberRegex = /^\d{13,19}$/;
  const cardExpiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
  const cardCvvRegex = /^\d{3,4}$/;

  const [month, year] = expiry.split('/');
  if (!month || !year) return false;
  const expiryDate = new Date(`20${year}`, month - 1);

  const currentDate = new Date();
  currentDate.setDate(1); // Устанавливаем день на первый для сравнения месяца и года

  return (
    cardNumberRegex.test(number) &&
    cardExpiryRegex.test(expiry) &&
    expiryDate >= currentDate &&
    cardCvvRegex.test(cvv) &&
    luhnCheck(number)
  );
}

// Алгоритм Луна для проверки номера карты
function luhnCheck(val) {
  let sum = 0;
  for (let i = 0; i < val.length; i++) {
    let intVal = parseInt(val.substr(i, 1));
    if (i % 2 === val.length % 2) {
      intVal *= 2;
      if (intVal > 9) intVal -= 9;
    }
    sum += intVal;
  }
  return sum % 10 === 0;
}

// Функция маскировки номера карты
function maskCardNumber(number) {
  return number.replace(/\d{12}(\d{4})/, '**** **** **** $1');
}

// Функция для обработки платежа (замените на реальную интеграцию с платежным шлюзом)
async function processPayment(cardNumber, cardExpiry, cardCvv) {
  // Симуляция обработки платежа
  return new Promise((resolve) => {
    setTimeout(() => {
      // Простая симуляция: оплата проходит, если последняя цифра чётная
      const lastDigit = parseInt(cardNumber.slice(-1), 10);
      resolve(lastDigit % 2 === 0);
    }, 1000);
  });
}

// Обработка оформления платежа
if (paymentForm) {
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Очистка предыдущих сообщений об ошибках
    if (errorContainer) errorContainer.textContent = '';

    const cardNumber = paymentForm['card-number'].value.replace(/\s+/g, '');
    const cardExpiry = paymentForm['card-expiry'].value;
    const cardCvv = paymentForm['card-cvv'].value;

    // Валидация данных карты
    if (!validateCard(cardNumber, cardExpiry, cardCvv)) {
      const errorMessage = '❌ Неверные данные карты. Проверьте номер, срок действия и CVV.';
      if (errorContainer) {
        errorContainer.textContent = errorMessage;
      } else {
        showNotification(errorMessage, 'error');
      }
      return;
    }

    try {
      const orderData = safeParseJSON(sessionStorage.getItem('orderData'));
      if (!orderData) {
        showNotification('❌ Не удалось получить данные заказа.', 'error');
        window.location.href = 'cart.html';
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        showNotification('🔒 Пожалуйста, войдите в аккаунт.', 'error');
        window.location.href = 'login.html';
        return;
      }

      // Обработка платежа
      const paymentSuccess = await processPayment(cardNumber, cardExpiry, cardCvv);
      if (!paymentSuccess) {
        const errorMessage = '❌ Не удалось выполнить оплату. Проверьте данные карты.';
        if (errorContainer) {
          errorContainer.textContent = errorMessage;
        } else {
          showNotification(errorMessage, 'error');
        }
        return;
      }

      // Добавление данных оплаты в orderData
      orderData.paymentDetails = {
        cardNumber: maskCardNumber(cardNumber),
        cardExpiry: cardExpiry,
      };

      // Сохранение заказа в Firestore
      const ordersCollection = collection(db, 'orders');
      const newOrderRef = await addDoc(ordersCollection, orderData);

      // Очистка корзины
      const cartRef = doc(db, 'carts', user.uid);
      await setDoc(cartRef, { items: [] });

      // Уведомление пользователя
      const successMessage = `✅ Оплата успешно выполнена! Заказ оформлен. ID заказа: ${newOrderRef.id}`;
      showNotification(successMessage, 'success');

      // Очистка sessionStorage
      sessionStorage.removeItem('orderData');

      // Перенаправление пользователя на главную страницу через 3 секунды
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 3000);
    } catch (error) {
      console.error('Ошибка оплаты:', error);
      const errorMessage = '❌ Не удалось выполнить оплату. Попробуйте позже.';
      if (errorContainer) {
        errorContainer.textContent = errorMessage;
      } else {
        showNotification(errorMessage, 'error');
      }
    }
  });
}

// Инициализация формы оплаты при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showNotification('🔒 Пожалуйста, войдите в аккаунт для оформления заказа.', 'error');
      window.location.href = 'login.html';
    }

    // Дополнительная логика инициализации, если необходимо
  });
});

// Обработка ошибок глобально
window.addEventListener('error', (event) => {
  console.error('Произошла ошибка:', event.error);
  showNotification('❌ Произошла ошибка при выполнении операции. Попробуйте снова.', 'error');
});
