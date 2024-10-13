from django.shortcuts import render
from django.http import HttpResponse
import pandas as pd
from sklearn.linear_model import LinearRegression
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from difflib import SequenceMatcher
import tokenize
from io import BytesIO

def home(request):
    return render(request, 'page/index.html')

# @csrf_exempt
def predict_future_data(request): 
    if request.method == 'POST':
        try:
            # 獲取前端傳來的資料
            data = request.POST.get('data')
            
            # 將資料拆分為單個數字列表
            data_list = [float(i) for i in data.split(',') if i]
                        
            # 初始化 22 個空的組列表
            data_groups = [[] for _ in range(22)]
            
            # 按循環索引將每個數字分配到對應的組
            for index, value in enumerate(data_list):
                group_index = index % 22
                data_groups[group_index].append(value)
            
            all_predictions = []

            # 對每個組進行預測
            for group in data_groups:
                # 如果該組沒有數據，跳過
                if not group:
                    continue

                # 將資料轉換為 DataFrame
                df = pd.DataFrame({'Value': group})
                df['Index'] = df.index

                # 構建線性回歸模型
                model = LinearRegression()
                model.fit(df[['Index']], df['Value'])

                # 預測未來 33% 的資料量
                num_predictions = max(1, len(group) // 3)
                future_indices = [[i] for i in range(len(group), len(group) + num_predictions)]
                
                # 使用與訓練數據相同的 DataFrame 結構來進行預測
                future_indices_df = pd.DataFrame(future_indices, columns=['Index'])
                predictions = model.predict(future_indices_df)

                # 只保存預測結果
                all_predictions.append(list(predictions))

            # 返回所有 22 組的預測資料
            return JsonResponse({'predictions': all_predictions})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method.'}, status=400)

def tokenize_code(code):
    tokens = []
    try:
        tokens_gen = tokenize.tokenize(BytesIO(code.encode('utf-8')).readline)
        for token in tokens_gen:
            if token.type in [tokenize.ENCODING, tokenize.NL, tokenize.NEWLINE]:
                continue
            tokens.append((token.string, token.start))
    except tokenize.TokenError:
        pass
    return tokens

def lcs_tokens(tokens1, tokens2):
    tokens1_str = [token[0] for token in tokens1]
    tokens2_str = [token[0] for token in tokens2]
    matcher = SequenceMatcher(None, tokens1_str, tokens2_str)
    highlighted_code1 = ""
    highlighted_code2 = ""
    current_line1, current_col1 = 0, 0
    current_line2, current_col2 = 0, 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        # 處理左側代碼的標記
        for token, (line, col) in tokens1[i1:i2]:
            if not token.strip():
                highlighted_code1 += token.replace("<", "&lt;").replace(">", "&gt;")  # 直接保留空白符，避免包裹在 <span> 中
                continue
            
            if line > current_line1:
                highlighted_code1 += "\n"
                current_col1 = 0
                current_line1 = line

            if col > current_col1:
                highlighted_code1 += " " * (col - current_col1)
                current_col1 = col

            # 將重複部分標記為綠色，其他部分保留原始樣式
            if tag == 'equal':
                highlighted_code1 += f'<span class="highlight">{token.replace("<", "&lt;").replace(">", "&gt;")}</span>'
            else:
                # 對非匹配部分進行 HTML 編碼
                highlighted_code1 += token.replace("<", "&lt;").replace(">", "&gt;")

            current_col1 += len(token)

        # 處理右側代碼的標記
        for token, (line, col) in tokens2[j1:j2]:
            if not token.strip():
                highlighted_code2 += token.replace("<", "&lt;").replace(">", "&gt;")  # 直接保留空白符，避免包裹在 <span> 中
                continue
            
            if line > current_line2:
                highlighted_code2 += "\n"
                current_col2 = 0
                current_line2 = line

            if col > current_col2:
                highlighted_code2 += " " * (col - current_col2)
                current_col2 = col

            # 將重複部分標記為透明，非重複部分標記為紅色
            if tag == 'equal':
                highlighted_code2 += f'<span class="transparent">{token.replace("<", "&lt;").replace(">", "&gt;")}</span>'
            else:
                # 對非匹配部分進行 HTML 編碼
                highlighted_code2 += f'<span class="non-matching">{token.replace("<", "&lt;").replace(">", "&gt;")}</span>'

            current_col2 += len(token)

    highlighted_code1 = highlighted_code1.strip()
    highlighted_code2 = highlighted_code2.strip()

    return highlighted_code1, highlighted_code2



def compare_code(request):
    code_input1 = ""
    code_input2 = ""
    result_left = ""
    result_right = ""

    if request.method == 'POST':
        code_input1 = request.POST.get('code_input1', '')
        code_input2 = request.POST.get('code_input2', '')

        tokens1 = tokenize_code(code_input1)
        tokens2 = tokenize_code(code_input2)

        # Compare tokens using LCS algorithm
        result_left, result_right = lcs_tokens(tokens1, tokens2)

    return render(request, 'page/code_cmp.html', {
        'code_input1': code_input1,
        'code_input2': code_input2,
        'result_left': result_left,
        'result_right': result_right
    })
