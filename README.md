# EasyPZ
**Use this Javascript library to make your web visualization interactive 
via pan and zoom, for mobile and desktop!**


EasyPZ supports many interactions for panning and zooming, including wheel, 
pinch, double click, hold, brush, rub, and dynamic zoom, panning methods
 including default, flick, and many variations.

Many examples can be found at [easypz.io](https://easypz.io), including 
examples using [d3](https://d3js.org/), and examples that use
canvas instead of SVG. Examples from the d3 gallery that just magically
turn into navigatable visualizations without a single line of code
can be found at [demos.easypz.io](https://demos.easypz.io/).

Instructions on how to use EasyPZ, explanations for the many options, as 
well as how to extend EasyPZ with your own pan or zoom method,
can be found in the [Wiki](https://github.com/michaschwab/easypz/wiki)! 

### Changelog

#### 1.1.5

* Allowed switching between mouse- and touch-based interactions on hybrid devices.

#### 1.1.3

* EasyPZ instances now check if new modes of pan and zoom are available when
 settings change.

#### 1.1.2

* Allowed disabling EasyPZ by setting the enabled modes to an empty list.

#### 1.1.1

* Added a .setSettings method to EasyPZ to allow changing settings.
* Changes in the settings set via HTML are now detected and applied
  to EasyPZ using the .setSettings method.
* Increased the frequency of the settings observation from 2s to 0.5s.

#### 1.1.0

* Made the default functionality to be applyTransformTo: "svg > *" for when
the easypz attribute is not set.

### Known Issues
Currently none.
