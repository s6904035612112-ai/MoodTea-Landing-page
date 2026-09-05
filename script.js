/* =========================================================
   MoodTea — script.js
   ใช้ร่วมกันทุกหน้า: product.html / order.html / admin.html
   สคริปต์จะเช็ค element บนหน้าปัจจุบันก่อนรันแต่ละส่วน
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     ค่าคงที่ / config
     --------------------------------------------------------- */
  var PRODUCTS_JSON_PATH = 'products.json';
  var ORDER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxCaaME2WmPrK4OM9WT9R0YcH5LIq5-8mhvVztcIR3u0ctz3Z1n8MQsuMYedEzQ0FXS/exec';
  var ORDERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJ6Oh1GmqcZfyAa-oAQbqhlYBxWvHlE-LFA5I4EaElxXvmXBPSBJITM3Kb9DpxyrrovwMkEawCG_LM/pub?gid=0&single=true&output=csv';

  var MOOD_LABELS = {
    all: 'ทั้งหมด',
    fresh: 'Fresh',
    focus: 'Focus',
    relax: 'Relax',
    balance: 'Balance'
  };

  /* ===========================================================
     1) PRODUCT LISTING PAGE (product.html)
     ต้องมี #filter-bar และ #product-list
     =========================================================== */
  function initProductPage() {
    var filterBar = document.getElementById('filter-bar');
    var productList = document.getElementById('product-list');

    if (!filterBar || !productList) {
      return; // ไม่ใช่หน้านี้ ข้ามไป
    }

    var allProducts = [];

    // อ่าน mood จาก URL parameter เช่น ?mood=fresh
    var params = new URLSearchParams(window.location.search);
    var initialMood = params.get('mood');
    if (!initialMood || !MOOD_LABELS.hasOwnProperty(initialMood)) {
      initialMood = 'all';
    }

    fetch(PRODUCTS_JSON_PATH)
      .then(function (res) {
        if (!res.ok) {
          throw new Error('โหลด products.json ไม่สำเร็จ');
        }
        return res.json();
      })
      .then(function (products) {
        allProducts = products;
        buildFilterBar(initialMood);
        renderProducts(initialMood);
      })
      .catch(function (error) {
        console.error(error);
        productList.innerHTML = '<p class="product-list__error">ไม่สามารถโหลดข้อมูลสินค้าได้ในขณะนี้</p>';
      });

    function buildFilterBar(activeMood) {
      filterBar.innerHTML = '';

      Object.keys(MOOD_LABELS).forEach(function (moodKey) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-btn';
        btn.dataset.mood = moodKey;
        btn.textContent = MOOD_LABELS[moodKey];

        if (moodKey === activeMood) {
          btn.classList.add('is-active');
        }

        btn.addEventListener('click', function () {
          setActiveFilterButton(moodKey);
          renderProducts(moodKey);
        });

        filterBar.appendChild(btn);
      });
    }

    function setActiveFilterButton(activeMood) {
      var buttons = filterBar.querySelectorAll('.filter-btn');
      buttons.forEach(function (btn) {
        btn.classList.toggle('is-active', btn.dataset.mood === activeMood);
      });
    }

    function renderProducts(moodFilter) {
      var filtered = allProducts.filter(function (product) {
        if (moodFilter === 'all') {
          return true;
        }
        return product.mood === moodFilter;
      });

      productList.innerHTML = '';

      if (filtered.length === 0) {
        productList.innerHTML = '<p class="product-list__empty">ไม่พบสินค้าในหมวดนี้</p>';
        return;
      }

      filtered.forEach(function (product) {
        productList.appendChild(createProductCard(product));
      });
    }

    function createProductCard(product) {
      var card = document.createElement('article');
      card.className = 'card';
      if (product.mood) {
        card.classList.add('card--' + product.mood);
      }

      var fullName = product.size ? (product.name + ' ' + product.size) : product.name;

      var moodBadge = '';
      if (product.mood) {
        moodBadge =
          '<span class="mood-label">' +
          '<span class="mood-dot mood-dot--' + product.mood + '"></span>' +
          MOOD_LABELS[product.mood] +
          '</span>';
      }

      var orderUrl =
        'order.html?item=' + encodeURIComponent(fullName) +
        '&price=' + encodeURIComponent(product.price);

      card.innerHTML =
        '<div class="card__image">' +
          '<img src="' + product.image + '" alt="' + fullName + '" loading="lazy">' +
        '</div>' +
        '<div class="card__body">' +
          moodBadge +
          '<h3 class="card__title">' + product.name + '</h3>' +
          (product.size ? '<p class="card__size">' + product.size + '</p>' : '') +
          '<p class="card__description">' + product.description + '</p>' +
          '<div class="card__footer">' +
            '<span class="card__price">' + product.price + '</span>' +
            '<a href="' + orderUrl + '" class="btn btn--primary btn--sm">สั่งซื้อ</a>' +
          '</div>' +
        '</div>';

      return card;
    }
  }

  /* ===========================================================
     2) ORDER FORM PAGE (order.html)
     ต้องมี #orderForm, #customerName, #contact, #items, #total, #note
     =========================================================== */
  function initOrderPage() {
    var orderForm = document.getElementById('orderForm');
    var itemsField = document.getElementById('items');
    var totalField = document.getElementById('total');

    if (!orderForm || !itemsField || !totalField) {
      return; // ไม่ใช่หน้านี้ ข้ามไป
    }

    var customerNameField = document.getElementById('customerName');
    var contactField = document.getElementById('contact');
    var noteField = document.getElementById('note');

    // ---- เติมค่าจาก URL parameter ทันทีที่โหลดหน้า ----
    var params = new URLSearchParams(window.location.search);
    var itemParam = params.get('item');
    var priceParam = params.get('price');

    if (itemParam !== null) {
      itemsField.value = itemParam;
    }

    // สำคัญ: ต้องเติมช่อง total เสมอ ห้ามลืม
    if (priceParam !== null) {
      totalField.value = priceParam;
    }

    // ---- Submit ฟอร์ม ----
    orderForm.addEventListener('submit', function (event) {
      event.preventDefault();

      var payload = {
        customerName: customerNameField ? customerNameField.value : '',
        contact: contactField ? contactField.value : '',
        items: itemsField.value,
        total: totalField.value,
        note: noteField ? noteField.value : ''
      };

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
        .then(function () {
          window.location.href = 'thankyou.html';
        })
        .catch(function (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        });
    });
  }

  /* ===========================================================
     3) ADMIN PAGE (admin.html)
     ต้องมี #ordersTable tbody
     =========================================================== */
  function initAdminPage() {
    var table = document.getElementById('ordersTable');
    if (!table) {
      return; // ไม่ใช่หน้านี้ ข้ามไป
    }

    var tbody = table.querySelector('tbody');
    if (!tbody) {
      return;
    }

    tbody.innerHTML = '<tr><td colspan="6">กำลังโหลดข้อมูล...</td></tr>';

    fetch(ORDERS_CSV_URL)
      .then(function (res) {
        if (!res.ok) {
          throw new Error('โหลดข้อมูลออเดอร์ไม่สำเร็จ');
        }
        return res.text();
      })
      .then(function (csvText) {
        var rows = parseCSV(csvText);

        if (rows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6">ยังไม่มีรายการสั่งซื้อ</td></tr>';
          return;
        }

        // แถวแรกคือ header — ตัดออก
        var dataRows = rows.slice(1).filter(function (row) {
          return row.length > 1 || (row.length === 1 && row[0] !== '');
        });

        // เรียงล่าสุดขึ้นก่อน (สมมติข้อมูลเดิมเรียงจากเก่า -> ใหม่ตามลำดับที่บันทึก)
        dataRows.reverse();

        tbody.innerHTML = '';

        dataRows.forEach(function (row) {
          var tr = document.createElement('tr');

          // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
          for (var i = 0; i < 6; i++) {
            var td = document.createElement('td');
            td.textContent = row[i] !== undefined ? row[i] : '';
            tr.appendChild(td);
          }

          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</td></tr>';
      });
  }

  /**
   * parseCSV — parser อย่างง่าย ไม่พึ่ง library ภายนอก
   * รองรับฟิลด์ที่ครอบด้วย double quote ("...") รวมถึงกรณีมี comma
   * หรือ newline อยู่ภายในฟิลด์ที่ถูกครอบด้วย quote
   * คืนค่าเป็น array of rows โดยแต่ละ row เป็น array of string values
   */
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var insideQuotes = false;

    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (var i = 0; i < text.length; i++) {
      var char = text[i];

      if (insideQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            // escaped quote ("")
            field += '"';
            i++;
          } else {
            insideQuotes = false;
          }
        } else {
          field += char;
        }
      } else {
        if (char === '"') {
          insideQuotes = true;
        } else if (char === ',') {
          row.push(field);
          field = '';
        } else if (char === '\n') {
          row.push(field);
          rows.push(row);
          row = [];
          field = '';
        } else {
          field += char;
        }
      }
    }

    // ดันฟิลด์/แถวสุดท้ายที่เหลือค้างอยู่
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่างทิ้ง (เช่นบรรทัดว่างท้ายไฟล์)
    return rows.filter(function (r) {
      return !(r.length === 1 && r[0].trim() === '');
    });
  }

  /* ---------------------------------------------------------
     Bootstrap — รันเฉพาะส่วนที่ตรงกับหน้าปัจจุบัน
     --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initProductPage();
    initOrderPage();
    initAdminPage();
  });
})();
