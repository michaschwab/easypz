# EasyPZ
Use this Javascript library to make your web visualization interactive via pan and zoom, for mobile and desktop!


EasyPZ supports many interactions for panning and zooming, including wheel, pinch, double click, hold, brush, rub, and dynamic zoom, panning methods including default, flick, and many variations.

To use EasyPZ, simply include 

    <script src="https://code.easypz.io/easypz.latest.min.js"></script>

and assign an `easypz` attribute to the visualization you want to make zoomable, e.g:

    <svg easypz="true" width="960" height="600">
    
    </svg>

If you want to set specific settings, it can be done the following way:

    <svg easypz='
    {
       "onPanned": "onPanned",
       "onZoomed": "onZoomed",
       "onResetAbsoluteScale": "onResetAbsoluteScale",
       "modes": ["SIMPLE_PAN", "HOLD_ZOOM_IN", "CLICK_HOLD_ZOOM_OUT", "WHEEL_ZOOM", "PINCH_ZOOM", "DBLCLICK_ZOOM_IN", "DBLRIGHTCLICK_ZOOM_OUT"]
    }' width="960" height="600">
    
    </svg>

Then, as minimum, implement the functions `onZoomed` and `onPanned`.