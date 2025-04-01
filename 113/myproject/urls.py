from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.home, name='home'),
    path('predict/', views.predict_future_data, name='predict'),
    path('cmp_code/', views.compare_code, name='compare_code'),
    path('compare_code_raw/', views.compare_code_raw, name='compare_code_raw'),
    path('fetch-url/', views.fetch_url, name='fetch_url'),
]