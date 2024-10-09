from django.shortcuts import render
from django.http import HttpResponse
import pandas as pd
from sklearn.linear_model import LinearRegression
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

def home(request):
    context = {
        'message': "Hello, world! Welcome to my first Django app."
    }
    return render(request, 'page/index.html', context)

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

