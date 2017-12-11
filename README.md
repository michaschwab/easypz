# EasyPZ
Use this Javascript library to make your web visualization interactive via pan and zoom, for mobile and desktop!


EasyPZ supports many interactions for panning and zooming, including wheel, pinch, double click, hold, brush, rub, and dynamic zoom, panning methods including default, flick, and many variations.

To use EasyPZ, simply include 

    <script src="https://code.easypz.io/easypz.latest.min.js"></script>

and assign an `easypz` attribute to the visualization you want to make zoomable, e.g:

    <svg easypz="true" width="960" height="600">
    
    </svg>

If you want to set specific settings, e.g. set the pan and zoom interaction modes, it can be done the following way:

    <svg easypz='
    {
       "modes": ["SIMPLE_PAN", "HOLD_ZOOM_IN", "CLICK_HOLD_ZOOM_OUT", "WHEEL_ZOOM", "PINCH_ZOOM", "DBLCLICK_ZOOM_IN", "DBLRIGHTCLICK_ZOOM_OUT"]
    }' width="960" height="600">
    
    </svg>

Then, as minimum, implement the function `onTransformed(scale, translateX, translateY)` in your JavaScript code.

Many more examples can be found at [easypz.io](https://easypz.io), including examples using [d3](https://d3js.org/).