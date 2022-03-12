var _this = this;
function sign(number) {
    if (number < 0)
        return -1;
    if (number > 0)
        return 1;
    return 0;
}
var EasyPZLoader = /** @class */ (function () {
    function EasyPZLoader() {
        this.easyPzElements = [];
    }
    EasyPZLoader.getSettingsFromString = function (settingsString) {
        var settings = {
            onPanned: function () { },
            onZoomed: function () { },
            onTransformed: function () { },
            onResetAbsoluteScale: function () { },
            options: {},
            modes: EasyPZLoader.DEFAULT_MODES,
            applyTransformTo: '',
            replaceVariables: false,
            modeSettings: {}
        };
        if (!!window['onPanned'])
            settings.onPanned = window['onPanned'];
        if (!!window['onZoomed'])
            settings.onZoomed = window['onZoomed'];
        if (!!window['onTransformed'])
            settings.onTransformed = window['onTransformed'];
        if (!!window['onResetAbsoluteScale'])
            settings.onResetAbsoluteScale = window['onResetAbsoluteScale'];
        var settingsObj = {};
        try {
            if (settingsString && settingsString.length) {
                settingsObj = JSON.parse(settingsString);
            }
            else {
                settingsObj = { applyTransformTo: "svg > *" };
            }
        }
        catch (e) {
            console.error('Could not parse EasyPZ settings: "' + settingsString + '"');
            console.log(e);
        }
        var possibleOverrides = ['options', 'modes', 'onPanned', 'onZoomed', 'onTransformed',
            'onResetAbsoluteScale', 'applyTransformTo', 'modeSettings'];
        for (var _i = 0, possibleOverrides_1 = possibleOverrides; _i < possibleOverrides_1.length; _i++) {
            var possibleOverride = possibleOverrides_1[_i];
            if (settingsObj[possibleOverride]) {
                settings[possibleOverride] = settingsObj[possibleOverride];
                if (possibleOverride.substr(0, 2) === 'on') {
                    settings[possibleOverride] = window[settings[possibleOverride]];
                }
            }
        }
        if (settingsObj['replaceVariables'])
            settings['replaceVariables'] = !!settingsObj['replaceVariables'];
        return settings;
    };
    EasyPZLoader.prototype.checkElements = function () {
        var els = Array.from(document.querySelectorAll('[easypz]')).concat(Array.from(document.querySelectorAll('[data-easypz]')));
        var prevEls = this.easyPzElements.map(function (obj) { return obj.element; });
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var settingsString = el.getAttribute('easypz') || el.dataset.easypz;
            var prevIndex = prevEls.indexOf(el);
            var prevObj = prevEls.indexOf(el) === -1 ? null : this.easyPzElements[prevIndex];
            if (prevObj) {
                if (prevObj.settings === settingsString) {
                    // Same element, same settings: Do nothing.
                    continue;
                }
                else {
                    // Same element, different settings: Update settings.
                    console.log('Modifying EasyPZ');
                }
            }
            else {
                console.log('Adding EasyPZ');
            }
            var modes = [];
            var onPanned = function () { };
            var onZoomed = function () { };
            var onTransformed = function () { };
            var onResetAbsoluteScale = function () { };
            var options = {};
            var applyTransformTo = '';
            var modeSettings = {};
            try {
                var settingsObj = EasyPZLoader.getSettingsFromString(settingsString);
                modes = settingsObj.modes;
                onPanned = settingsObj.onPanned;
                onZoomed = settingsObj.onZoomed;
                onTransformed = settingsObj.onTransformed;
                onResetAbsoluteScale = settingsObj.onResetAbsoluteScale;
                applyTransformTo = settingsObj.applyTransformTo;
                options = settingsObj.options;
                modeSettings = settingsObj.modeSettings;
            }
            catch (e) {
                console.error(e);
            }
            if (!prevObj) {
                var easypz = new EasyPZ(el, onTransformed, options, modes, modeSettings, onPanned, onZoomed, onResetAbsoluteScale, applyTransformTo);
                this.easyPzElements.push({
                    element: el,
                    settings: settingsString,
                    easypz: easypz
                });
            }
            else {
                prevObj.settings = settingsString;
                prevObj.easypz.setSettings(onTransformed, options, modes, modeSettings, onPanned, onZoomed, onResetAbsoluteScale, applyTransformTo);
            }
        }
    };
    EasyPZLoader.DEFAULT_MODES = ["SIMPLE_PAN", "HOLD_ZOOM_IN", "CLICK_HOLD_ZOOM_OUT", "WHEEL_ZOOM_EASE", "PINCH_ZOOM", "DBLCLICK_ZOOM_IN", "DBLRIGHTCLICK_ZOOM_OUT"];
    return EasyPZLoader;
}());
var EzEventEmitter = /** @class */ (function () {
    function EzEventEmitter() {
        this.subscribers = [];
    }
    EzEventEmitter.prototype.emit = function (value) {
        this.subscribers.forEach(function (subscriber) {
            subscriber(value);
        });
    };
    EzEventEmitter.prototype.subscribe = function (subscriber) {
        this.subscribers.push(subscriber);
    };
    return EzEventEmitter;
}());
var EzPromise = /** @class */ (function () {
    function EzPromise(mainPart) {
        var _this = this;
        mainPart(function (data) { _this.resolve(data); }, function (data) { _this.resolve(data); });
    }
    EzPromise.prototype.then = function (callback) {
        this.onDone = callback;
    };
    EzPromise.prototype.resolve = function (data) {
        if (this.onDone) {
            this.onDone(data);
        }
    };
    return EzPromise;
}());
var EasyPzZoomData = /** @class */ (function () {
    function EasyPzZoomData() {
    }
    return EasyPzZoomData;
}());
var EasyPzPanData = /** @class */ (function () {
    function EasyPzPanData() {
    }
    return EasyPzPanData;
}());
var EasyPzCallbackData = /** @class */ (function () {
    function EasyPzCallbackData() {
    }
    return EasyPzCallbackData;
}());
var EasyPzMode = /** @class */ (function () {
    function EasyPzMode() {
    }
    return EasyPzMode;
}());
var EasyPZ = /** @class */ (function () {
    function EasyPZ(el, onTransform, options, enabledModes, modeSettings, onPanned, onZoomed, onResetAbsoluteScale, applyTransformTo) {
        if (onTransform === void 0) { onTransform = function () { }; }
        if (modeSettings === void 0) { modeSettings = {}; }
        if (onPanned === void 0) { onPanned = function () { }; }
        if (onZoomed === void 0) { onZoomed = function () { }; }
        if (onResetAbsoluteScale === void 0) { onResetAbsoluteScale = function () { }; }
        if (applyTransformTo === void 0) { applyTransformTo = ''; }
        this.applyTransformTo = applyTransformTo;
        this.lastMouseDownTime = 0;
        this.mouseDownTime = 0;
        this.mouseMoveTime = 0;
        this.mouseUpTime = 0;
        this.lastMousePos = { x: 0, y: 0 };
        this.numberOfPointers = 0;
        this.mousePos = { x: 0, y: 0 };
        this.afterMouseMovedCallbacks = [];
        this.height = 0;
        this.width = 0;
        // Mobile devices call both touchend as well as mouseup on release.
        // However, there is a delay - touchend is called about 250 ms before mouseup.
        // These variables are used to prevent those mouseup events to be called if a
        // touchend event was just called. The same is true for mousedown and touchstart.
        this.lastTouchEvent = 0;
        this.enabledModes = ["SIMPLE_PAN", "HOLD_ZOOM_IN", "CLICK_HOLD_ZOOM_OUT", "WHEEL_ZOOM", "PINCH_ZOOM", "DBLCLICK_ZOOM_IN", "DBLRIGHTCLICK_ZOOM_OUT"];
        this.onPanned = new EzEventEmitter();
        this.onZoomed = new EzEventEmitter();
        this.resetAbsoluteScale = new EzEventEmitter();
        this.totalTransform = { scale: 1, translateX: 0, translateY: 0 };
        this.totalTransformSnapshot = { scale: 1, translateX: 0, translateY: 0 };
        this.options = {
            minScale: 0.25,
            maxScale: 12,
            bounds: { top: -150, right: 150, bottom: 150, left: -150 }
        };
        this.listeners = {
            'mousedown': this.onMouseDown.bind(this),
            'touchstart': this.onTouchStart.bind(this),
            'mousemove': this.onMouseMove.bind(this),
            'touchmove': this.onTouchMove.bind(this),
            'mouseup': this.onMouseUp.bind(this),
            'mouseout': this.onMouseOut.bind(this),
            'touchend': this.onTouchEnd.bind(this),
            'contextmenu': this.onContextMenu.bind(this),
            'wheel': this.onWheel.bind(this)
        };
        this.lastAppliedTransform = { translateX: 0, translateY: 0, scale: 1 };
        this.modes = [];
        this.el = el instanceof Node ? el : el.node();
        this.setSettings(onTransform, options, enabledModes, modeSettings, onPanned, onZoomed, onResetAbsoluteScale, applyTransformTo);
        this.ngAfterViewInit();
        this.setupHostListeners();
    }
    EasyPZ.prototype.setSettings = function (onTransform, options, enabledModes, modeSettings, onPanned, onZoomed, onResetAbsoluteScale, applyTransformTo) {
        var _this = this;
        if (onTransform === void 0) { onTransform = function () { }; }
        if (modeSettings === void 0) { modeSettings = {}; }
        if (onPanned === void 0) { onPanned = function () { }; }
        if (onZoomed === void 0) { onZoomed = function () { }; }
        if (onResetAbsoluteScale === void 0) { onResetAbsoluteScale = function () { }; }
        if (applyTransformTo === void 0) { applyTransformTo = ''; }
        if (enabledModes) {
            this.enabledModes = enabledModes;
        }
        // Update modes in case they are different.
        this.modes = EasyPZ.modes.map(function (unresolvedMode) {
            return unresolvedMode(_this);
        });
        // Reset listeners.
        this.onPanned = new EzEventEmitter();
        this.onZoomed = new EzEventEmitter();
        this.resetAbsoluteScale = new EzEventEmitter();
        this.applyModeSettings(modeSettings);
        if (options) {
            if (typeof options.minScale !== 'undefined') {
                this.options.minScale = options.minScale;
            }
            if (typeof options.maxScale !== 'undefined') {
                this.options.maxScale = options.maxScale;
            }
            if (typeof options.bounds !== 'undefined') {
                this.options.bounds = options.bounds;
            }
        }
        var transformBeforeScale = !applyTransformTo;
        this.trackTotalTransformation(onTransform, onPanned, onZoomed, transformBeforeScale);
        this.resetAbsoluteScale.subscribe(function () { return _this.saveCurrentTransformation(onResetAbsoluteScale); });
        this.onPanned.subscribe(function () { return _this.applyTransformation(); });
        this.onZoomed.subscribe(function () { return _this.applyTransformation(); });
    };
    EasyPZ.prototype.saveCurrentTransformation = function (onResetAbsoluteScale) {
        this.totalTransformSnapshot = {
            scale: this.totalTransform.scale,
            translateX: this.totalTransform.translateX,
            translateY: this.totalTransform.translateY
        };
        onResetAbsoluteScale();
    };
    EasyPZ.prototype.trackTotalTransformation = function (onTransform, onPanned, onZoomed, transformBeforeScale) {
        var _this = this;
        this.onPanned.subscribe(function (panData) {
            if (transformBeforeScale) {
                _this.totalTransform.translateX += panData.x;
                _this.totalTransform.translateY += panData.y;
            }
            else {
                _this.totalTransform.translateX += panData.x / _this.totalTransform.scale;
                _this.totalTransform.translateY += panData.y / _this.totalTransform.scale;
            }
            _this.ensureTransformWithinBounds(transformBeforeScale);
            onPanned(panData, _this.totalTransform);
            onTransform(_this.totalTransform);
        });
        this.onZoomed.subscribe(function (zoomData) {
            // Zoom either relative to the current transformation, or to the saved snapshot.
            var zoomDataScaleChange = zoomData.scaleChange ? zoomData.scaleChange : 1;
            var relativeTransform = zoomData.absoluteScaleChange ? _this.totalTransformSnapshot : _this.totalTransform;
            var scaleChange = zoomData.absoluteScaleChange ? 1 / zoomData.absoluteScaleChange : 1 / zoomDataScaleChange;
            var scalePrev = zoomData.absoluteScaleChange ? _this.totalTransformSnapshot.scale : _this.totalTransform.scale;
            _this.totalTransform.scale = _this.getScaleWithinLimits(relativeTransform.scale * scaleChange);
            scaleChange = _this.totalTransform.scale / scalePrev;
            if (transformBeforeScale) {
                _this.totalTransform.translateX = (relativeTransform.translateX - zoomData.x) / scalePrev * _this.totalTransform.scale + zoomData.x;
                _this.totalTransform.translateY = (relativeTransform.translateY - zoomData.y) / scalePrev * _this.totalTransform.scale + zoomData.y;
                if (zoomData.targetX && zoomData.targetY) {
                    _this.totalTransform.translateX += (zoomData.targetX - zoomData.x) / scalePrev * _this.totalTransform.scale;
                    _this.totalTransform.translateY += (zoomData.targetY - zoomData.y) / scalePrev * _this.totalTransform.scale;
                }
            }
            else {
                var posBefore = { x: zoomData.x, y: zoomData.y };
                var posAfter = { x: posBefore.x * scaleChange, y: posBefore.y * scaleChange };
                var relative = { x: posAfter.x - posBefore.x, y: posAfter.y - posBefore.y };
                _this.totalTransform.translateX = relativeTransform.translateX - relative.x / _this.totalTransform.scale;
                _this.totalTransform.translateY = relativeTransform.translateY - relative.y / _this.totalTransform.scale;
                if (zoomData.targetX && zoomData.targetY) {
                    _this.totalTransform.translateX += (zoomData.targetX - zoomData.x) / _this.totalTransform.scale;
                    _this.totalTransform.translateY += (zoomData.targetY - zoomData.y) / _this.totalTransform.scale;
                }
            }
            _this.ensureTransformWithinBounds(transformBeforeScale);
            onZoomed(zoomData, _this.totalTransform);
            onTransform(_this.totalTransform);
        });
    };
    EasyPZ.prototype.getScaleWithinLimits = function (scale) {
        if (!isNaN(this.options.minScale) && this.options.minScale !== null) {
            scale = scale > this.options.minScale ? scale : this.options.minScale;
        }
        if (!isNaN(this.options.maxScale) && this.options.maxScale !== null) {
            scale = scale < this.options.maxScale ? scale : this.options.maxScale;
        }
        return scale;
    };
    EasyPZ.prototype.ensureTransformWithinBounds = function (transformBeforeScale) {
        if (this.options.bounds) {
            var scale = transformBeforeScale ? this.totalTransform.scale - 1 : 1 - 1 / this.totalTransform.scale;
            var scaleTopLeft = -1 * Math.max(scale, 0);
            var scaleBotRight = -1 * Math.min(scale, 0);
            if (this.totalTransform.translateX < scaleTopLeft * this.width + this.options.bounds.left) {
                this.totalTransform.translateX = scaleTopLeft * this.width + this.options.bounds.left;
            }
            if (this.totalTransform.translateX > scaleBotRight * this.width + this.options.bounds.right) {
                this.totalTransform.translateX = scaleBotRight * this.width + this.options.bounds.right;
            }
            if (this.totalTransform.translateY < scaleTopLeft * this.height + this.options.bounds.top) {
                this.totalTransform.translateY = scaleTopLeft * this.height + this.options.bounds.top;
            }
            if (this.totalTransform.translateY > scaleBotRight * this.height + this.options.bounds.bottom) {
                this.totalTransform.translateY = scaleBotRight * this.height + this.options.bounds.bottom;
            }
        }
    };
    EasyPZ.prototype.applyTransformation = function () {
        if (this.applyTransformTo) {
            var els = this.el.querySelectorAll(this.applyTransformTo);
            for (var i = 0; i < els.length; i++) {
                var element = els[i];
                var transform = element.getAttribute('transform') || '';
                var transformData = EasyPZ.parseTransform(transform);
                var translateX = this.totalTransform.translateX;
                var translateY = this.totalTransform.translateY;
                var scaleX = this.totalTransform.scale;
                var scaleY = this.totalTransform.scale;
                if (transformData) {
                    var originalScaleX = transformData.scaleX / this.lastAppliedTransform.scale;
                    var originalScaleY = transformData.scaleY / this.lastAppliedTransform.scale;
                    var originalTranslate = { x: 0, y: 0 };
                    var translateBeforeScaleFactorX = transformData.translateBeforeScale ? 1 : originalScaleX;
                    var translateBeforeScaleFactorY = transformData.translateBeforeScale ? 1 : originalScaleY;
                    originalTranslate.x = (transformData.translateX - this.lastAppliedTransform.translateX / originalScaleX) * translateBeforeScaleFactorX;
                    originalTranslate.y = (transformData.translateY - this.lastAppliedTransform.translateY / originalScaleY) * translateBeforeScaleFactorY;
                    // console.log(originalTranslate.x, transformData.translateX , this.lastAppliedTransform.translateX, originalScale, this.lastAppliedTransform.scale, this.lastAppliedTransform.lastScale, transformData.translateBeforeScale);
                    scaleX *= originalScaleX;
                    scaleY *= originalScaleY;
                    translateX = translateX / originalScaleX + originalTranslate.x / originalScaleX;
                    translateY = translateY / originalScaleY + originalTranslate.y / originalScaleY;
                }
                else {
                    console.log('what is wrong', transform);
                }
                var transformString = '';
                if (transformData.rotate) {
                    transformString += 'rotate(' + transformData.rotate + ')';
                }
                if (transformData.skewX) {
                    transformString += 'skewX(' + transformData.skewX + ')';
                }
                if (transformData.skewY) {
                    transformString += 'skewY(' + transformData.skewY + ')';
                }
                transformString += 'scale(' + scaleX + ',' + scaleY + ')';
                transformString += 'translate(' + translateX + ',' + translateY + ')';
                element.setAttribute('transform', transformString);
            }
            this.lastAppliedTransform.translateX = this.totalTransform.translateX;
            this.lastAppliedTransform.translateY = this.totalTransform.translateY;
            this.lastAppliedTransform.scale = this.totalTransform.scale;
        }
    };
    EasyPZ.parseTransform = function (transform) {
        var transformObject = { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, translateBeforeScale: false,
            rotate: '', skewX: '', skewY: '' };
        if (transform) {
            transform = transform.replace(/(\r\n|\n|\r)/gm, '');
            var recognized = false;
            var translate = /\s*translate\(([-0-9.]+),\s*([-0-9.]+)\)/.exec(transform);
            if (translate) {
                transformObject.translateX = parseFloat(translate[1]);
                transformObject.translateY = parseFloat(translate[2]);
                recognized = true;
            }
            var scale = /\s*scale\(([-0-9.]+)(,\s*([-0-9.]+))?\)/.exec(transform);
            if (scale) {
                transformObject.scaleX = parseFloat(scale[1]);
                transformObject.scaleY = scale[3] ? parseFloat(scale[3]) : parseFloat(scale[1]);
                recognized = true;
            }
            var translateScale = /\s*translate\(([-0-9.]+),\s*([-0-9.]+)\)[ ]*scale\(([-0-9.]+(,\s*[-0-9.]+)?)\)/.exec(transform);
            if (translateScale) {
                transformObject.translateBeforeScale = true;
            }
            var rotate = /\s*rotate\(([-0-9., ]*)\)/.exec(transform);
            if (rotate) {
                transformObject.rotate = rotate[1];
                recognized = true;
            }
            var skewX = /\s*skewX\(([-0-9., ]*)\)/.exec(transform);
            if (skewX) {
                transformObject.skewX = skewX[1];
                recognized = true;
            }
            var skewY = /\s*skewY\(([-0-9., ]*)\)/.exec(transform);
            if (skewY) {
                transformObject.skewY = skewY[1];
                recognized = true;
            }
            if (!recognized) {
                console.error('No transformation recognized in: ', transform);
            }
        }
        return transformObject;
    };
    EasyPZ.prototype.ngAfterViewInit = function () {
        this.setDimensions();
    };
    EasyPZ.prototype.setDimensions = function () {
        var rect = this.el.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
    };
    EasyPZ.prototype.updateMousePosition = function (event) {
        var pos = this.getMousePosition(event);
        if (pos) {
            this.mousePos = pos;
        }
    };
    EasyPZ.prototype.getMousePosition = function (event) {
        var pos = { x: 0, y: 0 };
        //if(event instanceof MouseEvent && event.clientX)
        if (event.type.substr(0, 5) === 'mouse' && event['clientX']) {
            pos = { x: event['clientX'], y: event['clientY'] };
            this.numberOfPointers = 1;
        }
        //else if(event instanceof TouchEvent)
        else if (event.type.substr(0, 5) === 'touch') {
            var touches = event['touches'] ? event['touches'] : [];
            this.numberOfPointers = touches.length;
            if (touches.length < 1)
                return null;
            pos = { x: touches[0].clientX, y: touches[0].clientY };
        }
        return this.getRelativePosition(pos.x, pos.y);
    };
    EasyPZ.prototype.getRelativePosition = function (x, y) {
        var boundingRect = this.el.getBoundingClientRect();
        this.width = boundingRect.width;
        this.height = boundingRect.height;
        return { x: x - boundingRect.left, y: y - boundingRect.top };
    };
    EasyPZ.prototype.onMouseTouchDown = function (mouseEvent, touchEvent) {
        this.lastMouseDownTime = this.mouseDownTime;
        this.lastMousePos = { x: this.mousePos.x, y: this.mousePos.y };
        this.mouseDownTime = Date.now();
        var event = mouseEvent || touchEvent;
        if (!event) {
            return console.error('no event!');
        }
        this.updateMousePosition(event);
        var eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN;
        this.onMouseTouchEvent(eventType, event);
    };
    EasyPZ.prototype.setupHostListeners = function () {
        for (var _i = 0, _a = Object.entries(this.listeners); _i < _a.length; _i++) {
            var _b = _a[_i], listenerName = _b[0], listenerFct = _b[1];
            this.el.addEventListener(listenerName, listenerFct);
        }
    };
    EasyPZ.prototype.removeHostListeners = function () {
        for (var _i = 0, _a = Object.entries(this.listeners); _i < _a.length; _i++) {
            var _b = _a[_i], listenerName = _b[0], listenerFct = _b[1];
            this.el.removeEventListener(listenerName, listenerFct);
        }
    };
    EasyPZ.prototype.onMouseDown = function (event) {
        if (Date.now() - this.lastTouchEvent > EasyPZ.TOUCH_TO_COMPUTER_SWITCH_TIME_MS) {
            this.onMouseTouchDown(event);
        }
    };
    EasyPZ.prototype.onTouchStart = function (event) {
        this.lastTouchEvent = Date.now();
        var eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN;
        if (event.touches.length == 1) {
            this.onMouseTouchDown(null, event);
        }
        else if (event.touches.length == 2) {
            this.updateMousePosition(event);
            this.onMultiTouchEvent(eventType, event);
            event.preventDefault();
        }
    };
    EasyPZ.prototype.onMouseTouchMove = function (mouseEvent, touchEvent) {
        this.mouseMoveTime = Date.now();
        this.lastMousePos = { x: this.mousePos.x, y: this.mousePos.y };
        var event = mouseEvent || touchEvent;
        if (!event) {
            console.error('no event');
            return false;
        }
        this.updateMousePosition(event);
        var eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE;
        var eventWasUsed = this.onMouseTouchEvent(eventType, event);
        for (var _i = 0, _a = this.afterMouseMovedCallbacks; _i < _a.length; _i++) {
            var cb = _a[_i];
            cb();
        }
        return eventWasUsed;
    };
    EasyPZ.prototype.onMouseMove = function (event) {
        this.onMouseTouchMove(event);
    };
    EasyPZ.prototype.onTouchMove = function (event) {
        if (event.touches.length == 1) {
            var eventWasUsed = this.onMouseTouchMove(null, event);
            if (eventWasUsed) {
                event.preventDefault();
            }
        }
        else if (event.touches.length == 2) {
            this.updateMousePosition(event);
            var eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE;
            this.onMultiTouchEvent(eventType, event);
            event.preventDefault();
        }
    };
    EasyPZ.addMode = function (unresolvedMode) {
        EasyPZ.modes.push(unresolvedMode);
    };
    EasyPZ.prototype.getEventData = function (event, modeName) {
        return {
            event: event,
            modeName: modeName
        };
    };
    EasyPZ.prototype.getActiveModes = function () {
        var _this = this;
        var modes = [];
        this.modes.forEach(function (mode) {
            mode.ids.forEach(function (modeId) {
                if (_this.enabledModes.indexOf(modeId) !== -1) {
                    modes.push({ mode: mode, activeId: modeId });
                }
            });
        });
        return modes;
    };
    EasyPZ.prototype.onMultiTouchEvent = function (eventType, event) {
        var _this = this;
        this.getActiveModes().forEach(function (modeData) {
            if (eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE && modeData.mode.onMove)
                modeData.mode.onMove(_this.getEventData(event, modeData.activeId));
            else if (eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN && modeData.mode.onClickTouch)
                modeData.mode.onClickTouch(_this.getEventData(event, modeData.activeId));
            else if (eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP && modeData.mode.onClickTouchEnd)
                modeData.mode.onClickTouchEnd(_this.getEventData(event, modeData.activeId));
        });
    };
    EasyPZ.prototype.onMouseTouchUp = function (mouseEvent, touchEvent) {
        this.mouseUpTime = Date.now();
        this.lastMousePos = { x: this.mousePos.x, y: this.mousePos.y };
        var event = mouseEvent || touchEvent;
        if (!event) {
            return console.error('no event');
        }
        this.updateMousePosition(event);
        var eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP;
        this.onMouseTouchEvent(eventType, event);
    };
    EasyPZ.prototype.onMouseTouchEvent = function (eventType, event) {
        var _this = this;
        var eventWasUsed = false;
        if (EasyPZ.isRightClick(event)) {
            if (eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN) {
                //TODO should check if it uses the event.
                this.onRightClick(eventType, event);
            }
            return eventWasUsed;
        }
        this.getActiveModes().forEach(function (modeData) {
            if (eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE && modeData.mode.onMove)
                modeData.mode.onMove(_this.getEventData(event, modeData.activeId));
            else if (eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN && modeData.mode.onClickTouch)
                modeData.mode.onClickTouch(_this.getEventData(event, modeData.activeId));
            else if (eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP && modeData.mode.onClickTouchEnd)
                modeData.mode.onClickTouchEnd(_this.getEventData(event, modeData.activeId));
            eventWasUsed = true;
            /*if(modeData.mode.active)
            {
                eventWasUsed = true;
            }*/
        });
        return eventWasUsed;
    };
    EasyPZ.prototype.onMouseUp = function (event) {
        if (Date.now() - this.lastTouchEvent > EasyPZ.TOUCH_TO_COMPUTER_SWITCH_TIME_MS) {
            this.onMouseTouchUp(event);
        }
    };
    EasyPZ.prototype.onMouseOut = function (event) {
        // The problem with this is that it detects mouseout events of elements within this element,
        // not only of mouseout events of the main element itself. This is why a pointer position check is done
        // to see if the user has actually left the visualization.
        var pos = this.getMousePosition(event);
        if (pos && (pos.x < 0 || pos.x > this.width || pos.y < 0 || pos.y > this.height)) {
            this.onMouseTouchUp(event);
        }
    };
    EasyPZ.prototype.onTouchEnd = function (event) {
        // Touch End always has zero touch positions, so the pointer position can not be used here.
        this.lastTouchEvent = Date.now();
        var eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP;
        this.onMouseTouchUp(null, event);
        this.onMultiTouchEvent(eventType, event);
    };
    EasyPZ.prototype.onContextMenu = function () {
        /*if(this.modeOn(EasyPZ.MODES.DBLRIGHTCLICK_ZOOM_IN) || this.modeOn(EasyPZ.MODES.DBLRIGHTCLICK_ZOOM_OUT))
        {
            event.preventDefault();
            return false;
        }*/
    };
    EasyPZ.prototype.onWheel = function (event) {
        var _this = this;
        var captured = false;
        this.getActiveModes().forEach(function (modeData) {
            if (modeData.mode.onWheel) {
                modeData.mode.onWheel(_this.getEventData(event, modeData.activeId));
                captured = true;
            }
        });
        if (captured) {
            event.preventDefault();
        }
    };
    EasyPZ.prototype.onRightClick = function (eventType, event) {
        var _this = this;
        this.getActiveModes().forEach(function (modeData) {
            if (modeData.mode.onRightClick) {
                modeData.mode.onRightClick(_this.getEventData(event, modeData.activeId));
            }
        });
    };
    EasyPZ.prototype.applyModeSettings = function (modeSettings) {
        if (modeSettings === void 0) { modeSettings = {}; }
        var modeNames = Object.keys(modeSettings);
        if (modeNames && modeNames.length) {
            var _loop_1 = function (modeName) {
                var modes = this_1.modes.filter(function (m) { return m.ids.indexOf(modeName) !== -1; });
                if (modes.length !== 1) {
                    console.error('Trying to set a setting for an easypz mode that does not exist', modeName);
                }
                else {
                    var mode = modes[0];
                    var newSettings = modeSettings[modeName];
                    for (var settingName in newSettings) {
                        if (!mode.settings[settingName]) {
                            console.error('Trying to set a setting for the easypz mode ', modeName, ', but this setting does not exist: ', settingName);
                        }
                        else {
                            mode.settings[settingName] = newSettings[settingName];
                        }
                    }
                }
            };
            var this_1 = this;
            for (var _i = 0, modeNames_1 = modeNames; _i < modeNames_1.length; _i++) {
                var modeName = modeNames_1[_i];
                _loop_1(modeName);
            }
        }
    };
    EasyPZ.easeInteraction = function (maxSpeed, duration, onStep) {
        return EasyPZ.momentumInteraction(onStep, function (timePassed) {
            return maxSpeed - Math.pow((timePassed - duration / 2), 2) / (Math.pow(duration, 2) / (4 * maxSpeed));
        }, duration);
    };
    EasyPZ.frictionInteraction = function (maxSpeed, friction, onStep) {
        return EasyPZ.momentumInteraction(onStep, function (timePassed) {
            return Math.max(0, maxSpeed - friction * timePassed);
        }, maxSpeed / friction);
    };
    EasyPZ.momentumInteraction = function (onStep, speedFct, duration) {
        var startTime = Date.now();
        var lastMoveTime = Date.now();
        var continueInteraction = function () {
            var timePassed = Date.now() - startTime;
            var speed = speedFct(timePassed);
            if (timePassed < duration) {
                var timePassed_1 = Date.now() - lastMoveTime;
                var dist = timePassed_1 * speed;
                onStep({ speed: speed, timePassed: timePassed_1, dist: dist });
                lastMoveTime = Date.now();
                requestAnimationFrame(continueInteraction);
            }
        };
        return {
            start: function () {
                requestAnimationFrame(continueInteraction);
            },
            stop: function () {
                startTime = 0;
            }
        };
    };
    EasyPZ.momentumInteractionOld = function (onStep, speedFct, duration) {
        var startTime = Date.now();
        var lastMoveTime = Date.now();
        var continueInteraction = function () {
            var timePassed = Date.now() - startTime;
            var speed = speedFct(timePassed);
            if (timePassed < duration) {
                var dist = (Date.now() - lastMoveTime) * speed;
                onStep(dist);
                lastMoveTime = Date.now();
                requestAnimationFrame(continueInteraction);
            }
        };
        return {
            start: function () {
                requestAnimationFrame(continueInteraction);
            },
            stop: function () {
                startTime = 0;
            }
        };
    };
    /* Useful functions */
    EasyPZ.isRightClick = function (event) {
        return event instanceof MouseEvent
            && (!!event.clientX)
            && (("which" in event && event.which === 3)
                || ("button" in event && event.button === 2));
    };
    EasyPZ.getPositionDistance = function (pos1, pos2) {
        return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
    };
    EasyPZ.prototype.callbackAfterTimeoutOrMovement = function (timeout, movement) {
        var _this = this;
        return new EzPromise(function (resolve) {
            var resolved = false;
            var currentPos = { x: _this.mousePos.x, y: _this.mousePos.y };
            var index = _this.afterMouseMovedCallbacks.length;
            _this.afterMouseMovedCallbacks.push(function () {
                var dist = EasyPZ.getPositionDistance(currentPos, _this.mousePos);
                if (dist > movement && !resolved) {
                    //console.log('resolved after ', dist , ' px');
                    _this.afterMouseMovedCallbacks.splice(index, 1);
                    resolved = true;
                    resolve(dist);
                }
            });
            setTimeout(function () {
                if (!resolved) {
                    var dist = EasyPZ.getPositionDistance(currentPos, _this.mousePos);
                    //console.log('resolved after ', timeout , ' ms');
                    _this.afterMouseMovedCallbacks.splice(index, 1);
                    resolved = true;
                    resolve(dist);
                }
            }, timeout);
        });
    };
    EasyPZ.MOUSE_EVENT_TYPES = { 'MOUSE_DOWN': 0, 'MOUSE_MOVE': 1, 'MOUSE_UP': 2 };
    EasyPZ.TOUCH_TO_COMPUTER_SWITCH_TIME_MS = 500;
    EasyPZ.DIMENSIONS = ['x', 'y'];
    EasyPZ.modes = [];
    return EasyPZ;
}());
/* Simple Pan*/
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['SIMPLE_PAN'],
        settings: { minDistance: 3, delay: 300 },
        active: false,
        data: { lastPosition: { x: 0, y: 0 } },
        onClickTouch: function () {
            mode.active = false;
            mode.data.lastPosition = { x: easypz.mousePos.x, y: easypz.mousePos.y };
            easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.minDistance).then(function (dist) {
                mode.active = easypz.mouseUpTime < easypz.mouseDownTime && dist >= mode.settings.minDistance;
            });
        },
        onMove: function () {
            if (mode.active) {
                var relativeX = easypz.mousePos.x - mode.data.lastPosition.x;
                var relativeY = easypz.mousePos.y - mode.data.lastPosition.y;
                easypz.onPanned.emit({ x: relativeX, y: relativeY });
                mode.data.lastPosition = { x: easypz.mousePos.x, y: easypz.mousePos.y };
            }
        },
        onClickTouchEnd: function () {
            mode.active = false;
        }
    };
    return mode;
});
/* Flick Pan */
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['FLICK_PAN'],
        settings: { minDistance: 3, delay: 300, friction: 0.005 },
        active: false,
        data: {
            continueTime: 0,
            positions: [],
            momentum: null
        },
        onClickTouch: function () {
            mode.active = false;
            mode.data.positions = [{ x: easypz.mousePos.x, y: easypz.mousePos.y, time: Date.now() }];
            if (mode.data.momentum) {
                mode.data.momentum.stop();
            }
            easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.minDistance).then(function (dist) {
                mode.active = easypz.mouseUpTime < easypz.mouseDownTime && dist >= mode.settings.minDistance;
            });
        },
        onMove: function () {
            if (mode.active) {
                var relativeX = easypz.mousePos.x - easypz.lastMousePos.x;
                var relativeY = easypz.mousePos.y - easypz.lastMousePos.y;
                easypz.onPanned.emit({ x: relativeX, y: relativeY });
                mode.data.positions.push({ x: easypz.mousePos.x, y: easypz.mousePos.y, time: Date.now() });
            }
        },
        onClickTouchEnd: function () {
            if (mode.active) {
                mode.active = false;
                var referencePoints = mode.data.positions.filter(function (flickPos) {
                    return flickPos.time >= Date.now() - 100 && flickPos.time <= Date.now() - 50;
                });
                if (referencePoints.length == 0)
                    return;
                var refPoint = referencePoints[0];
                var dist = EasyPZ.getPositionDistance({ x: refPoint.x, y: refPoint.y }, easypz.mousePos);
                var flickDirection_1 = { x: (easypz.mousePos.x - refPoint.x) / dist, y: (easypz.mousePos.y - refPoint.y) / dist };
                var time = Date.now() - refPoint.time;
                var speed = dist / time;
                mode.data.momentum = EasyPZ.frictionInteraction(speed, mode.settings.friction, function (_a) {
                    var dist = _a.dist;
                    var relativeMove = { x: flickDirection_1.x * dist, y: flickDirection_1.y * dist };
                    easypz.onPanned.emit(relativeMove);
                });
                mode.data.momentum.start();
            }
        }
    };
    return mode;
});
/* Hold Zoom */
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['HOLD_ZOOM_IN', 'HOLD_ZOOM_OUT', 'CLICK_HOLD_ZOOM_IN', 'CLICK_HOLD_ZOOM_OUT'],
        settings: { maxDistance: 3, delay: 350, zoomInScaleChangePerMs: -0.0015,
            zoomOutScaleChangePerMs: 0.003, doubleClickTimeout: 300 },
        active: false,
        data: { zoomingOut: false, zoomPos: { x: 0, y: 0 } },
        onClickTouch: function (eventData) {
            var holdZoomLastChange;
            var recursiveZoom = function () {
                if (mode.active) {
                    var timePassed = Date.now() - holdZoomLastChange;
                    var scaleChangePerMs = mode.data.zoomingOut ? mode.settings.zoomOutScaleChangePerMs : mode.settings.zoomInScaleChangePerMs;
                    var scale = 1 + scaleChangePerMs * timePassed;
                    easypz.onZoomed.emit({ x: mode.data.zoomPos.x, y: mode.data.zoomPos.y, scaleChange: scale });
                    holdZoomLastChange = Date.now();
                    requestAnimationFrame(recursiveZoom);
                }
            };
            // If the pointer is moved within the first 300ms, it is not considered zooming.
            easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.maxDistance).then(function (dist) {
                mode.active = easypz.mouseUpTime < easypz.mouseDownTime && dist <= mode.settings.maxDistance;
                if (mode.active) {
                    holdZoomLastChange = Date.now();
                    var hasClickedFirst = easypz.mouseDownTime - easypz.lastMouseDownTime < mode.settings.doubleClickTimeout;
                    mode.data.zoomPos = { x: easypz.mousePos.x, y: easypz.mousePos.y };
                    // start zooming
                    var clickFirst = eventData.modeName === 'CLICK_HOLD_ZOOM_IN' ||
                        eventData.modeName === 'CLICK_HOLD_ZOOM_OUT';
                    if (hasClickedFirst == clickFirst) {
                        mode.data.zoomingOut = eventData.modeName === 'HOLD_ZOOM_OUT' ||
                            eventData.modeName === 'CLICK_HOLD_ZOOM_OUT';
                        recursiveZoom();
                    }
                }
            });
        },
        onMove: function () {
            if (mode.active) {
                mode.data.zoomPos = { x: easypz.mousePos.x, y: easypz.mousePos.y };
            }
        },
        onClickTouchEnd: function () {
            mode.active = false;
        }
    };
    return mode;
});
/* Double Click Zoom */
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['DBLCLICK_ZOOM_IN', 'DBLCLICK_ZOOM_OUT', 'DBLRIGHTCLICK_ZOOM_IN', 'DBLRIGHTCLICK_ZOOM_OUT'],
        settings: { dblClickTime: 300,
            zoomInScaleChange: 0.33,
            zoomOutScaleChange: 3,
            maxHoldTime: 200
        },
        onClickTouchEnd: function (eventData) {
            var isDblClick = easypz.mouseDownTime - easypz.lastMouseDownTime < mode.settings.dblClickTime;
            var isHold = easypz.mouseUpTime - easypz.mouseDownTime > mode.settings.maxHoldTime;
            var isNotRightClick = eventData.modeName.substr(0, 'DBLCLICK'.length) === 'DBLCLICK';
            if (isDblClick && !isHold && isNotRightClick) {
                var zoomingOut = eventData.modeName === 'DBLCLICK_ZOOM_OUT';
                var scaleChange = zoomingOut ? mode.settings.zoomOutScaleChange : mode.settings.zoomInScaleChange;
                easypz.onZoomed.emit({ x: easypz.mousePos.x, y: easypz.mousePos.y, scaleChange: scaleChange });
            }
        },
        onRightClick: function (eventData) {
            var isDblClick = easypz.mouseDownTime - easypz.lastMouseDownTime < mode.settings.dblClickTime;
            var isHold = easypz.mouseUpTime - easypz.mouseDownTime > mode.settings.maxHoldTime;
            var isRightClick = eventData.modeName.substr(0, 'DBLRIGHTCLICK'.length) === 'DBLRIGHTCLICK';
            if (isDblClick && !isHold && isRightClick) {
                var zoomingOut = eventData.modeName === 'DBLRIGHTCLICK_ZOOM_OUT';
                var scaleChange = zoomingOut ? mode.settings.zoomOutScaleChange : mode.settings.zoomInScaleChange;
                easypz.onZoomed.emit({ x: easypz.mousePos.x, y: easypz.mousePos.y, scaleChange: scaleChange });
            }
        }
    };
    return mode;
});
/* Wheel Zoom */
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['WHEEL_ZOOM', 'WHEEL_ZOOM_MOMENTUM', 'WHEEL_ZOOM_EASE'],
        settings: {
            zoomInScaleChange: 0.8,
            zoomOutScaleChange: 1.2,
            momentumSpeedPercentage: 0.01,
            momentumFriction: 0.000004,
            easeDuration: 300
        },
        onWheel: function (eventData) {
            var delta = eventData.event.wheelDelta ? eventData.event.wheelDelta : -1 * eventData.event.deltaY;
            var change = delta / Math.abs(delta);
            var zoomingIn = change > 0;
            var scale = zoomingIn ? mode.settings.zoomInScaleChange : mode.settings.zoomOutScaleChange;
            var relativeScale = 1 - scale;
            var absScale = Math.abs(relativeScale) * mode.settings.momentumSpeedPercentage;
            var scaleSign = sign(relativeScale);
            if (eventData.modeName === 'WHEEL_ZOOM_EASE') {
                _this.zoomMomentum = EasyPZ.easeInteraction(absScale, mode.settings.easeDuration, function (_a) {
                    var dist = _a.dist;
                    var newScale = 1 - scaleSign * dist;
                    easypz.onZoomed.emit({ x: easypz.mousePos.x, y: easypz.mousePos.y, scaleChange: newScale });
                });
                _this.zoomMomentum.start();
            }
            else {
                easypz.onZoomed.emit({ x: easypz.mousePos.x, y: easypz.mousePos.y, scaleChange: scale });
                if (eventData.modeName === 'WHEEL_ZOOM_MOMENTUM') {
                    _this.flickMomentum = EasyPZ.frictionInteraction(absScale, mode.settings.momentumFriction, function (_a) {
                        var dist = _a.dist;
                        var newScale = 1 - scaleSign * dist;
                        easypz.onZoomed.emit({ x: easypz.mousePos.x, y: easypz.mousePos.y, scaleChange: newScale });
                    });
                    _this.flickMomentum.start();
                }
            }
        }
    };
    return mode;
});
/* Pinch Zoom and Pan */
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['PINCH_ZOOM', 'PINCH_ZOOM_QUADRATIC', 'PINCH_ZOOM_POWER_FOUR', 'PINCH_ZOOM_MOMENTUM', 'PINCH_PAN'],
        settings: {
            friction: 0.00001
        },
        data: {
            momentum: null,
            posStart1: null,
            posStart2: null,
            references: [],
            zoomPos: { x: 0, y: 0 },
            zoomCenterPos: { x: 0, y: 0 }
        },
        onClickTouch: function (eventData) {
            if (mode.data.momentum) {
                mode.data.momentum.stop();
            }
            mode.data.references = [];
            if (eventData.event.touches && eventData.event.touches.length > 1) {
                mode.data.posStart1 = easypz.getRelativePosition(eventData.event.touches[0].clientX, eventData.event.touches[0].clientY);
                mode.data.posStart2 = easypz.getRelativePosition(eventData.event.touches[1].clientX, eventData.event.touches[1].clientY);
                easypz.resetAbsoluteScale.emit(null);
            }
        },
        onMove: function (eventData) {
            if (mode.data.posStart1 && mode.data.posStart2) {
                var pos1 = easypz.getRelativePosition(eventData.event.touches[0].clientX, eventData.event.touches[0].clientY);
                var pos2 = easypz.getRelativePosition(eventData.event.touches[1].clientX, eventData.event.touches[1].clientY);
                var distBefore = EasyPZ.getPositionDistance(mode.data.posStart1, mode.data.posStart2);
                var distNow = EasyPZ.getPositionDistance(pos1, pos2);
                var ratio = distBefore / distNow;
                var power = 1;
                if (eventData.modeName === 'PINCH_ZOOM_QUADRATIC')
                    power = 2;
                if (eventData.modeName === 'PINCH_ZOOM_POWER_FOUR')
                    power = 4;
                if (eventData.modeName === 'PINCH_PAN')
                    power = 0;
                var scale = Math.pow(ratio, power);
                mode.data.references.push({ time: Date.now(), scale: scale });
                mode.data.zoomPos = { x: (mode.data.posStart1.x + mode.data.posStart2.x) / 2, y: (mode.data.posStart1.y + mode.data.posStart2.y) / 2 };
                mode.data.zoomCenterPos = { x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2 };
                easypz.onZoomed.emit({ x: mode.data.zoomPos.x, y: mode.data.zoomPos.y, absoluteScaleChange: scale, targetX: mode.data.zoomCenterPos.x, targetY: mode.data.zoomCenterPos.y });
            }
        },
        onClickTouchEnd: function (eventData) {
            var _this = this;
            mode.data.posStart1 = null;
            mode.data.posStart1 = null;
            if (eventData.modeName === 'PINCH_ZOOM_MOMENTUM' && mode.data.references.length > 5) {
                var refLast = mode.data.references[mode.data.references.length - 1];
                var ref = mode.data.references[mode.data.references.length - 4];
                var refTimeDiff = refLast.time - ref.time;
                var refScaleDiff = refLast.scale - ref.scale;
                var lastScale_1 = refLast.scale;
                var scaleChangeSpeed = refScaleDiff / refTimeDiff;
                var absScaleChangeSpeed = Math.abs(scaleChangeSpeed);
                var scaleSign_1 = sign(scaleChangeSpeed);
                mode.data.momentum = EasyPZ.frictionInteraction(absScaleChangeSpeed, mode.settings.friction, function (_a) {
                    var dist = _a.dist;
                    var newScale = lastScale_1 + scaleSign_1 * dist;
                    easypz.onZoomed.emit({ x: _this.pinchZoomPos.x, y: _this.pinchZoomPos.y, absoluteScaleChange: newScale, targetX: _this.pinchZoomCenterPos.x, targetY: _this.pinchZoomCenterPos.y });
                    lastScale_1 = newScale;
                });
                mode.data.momentum.start();
            }
        }
    };
    return mode;
});
/* Wheel Pan */
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['WHEEL_PAN_X', 'WHEEL_PAN_Y'],
        settings: {
            speed: 50
        },
        onWheel: function (eventData) {
            var delta = eventData.event.wheelDelta ? eventData.event.wheelDelta : -1 * eventData.event.deltaY;
            var change = delta / Math.abs(delta);
            var zoomingIn = change > 0;
            var sign = zoomingIn ? 1 : -1;
            var panned = { x: 0, y: 0 };
            var direction = eventData.modeName === 'WHEEL_PAN_X' ? 'x' : 'y';
            panned[direction] = mode.settings.speed * sign;
            easypz.onPanned.emit(panned);
        }
    };
    return mode;
});
/* Brush Zoom */
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['BRUSH_ZOOM', 'BRUSH_ZOOM_X', 'BRUSH_ZOOM_Y'],
        settings: {
            minDistance: 3,
            delay: 300,
            minTime: 150
        },
        active: false,
        data: {
            startPos: { x: 0, y: 0 },
            el: null
        },
        onClickTouch: function () {
            if (easypz.numberOfPointers !== 1) {
                mode.active = false;
                if (mode.data.el) {
                    mode.data.el.style.display = 'none';
                }
            }
            else {
                mode.active = true;
                if (!mode.data.el) {
                    mode.data.el = document.createElement('div');
                    mode.data.el.style.border = '1px solid #c00';
                    mode.data.el.style.background = 'rgba(200,50,50,0.3)';
                    mode.data.el.style.position = 'absolute';
                    document.body.appendChild(mode.data.el);
                }
                //this.brushZoomDirection = direction;
                mode.data.startPos = { x: easypz.mousePos.x, y: easypz.mousePos.y };
                easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.minDistance).then(function (dist) {
                    mode.active = easypz.numberOfPointers == 1 && dist > mode.settings.minDistance;
                    if (!mode.active && mode.data.el)
                        mode.data.el.style.display = 'none';
                });
                setTimeout(function () {
                    if (easypz.numberOfPointers !== 1) {
                        mode.active = false;
                        if (mode.data.el)
                            mode.data.el.style.display = 'none';
                    }
                }, mode.settings.delay);
            }
        },
        onMove: function (eventData) {
            if (easypz.numberOfPointers !== 1) {
                mode.active = false;
                if (mode.data.el)
                    mode.data.el.style.display = 'none';
            }
            if (mode.active) {
                var left = easypz.mousePos.x < mode.data.startPos.x ? easypz.mousePos.x : mode.data.startPos.x;
                var width = Math.abs(mode.data.startPos.x - easypz.mousePos.x);
                var top_1 = easypz.mousePos.y < mode.data.startPos.y ? easypz.mousePos.y : mode.data.startPos.y;
                var height = Math.abs(mode.data.startPos.y - easypz.mousePos.y);
                if (eventData.modeName === 'BRUSH_ZOOM_X') {
                    top_1 = easypz.el.getBoundingClientRect().top;
                    height = easypz.height;
                }
                else if (eventData.modeName === 'BRUSH_ZOOM_Y') {
                    left = easypz.el.getBoundingClientRect().left;
                    width = easypz.width;
                }
                mode.data.el.style.display = 'block';
                mode.data.el.style.left = left + 'px';
                mode.data.el.style.top = top_1 + 'px';
                mode.data.el.style.width = width + 'px';
                mode.data.el.style.height = height + 'px';
            }
        },
        onClickTouchEnd: function (eventData) {
            if (mode.active) {
                mode.active = false;
                mode.data.el.style.display = 'none';
                if (Date.now() - easypz.mouseDownTime > mode.settings.minTime) {
                    var middle = { x: mode.data.startPos.x + (easypz.mousePos.x - mode.data.startPos.x) / 2, y: mode.data.startPos.y + (easypz.mousePos.y - mode.data.startPos.y) / 2 };
                    var dist = {
                        x: Math.abs(easypz.mousePos.x - mode.data.startPos.x),
                        y: Math.abs(easypz.mousePos.y - mode.data.startPos.y)
                    };
                    var scaleChange = void 0;
                    if (eventData.modeName === 'BRUSH_ZOOM') {
                        scaleChange = Math.max(dist.x / easypz.width, dist.y / easypz.height) * 1.3;
                    }
                    else if (eventData.modeName === 'BRUSH_ZOOM_X') {
                        scaleChange = dist.x / easypz.width * 1.3;
                    }
                    else if (eventData.modeName === 'BRUSH_ZOOM_Y') {
                        scaleChange = dist.y / easypz.height * 1.3;
                    }
                    //this.onZoomed.emit({x: middle.x, y: middle.y, scaleChange: scaleChange });
                    easypz.onZoomed.emit({ x: middle.x, y: middle.y, scaleChange: scaleChange, targetX: _this.width / 2, targetY: _this.height / 2 });
                }
            }
        }
    };
    return mode;
});
/* Dynamic / RubPointing Zoom */
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['DYNAMIC_ZOOM_X_STATIC', 'DYNAMIC_ZOOM_X_ORIGINAL_PAN', 'DYNAMIC_ZOOM_X_NORMAL_PAN', 'DYNAMIC_ZOOM_X_ADJUSTABLE', 'DYNAMIC_ZOOM_Y_STATIC', 'DYNAMIC_ZOOM_Y_ORIGINAL_PAN', 'DYNAMIC_ZOOM_Y_NORMAL_PAN', 'DYNAMIC_ZOOM_Y_ADJUSTABLE'],
        settings: {
            speed: 0.05,
            minDistance: 3,
            delay: 300,
            minDirectionPercentage: 0.7
        },
        active: false,
        data: {
            startPos: { x: 0, y: 0 },
            relativePos: { x: 0, y: 0 },
            direction: 'x'
        },
        onClickTouch: function (eventData) {
            mode.data.direction = eventData.modeName.substr('DYNAMIC_ZOOM_'.length, 1).toLowerCase();
            var direction = mode.data.direction;
            mode.data.startPos = { x: easypz.mousePos.x, y: easypz.mousePos.y };
            mode.data.relativePos = { x: 0, y: 0 };
            easypz.resetAbsoluteScale.emit(null);
            easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.minDistance).then(function (dist) {
                var distInDirection = Math.abs(mode.data.startPos[direction] - easypz.mousePos[direction]);
                if (easypz.numberOfPointers > 1 || dist < mode.settings.minDistance || distInDirection / dist < mode.settings.minDirectionPercentage) {
                    mode.active = false;
                }
                else if (_this.mouseDownTime > _this.mouseUpTime) {
                    mode.active = true;
                }
            });
        },
        onMove: function (eventData) {
            if (mode.active) {
                var relativeMove_1 = { x: 0, y: 0 };
                var direction = mode.data.direction;
                EasyPZ.DIMENSIONS.forEach(function (dimension) {
                    relativeMove_1[dimension] = easypz.mousePos[dimension] - easypz.lastMousePos[dimension];
                });
                var dist = easypz.mousePos[direction] - mode.data.startPos[direction];
                if (!dist)
                    return;
                var scale_1 = Math.exp(-1 * mode.settings.speed * dist);
                EasyPZ.DIMENSIONS.forEach(function (dimension) {
                    mode.data.relativePos[dimension] += relativeMove_1[dimension] * scale_1;
                });
                var actualZoomPosition = void 0;
                var targetX = null;
                var targetY = null;
                var dynamicZoomPosition = void 0;
                if (eventData.modeName === 'DYNAMIC_ZOOM_X_ADJUSTABLE'
                    || eventData.modeName === 'DYNAMIC_ZOOM_Y_ADJUSTABLE') {
                    actualZoomPosition = { x: mode.data.startPos.x + mode.data.relativePos.x, y: mode.data.startPos.y + mode.data.relativePos.y };
                    targetX = easypz.mousePos.x;
                    targetY = easypz.mousePos.y;
                    dynamicZoomPosition = { x: easypz.mousePos.x, y: easypz.mousePos.y };
                }
                else if (eventData.modeName === 'DYNAMIC_ZOOM_X_STATIC'
                    || eventData.modeName === 'DYNAMIC_ZOOM_Y_STATIC') {
                    dynamicZoomPosition = { x: mode.data.startPos.x, y: mode.data.startPos.y };
                }
                else if (eventData.modeName === 'DYNAMIC_ZOOM_X_NORMAL_PAN'
                    || eventData.modeName === 'DYNAMIC_ZOOM_Y_NORMAL_PAN') {
                    dynamicZoomPosition = { x: mode.data.startPos.x - mode.data.relativePos.x, y: mode.data.startPos.y - mode.data.relativePos.y };
                }
                else if (eventData.modeName === 'DYNAMIC_ZOOM_X_ORIGINAL_PAN'
                    || eventData.modeName === 'DYNAMIC_ZOOM_Y_ORIGINAL_PAN') {
                    dynamicZoomPosition = { x: easypz.mousePos.x, y: easypz.mousePos.y };
                }
                var zoomPos = actualZoomPosition ? actualZoomPosition : dynamicZoomPosition;
                easypz.onZoomed.emit({ x: zoomPos.x, y: zoomPos.y, absoluteScaleChange: scale_1, targetX: targetX, targetY: targetY });
            }
        },
        onClickTouchEnd: function () {
            mode.active = false;
        }
    };
    return mode;
});
/* Rub Zoom */
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['RUB_ZOOM_IN_X', 'RUB_ZOOM_IN_Y', 'RUB_ZOOM_OUT_X', 'RUB_ZOOM_OUT_Y'],
        settings: {
            speed: 0.02,
            minDistance: 15,
            minDistanceAfterDirectionChange: 10
        },
        active: false,
        data: {
            direction: 'x',
            hasChangedDirection: false,
            hasChangedDirectionSign: 0,
            hasChangedDirectionDirection: 'x',
            zoomPosition: null,
            zoomReference: null
        },
        onClickTouch: function () {
            mode.active = false;
            mode.data.zoomPosition = { x: easypz.mousePos.x, y: easypz.mousePos.y };
            mode.data.zoomReference = { x: easypz.mousePos.x, y: easypz.mousePos.y };
        },
        onMove: function (eventData) {
            if (mode.data.zoomReference) {
                var direction = eventData.modeName.substr(eventData.modeName.length - 1).toLowerCase();
                var distance = Math.abs(mode.data.zoomReference[direction] - easypz.mousePos[direction]);
                var signBefore = sign(easypz.lastMousePos[direction] - mode.data.zoomReference[direction]);
                var signNow = sign(easypz.mousePos[direction] - easypz.lastMousePos[direction]);
                if (signBefore != 0 && signNow != 0 && signBefore != signNow && distance > mode.settings.minDistance) {
                    mode.data.zoomReference = { x: easypz.mousePos.x, y: easypz.mousePos.y };
                    distance = 0;
                    mode.data.hasChangedDirection = true;
                    mode.data.hasChangedDirectionSign = signNow;
                    mode.data.hasChangedDirectionDirection = direction;
                }
                if (!mode.active && mode.data.hasChangedDirection && direction == mode.data.hasChangedDirectionDirection && signNow != mode.data.hasChangedDirectionSign) {
                    mode.data.hasChangedDirection = false;
                }
                if (mode.data.hasChangedDirection && distance > mode.settings.minDistanceAfterDirectionChange) {
                    mode.active = true;
                }
                var distanceSinceLast = Math.abs(easypz.mousePos[direction] - easypz.lastMousePos[direction]);
                if (mode.active && distanceSinceLast) {
                    var directionValue = eventData.modeName.substr(0, 'RUB_ZOOM_IN'.length) === 'RUB_ZOOM_IN' ? 1 : -1;
                    var zoomPos = { x: (easypz.mousePos.x + mode.data.zoomReference.x) / 2, y: (easypz.mousePos.y + mode.data.zoomReference.y) / 2 };
                    var scaleChange = 1 - mode.settings.speed * distanceSinceLast * directionValue;
                    easypz.onZoomed.emit({ x: zoomPos.x, y: zoomPos.y, scaleChange: scaleChange });
                }
            }
        },
        onClickTouchEnd: function () {
            mode.active = false;
            mode.data.zoomPosition = null;
            mode.data.zoomReference = null;
            mode.data.hasChangedDirection = false;
        }
    };
    return mode;
});
EasyPZ.addMode(function (easypz) {
    var mode = {
        ids: ['SHIFT_DRAG_ZOOM'],
        settings: { speed: 0.05 },
        active: false,
        data: { zoomPos: { x: 0, y: 0 }, currY: 0 },
        onClickTouch: function (e) {
            if (e.event.shiftKey) {
                mode.active = true;
                mode.data.zoomPos.x = easypz.mousePos.x;
                mode.data.zoomPos.y = easypz.mousePos.y;
                mode.data.currY = easypz.mousePos.y;
            }
        },
        onMove: function () {
            if (mode.active) {
                var deltaY = easypz.mousePos.y - mode.data.currY;
                mode.data.currY = easypz.mousePos.y;
                easypz.onZoomed.emit({
                    x: mode.data.zoomPos.x,
                    y: mode.data.zoomPos.y,
                    scaleChange: 1 - mode.settings.speed * deltaY
                });
            }
        },
        onClickTouchEnd: function () {
            mode.active = false;
        }
    };
    return mode;
});
var easyPZLoader = new EasyPZLoader();
easyPZLoader.checkElements();
window.addEventListener('load', function () { easyPZLoader.checkElements(); });
window.setInterval(function () { easyPZLoader.checkElements(); }, 500);
//# sourceMappingURL=easypz.js.map