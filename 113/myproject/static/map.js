let mapDataColumns = [];  // 保存多個數據列
let currentSpeedIndex = 0;  // 當前顯示的數據列
const speedValues = [1, 1.5, 2.0, 3.0, 0.5];
let sliderInterval = null;

function initializeMapData() {
    mapData = [];
    document.querySelectorAll('.city').forEach((city, index) => {
        mapData.push({
            County: city.classList[0],
            Value: parseInt(city.getAttribute('data-value')) || 0,
            __rowNum__: index + 1
        });
    });
    mapDataColumns.push(mapData);  // 將初始化的資料保存為第一個數據列
}

window.onload = function () {
    const svgElement = document.getElementById('taiwan-map');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    document.querySelectorAll('.city').forEach((city) => {
        const d = city.getAttribute('d');
        const points = d.match(/-?\d+(\.\d+)?/g).map(Number);
        for (let i = 0; i < points.length; i += 2) {
            const x = points[i];
            const y = points[i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    });

    const padding = 10;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    svgElement.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);

    initializeMapData(); // 確保 mapData 初始化完成

    // 設置顏色選擇框預設值為紅色
    const selectElement = document.getElementById('colorScheme');
    selectElement.value = 'red'; // 預設選擇紅色
    selectElement.style.backgroundColor = colorSchemes['red'][4]; // 設置選擇框的背景顏色為紅色系的深色

    // 使用初始化的資料來更新地圖顏色
    currentColorScheme = colorSchemes['red'];
    currentColumnIndex = 0;  // 使用第一個數據列
    updateMap(mapDataColumns[currentColumnIndex]); // 更新顯示

    // 初始化滑軌區塊的事件來防止地圖移動
    const sliderInfoContainer = document.getElementById('slider-info-container');
    const valueSlider = document.getElementById('valueSlider');

    // 阻止滑軌容器的事件冒泡
    sliderInfoContainer.addEventListener('mousedown', function (event) {
        event.stopPropagation();
    });

    // 阻止滑軌的事件冒泡
    valueSlider.addEventListener('mousedown', function (event) {
        event.stopPropagation();
    });
};

function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) return;

    fileInput.value = ""; // 清空檔案選擇器

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        // 保存多個數據列
        mapDataColumns = [];
        for (let i = 1; i < jsonData[0].length; i++) {
            const columnData = jsonData.map(row => ({
                County: row[0],  // 第一列為縣市名
                Value: parseInt(row[i]) || 0,
                Title: jsonData[0][i]  // 保存標題名稱
            })).slice(1);  // 忽略標題列
            mapDataColumns.push(columnData);
        }

        // 更新滑軌的狀態
        const sliderInfoContainer = document.getElementById('slider-info-container');
        const valueSlider = document.getElementById('valueSlider');
        const sliderInfoText = document.getElementById('slider-info-text');
        const columnTitle = document.getElementById('column-title');

        if (mapDataColumns.length > 1) {
            sliderInfoContainer.style.display = 'block';  // 顯示滑軌容器
            valueSlider.max = mapDataColumns.length - 1;
            valueSlider.disabled = false;  // 啟用滑軌
            // 顯示滑軌數量信息和標題
            sliderInfoText.textContent = `(1/${mapDataColumns.length})`;
            columnTitle.textContent = mapDataColumns[0][0]?.Title || '';
        } else {
            sliderInfoContainer.style.display = 'none';  // 隱藏滑軌容器
            valueSlider.disabled = true;  // 禁用滑軌
        }

        // 檢查資料量，決定是否顯示預測按鈕
        if (mapDataColumns.length > 15) {
            document.getElementById('predict-button').style.visibility = 'visible';
        } else {
            document.getElementById('predict-button').style.visibility = 'hidden';
        }

        // 更新地圖顯示第一個數據列
        currentColumnIndex = 0;
        updateMap(mapDataColumns[currentColumnIndex]);
    };
    reader.readAsArrayBuffer(file);
}

function handlePrediction() {
    // 獲取當前顯示的數據列
    const data = mapDataColumns.map(column =>
        column.map(entry => entry.Value).join(',')
    ).join(',');


    // 發送 POST 請求到 Django 後端進行預測
    fetch('/predict/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: `data=${data}`
    })
        .then(response => response.json())
        .then(result => {

            for (let i = 0; i < result.predictions[0].length; i++) {
                const predictedData = mapDataColumns[currentColumnIndex].map((entry, index) => ({
                    County: entry.County,
                    Value: result.predictions[index][i] || 0, // 第 index 組的第 i 個預測值
                    Title: `預測 - 第${mapDataColumns.length + 1}列`
                }));
                // 將每次預測的結果推入到 mapDataColumns
                mapDataColumns.push(predictedData);
            }

            // 更新滑軌的狀態
            const sliderInfoContainer = document.getElementById('slider-info-container');
            const valueSlider = document.getElementById('valueSlider');
            const sliderInfoText = document.getElementById('slider-info-text');
            const columnTitle = document.getElementById('column-title');

            sliderInfoContainer.style.display = 'block';  // 顯示滑軌容器
            valueSlider.max = mapDataColumns.length - 1;  // 更新滑軌最大值
            valueSlider.value = mapDataColumns.length - 1;  // 切換到最新的預測列
            valueSlider.disabled = false;  // 啟用滑軌

            // 顯示滑軌數量信息和標題
            sliderInfoText.textContent = `(1/${mapDataColumns.length})`;
            columnTitle.textContent = mapDataColumns[0][0]?.Title || '';

            // 更新地圖顯示預測的數據列（可以自定義是否立即顯示預測列或保持當前顯示列）
            currentColumnIndex = mapDataColumns.length - 1;  // 切換到最新的預測列
            updateMap(mapDataColumns[currentColumnIndex]);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function displayPredictionResult(predictions) {
    const predictionContainer = document.getElementById('prediction-result');
    predictionContainer.innerHTML = '<h3>預測結果</h3>';

    predictions.forEach((value, index) => {
        const predictionItem = document.createElement('p');
        predictionItem.textContent = `預測 ${index + 1}: ${value.toFixed(2)}`;
        predictionContainer.appendChild(predictionItem);
    });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function handleSliderChange() {
    const valueSlider = document.getElementById('valueSlider');
    currentColumnIndex = parseInt(valueSlider.value);
    updateMap(mapDataColumns[currentColumnIndex]);

    // 更新顯示的數據列信息
    const sliderInfoText = document.getElementById('slider-info-text');
    const columnTitle = document.getElementById('column-title');
    sliderInfoText.textContent = `(${currentColumnIndex + 1}/${mapDataColumns.length})`;
    columnTitle.textContent = mapDataColumns[currentColumnIndex][0]?.Title || '';
}

// 定義多個色系
const colorSchemes = {
    red: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
    blue: ['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
    green: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
    purple: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f']
};

// 初始化為紅色系
let currentColorScheme = colorSchemes.red;

function handleColorSchemeChange() {
    const selectElement = document.getElementById('colorScheme');
    const scheme = selectElement.value;

    // 根據選中的色系設置下拉框的背景顏色
    selectElement.style.backgroundColor = colorSchemes[scheme][4];

    currentColorScheme = colorSchemes[scheme];
    // 重新更新地圖顏色
    updateMap(mapDataColumns[currentColumnIndex]);
}

function getInterpolatedColor(scheme, value, minValue, maxValue) { // 顏色漸變
    const index = (value - minValue) / (maxValue - minValue) * (scheme.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    if (lowerIndex === upperIndex) return scheme[lowerIndex];

    const ratio = index - lowerIndex;
    const lowerColor = hexToRgb(scheme[lowerIndex]);
    const upperColor = hexToRgb(scheme[upperIndex]);

    const interpolatedColor = {
        r: Math.round(lowerColor.r + ratio * (upperColor.r - lowerColor.r)),
        g: Math.round(lowerColor.g + ratio * (upperColor.g - lowerColor.g)),
        b: Math.round(lowerColor.b + ratio * (upperColor.b - lowerColor.b)),
    };
    return `rgb(${interpolatedColor.r}, ${interpolatedColor.g}, ${interpolatedColor.b})`;
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

function updateMap(data) {
    const values = data.map(entry => entry['Value']);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    data.forEach(entry => {
        const county = entry['County'];
        const value = entry['Value'];

        const mapElement = document.querySelector(`.${county}.city`);
        if (mapElement) {
            mapElement.dataset.value = value;
            const color = getInterpolatedColor(currentColorScheme, value, minValue, maxValue);
            mapElement.setAttribute('fill', color);
        }
    });
}

function playSlider() {
    const valueSlider = document.getElementById('valueSlider');
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');

    playButton.disabled = true;
    pauseButton.disabled = false;

    sliderInterval = setInterval(() => {
        if (valueSlider.value == valueSlider.max) {
            valueSlider.value = 0;
            
        } else {
            valueSlider.value = parseInt(valueSlider.value) + 1; // 當滑軌到達末端時，自動重回開頭
        }
        handleSliderChange(); // 更新滑軌值
    }, 1000 / speedValues[currentSpeedIndex]); // 根據當前速度設置間隔時間
}

function pauseSlider() {
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');

    playButton.disabled = false;
    pauseButton.disabled = true;

    clearInterval(sliderInterval);
}

function changeSpeed() {
    currentSpeedIndex = (currentSpeedIndex + 1) % speedValues.length;
    const speedLabel = document.getElementById('speed-label');
    speedLabel.textContent = `x${speedValues[currentSpeedIndex]}`;

    // 如果正在播放，應該重新應用新的速度
    if (sliderInterval) {
        clearInterval(sliderInterval);
        playSlider();
    }
}

document.querySelectorAll('.city').forEach(city => {
    city.addEventListener('mouseover', function () {
        const county = this.classList[0];
        const value = this.dataset.value || 0;
        const regionNameElement = document.getElementById('region-name');
        const regionValueElement = document.getElementById('region-value');
        regionNameElement.textContent = county;
        regionValueElement.textContent = value;

        // 複製當前的 <path> 元素
        const originalPath = this.cloneNode(true);
        originalPath.removeAttribute('class'); // 移除原有 class 避免樣式衝突

        // 新增到 hoverEffect 元素中
        const hoverEffect = document.getElementById('hover-effect');
        hoverEffect.innerHTML = ''; // 清空 hoverEffect 的內容
        hoverEffect.appendChild(originalPath);
        hoverEffect.style.display = 'block';

        // 使用 getScreenCTM() 來精確定位
        const ctm = this.getScreenCTM();
        const rect = this.getBoundingClientRect();

        hoverEffect.style.position = 'absolute';
        hoverEffect.style.top = `${window.scrollY + rect.top}px`;
        hoverEffect.style.left = `${window.scrollX + rect.left}px`;
        hoverEffect.style.width = '150px';
        hoverEffect.style.height = '100px';
        hoverEffect.innerHTML = `
                                <h3>${county}</h3>
                                <p>數字: ${value}</p>
                                `;

        // 應用 ctm 進行位置和縮放轉換
        const matrix = ctm.inverse();
        hoverEffect.style.transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`;

        // 添加動畫效果
        hoverEffect.animate([
            { transform: 'translate(0, 0)', boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)' },
            { transform: 'translate(2px, -2px)', boxShadow: '0 10px 15px rgba(0, 0, 0, 0.4)' }
        ], {
            duration: 200,
            fill: 'forwards'
        });
    });

    city.addEventListener('mouseout', function () {
        const regionNameElement = document.getElementById('region-name');
        const regionValueElement = document.getElementById('region-value');
        regionNameElement.textContent = '移動到地圖上查看';
        regionValueElement.textContent = 0;

        const hoverEffect = document.getElementById('hover-effect');
        hoverEffect.style.display = 'none';
    });
});

// Zoom functionality with mouse wheel and dragging
let currentScale = 1;
const mapElement = document.getElementById('taiwan-map');
const mapContainer = document.getElementById('map-container');

function zoomIn() {
    currentScale += 0.2;
    applyZoom();
}

function zoomOut() {
    currentScale -= 0.2;
    if (currentScale < 0.5) {
        currentScale = 0.5;
    }
    applyZoom();
}

function applyZoom() {
    mapElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`;
    mapElement.style.transformOrigin = 'center center';
}

mapContainer.addEventListener('wheel', function (e) {
    e.preventDefault();
    const zoomFactor = 0.1;
    const { offsetX: mouseX, offsetY: mouseY } = e;
    const prevScale = currentScale;

    if (e.deltaY < 0) {
        currentScale += zoomFactor;
    } else {
        currentScale -= zoomFactor;
        if (currentScale < 0.5) {
            currentScale = 0.5;
        }
    }

    const scaleRatio = currentScale / prevScale;
    offsetX = mouseX - (mouseX - offsetX) * scaleRatio;
    offsetY = mouseY - (mouseY - offsetY) * scaleRatio;

    applyZoom();
});

// Drag functionality
let isDragging = false;
let startX, startY;
let offsetX = 0, offsetY = 0;

mapContainer.addEventListener('mousedown', function (e) {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    mapContainer.style.cursor = 'grabbing';
});

mapContainer.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    applyZoom();
});

mapContainer.addEventListener('mouseup', function () {
    isDragging = false;
    mapContainer.style.cursor = 'default';
});

mapContainer.addEventListener('mouseleave', function () {
    isDragging = false;
    mapContainer.style.cursor = 'default';
});

// 當滑軌的容器發生滑鼠事件時，阻止事件冒泡，避免地圖被拖動
document.getElementById('slider-info-container').addEventListener('mousedown', function (event) {
    event.stopPropagation();
});

// 當滑軌本身發生滑鼠事件時，阻止事件冒泡，避免地圖被拖動
document.getElementById('valueSlider').addEventListener('mousedown', function (event) {
    event.stopPropagation();
});

function throttle(func, limit) { //防止密集判斷
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

fetch('/predict/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': getCookie('csrftoken')
    },
    body: `data=${data}`
})

const throttledSliderChange = throttle(handleSliderChange, 20);
document.getElementById('valueSlider').oninput = throttledSliderChange;