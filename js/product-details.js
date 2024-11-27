import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Контейнер для отображения деталей товара
const productDetailsContainer = document.getElementById('product-details');

// Получение параметра ID из URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

// Загрузка данных о товаре
async function loadProductDetails() {
  if (!productId) {
    productDetailsContainer.innerHTML = '<p>Товар не найден.</p>';
    return;
  }

  try {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);

    if (productSnap.exists()) {
      const product = productSnap.data();
      displayProductDetails(product);
    } else {
      productDetailsContainer.innerHTML = '<p>Товар не найден.</p>';
    }
  } catch (error) {
    console.error('Ошибка загрузки данных товара:', error);
    productDetailsContainer.innerHTML = '<p>Не удалось загрузить данные товара. Попробуйте позже.</p>';
  }
}

// Отображение деталей товара
function displayProductDetails(product) {
  productDetailsContainer.innerHTML = `
    <div class="product-details">
      <div class="product-main">
        <!-- Галерея -->
        <div class="product-gallery">
          <img src="${product.imageUrl}" alt="${product.name}" class="main-image" 
               onerror="this.src='https://via.placeholder.com/500x500?text=Изображение+не+найдено'">
          <div class="gallery-thumbnails">
            ${product.galleryImages.map(img => `
              <img src="${img}" alt="Изображение ${product.name}" class="thumbnail">
            `).join('')}
          </div>
        </div>

        <!-- Основная информация -->
        <div class="product-info">
          <h1>${product.manufacturer} - ${product.name}</h1>
          <p class="price">Цена: ${product.price.toFixed(2)} р.</p>
          <button class="add-to-cart" data-id="${product.id}">🛒 Добавить в корзину</button>

          <!-- Основные характеристики -->
          <ul class="features">
            ${product.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- Вкладки с описанием и характеристиками -->
      <div class="product-tabs">
        <div class="tabs">
          <button class="tab active" data-tab="description">Описание</button>
          <button class="tab" data-tab="specs">Характеристики</button>
        </div>
        <div class="tab-content active" id="description">
          <p>${product.description}</p>
        </div>
        <div class="tab-content" id="specs">
          <ul>
            ${Object.entries(product.specs).map(([key, value]) => `
              <li><strong>${key}:</strong> ${value}</li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;

  // Добавляем обработку переключения вкладок
  setupTabs();

  // Обработчик для кнопки "Добавить в корзину"
  document.querySelector('.add-to-cart').addEventListener('click', () => addToCart(product.id));
}

// Логика переключения вкладок
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Убираем активный класс у всех вкладок и контента
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      // Активируем текущую вкладку
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

// Добавление товара в корзину
async function addToCart(productId) {
  alert('🛒 Товар добавлен в корзину! (Функция заглушена)');
}

// Загрузка данных при открытии страницы
document.addEventListener('DOMContentLoaded', loadProductDetails);
