function sign(number: number)
{
    if(number < 0)
        return -1;
    if(number > 0)
        return 1;
    return 0;
}

class EasyPZLoader
{
    static DEFAULT_MODES = ["SIMPLE_PAN", "HOLD_ZOOM_IN", "CLICK_HOLD_ZOOM_OUT", "WHEEL_ZOOM", "PINCH_ZOOM", "DBLCLICK_ZOOM_IN", "DBLRIGHTCLICK_ZOOM_OUT"];
    private easyPzElements = [];
    
    private static getSettingsFromString(settingsString) : { onPanned: () => void, onZoomed: () => void, onTransformed: () => void, onResetAbsoluteScale: () => void, modes: string[], applyTransformTo: string, replaceVariables: boolean }
    {
        let settings = {
            onPanned: typeof window['onPanned'] === 'function' ? window['onPanned'] : () => {},
            onZoomed: typeof window['onZoomed'] === 'function' ? window['onZoomed'] : () => {},
            onTransformed: typeof window['onTransformed'] === 'function' ? window['onTransformed'] : () => {},
            onResetAbsoluteScale: () => {},
            modes: EasyPZLoader.DEFAULT_MODES,
            applyTransformTo: '',
            replaceVariables: false
        };
        
        let settingsObj = {};
        try
        {
            if(settingsString.length)
            {
                settingsObj = JSON.parse(settingsString);
            }
        }
        catch(e)
        {
            console.error('Could not parse EasyPZ settings: "' + settingsString + '"');
            console.log(e);
        }
        
        const possibleOverrides = ['modes', 'onPanned', 'onZoomed', 'onTransformed', 'onResetAbsoluteScale', 'applyTransformTo'];
        
        for(let possibleOverride of possibleOverrides)
        {
            if(settingsObj[possibleOverride])
            {
                settings[possibleOverride] = settingsObj[possibleOverride];
                
                if(possibleOverride.substr(0,2) === 'on')
                {
                    settings[possibleOverride] = window[settings[possibleOverride]];
                }
            }
        }
        if(settingsObj['replaceVariables'])
            settings['replaceVariables'] = !!settingsObj['replaceVariables'];
        
        return settings;
    }
    
    public checkElements()
    {
        let els = <NodeListOf<HTMLElement>> document.querySelectorAll('[easypz]');
        
        for(let i = 0; i < els.length; i++)
        {
            let el = els[i];
            let settingsString = el.getAttribute('easypz');
            
            if(this.easyPzElements.indexOf(el) !== -1)
            {
                continue;
            }
            this.easyPzElements.push(el);
            console.log('adding EasyPZ');
            
            let modes = [];
            let onPanned = function() {};
            let onZoomed = function() {};
            let onTransformed = function() {};
            let onResetAbsoluteScale = function() {};
            let applyTransformTo = '';
            let replaceVariables = false;
            
            try {
                let settingsObj = EasyPZLoader.getSettingsFromString(settingsString);
                modes = settingsObj.modes;
                
                onPanned = settingsObj.onPanned;
                onZoomed = settingsObj.onZoomed;
                onTransformed = settingsObj.onTransformed;
                onResetAbsoluteScale = settingsObj.onResetAbsoluteScale;
                applyTransformTo = settingsObj.applyTransformTo;
                replaceVariables = settingsObj.replaceVariables;
            }
            catch(e)
            {
                console.error(e);
            }
            new EasyPZ(el, onTransformed, modes, onPanned, onZoomed, onResetAbsoluteScale, applyTransformTo, replaceVariables);
        }
    }
}

const easyPZLoader = new EasyPZLoader();
window.addEventListener('load', function() { easyPZLoader.checkElements(); });
window.setInterval(function() { easyPZLoader.checkElements(); }, 2000);

class EzEventEmitter<T>
{
    subscribers : ((value: T) => void)[] = [];
    public emit(value?: T)
    {
        this.subscribers.forEach(subscriber =>
        {
            subscriber(value);
        });
    }
    public subscribe(subscriber: (value: T) => void)
    {
        this.subscribers.push(subscriber);
    }
}

class EzPromise<T>
{
    private onDone: (T) => void;
    
    public then(callback: (T) => void)
    {
        this.onDone = callback;
    }
    
    private resolve(data: T)
    {
        if(this.onDone)
        {
            this.onDone(data);
        }
    }
    
    constructor(mainPart: (resolve: (T) => void, reject) => void)
    {
        mainPart((data: T) => { this.resolve(data);} , (data: T) => { this.resolve(data);});
    }
}

class EasyPzZoomData
{
    x: number;
    y: number;
    scaleChange?: number;
    absoluteScaleChange?: number;
    targetX?: number;
    targetY?: number;
}

class EasyPzPanData
{
    x: number;
    y: number;
}

class EasyPZ
{
    public static MODES = {'HOLD_ZOOM_IN': 0, 'HOLD_ZOOM_OUT': 1, 'CLICK_HOLD_ZOOM_IN': 2, 'CLICK_HOLD_ZOOM_OUT': 3, 'SIMPLE_PAN': 4, 'DBLCLICK_ZOOM_IN': 5, 'DBLCLICK_ZOOM_OUT': 6, 'DBLRIGHTCLICK_ZOOM_IN': 7, 'DBLRIGHTCLICK_ZOOM_OUT': 8, 'WHEEL_ZOOM': 9, 'WHEEL_PAN_X': 10, 'WHEEL_PAN_Y': 11, 'BRUSH_ZOOM_X': 12, 'BRUSH_ZOOM_Y': 13, 'BRUSH_ZOOM_2D': 14, 'DYNAMIC_ZOOM_X_STATIC': 15, 'DYNAMIC_ZOOM_X_ORIGINAL_PAN': 16, 'DYNAMIC_ZOOM_X_NORMAL_PAN': 17, 'DYNAMIC_ZOOM_X_ADJUSTABLE': 18, 'DYNAMIC_ZOOM_Y_STATIC': 19, 'DYNAMIC_ZOOM_Y_ORIGINAL_PAN': 20, 'DYNAMIC_ZOOM_Y_NORMAL_PAN': 21, 'DYNAMIC_ZOOM_Y_ADJUSTABLE': 22, 'PINCH_ZOOM': 23, 'PINCH_ZOOM_QUADRATIC': 24, 'PINCH_ZOOM_POWER_FOUR': 25, 'FLICK_PAN': 26, 'RUB_ZOOM_IN_X': 27, 'RUB_ZOOM_IN_Y': 28, 'RUB_ZOOM_OUT_X': 29, 'RUB_ZOOM_OUT_Y': 30, 'PINCH_PAN': 31, 'WHEEL_ZOOM_MOMENTUM': 32, 'PINCH_ZOOM_MOMENTUM': 33 };
    private static MOUSE_EVENT_TYPES = {'MOUSE_DOWN': 0, 'MOUSE_MOVE': 1, 'MOUSE_UP': 2};
    
    private lastMouseDownTime = 0;
    private mouseDownTime = 0;
    private mouseMoveTime = 0;
    private mouseUpTime = 0;
    private lastMousePos = {x: 0, y: 0};
    private numberOfPointers = 0;
    private mousePos = {x: 0, y: 0};
    private afterMouseMovedCallbacks : (() => void)[] = [];
    private height = 0;
    private width = 0;
    
    private hasUsedTouch = false;
    private simplePanning = false;
    private simplePanningPosition = {x: 0, y: 0};
    private flickPanning = false;
    private flickContinueTime = 0;
    private flickPositions : {time: number, x: number, y: number}[] = [];
    private flickMomentum = null;
    
    private holdZooming = false;
    private holdZoomingOut = false;
    private holdZoomingPosition : {x: number, y: number};
    
    private dynamicZooming = false;
    private dynamicZoomDirection = 'y';
    private dynamicZoomPositionStart : {x: number, y: number};
    private dynamicZoomPositionRelative : {x: number, y: number};
    private dynamicZoomPosition = {x: 0, y: 0};
    
    private brushZooming = false;
    private brushZoomDirection = 'x';
    private brushStart : {x: number, y: number};
    
    private pinchZoomPos : {x: number, y: number};
    private pinchZoomCenterPos : {x: number, y: number};
    private pinchZoomPosStart1  : {x: number, y: number};
    private pinchZoomPosStart2  : {x: number, y: number};
    private pinchZoomMomentum = null;
    private pinchZoomReferences = [];
    
    static SIMPLE_PANNING_MIN_DISTANCE = 3;
    static SIMPLE_PANNING_DELAY = 300;
    
    static FLICK_PANNING_FRICTION = 0.002;
    
    static HOLD_ZOOM_MAX_DISTANCE = 3;
    static HOLD_ZOOM_DELAY = 300;
    static HOLD_ZOOMING_IN_SCALE_CHANGE_PER_MS = -0.0015;
    static HOLD_ZOOMING_OUT_SCALE_CHANGE_PER_MS = 0.003;
    static HOLD_ZOOMING_OUT_DBLCLICK_TIMEOUT = 300;
    
    static DBLCLICK_ZOOM_DBLCLICKTIME = 300;
    static DBLCLICK_ZOOM_IN_SCALECHANGE = 0.3;
    static DBLCLICK_ZOOM_OUT_SCALECHANGE = 5;
    static DBLCLICK_MAX_HOLD_TIME = 200;
    static DBLRIGHTCLICK_ZOOM_IN_SCALECHANGE  = 0.3;
    static DBLRIGHTCLICK_ZOOM_OUT_SCALECHANGE  = 3;
    
    static WHEEL_ZOOM_IN_SCALECHANGE = 0.8;
    static WHEEL_ZOOM_OUT_SCALECHANGE = 1.2;
    
    static WHEEL_ZOOM_MOMENTUM_SPEED_PERCENTAGE = 0.01;
    static WHEEL_ZOOM_MOMENTUM_FRICTION = 0.000004;
    
    static WHEEL_PAN_SPEED = 50;
    
    static DYNAMIC_ZOOM_SPEED = 0.05;
    static DYNAMIC_ZOOM_MIN_DISTANCE_WITHIN_DELAY = 3;
    static DYNAMIC_ZOOM_DELAY = 300;
    static DYNAMIC_ZOOM_MIN_DIRECTION_PERCENTAGE = 0.7;
    
    static BRUSH_ZOOM_MIN_DISTANCE = 3;
    static BRUSH_ZOOM_DELAY = 300;
    static BRUSH_ZOOM_MIN_TIME = 150;
    
    static RUB_ZOOM_SCALE_CHANGE = 0.02;
    static RUB_ZOOM_MIN_DISTANCE = 15;
    static RUB_ZOOM_MIN_DISTANCE_AFTER_DIRECTION_CHANGE = 10;
    
    static PINCH_ZOOM_FRICTION = 0.00001;
    
    static DIMENSIONS = ['x', 'y'];
    
    private enabledModes = ["SIMPLE_PAN", "HOLD_ZOOM_IN", "CLICK_HOLD_ZOOM_OUT", "WHEEL_ZOOM", "PINCH_ZOOM", "DBLCLICK_ZOOM_IN", "DBLRIGHTCLICK_ZOOM_OUT"];
    //@Input() onPanned: (x: number, y: number) => void;
    public onPanned = new EzEventEmitter<EasyPzPanData>();
    public onZoomed = new EzEventEmitter<EasyPzZoomData>();
    public resetAbsoluteScale = new EzEventEmitter<void>();
    
    private totalTransform = { scale: 1, translateX: 0, translateY: 0};
    private totalTransformSnapshot = { scale: 1, translateX: 0, translateY: 0};
    private el: HTMLElement;
    
    constructor(el: Node|{node: () => HTMLElement},
                onTransform: (transform: { scale: number, translateX: number, translateY: number}) => void = () => {},
                enabledModes: string[] = null,
                onPanned: (panData: EasyPzPanData, transform: { scale: number, translateX: number, translateY: number}) => void = () => {},
                onZoomed: (zoomData: EasyPzZoomData, transform: { scale: number, translateX: number, translateY: number}) => void = () => {},
                onResetAbsoluteScale: () => void = () => {},
                private applyTransformTo: string = '',
                replaceVariables = false)
    {
        if(enabledModes)
        {
            this.enabledModes = enabledModes;
        }
        this.el = el instanceof Node ? <HTMLElement> el : el.node();
        
        let transformBeforeScale = applyTransformTo ? false : true;
        this.trackTotalTransformation(onTransform, onPanned, onZoomed, transformBeforeScale);
        this.resetAbsoluteScale.subscribe(() => this.saveCurrentTransformation(onResetAbsoluteScale));
        this.onPanned.subscribe(() => this.applyTransformation());
        this.onZoomed.subscribe(() => this.applyTransformation());
        
        if(replaceVariables)
        {
            this.detectTemplateVariables();
        }
        this.onPanned.subscribe(() => this.replaceVariables());
        this.onZoomed.subscribe(() => this.replaceVariables());
        
        this.ngAfterViewInit();
        this.setupHostListeners();
    }
    
    private saveCurrentTransformation(onResetAbsoluteScale)
    {
        this.totalTransformSnapshot = {
            scale: this.totalTransform.scale,
            translateX: this.totalTransform.translateX,
            translateY: this.totalTransform.translateY
        };
        
        onResetAbsoluteScale();
    }
    
    private trackTotalTransformation(onTransform, onPanned, onZoomed, transformBeforeScale)
    {
        this.onPanned.subscribe((panData: EasyPzPanData) =>
        {
            if(transformBeforeScale)
            {
                this.totalTransform.translateX += panData.x;
                this.totalTransform.translateY += panData.y;
            }
            else
            {
                this.totalTransform.translateX += panData.x / this.totalTransform.scale;
                this.totalTransform.translateY += panData.y / this.totalTransform.scale;
            }
            
            onPanned(panData, this.totalTransform);
            onTransform(this.totalTransform);
        });
        this.onZoomed.subscribe((zoomData: EasyPzZoomData) =>
        {
            if(transformBeforeScale)
            {
                let scaleChange = 1 / zoomData.scaleChange;
                this.totalTransform.scale *= scaleChange;
                
                let scalePrev = this.totalTransform.scale;
                let scaleAfter = this.totalTransform.scale * scaleChange;
                
                this.totalTransform.translateX = (this.totalTransform.translateX - zoomData.x) / scalePrev * scaleAfter + zoomData.x;
                this.totalTransform.translateY = (this.totalTransform.translateY - zoomData.y) / scalePrev * scaleAfter + zoomData.y;
            }
            else
            {
                // Zoom either relative to the current transformation, or to the saved snapshot.
                let relativeTransform = zoomData.absoluteScaleChange ? this.totalTransformSnapshot : this.totalTransform;
                let scaleChange = zoomData.absoluteScaleChange ? 1 / zoomData.absoluteScaleChange : 1 / zoomData.scaleChange;
                
                this.totalTransform.scale = relativeTransform.scale * scaleChange;
                
                let posBefore = {x: zoomData.x , y: zoomData.y };
                let posAfter = {x: posBefore.x * scaleChange, y: posBefore.y * scaleChange};
                let relative = {x: posAfter.x - posBefore.x, y: posAfter.y - posBefore.y};
                
                this.totalTransform.translateX = relativeTransform.translateX - relative.x / this.totalTransform.scale;
                this.totalTransform.translateY = relativeTransform.translateY - relative.y / this.totalTransform.scale;
                
                if(zoomData.targetX || zoomData.targetY)
                {
                    this.totalTransform.translateX += (zoomData.targetX - zoomData.x) / this.totalTransform.scale;
                    this.totalTransform.translateY += (zoomData.targetY - zoomData.y) / this.totalTransform.scale;
                }
            }
            
            onZoomed(zoomData, this.totalTransform);
            onTransform(this.totalTransform);
        });
    }
    
    private lastAppliedTransform = { translateX: 0, translateY: 0 };
    
    private applyTransformation()
    {
        if(this.applyTransformTo)
        {
            let els = this.el.querySelectorAll(this.applyTransformTo);
            
            for(let i = 0; i < els.length; i++)
            {
                const element = els[i];
                let transform = element.getAttribute('transform');
                let transformData = EasyPZ.parseTransform(transform);
                
                let translateX = this.totalTransform.translateX;
                let translateY = this.totalTransform.translateY;
                
                if(transformData)
                {
                    translateX += transformData.translateX - this.lastAppliedTransform.translateX;
                    translateY += transformData.translateY - this.lastAppliedTransform.translateY;
                }
                else
                {
                    console.log('what is wrong', transform);
                }
                
                //element.setAttribute('transform', 'translate(' + translateX + ',' + translateY + ')' + 'scale(' + this.totalTransform.scale + ')');
                element.setAttribute('transform', 'scale(' + this.totalTransform.scale + ')' + 'translate(' + translateX + ',' + translateY + ')');
            }
            
            this.lastAppliedTransform.translateX = this.totalTransform.translateX;
            this.lastAppliedTransform.translateY = this.totalTransform.translateY;
        }
    }
    
    private templateVariableElements = [];
    private static TEMPLATE_VARIABLES = { 'translateX': '__EASYPZ-TRANSLATE-X__', 'translateY': '__EASYPZ-TRANSLATE-Y__', 'scale': '__EASYPZ-SCALE__'};
    
    
    private detectTemplateVariables()
    {
        const templateVariableNames = Object.keys(EasyPZ.TEMPLATE_VARIABLES).map(key => EasyPZ.TEMPLATE_VARIABLES[key]);
        const allEls = this.el.getElementsByTagName('*');
        
        for(let i = 0; i < allEls.length; i++)
        {
            const el = allEls[i];
            
            for(let i = 0; i < el.attributes.length; i++)
            {
                const attribute = el.attributes[i];
                //console.log(el, attribute.name, attribute.value);
                for(const variable of templateVariableNames)
                {
                    //console.log(el, attribute.value, variable);
                    if(attribute.value && attribute.value.indexOf(variable) !== -1 && this.templateVariableElements.indexOf(el) === -1)
                    {
                        el.setAttribute('data-easypz-' + attribute.name, attribute.value);
                        this.templateVariableElements.push(el);
                    }
                }
            }
        }
    }
    
    private replaceVariables()
    {
        const TEMPLATE_VARIABLES = Object.keys(EasyPZ.TEMPLATE_VARIABLES);
        
        this.templateVariableElements.forEach(el =>
        {
            for(let i = 0; i < el.attributes.length; i++)
            {
                const attribute = el.attributes[i];
                if(attribute.name.substr(0, 'data-easypz-'.length) === 'data-easypz-')
                {
                    const attrName = attribute.name.substr('data-easypz-'.length);
                    let attrValue = attribute.value;
                    
                    for(const dataName of TEMPLATE_VARIABLES)
                    {
                        const templateVariable = EasyPZ.TEMPLATE_VARIABLES[dataName];
                        const templateValue = this.totalTransform[dataName];
                        attrValue = attrValue.replace(templateVariable, templateValue);
                    }
                    
                    el.setAttribute(attrName, attrValue);
                }
            }
        });
    }
    
    private static parseTransform(transform: string)
    {
        if(!transform)
        {
            return { translateX: 0, translateY: 0 };
        }
        
        transform = transform.replace(/ /g,'');
        
        //var translate  = /translate\((\d+),(\d+)\)/.exec(transform);
        const translate  = /\s*translate\(([-0-9.]+),([-0-9.]+)\)/.exec(transform);
        if(translate)
        {
            return { translateX: parseFloat(translate[1]), translateY: parseFloat(translate[2]) };
        }
        else
        {
            console.error(transform);
            return { translateX: 0, translateY: 0 };
        }
    }
    
    private ngAfterViewInit()
    {
        let rect = this.el.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
    }
    
    private modeOn(mode: number): boolean
    {
        let modeName = Object.keys(EasyPZ.MODES)[mode];
        return this.enabledModes.indexOf(modeName) !== -1;
    }
    
    private maybeCall(neededMode: number, fct: () => void)
    {
        if (this.modeOn(neededMode))
        {
            fct();
        }
    }
    
    private updateMousePosition(event: MouseEvent|TouchEvent) : void
    {
        let pos = this.getMousePosition(event);
        if(pos)
        {
            this.mousePos = pos;
        }
    }
    
    private getMousePosition(event: MouseEvent|TouchEvent) : {x: number, y: number}
    {
        let pos = {x: 0, y: 0};
        
        //if(event instanceof MouseEvent && event.clientX)
        if(event.type.substr(0,5) === 'mouse' && event['clientX'])
        {
            pos = {x: event['clientX'], y: event['clientY']};
            this.numberOfPointers = 1;
        }
        //else if(event instanceof TouchEvent)
        else if(event.type.substr(0,5) === 'touch')
        {
            const touches = event['touches'] ? event['touches'] : [];
            this.numberOfPointers = touches.length;
            if(touches.length < 1) return;
            pos = {x: touches[0].clientX, y: touches[0].clientY};
        }
        
        return this.getRelativePosition(pos.x, pos.y);
    }
    
    private getRelativePosition(x: number, y: number) : {x: number, y: number}
    {
        let boundingRect = this.el.getBoundingClientRect();
        this.width = boundingRect.width;
        this.height = boundingRect.height;
        return { x: x - boundingRect.left, y: y - boundingRect.top };
    }
    
    private onMouseTouchDown(mouseEvent: MouseEvent, touchEvent?: TouchEvent)
    {
        this.lastMouseDownTime = this.mouseDownTime;
        this.lastMousePos = {x: this.mousePos.x, y: this.mousePos.y};
        this.mouseDownTime = Date.now();
        let event = mouseEvent || touchEvent;
        
        this.updateMousePosition(event);
        
        let eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN;
        this.onMouseTouchEvent(eventType, event);
    }
    
    private setupHostListeners()
    {
        this.el.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.el.addEventListener('touchstart', (event) => this.onTouchStart(event));
        this.el.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.el.addEventListener('touchmove', (event) => this.onTouchMove(event));
        this.el.addEventListener('mouseup', (event) => this.onMouseUp(event));
        this.el.addEventListener('mouseout', (event) => this.onMouseOut(event));
        this.el.addEventListener('touchend', (event) => this.onTouchEnd(event));
        this.el.addEventListener('contextmenu', (event) => this.onContextMenu(event));
        this.el.addEventListener('wheel', (event) => this.onWheel(event));
    }
    
    private onMouseDown(event: MouseEvent)
    {
        if(!this.hasUsedTouch)
        {
            this.onMouseTouchDown(event);
        }
    }
    
    private onTouchStart(event: TouchEvent)
    {
        this.hasUsedTouch = true;
        
        let eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN;
        if(event.touches.length == 1)
        {
            this.onMouseTouchDown(null, event);
        }
        else if(event.touches.length == 2)
        {
            this.updateMousePosition(event);
            this.onMultiTouchEvent(eventType, event);
            event.preventDefault();
        }
    }
    
    private onMouseTouchMove(mouseEvent: MouseEvent, touchEvent?: TouchEvent)
    {
        this.mouseMoveTime = Date.now();
        this.lastMousePos = {x: this.mousePos.x, y: this.mousePos.y};
        let event = mouseEvent || touchEvent;
        this.updateMousePosition(event);
        
        let eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE;
        this.onMouseTouchEvent(eventType, event);
        
        for(let cb of this.afterMouseMovedCallbacks)
        {
            cb();
        }
    }
    
    private onMouseMove(event: MouseEvent)
    {
        this.onMouseTouchMove(event);
    }
    
    private onTouchMove(event: TouchEvent)
    {
        if(event.touches.length == 1)
        {
            this.onMouseTouchMove(null, event);
        }
        else if(event.touches.length == 2)
        {
            this.updateMousePosition(event);
            let eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE;
            this.onMultiTouchEvent(eventType, event);
            event.preventDefault();
        }
    }
    
    private onMultiTouchEvent(eventType: number, event: TouchEvent)
    {
        // this is just to make sure it is disabled
        this.maybeCall(EasyPZ.MODES.BRUSH_ZOOM_X, () => this.brushZoom(eventType, event, 'x'));
        this.maybeCall(EasyPZ.MODES.BRUSH_ZOOM_Y, () => this.brushZoom(eventType, event, 'y'));
        this.maybeCall(EasyPZ.MODES.BRUSH_ZOOM_2D, () => this.brushZoom(eventType, event, 'xy'));
        
        this.maybeCall(EasyPZ.MODES.PINCH_ZOOM, () => this.pinchZoom(eventType, event));
        this.maybeCall(EasyPZ.MODES.PINCH_ZOOM_QUADRATIC, () => this.pinchZoom(eventType, event, 'quadratic'));
        this.maybeCall(EasyPZ.MODES.PINCH_ZOOM_POWER_FOUR, () => this.pinchZoom(eventType, event, 'power_four'));
        this.maybeCall(EasyPZ.MODES.PINCH_ZOOM_MOMENTUM, () => this.pinchZoom(eventType, event, 'linear', true));
        this.maybeCall(EasyPZ.MODES.PINCH_PAN, () => this.pinchZoom(eventType, event, 'fixed'));
    }
    
    private onMouseTouchUp(mouseEvent: MouseEvent, touchEvent?: TouchEvent)
    {
        this.mouseUpTime = Date.now();
        this.lastMousePos = {x: this.mousePos.x, y: this.mousePos.y};
        let event = mouseEvent || touchEvent;
        
        this.updateMousePosition(event);
        
        let eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP;
        this.onMouseTouchEvent(eventType, event);
    }
    
    private onMouseTouchEvent(eventType: number, event: MouseEvent|TouchEvent)
    {
        if(EasyPZ.isRightClick(event))
        {
            return this.onRightClick(eventType, event);
        }
        
        this.maybeCall(EasyPZ.MODES.SIMPLE_PAN, () => this.simplePan(eventType, event));
        this.maybeCall(EasyPZ.MODES.FLICK_PAN, () => this.flickPan(eventType, event));
        this.maybeCall(EasyPZ.MODES.HOLD_ZOOM_IN, () => this.holdZoom(eventType, event, 'in'));
        this.maybeCall(EasyPZ.MODES.HOLD_ZOOM_OUT, () => this.holdZoom(eventType, event, 'out'));
        this.maybeCall(EasyPZ.MODES.CLICK_HOLD_ZOOM_IN, () => this.holdZoom(eventType, event, 'in', true));
        this.maybeCall(EasyPZ.MODES.CLICK_HOLD_ZOOM_OUT, () => this.holdZoom(eventType, event, 'out', true));
        this.maybeCall(EasyPZ.MODES.DBLCLICK_ZOOM_IN, () => this.dblClickZoom(eventType, event, 'in'));
        this.maybeCall(EasyPZ.MODES.DBLCLICK_ZOOM_OUT, () => this.dblClickZoom(eventType, event, 'out'));
        this.maybeCall(EasyPZ.MODES.DYNAMIC_ZOOM_X_STATIC, () => this.dynamicZoom(eventType, event, 'x', 'static'));
        this.maybeCall(EasyPZ.MODES.DYNAMIC_ZOOM_X_ORIGINAL_PAN, () => this.dynamicZoom(eventType, event, 'x', 'original_pan'));
        this.maybeCall(EasyPZ.MODES.DYNAMIC_ZOOM_X_NORMAL_PAN, () => this.dynamicZoom(eventType, event, 'x', 'normal_pan'));
        this.maybeCall(EasyPZ.MODES.DYNAMIC_ZOOM_X_ADJUSTABLE, () => this.dynamicZoom(eventType, event, 'x', 'adjustable'));
        this.maybeCall(EasyPZ.MODES.DYNAMIC_ZOOM_Y_STATIC, () => this.dynamicZoom(eventType, event, 'y', 'static'));
        this.maybeCall(EasyPZ.MODES.DYNAMIC_ZOOM_Y_ORIGINAL_PAN, () => this.dynamicZoom(eventType, event, 'y', 'original_pan'));
        this.maybeCall(EasyPZ.MODES.DYNAMIC_ZOOM_Y_NORMAL_PAN, () => this.dynamicZoom(eventType, event, 'y', 'normal_pan'));
        this.maybeCall(EasyPZ.MODES.DYNAMIC_ZOOM_Y_ADJUSTABLE, () => this.dynamicZoom(eventType, event, 'y', 'adjustable'));
        this.maybeCall(EasyPZ.MODES.BRUSH_ZOOM_X, () => this.brushZoom(eventType, event, 'x'));
        this.maybeCall(EasyPZ.MODES.BRUSH_ZOOM_Y, () => this.brushZoom(eventType, event, 'y'));
        this.maybeCall(EasyPZ.MODES.BRUSH_ZOOM_2D, () => this.brushZoom(eventType, event, 'xy'));
        this.maybeCall(EasyPZ.MODES.RUB_ZOOM_IN_X, () => this.rubZoom(eventType, event, 'x', 'in'));
        this.maybeCall(EasyPZ.MODES.RUB_ZOOM_IN_Y, () => this.rubZoom(eventType, event, 'y', 'in'));
        this.maybeCall(EasyPZ.MODES.RUB_ZOOM_OUT_X, () => this.rubZoom(eventType, event, 'x', 'out'));
        this.maybeCall(EasyPZ.MODES.RUB_ZOOM_OUT_Y, () => this.rubZoom(eventType, event, 'y', 'out'));
    }
    
    private onMouseUp(event: MouseEvent)
    {
        // This has to be checked because mobile devices call both touchend as well as mouseup on release.
        
        if(!this.hasUsedTouch)
        {
            this.onMouseTouchUp(event);
        }
    }
    private onMouseOut(event: MouseEvent)
    {
        // The problem with this is that it detects mouseout events of elements within this element,
        // not only of mouseout events of the main element itself. This is why a pointer position check is done
        // to see if the user has actually left the visualization.
        
        let pos = this.getMousePosition(event);
        
        if(pos.x < 0 || pos.x > this.width || pos.y < 0 || pos.y > this.height)
        {
            this.onMouseTouchUp(event);
        }
    }
    
    private onTouchEnd(event: TouchEvent)
    {
        // Touch End always has zero touch positions, so the pointer position can not be used here.
        
        let eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP;
        this.onMouseTouchUp(null, event);
        this.onMultiTouchEvent(eventType, event);
    }
    
    private onContextMenu(event: MouseEvent)
    {
        if(this.modeOn(EasyPZ.MODES.DBLRIGHTCLICK_ZOOM_IN) || this.modeOn(EasyPZ.MODES.DBLRIGHTCLICK_ZOOM_OUT))
        {
            event.preventDefault();
            return false;
        }
    }
    
    private onWheel(event: WheelEvent)
    {
        this.maybeCall(EasyPZ.MODES.WHEEL_ZOOM, () => this.wheelZoom(event));
        this.maybeCall(EasyPZ.MODES.WHEEL_ZOOM_MOMENTUM, () => this.wheelZoomMomentum(event));
        this.maybeCall(EasyPZ.MODES.WHEEL_PAN_X, () => this.wheelPan(event, 'x'));
        this.maybeCall(EasyPZ.MODES.WHEEL_PAN_Y, () => this.wheelPan(event, 'y'));
        
        if(this.modeOn(EasyPZ.MODES.WHEEL_ZOOM)
            || this.modeOn(EasyPZ.MODES.WHEEL_ZOOM_MOMENTUM)
            || this.modeOn(EasyPZ.MODES.WHEEL_PAN_X)
            || this.modeOn(EasyPZ.MODES.WHEEL_PAN_Y))
        {
            event.preventDefault();
        }
    }
    
    private onRightClick(eventType: number, event: MouseEvent|TouchEvent)
    {
        this.maybeCall(EasyPZ.MODES.DBLRIGHTCLICK_ZOOM_IN, () => this.dblRightClickZoom(eventType, event, 'in'));
        this.maybeCall(EasyPZ.MODES.DBLRIGHTCLICK_ZOOM_OUT, () => this.dblRightClickZoom(eventType, event, 'out'));
    }
    
    /* Simple Panning */
    
    private simplePan(eventType: number, event: MouseEvent|TouchEvent)
    {
        if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN)
        {
            this.simplePanning = false;
            this.simplePanningPosition = {x: this.mousePos.x, y: this.mousePos.y};
            
            // If the pointer is not moved to drag the content within the first 300ms, it is not considered panning.
            this.callbackAfterTimeoutOrMovement(EasyPZ.SIMPLE_PANNING_DELAY, EasyPZ.SIMPLE_PANNING_MIN_DISTANCE).then((dist) =>
            {
                this.simplePanning = this.mouseUpTime < this.mouseDownTime && dist >= EasyPZ.SIMPLE_PANNING_MIN_DISTANCE;
            });
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE)
        {
            if(this.simplePanning)
            {
                let relativeX = this.mousePos.x - this.simplePanningPosition.x;
                let relativeY = this.mousePos.y - this.simplePanningPosition.y;
                this.onPanned.emit({x: relativeX, y: relativeY});
                
                this.simplePanningPosition = {x: this.mousePos.x, y: this.mousePos.y};
            }
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP)
        {
            this.simplePanning = false;
        }
    }
    
    /* Flick Panning */
    
    private flickPan(eventType: number, event: MouseEvent|TouchEvent)
    {
        if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN)
        {
            this.flickPanning = false;
            this.flickPositions = [{x: this.mousePos.x, y: this.mousePos.y, time: Date.now()}];
            if(this.flickMomentum)
            {
                this.flickMomentum.stop();
            }
            
            // If the pointer is not moved to drag the content within the first 300ms, it is not considered panning.
            this.callbackAfterTimeoutOrMovement(EasyPZ.SIMPLE_PANNING_DELAY, EasyPZ.SIMPLE_PANNING_MIN_DISTANCE).then((dist) =>
            {
                this.flickPanning = this.mouseUpTime < this.mouseDownTime && dist >= EasyPZ.SIMPLE_PANNING_MIN_DISTANCE;
            });
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE)
        {
            if(this.flickPanning)
            {
                let relativeX = this.mousePos.x - this.lastMousePos.x;
                let relativeY = this.mousePos.y - this.lastMousePos.y;
                this.onPanned.emit({x: relativeX, y: relativeY});
                this.flickPositions.push({x: this.mousePos.x, y: this.mousePos.y, time: Date.now()});
            }
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP)
        {
            this.flickPanning = false;
            
            let referencePoints = this.flickPositions.filter(flickPos =>
            {
                return flickPos.time >= Date.now() - 100 && flickPos.time <= Date.now() - 50;
            });
            
            if(referencePoints.length == 0) return;
            
            let refPoint = referencePoints[0];
            let dist = EasyPZ.getPositionDistance({x: refPoint.x, y: refPoint.y}, this.mousePos);
            let flickDirection = {x: (this.mousePos.x - refPoint.x) / dist, y: (this.mousePos.y - refPoint.y) / dist};
            
            let time = Date.now() - refPoint.time;
            let speed = dist / time;
            this.flickMomentum = this.momentumInteraction(speed, EasyPZ.FLICK_PANNING_FRICTION, (dist) =>
            {
                let relativeMove = {x: flickDirection.x * dist, y: flickDirection.y * dist };
                this.onPanned.emit(relativeMove);
            });
            
            this.flickMomentum.start();
        }
    }
    
    private momentumInteraction(startSpeed : number, friction : number, onStep : (dist) => void)
    {
        let startTime = Date.now();
        let lastMoveTime = Date.now();
        
        let speedFct = (time) =>
        {
            let timePassed = time - startTime;
            return Math.max(0, startSpeed - friction * timePassed);
        };
        
        let continueInteraction = () =>
        {
            let speed = speedFct(Date.now());
            
            if(speed > 0)
            {
                let dist = (Date.now() - lastMoveTime) * speed;
                onStep(dist);
                lastMoveTime = Date.now();
                
                requestAnimationFrame(continueInteraction);
            }
        };
        
        return {
            start : function()
            {
                requestAnimationFrame(continueInteraction);
            },
            stop : function()
            {
                startTime = 0;
            }
        }
    }
    
    /* Hold Zooming */
    
    private holdZoom(eventType: number, event: MouseEvent|TouchEvent, inOut: string = 'in', clickFirst = false)
    {
        if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN)
        {
            let startPos = {x: this.mousePos.x, y: this.mousePos.y};
            let holdZoomLastChange;
            
            let recursiveZoom = () =>
            {
                if(this.holdZooming)
                {
                    let timePassed = Date.now() - holdZoomLastChange;
                    let scaleChangePerMs = this.holdZoomingOut ? EasyPZ.HOLD_ZOOMING_OUT_SCALE_CHANGE_PER_MS : EasyPZ.HOLD_ZOOMING_IN_SCALE_CHANGE_PER_MS;
                    let scale = 1 + scaleChangePerMs * timePassed;
                    this.onZoomed.emit({x: this.mousePos.x, y: this.mousePos.y, scaleChange: scale});
                    holdZoomLastChange = Date.now();
                    
                    requestAnimationFrame(recursiveZoom);
                }
            };
            
            // If the pointer is moved within the first 300ms, it is not considered zooming.
            setTimeout(() =>
            {
                if(this.mouseDownTime > this.mouseUpTime)
                {
                    if (EasyPZ.getPositionDistance(startPos, this.mousePos) < EasyPZ.HOLD_ZOOM_MAX_DISTANCE)
                    {
                        this.holdZooming = true;
                        holdZoomLastChange = Date.now();
                        let hasClickedFirst = this.mouseDownTime - this.lastMouseDownTime < EasyPZ.HOLD_ZOOMING_OUT_DBLCLICK_TIMEOUT;
                        this.holdZoomingPosition = {x: this.mousePos.x, y: this.mousePos.y};
                        
                        // start zooming
                        if(hasClickedFirst == clickFirst)
                        {
                            this.holdZoomingOut = inOut != 'in';
                            recursiveZoom();
                        }
                        
                    }
                }
            }, EasyPZ.HOLD_ZOOM_DELAY);
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE)
        {
            if(this.holdZooming)
            {
                this.holdZoomingPosition = {x: this.mousePos.x, y: this.mousePos.y};
            }
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP)
        {
            this.holdZooming = false;
        }
    }
    
    /* Double Click Zoom */
    
    private dblClickZoom(eventType: number, event: MouseEvent|TouchEvent, inOut: string = 'in')
    {
        if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN)
        {
        
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE)
        {
        
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP)
        {
            let isDblClick = this.mouseDownTime - this.lastMouseDownTime < EasyPZ.DBLCLICK_ZOOM_DBLCLICKTIME;
            let isHold = this.mouseUpTime - this.mouseDownTime > EasyPZ.DBLCLICK_MAX_HOLD_TIME;
            
            if (isDblClick && !isHold)
            {
                let scaleChange = inOut == 'in' ? EasyPZ.DBLCLICK_ZOOM_IN_SCALECHANGE : EasyPZ.DBLCLICK_ZOOM_OUT_SCALECHANGE;
                this.onZoomed.emit({x: this.mousePos.x, y: this.mousePos.y, scaleChange: scaleChange});
            }
        }
    }
    
    /* Dynamic / RubPointing Zoom */
    
    private dynamicZoom(eventType: number, event: MouseEvent|TouchEvent, direction: string, mode: string)
    {
        if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN)
        {
            this.dynamicZoomDirection = direction;
            this.dynamicZoomPositionStart = {x: this.mousePos.x, y: this.mousePos.y};
            this.dynamicZoomPositionRelative = {x: 0, y: 0};
            this.resetAbsoluteScale.emit();
            
            this.callbackAfterTimeoutOrMovement(EasyPZ.DYNAMIC_ZOOM_DELAY, EasyPZ.DYNAMIC_ZOOM_MIN_DISTANCE_WITHIN_DELAY).then((dist) =>
            {
                let distInDirection = Math.abs(this.dynamicZoomPositionStart[direction] - this.mousePos[direction]);
                
                if (this.numberOfPointers > 1 || dist < EasyPZ.DYNAMIC_ZOOM_MIN_DISTANCE_WITHIN_DELAY || distInDirection / dist < EasyPZ.DYNAMIC_ZOOM_MIN_DIRECTION_PERCENTAGE)
                {
                    this.dynamicZooming = false;
                }
                else if(this.mouseDownTime > this.mouseUpTime)
                {
                    this.dynamicZooming = true;
                }
            });
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE)
        {
            if(this.dynamicZooming)
            {
                let relativeMove = {x: 0, y: 0};
                
                EasyPZ.DIMENSIONS.forEach(dimension => {
                    relativeMove[dimension] = this.mousePos[dimension] - this.lastMousePos[dimension];
                });
                let dist = this.mousePos[direction] - this.dynamicZoomPositionStart[direction];
                //let dist = relativeMove[direction];
                if(!dist) return;
                
                let scale = Math.exp(-1 * EasyPZ.DYNAMIC_ZOOM_SPEED * dist);
                EasyPZ.DIMENSIONS.forEach(dimension => {
                    this.dynamicZoomPositionRelative[dimension] += relativeMove[dimension] * scale;
                });
                
                
                let actualZoomPosition : {x:number, y:number};
                let targetX = null;
                let targetY = null;
                
                if(mode == 'adjustable')
                {
                    actualZoomPosition = {x: this.dynamicZoomPositionStart.x + this.dynamicZoomPositionRelative.x, y: this.dynamicZoomPositionStart.y + this.dynamicZoomPositionRelative.y};
                    targetX = this.mousePos.x;
                    targetY = this.mousePos.y;
                    this.dynamicZoomPosition = { x: this.mousePos.x, y: this.mousePos.y };
                }
                else if(mode == 'static')
                {
                    this.dynamicZoomPosition = {x: this.dynamicZoomPositionStart.x, y: this.dynamicZoomPositionStart.y};
                }
                else if(mode == 'normal_pan')
                {
                    this.dynamicZoomPosition = {x: this.dynamicZoomPositionStart.x - this.dynamicZoomPositionRelative.x, y: this.dynamicZoomPositionStart.y - this.dynamicZoomPositionRelative.y};
                }
                else if(mode == 'original_pan')
                {
                    this.dynamicZoomPosition = {x: this.mousePos.x, y: this.mousePos.y};
                }
                
                let zoomPos = actualZoomPosition ? actualZoomPosition : this.dynamicZoomPosition;
                this.onZoomed.emit({x: zoomPos.x, y: zoomPos.y, absoluteScaleChange: scale, targetX: targetX, targetY: targetY});
            }
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP)
        {
            this.dynamicZooming = false;
        }
    }
    
    /* Brushing Zoom */
    
    private brushZoom(eventType: number, event: MouseEvent|TouchEvent, direction: string)
    {
        if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN && this.numberOfPointers === 1)
        {
            this.brushZooming = true;
            this.brushZoomDirection = direction;
            this.brushStart = {x: this.mousePos.x, y: this.mousePos.y};
            
            this.callbackAfterTimeoutOrMovement(EasyPZ.BRUSH_ZOOM_DELAY, EasyPZ.BRUSH_ZOOM_MIN_DISTANCE).then((dist) =>
            {
                this.brushZooming = this.numberOfPointers == 1 && dist > EasyPZ.BRUSH_ZOOM_MIN_DISTANCE;
            });
            setTimeout(() =>
            {
                if(this.numberOfPointers !== 1)
                {
                    this.brushZooming = false;
                }
            }, EasyPZ.BRUSH_ZOOM_DELAY);
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE)
        {
            if(this.numberOfPointers !== 1)
            {
                this.brushZooming = false;
            }
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP)
        {
            if(this.brushZooming)
            {
                this.brushZooming = false;
                
                if(Date.now() - this.mouseDownTime > EasyPZ.BRUSH_ZOOM_MIN_TIME)
                {
                    let middle = {x: this.brushStart.x + (this.mousePos.x - this.brushStart.x) / 2, y: this.brushStart.y + (this.mousePos.y - this.brushStart.y) / 2 };
                    let dist, scaleChange;
                    
                    if(direction == 'x')
                    {
                        dist = Math.abs(this.mousePos.x - this.brushStart.x);
                        scaleChange = dist / this.width * 1.3;
                    }
                    else if(direction == 'y')
                    {
                        dist = Math.abs(this.mousePos.y - this.brushStart.y);
                        scaleChange = dist / this.height * 1.3;
                    }
                    
                    //this.onZoomed.emit({x: middle.x, y: middle.y, scaleChange: scaleChange });
                    this.onZoomed.emit({x: middle.x, y: middle.y, scaleChange: scaleChange, targetX: this.width / 2, targetY: this.height / 2});
                }
            }
        }
    }
    
    /* Wheel Zoom */
    
    private wheelZoom(event: WheelEvent)
    {
        const delta = event.wheelDelta ? event.wheelDelta : -1 * event.deltaY;
        const change = delta / Math.abs(delta);
        const zoomingIn = change > 0;
        
        let scale = zoomingIn ? EasyPZ.WHEEL_ZOOM_IN_SCALECHANGE : EasyPZ.WHEEL_ZOOM_OUT_SCALECHANGE;
        this.onZoomed.emit({x: this.mousePos.x, y: this.mousePos.y, scaleChange: scale});
    }
    
    /* Wheel Zoom Momentum */
    
    private wheelZoomMomentum(event: WheelEvent)
    {
        const delta = event.wheelDelta ? event.wheelDelta : -1 * event.deltaY;
        let change = delta / Math.abs(delta);
        let zoomingIn = change > 0;
        
        let scale = zoomingIn ? EasyPZ.WHEEL_ZOOM_IN_SCALECHANGE : EasyPZ.WHEEL_ZOOM_OUT_SCALECHANGE;
        this.onZoomed.emit({x: this.mousePos.x, y: this.mousePos.y, scaleChange: scale});
        
        let relativeScale = 1 - scale;
        let absScale = Math.abs(relativeScale) * EasyPZ.WHEEL_ZOOM_MOMENTUM_SPEED_PERCENTAGE;
        let scaleSign = sign(relativeScale);
        
        this.flickMomentum = this.momentumInteraction(absScale, EasyPZ.WHEEL_ZOOM_MOMENTUM_FRICTION, (dist) =>
        {
            let newScale = 1 - scaleSign * dist;
            this.onZoomed.emit({x: this.mousePos.x, y: this.mousePos.y, scaleChange: newScale});
        });
        
        this.flickMomentum.start();
    }
    
    /* Wheel Pan */
    
    private wheelPan(event: WheelEvent, direction: string)
    {
        const delta = event.wheelDelta ? event.wheelDelta : -1 * event.deltaY;
        let change = delta / Math.abs(delta);
        let zoomingIn = change > 0;
        let sign = zoomingIn ? 1 : -1;
        
        let panned = {x: 0, y: 0};
        panned[direction] = EasyPZ.WHEEL_PAN_SPEED * sign;
        this.onPanned.emit(panned);
    }
    
    /* Double Right Click Zoom Out */
    
    private dblRightClickZoom(eventType: number, event: MouseEvent|TouchEvent, inOut: string = 'in')
    {
        if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN)
        {
        
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE)
        {
        
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP)
        {
            let isDblClick = this.mouseDownTime - this.lastMouseDownTime < EasyPZ.DBLCLICK_ZOOM_DBLCLICKTIME;
            let isHold = this.mouseUpTime - this.mouseDownTime > EasyPZ.DBLCLICK_MAX_HOLD_TIME;
            
            if (isDblClick && !isHold)
            {
                let scaleChange = inOut == 'in' ? EasyPZ.DBLRIGHTCLICK_ZOOM_IN_SCALECHANGE : EasyPZ.DBLRIGHTCLICK_ZOOM_OUT_SCALECHANGE;
                this.onZoomed.emit({x: this.mousePos.x, y: this.mousePos.y, scaleChange: scaleChange});
            }
        }
    }
    
    /* Pinch Zoom */
    
    private pinchZoom(eventType: number, event: TouchEvent, scaling?: string, momentum?: boolean)
    {
        if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN)
        {
            if(this.pinchZoomMomentum)
            {
                this.pinchZoomMomentum.stop();
            }
            this.pinchZoomReferences = [];
            this.pinchZoomPosStart1 = this.getRelativePosition(event.touches[0].clientX, event.touches[0].clientY);
            this.pinchZoomPosStart2 = this.getRelativePosition(event.touches[1].clientX, event.touches[1].clientY);
            this.resetAbsoluteScale.emit();
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE)
        {
            if(this.pinchZoomPosStart1 && this.pinchZoomPosStart2)
            {
                let pos1 = this.getRelativePosition(event.touches[0].clientX, event.touches[0].clientY);
                let pos2 = this.getRelativePosition(event.touches[1].clientX, event.touches[1].clientY);
                let distBefore = EasyPZ.getPositionDistance(this.pinchZoomPosStart1, this.pinchZoomPosStart2);
                let distNow = EasyPZ.getPositionDistance(pos1, pos2);
                let ratio = distBefore / distNow;
                
                let power = 1;
                if(scaling == 'quadratic') power = 2;
                if(scaling == 'power_four') power = 4;
                if(scaling == 'fixed') power = 0;
                let scale = Math.pow(ratio, power);
                
                this.pinchZoomReferences.push({time: Date.now(), scale});
                this.pinchZoomPos = {x: (this.pinchZoomPosStart1.x + this.pinchZoomPosStart2.x) / 2, y: (this.pinchZoomPosStart1.y + this.pinchZoomPosStart2.y) / 2};
                this.pinchZoomCenterPos = {x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2};
                this.onZoomed.emit({x: this.pinchZoomPos.x, y: this.pinchZoomPos.y, absoluteScaleChange: scale, targetX: this.pinchZoomCenterPos.x, targetY: this.pinchZoomCenterPos.y});
            }
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP)
        {
            this.pinchZoomPosStart1 = null;
            this.pinchZoomPosStart2 = null;
            
            if(momentum && this.pinchZoomReferences.length > 5)
            {
                let refLast = this.pinchZoomReferences[this.pinchZoomReferences.length-1];
                let ref = this.pinchZoomReferences[this.pinchZoomReferences.length-4];
                let refTimeDiff = refLast.time - ref.time;
                let refScaleDiff = refLast.scale - ref.scale;
                
                let lastScale = refLast.scale;
                
                let scaleChangeSpeed = refScaleDiff / refTimeDiff;
                let absScaleChangeSpeed = Math.abs(scaleChangeSpeed);
                let scaleSign = sign(scaleChangeSpeed);
                
                this.pinchZoomMomentum = this.momentumInteraction(absScaleChangeSpeed, EasyPZ.PINCH_ZOOM_FRICTION, (dist) =>
                {
                    let newScale = lastScale + scaleSign * dist;
                    this.onZoomed.emit({x: this.pinchZoomPos.x, y: this.pinchZoomPos.y, absoluteScaleChange: newScale, targetX: this.pinchZoomCenterPos.x, targetY: this.pinchZoomCenterPos.y});
                    lastScale = newScale;
                });
                
                this.pinchZoomMomentum.start();
            }
        }
    }
    
    private rubZooming = false;
    private rubZoomHasChangedDirection = false;
    private rubZoomHasChangedDirectionSign = 0;
    private rubZoomHasChangedDirectionDirection = 'x';
    private rubZoomPosition = null;
    private rubZoomReference = null;
    
    private rubZoom(eventType: number, event: MouseEvent|TouchEvent, direction: string = 'x', inOut: string = 'in')
    {
        if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN)
        {
            this.rubZooming = false;
            this.rubZoomPosition = {x: this.mousePos.x, y: this.mousePos.y};
            this.rubZoomReference = {x: this.mousePos.x, y: this.mousePos.y};
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE)
        {
            if(this.rubZoomReference)
            {
                let distance = Math.abs(this.rubZoomReference[direction] - this.mousePos[direction]);
                
                let signBefore = sign(this.lastMousePos[direction] - this.rubZoomReference[direction]);
                let signNow = sign(this.mousePos[direction] - this.lastMousePos[direction]);
                
                if(signBefore != 0 && signNow != 0 && signBefore != signNow && distance > EasyPZ.RUB_ZOOM_MIN_DISTANCE)
                {
                    this.rubZoomReference = {x: this.mousePos.x, y: this.mousePos.y};
                    distance = 0;
                    this.rubZoomHasChangedDirection = true;
                    this.rubZoomHasChangedDirectionSign = signNow;
                    this.rubZoomHasChangedDirectionDirection = direction;
                }
                
                if(!this.rubZooming && this.rubZoomHasChangedDirection && direction == this.rubZoomHasChangedDirectionDirection && signNow != this.rubZoomHasChangedDirectionSign)
                {
                    this.rubZoomHasChangedDirection = false;
                }
                
                if(this.rubZoomHasChangedDirection && distance > EasyPZ.RUB_ZOOM_MIN_DISTANCE_AFTER_DIRECTION_CHANGE)
                {
                    this.rubZooming = true;
                }
                
                let distanceSinceLast = Math.abs(this.mousePos[direction] - this.lastMousePos[direction]);
                if(this.rubZooming && distanceSinceLast)
                {
                    let direction = inOut == 'in' ? 1 : -1;
                    let zoomPos = {x: (this.mousePos.x + this.rubZoomReference.x)/2, y: (this.mousePos.y + this.rubZoomReference.y)/2};
                    let scaleChange = 1 - EasyPZ.RUB_ZOOM_SCALE_CHANGE * distanceSinceLast * direction;
                    
                    this.onZoomed.emit({x: zoomPos.x, y: zoomPos.y, scaleChange: scaleChange});
                }
            }
        }
        else if(eventType == EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP)
        {
            this.rubZooming = false;
            this.rubZoomPosition = null;
            this.rubZoomReference = null;
            this.rubZoomHasChangedDirection = false;
        }
    }
    
    /* Useful functions */
    
    abs(number)
    {
        return Math.abs(number);
    }
    
    static isRightClick(event: MouseEvent|TouchEvent): boolean
    {
        return event instanceof MouseEvent && (event.clientX) && (("which" in event && event.which === 3) || ("button" in event && event.button === 2));
    }
    
    static getPositionDistance(pos1: {x: number, y: number}, pos2: {x: number, y: number})
    {
        return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
    }
    
    callbackAfterTimeoutOrMovement(timeout: number, movement: number) : EzPromise<number>
    {
        return new EzPromise<number>((resolve, reject) =>
        {
            let resolved = false;
            
            let currentPos = {x: this.mousePos.x, y: this.mousePos.y};
            let index = this.afterMouseMovedCallbacks.length;
            
            this.afterMouseMovedCallbacks.push(() =>
            {
                let dist = EasyPZ.getPositionDistance(currentPos, this.mousePos);
                
                if(dist > movement && !resolved)
                {
                    //console.log('resolved after ', dist , ' px');
                    this.afterMouseMovedCallbacks.splice(index, 1);
                    resolved = true;
                    resolve(dist);
                }
            });
            
            setTimeout(() =>
            {
                if(!resolved)
                {
                    let dist = EasyPZ.getPositionDistance(currentPos, this.mousePos);
                    //console.log('resolved after ', timeout , ' ms');
                    this.afterMouseMovedCallbacks.splice(index, 1);
                    resolved = true;
                    resolve(dist);
                }
            }, timeout);
        });
    }
}