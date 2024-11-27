// js/admin.js
import { db, auth } from './firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Элементы
const addProductForm = document.getElementById('add-product-form');
const productsList = document.getElementById('products-list');

// Проверка роли пользователя и загрузка товаров
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert('🔒 Пожалуйста, войдите в аккаунт.');
    window.location.href = 'login.html';
    return;
  }

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data.role !== 'admin') {
      alert('🚫 Доступ запрещен. Только администратор может просматривать эту страницу.');
      window.location.href = 'index.html';
      return;
    }
  } else {
    alert('❌ Не удалось загрузить данные пользователя.');
    window.location.href = 'index.html';
    return;
  }

  loadProducts();
});

// Обработчик формы добавления товара
if (addProductForm) {
  addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const manufacturer = addProductForm['manufacturer'].value.trim();
    const name = addProductForm['name'].value.trim();
    const description = addProductForm['description'].value.trim();
    const price = parseFloat(addProductForm['price'].value);
    const imageUrl = addProductForm['imageUrl'].value.trim();
    const category = addProductForm['category'].value;

    if (
      !manufacturer ||
      !name ||
      !description ||
      isNaN(price) ||
      price < 0 ||
      !imageUrl ||
      !isValidUrl(imageUrl) ||
      !category
    ) {
      alert('❌ Пожалуйста, заполните все поля корректно.');
      return;
    }

    try {
      await addDoc(collection(db, 'products'), {
        manufacturer: manufacturer,
        name: name,
        description: description,
        price: parseFloat(price.toFixed(2)),
        imageUrl: imageUrl,
        category: category,
      });

      alert('✅ Товар успешно добавлен!');
      addProductForm.reset();
      loadProducts();
    } catch (error) {
      console.error('Ошибка добавления товара:', error);
      alert('❌ Не удалось добавить товар. Попробуйте позже.');
    }
  });
}

// Загрузка списка товаров
async function loadProducts() {
  try {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    productsList.innerHTML = '';
    if (productsSnapshot.empty) {
      productsList.innerHTML = '<p>📭 Нет доступных товаров.</p>';
      return;
    }

    // Используем DocumentFragment для повышения производительности
    const fragment = document.createDocumentFragment();

    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      const productItem = document.createElement('div');
      productItem.classList.add('admin-product-item');
      productItem.innerHTML = `
        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/150?text=Нет+изображения'">
        <div class="admin-product-details">
          <h3>${product.manufacturer} - ${product.name}</h3>
          <p>${product.description}</p>
          <p>${product.price} р.</p>
          <p>Категория: ${product.category}</p>
        </div>
        <div class="admin-product-actions">
          <button class="btn edit-btn" data-id="${doc.id}">✏️ Редактировать</button>
          <button class="btn remove-item" data-id="${doc.id}">🗑️ Удалить</button>
        </div>
      `;
      fragment.appendChild(productItem);
    });

    productsList.appendChild(fragment);

    // Делегирование событий для кнопок редактирования и удаления
    productsList.addEventListener('click', (event) => {
      const target = event.target;
      const productId = target.getAttribute('data-id');
      if (target.classList.contains('edit-btn')) {
        showEditProductForm(productId);
      } else if (target.classList.contains('remove-item')) {
        deleteProduct(productId);
      }
    });
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    productsList.innerHTML = '<p>❌ Не удалось загрузить товары. Попробуйте позже.</p>';
  }
}

// Удаление товара
async function deleteProduct(productId) {
  if (!confirm('⚠️ Вы уверены, что хотите удалить этот товар?')) return;
  try {
    await deleteDoc(doc(db, 'products', productId));
    alert('✅ Товар успешно удален!');
    loadProducts();
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    alert('❌ Не удалось удалить товар. Попробуйте позже.');
  }
}

// Показать форму редактирования товара
async function showEditProductForm(productId) {
  try {
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (!productDoc.exists()) {
      alert('❌ Товар не найден.');
      return;
    }
    const product = productDoc.data();

    if (document.getElementById(`edit-product-form-${productId}`)) return;

    const formHtml = `
      <div class="edit-product-form" id="edit-product-form-${productId}">
        <h3>✏️ Редактировать товар</h3>
        <form>
          <input type="text" name="manufacturer" placeholder="Производитель" value="${product.manufacturer}" required>
          <input type="text" name="name" placeholder="Название" value="${product.name}" required>
          <textarea name="description" placeholder="Описание" required>${product.description}</textarea>
          <input type="number" name="price" placeholder="Цена" value="${product.price}" required min="0" step="0.01">
          <input type="url" name="imageUrl" placeholder="URL изображения" value="${product.imageUrl}" required>
          <select name="category" required>
            <option value="">Выберите категорию</option>
            <option value="вейп" ${product.category === 'вейп' ? 'selected' : ''}>🚬 Вейп</option>
            <option value="жидкости" ${product.category === 'жидкости' ? 'selected' : ''}>💧 Жидкости</option>
            <option value="расходники" ${product.category === 'расходники' ? 'selected' : ''}>🛠️ Расходники</option>
          </select>
          <button type="submit">💾 Сохранить</button>
          <button type="button" class="cancel-btn" data-id="${productId}">❌ Отмена</button>
        </form>
      </div>
    `;
    const productItem = document.querySelector(`button.edit-btn[data-id="${productId}"]`).closest('.admin-product-item');
    productItem.insertAdjacentHTML('beforeend', formHtml);

    const editForm = document.querySelector(`#edit-product-form-${productId} form`);
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const manufacturer = editForm['manufacturer'].value.trim();
      const name = editForm['name'].value.trim();
      const description = editForm['description'].value.trim();
      const price = parseFloat(editForm['price'].value);
      const imageUrl = editForm['imageUrl'].value.trim();
      const category = editForm['category'].value;

      if (
        !manufacturer ||
        !name ||
        !description ||
        isNaN(price) ||
        price < 0 ||
        !imageUrl ||
        !isValidUrl(imageUrl) ||
        !category
      ) {
        alert('❌ Пожалуйста, заполните все поля корректно.');
        return;
      }

      try {
        await updateDoc(doc(db, 'products', productId), {
          manufacturer: manufacturer,
          name: name,
          description: description,
          price: parseFloat(price.toFixed(2)),
          imageUrl: imageUrl,
          category: category,
        });

        alert('✅ Товар успешно обновлен!');
        closeEditForm(productId);
        loadProducts();
      } catch (error) {
        console.error('Ошибка обновления товара:', error);
        alert('❌ Не удалось обновить товар. Попробуйте позже.');
      }
    });

    const cancelBtn = document.querySelector(`#edit-product-form-${productId} .cancel-btn`);
    cancelBtn.addEventListener('click', () => {
      closeEditForm(productId);
    });
  } catch (error) {
    console.error('Ошибка загрузки товара:', error);
    alert('❌ Не удалось загрузить данные товара.');
  }
}

// Функция для закрытия формы редактирования
function closeEditForm(productId) {
  const editFormContainer = document.getElementById(`edit-product-form-${productId}`);
  if (editFormContainer) {
    editFormContainer.remove();
  }
}

// Проверка корректности URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}
// admin.js

// Массив для хранения списка производителей
let manufacturers = [];

// Функция для обновления отображения списка производителей
function updateManufacturerList() {
  const manufacturerList = document.getElementById('manufacturer-list');
  manufacturerList.innerHTML = ''; // Очищаем список

  manufacturers.forEach((manufacturer, index) => {
    const li = document.createElement('li');
    li.innerHTML = `${manufacturer} <button class="remove-manufacturer" data-index="${index}">Удалить</button>`;
    manufacturerList.appendChild(li);
  });

  // Добавляем обработчик для кнопок удаления
  document.querySelectorAll('.remove-manufacturer').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      removeManufacturer(index);
    });
  });
}

// Функция для добавления нового производителя
function addManufacturer(manufacturerName) {
  if (manufacturerName && !manufacturers.includes(manufacturerName)) {
    manufacturers.push(manufacturerName);
    updateManufacturerList();
    updateManufacturerFilter();
  } else {
    alert('Производитель уже существует или имя пустое');
  }
}

// Функция для удаления производителя
function removeManufacturer(index) {
  manufacturers.splice(index, 1);
  updateManufacturerList();
  updateManufacturerFilter();
}

// Функция для обновления фильтра производителей на главной странице
function updateManufacturerFilter() {
  const manufacturerSelect = document.getElementById('manufacturer-select');
  manufacturerSelect.innerHTML = '<option value="">🛠️ Все производители</option>'; // Очищаем старые данные

  manufacturers.forEach(manufacturer => {
    const option = document.createElement('option');
    option.value = manufacturer.toLowerCase();
    option.textContent = manufacturer;
    manufacturerSelect.appendChild(option);
  });
}

// Слушатель событий для формы добавления нового производителя
document.getElementById('add-manufacturer-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const manufacturerInput = event.target.manufacturer;
  addManufacturer(manufacturerInput.value.trim());
  manufacturerInput.value = ''; // Очищаем поле
});

// Инициализация списка производителей (для демонстрации, обычно данные будут загружаться из базы данных)
updateManufacturerList();
updateManufacturerFilter();
