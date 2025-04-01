let mapDataColumns = [];  // 保存多個數據列
let currentSpeedIndex = 0;  // 當前顯示的數據列
const speedValues = [1, 1.5, 2.0, 3.0, 0.5];
let sliderInterval = null;

const allowedCounties = new Set([
    // 中文名稱
    "連江縣", "金門縣", "宜蘭縣", "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣",
    "嘉義縣", "屏東縣", "台東縣", "花蓮縣", "台北市", "高雄市", "新北市", "台中市",
    "台南市", "桃園市", "基隆市", "嘉義市", "新竹市", "澎湖縣",
    // 英文名稱 (依據實際情況補充)
    "Lienchiang County", "Kinmen County", "Yilan County", "Hsinchu County", "Miaoli County",
    "Changhua County", "Nantou County", "Yunlin County", "Chiayi County", "Pingtung County",
    "Taitung County", "Hualien County", "Taipei City", "Kaohsiung City", "New Taipei City",
    "Taichung City", "Tainan City", "Taoyuan City", "Keelung City", "Chiayi City", "Hsinchu City",
    "Penghu County"
]);

function initializeMapData() {
    mapData = [];
    document.querySelectorAll('.city').forEach((city, index) => {
        mapData.push({
            // 這裡若有可能出現多餘空白，可加 .trim()
            County: city.classList[0].trim(),
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
    selectElement.style.backgroundColor = colorSchemes['red'][4]; // 設置選擇框背景色

    // 使用初始化的資料來更新地圖顏色
    currentColorScheme = colorSchemes['red'];
    currentColumnIndex = 0;  // 使用第一個數據列
    updateMap(mapDataColumns[currentColumnIndex]); // 更新顯示

    // 阻止滑軌區塊事件冒泡
    const sliderInfoContainer = document.getElementById('slider-info-container');
    const valueSlider = document.getElementById('valueSlider');
    sliderInfoContainer.addEventListener('mousedown', function (event) { event.stopPropagation(); });
    valueSlider.addEventListener('mousedown', function (event) { event.stopPropagation(); });
};

function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) return;

    // 清空檔案選擇器
    fileInput.value = "";

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // 處理 Excel 檔案
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            processUploadedData(jsonData);
        };
        reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.csv')) {
        // 處理 CSV 檔案 (簡單 CSV 解析，複雜狀況建議使用 PapaParse)
        const reader = new FileReader();
        reader.onload = function (e) {
            const csvText = e.target.result;
            const lines = csvText.split('\n').filter(line => line.trim() !== '');
            const csvData = lines.map(line => line.split(','));
            processUploadedData(csvData);
        };
        reader.readAsText(file);
    } else if (fileName.endsWith('.json')) {
        // 處理 JSON 檔案
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const jsonParsed = JSON.parse(e.target.result);
                // 支援兩種格式：直接 2D 陣列 或 { data: 2D 陣列 }
                const jsonData = jsonParsed.data ? jsonParsed.data : jsonParsed;
                processUploadedData(jsonData);
            } catch (err) {
                console.error("JSON 解析錯誤：", err);
            }
        };
        reader.readAsText(file);
    } else if (fileName.endsWith('.xml')) {
        // 處理 XML 檔案
        const reader = new FileReader();
        reader.onload = function (e) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, "application/xml");
            processUploadedXmlData(xmlDoc);
        };
        reader.readAsText(file);
    } else {
        alert("不支援此檔案格式，請上傳 Excel、CSV 或 JSON 檔案。");
    }
}

function processUploadedXmlData(xmlDoc) {
    const rows = [];

    // 動態取得 XML 頂層子節點（即根標籤的所有子標籤）
    const rootElement = xmlDoc.documentElement;
    const records = rootElement.children;

    if (records.length === 0) {
        console.error(`No child elements found under <${rootElement.tagName}>.`);
        return;
    }

    // 動態生成標題列
    const header = [];
    const firstRecord = records[0].children;
    for (let i = 0; i < firstRecord.length; i++) {
        header.push(firstRecord[i].tagName);  // 使用子節點標籤作為標題
    }
    rows.push(header);

    // 解析每個記錄
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const row = [];
        for (let j = 0; j < header.length; j++) {
            const value = getElementText(record, header[j]);
            row.push(value);
        }
        rows.push(row);
    }

    console.log(rows);  // 確認資料結構是否正確
    processUploadedData(rows);  // 傳遞到你的既有函數處理 2D 陣列
}

// 取得節點文字內容的輔助函數
function getElementText(parent, tagName) {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent.trim() : "";  // 如果節點不存在，返回空字串
}

/**
 * 過濾原始資料，只保留指定縣市的列
 * @param {Array} rawData - 2D 陣列，第一欄為縣市名稱
 * @returns {Array} 過濾後的資料
 */

function normalizeCountyName(name) {
    if (!name) return "";
    // 移除所有半形空白及全形空白 (U+3000)
    let normalized = name.replace(/[\s\u3000]/g, "").replace(/（.*?）/g, "").replace(/\(.*?\)/g, "").replace(/臺/g, "台");

    return normalized;
}

function filterAllowedCounties(rawData) {
    const header = rawData[0];
    const filteredRows = [header]; // 保留標題列
    const seenCounties = new Set(); // 用來追蹤已經處理過的縣市名稱

    for (let i = 1; i < rawData.length; i++) {
        const countyNameRaw = rawData[i][0];
        const normalizedName = normalizeCountyName(countyNameRaw);

        if (!seenCounties.has(normalizedName) && allowedCounties.has(normalizedName)) {
            filteredRows.push(rawData[i]);
            seenCounties.add(normalizedName); // 標記這個縣市已經處理過
        }
    }
    return filteredRows;
}

function processUploadedData(rawData) {
    // 先過濾只保留指定縣市
    console.log(rawData)
    rawData = filterAllowedCounties(rawData);
    console.log(rawData)
    // 清空之前的資料
    mapDataColumns = [];

    // 假設 rawData 第一列為標題，從第二欄開始為數據列
    for (let i = 1; i < rawData[0].length; i++) {
        const columnData = rawData.map(row => ({
            County: normalizeCountyName(row[0] || ""),  // 使用正規化後的縣市名稱
            Value: parseInt(row[i]) || 0,
            Title: rawData[0][i]
        })).slice(1);
        mapDataColumns.push(columnData);
    }

    // 更新滑軌與地圖顯示
    const sliderInfoContainer = document.getElementById('slider-info-container');
    const valueSlider = document.getElementById('valueSlider');
    const sliderInfoText = document.getElementById('slider-info-text');
    const columnTitle = document.getElementById('column-title');

    if (mapDataColumns.length > 1) {
        sliderInfoContainer.style.display = 'block';
        valueSlider.max = mapDataColumns.length - 1;
        valueSlider.disabled = false;
        sliderInfoText.textContent = `(1/${mapDataColumns.length})`;
        columnTitle.textContent = mapDataColumns[0][0]?.Title || '';
    } else {
        sliderInfoContainer.style.display = 'none';
        valueSlider.disabled = true;
    }

    document.getElementById('predict-button').style.visibility = (mapDataColumns.length > 15) ? 'visible' : 'hidden';

    currentColumnIndex = 0;
    updateMap(mapDataColumns[currentColumnIndex]);
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
                    Value: result.predictions[index][i] || 0,
                    Title: `預測 - 第${mapDataColumns.length + 1}列`
                }));
                mapDataColumns.push(predictedData);
            }

            const sliderInfoContainer = document.getElementById('slider-info-container');
            const valueSlider = document.getElementById('valueSlider');
            const sliderInfoText = document.getElementById('slider-info-text');
            const columnTitle = document.getElementById('column-title');

            sliderInfoContainer.style.display = 'block';
            valueSlider.max = mapDataColumns.length - 1;
            valueSlider.value = mapDataColumns.length - 1;
            valueSlider.disabled = false;
            sliderInfoText.textContent = `(1/${mapDataColumns.length})`;
            columnTitle.textContent = mapDataColumns[0][0]?.Title || '';

            currentColumnIndex = mapDataColumns.length - 1;
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
    const sliderInfoText = document.getElementById('slider-info-text');
    const columnTitle = document.getElementById('column-title');
    sliderInfoText.textContent = `(${currentColumnIndex + 1}/${mapDataColumns.length})`;
    columnTitle.textContent = mapDataColumns[currentColumnIndex][0]?.Title || '';
}

// 色系設定
const colorSchemes = {
    red: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
    blue: ['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
    green: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
    purple: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f']
};

let currentColorScheme = colorSchemes.red;

function handleColorSchemeChange() {
    const selectElement = document.getElementById('colorScheme');
    const scheme = selectElement.value;
    selectElement.style.backgroundColor = colorSchemes[scheme][4];
    currentColorScheme = colorSchemes[scheme];
    updateMap(mapDataColumns[currentColumnIndex]);
}

function getInterpolatedColor(scheme, value, minValue, maxValue) {
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
        const county = normalizeCountyName(entry['County']);
        const safeCounty = CSS.escape(county);
        const mapElement = document.querySelector(`.${safeCounty}.city`);
        if (mapElement) {
            mapElement.dataset.value = entry['Value'];
            const color = getInterpolatedColor(currentColorScheme, entry['Value'], minValue, maxValue);
            mapElement.setAttribute('fill', color);
        } else {
            console.warn(`無法找到對應縣市：${county}`);
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
            valueSlider.value = parseInt(valueSlider.value) + 1;
        }
        handleSliderChange();
    }, 1000 / speedValues[currentSpeedIndex]);
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
    if (sliderInterval) {
        clearInterval(sliderInterval);
        playSlider();
    }
}

document.querySelectorAll('.city').forEach(city => {
    city.addEventListener('mouseover', function () {
        const county = this.classList[0].trim();
        const value = this.dataset.value || 0;
        const regionNameElement = document.getElementById('region-name');
        const regionValueElement = document.getElementById('region-value');
        regionNameElement.textContent = county;
        regionValueElement.textContent = value;
        const originalPath = this.cloneNode(true);
        originalPath.removeAttribute('class');
        const hoverEffect = document.getElementById('hover-effect');
        hoverEffect.innerHTML = '';
        hoverEffect.appendChild(originalPath);
        hoverEffect.style.display = 'block';
        const ctm = this.getScreenCTM();
        const rect = this.getBoundingClientRect();
        hoverEffect.style.position = 'absolute';
        hoverEffect.style.top = `${window.scrollY + rect.top}px`;
        hoverEffect.style.left = `${window.scrollX + rect.left}px`;
        hoverEffect.style.width = '150px';
        hoverEffect.style.height = '100px';
        hoverEffect.innerHTML = `<h3>${county}</h3><p>數字: ${value}</p>`;
        const matrix = ctm.inverse();
        hoverEffect.style.transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`;
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

function handleUrlFetch() {
    const urlInput = document.getElementById('urlInput');
    const url = urlInput.value.trim();

    if (!url) {
        alert('請輸入有效的網址');
        return;
    }

    fetch('/fetch-url/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ url: url })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('爬取成功:', data.content);

                // 創建一個 Blob 模擬檔案
                const blob = new Blob([data.content], { type: 'text/xml' });
                const file = new File([blob], "fetched_data.xml", { type: 'text/xml' });

                // 將 Blob 模擬成檔案並觸發現有的 handleFileUpload 流程
                simulateFileUpload(file);
            } else {
                alert('爬取失敗，請檢查網址');
            }
        })
        .catch(error => {
            console.error('發生錯誤:', error);
            alert('請求失敗，請稍後再試');
        });
    urlInput.value = '';
}

function simulateFileUpload(file) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const fileInput = document.getElementById('fileInput');
    fileInput.files = dataTransfer.files;

    // 調用現有的 handleFileUpload 函數
    handleFileUpload();
}

// Zoom 與拖曳功能
let currentScale = 1;
const mapElement = document.getElementById('taiwan-map');
const mapContainer = document.getElementById('map-container');
function zoomIn() {
    currentScale += 0.2;
    applyZoom();
}
function zoomOut() {
    currentScale -= 0.2;
    if (currentScale < 0.5) currentScale = 0.5;
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
    currentScale += (e.deltaY < 0) ? zoomFactor : -zoomFactor;
    if (currentScale < 0.5) currentScale = 0.5;
    const scaleRatio = currentScale / prevScale;
    offsetX = mouseX - (mouseX - offsetX) * scaleRatio;
    offsetY = mouseY - (mouseY - offsetY) * scaleRatio;
    applyZoom();
});
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
document.getElementById('slider-info-container').addEventListener('mousedown', function (event) {
    event.stopPropagation();
});
document.getElementById('valueSlider').addEventListener('mousedown', function (event) {
    event.stopPropagation();
});
function throttle(func, limit) {
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
const throttledSliderChange = throttle(handleSliderChange, 20);
document.getElementById('valueSlider').oninput = throttledSliderChange;