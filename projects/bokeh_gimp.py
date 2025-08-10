from PIL import Image
import numpy as np
from bokeh.events import Tap, MouseMove

from bokeh.plotting import figure, curdoc
from bokeh.models import ColumnDataSource, FreehandDrawTool, TapTool, Range1d, CustomJS, WheelZoomTool, AdaptiveTicker
from bokeh.layouts import column

# === Load and convert image ===
img = Image.open("map1.png").convert("RGBA")
arr = np.array(img)
h, w = arr.shape[:2]

# === Convert RGBA (uint8) to uint32 format ===
view = arr.view(dtype=np.uint32).reshape((h, w))

# === Image source ===
source = ColumnDataSource(data=dict(image=[view]))

# === Set initial canvas size (auto aspect) ===
canvas_width = 800
canvas_height = int(h * (canvas_width / w))

# === Create figure ===
TOOLS = "pan,box_zoom,reset,save"
p = figure(
    x_range=Range1d(start=0, end=w),
    y_range=Range1d(start=h, end=0),
    width=canvas_width, height=canvas_height,
    tools=TOOLS,
    title="ROS Map Editor (Crisp)"
)

# Lock zoom to minimum 1 unit per pixel using bounds
p.x_range.bounds = (0, w)
p.y_range.bounds = (0, h)
p.x_range.min_interval = 1
p.y_range.min_interval = 1

# Use adaptive ticker but clamp minimum interval to 1
adaptive_ticker = AdaptiveTicker(base=10, mantissas=[1, 2, 5, 10])
adaptive_ticker.min_interval = 1
p.xaxis.ticker = adaptive_ticker
p.yaxis.ticker = adaptive_ticker
p.xaxis.minor_tick_line_color = None
p.yaxis.minor_tick_line_color = None

# === Add image ===
p.image_rgba(image='image', x=0, y=0, dw=w, dh=h, source=source)

# === Add freehand drawing ===
draw_source = ColumnDataSource(data=dict(xs=[], ys=[]))
line_renderer = p.multi_line(xs='xs', ys='ys', source=draw_source, line_width=2, color='red')
draw_tool = FreehandDrawTool(renderers=[line_renderer])
p.add_tools(draw_tool)
p.toolbar.active_drag = draw_tool

# === Add pixel-accurate blocks ===
pixel_source = ColumnDataSource(data=dict(x=[], y=[], color=[]))
p.rect(x='x', y='y', width=1, height=1, color='color', source=pixel_source, line_color=None)

# === Hover highlight pixel ===
highlight_source = ColumnDataSource(data=dict(x=[], y=[]))
p.rect(x='x', y='y', width=1, height=1, source=highlight_source, fill_color=None, line_color='yellow', line_width=2)

p.add_tools(TapTool())

def paint_pixel(event):
    x = int(event.x)
    y = int(event.y)
    existing = set(zip(pixel_source.data['x'], pixel_source.data['y']))
    if (x, y) not in existing:
        pixel_source.stream({'x': [x + 0.5], 'y': [y + 0.5], 'color': ['black']})

p.on_event(Tap, paint_pixel)

# === Highlight hovered pixel ===
def update_highlight(event):
    x = int(event.x)
    y = int(event.y)
    highlight_source.data = dict(x=[x + 0.5], y=[y + 0.5])

p.on_event(MouseMove, update_highlight)

# === Add WheelZoomTool ===
wheel_zoom = WheelZoomTool()
p.add_tools(wheel_zoom)
p.toolbar.active_scroll = wheel_zoom

# === Add to layout ===
curdoc().add_root(column(p))
curdoc().title = "ROS Map Editor"
