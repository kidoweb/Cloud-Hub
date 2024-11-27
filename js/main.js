// js/main.js
import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Контейнер для продуктов
const productsContainer = document.getElementById('products');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');

// Загрузка товаров из Firestore
let allProducts = [];

async function loadProducts() {
  try {
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    allProducts = [];
    productsSnapshot.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() };
      allProducts.push(product);
    });
    displayProducts(allProducts);
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    productsContainer.innerHTML = '<p>Не удалось загрузить товары. Попробуйте позже.</p>';
  }
}

// Функция отображения товаров
function displayProducts(products) {
  productsContainer.innerHTML = '';
  if (products.length === 0) {
    productsContainer.innerHTML = '<p>Товары не найдены.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  products.forEach((product) => {
    const productCard = document.createElement('div');
    productCard.classList.add('product-card');
    productCard.innerHTML = `
      <a href="product.html?id=${product.id}" class="product-link">
        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/280x200?text=Изображение+не+найдено'">
        <div class="product-info">
          <h3>${product.manufacturer} - ${product.name}</h3>
          <p>${product.description}</p>
          <p class="price">${product.price.toFixed(2)} р.</p>
        </div>
      </a>
      <button class="add-to-cart" data-id="${product.id}">🛒 Добавить в корзину</button>
    `;
    fragment.appendChild(productCard);
  });

  productsContainer.appendChild(fragment);

  // Добавление обработчиков для кнопок "Добавить в корзину"
  productsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('add-to-cart')) {
      const productId = event.target.getAttribute('data-id');
      addToCart(productId);
    }
  });
}


function filterProducts() {
  // Получаем значения из полей фильтров
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const selectedCategory = document.getElementById('category-select').value.toLowerCase();
  const selectedManufacturer = document.getElementById('manufacturer-select').value.toLowerCase();
  const minPrice = parseFloat(document.getElementById('price-min').value) || 0;
  const maxPrice = parseFloat(document.getElementById('price-max').value) || 1000;

  // Логируем значения фильтров для отладки
  console.log('Min Price:', minPrice, 'Max Price:', maxPrice);

  // Фильтруем товары
  const filteredProducts = allProducts.filter((product) => {
    const name = `${product.manufacturer} - ${product.name}`.toLowerCase();
    const description = product.description.toLowerCase();
    const category = product.category ? product.category.toLowerCase() : '';
    const manufacturer = product.manufacturer ? product.manufacturer.toLowerCase() : '';
    
    // Проверка цены товара, если она отсутствует или имеет неверный формат
    const price = product.price ? parseFloat(product.price) : 0;

    // Логируем цену товара для отладки
    console.log('Product Price:', price);

    // Проверяем, совпадает ли товар с условиями фильтрации
    const matchesSearch = name.includes(searchTerm) || description.includes(searchTerm);
    const matchesCategory = selectedCategory === '' || category === selectedCategory;
    const matchesManufacturer = selectedManufacturer === '' || manufacturer === selectedManufacturer;
    const matchesPrice = price >= minPrice && price <= maxPrice;

    // Возвращаем товар, если все условия фильтрации выполняются
    return matchesSearch && matchesCategory && matchesManufacturer && matchesPrice;
  });

  // Отображаем отфильтрованные товары
  displayProducts(filteredProducts);
}


// Добавление товара в корзину в БД
async function addToCart(productId) {
  const user = auth.currentUser;
  if (!user) {
    alert('🔒 Пожалуйста, войдите в аккаунт, чтобы добавить товар в корзину.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const cartRef = doc(db, 'carts', user.uid);
    const cartSnap = await getDoc(cartRef);
    let cart = [];

    if (cartSnap.exists()) {
      cart = cartSnap.data().items || [];
    }

    const existingItem = cart.find((item) => item.id === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ id: productId, quantity: 1 });
    }

    await setDoc(cartRef, { items: cart });
    alert('🛒 Товар добавлен в корзину!');
    updateCartCount();
  } catch (error) {
    console.error('Ошибка добавления в корзину:', error);
    alert('❌ Не удалось добавить товар в корзину. Попробуйте позже.');
  }
}

// Функция обновления количества товаров в корзине
async function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    const user = auth.currentUser;
    if (user) {
      const cartRef = doc(db, 'carts', user.uid);
      const cartSnap = await getDoc(cartRef);
      if (cartSnap.exists()) {
        const cart = cartSnap.data().items || [];
        cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
      } else {
        cartCount.textContent = '0';
      }
    } else {
      cartCount.textContent = '0';
    }
  }
}

// Обработчики событий для фильтров с задержкой (debounce)
function debounce(func, delay) {
  let timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(func, delay);
  };
}

if (searchInput) {
  searchInput.addEventListener('input', debounce(filterProducts, 300));
}

if (categorySelect) {
  categorySelect.addEventListener('change', filterProducts);
}

// Загрузка товаров при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  updateCartCount();
});
