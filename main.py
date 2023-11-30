# -*- coding: utf-8 -*-
from shapely.wkt import loads
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import shapefile as shp
import tkinter as tk

shapefile_path = './data/TOWN_MOI_1120825.shp'
sf = shp.Reader(shapefile_path)
country = sf.records()
sf = sf.shapes()
visited = set()

fig, ax = plt.subplots()
for i in range(len(sf)):
    x, y = zip(*sf[i].points)
    ax.plot(x, y, 'k')

def plot_polygon():
    country_name = entry.get()
    ax.clear()
    index = [index for index, sublist in enumerate(country) if country_name in sublist][0]
    x, y = zip(*sf[index].points) 
    ax.plot(x, y, 'k')
    canvas.draw()

root = tk.Tk()
root.title('test')
root.geometry('700x700')

canvas = FigureCanvasTkAgg(fig, master=root)
canvas_widget  = canvas.get_tk_widget()
canvas_widget.config(width=500, height=500)
canvas_widget.pack()

button_control = tk.Frame(root)
button_control.pack()

label = tk.Label(button_control, text='行政區')
label.pack(side='left')

entry = tk.Entry(button_control)
entry.pack(side='left')

button = tk.Button(button_control, text='確定', command=plot_polygon)
button.pack(side='left')

root.mainloop()