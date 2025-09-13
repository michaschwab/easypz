# EasyPZ
**Use this Javascript library to make your web visualization interactive 
via pan and zoom, for mobile and desktop!**


EasyPZ supports many interactions for panning and zooming, including wheel, 
pinch, double click, hold, brush, rub, and dynamic zoom, panning methods
 including default, flick, and many variations.

Many examples can be found at [easypz.org](https://easypz.org), including 
examples using [d3](https://d3js.org/), and examples that use
canvas instead of SVG. 

Instructions on how to use EasyPZ, explanations for the many options, as 
well as how to extend EasyPZ with your own pan or zoom method,
can be found in the [Wiki](https://github.com/michaschwab/easypz/wiki)! 

### Changelog

#### 1.1.10
* Improve detection of preexisting transformations and reduce error logs.

#### 1.1.9
* Add the removeHostListeners method to allow removing EasyPZ's event listeners.

#### 1.1.8

* Allow passing easypz settings via the new data-easypz attribute to be more W3C compliant.

#### 1.1.7

* Basic support for rotate, skewX and skewY, and two different scales for X and Y. 
* Add a new zoom method: shift drag zoom.

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


### Licence

ISC License (ISC)

Copyright 2019 Michail Schwab

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
