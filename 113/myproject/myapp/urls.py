from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('predict/', views.predict_future_data, name='predict'),
    path('cmp_code/', views.compare_code, name='compare_code'),
]
