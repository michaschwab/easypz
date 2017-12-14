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
    private easyPzElements: HTMLElement[] = [];
    
    private static getSettingsFromString(settingsString) :
    {
        options: {
            minScale?: number,
            maxScale?: number,
            bounds?: { top: number, right: number, bottom: number, left: number }
        },
        onPanned: () => void,
        onZoomed: () => void,
        onTransformed: () => void,
        onResetAbsoluteScale: () => void,
        modes: string[],
        applyTransformTo: string,
        replaceVariables: boolean
    }
    {
        let settings = {
            onPanned: () => {},
            onZoomed: () => {},
            onTransformed: () => {},
            onResetAbsoluteScale: () => {},
            options: {},
            modes: EasyPZLoader.DEFAULT_MODES,
            applyTransformTo: '',
            replaceVariables: false
        };
        if(!!window['onPanned'])
            settings.onPanned = window['onPanned'];
        if(!!window['onZoomed'])
            settings.onZoomed = window['onZoomed'];
        if(!!window['onTransformed'])
            settings.onTransformed = window['onTransformed'];
        if(!!window['onResetAbsoluteScale'])
            settings.onResetAbsoluteScale = window['onResetAbsoluteScale'];
        
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
        
        const possibleOverrides = ['options', 'modes', 'onPanned', 'onZoomed', 'onTransformed', 'onResetAbsoluteScale', 'applyTransformTo'];
        
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
            
            let modes: string[] = [];
            let onPanned = function() {};
            let onZoomed = function() {};
            let onTransformed = function() {};
            let onResetAbsoluteScale = function() {};
            let options = {};
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
                options = settingsObj.options;
            }
            catch(e)
            {
                console.error(e);
            }
            new EasyPZ(el, onTransformed, options, modes, onPanned, onZoomed, onResetAbsoluteScale, applyTransformTo, replaceVariables);
        }
    }
}

const easyPZLoader = new EasyPZLoader();
window.addEventListener('load', function() { easyPZLoader.checkElements(); });
window.setInterval(function() { easyPZLoader.checkElements(); }, 2000);

class EzEventEmitter<T>
{
    subscribers : ((value: T) => void)[] = [];
    public emit(value: T)
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

class EasyPzCallbackData
{
    event;
    modeName;
}

class EasyPzMode
{
    ids: string[];
    active?: boolean;
    data?: any;
    settings: any;
    
    onClickTouch?: (eventData: EasyPzCallbackData) => void;
    onMove?: (eventData: EasyPzCallbackData) => void;
    onClickTouchEnd?: (eventData: EasyPzCallbackData) => void;
    onMultiTouch?: (eventData: EasyPzCallbackData) => void;
    onWheel?: (eventData: EasyPzCallbackData) => void;
    onRightClick?: (eventData: EasyPzCallbackData) => void;
}

class EasyPZ
{
    private static MOUSE_EVENT_TYPES = {'MOUSE_DOWN': 0, 'MOUSE_MOVE': 1, 'MOUSE_UP': 2};
    
    public lastMouseDownTime = 0;
    public mouseDownTime = 0;
    public mouseMoveTime = 0;
    public mouseUpTime = 0;
    public lastMousePos = {x: 0, y: 0};
    public numberOfPointers = 0;
    public mousePos = {x: 0, y: 0};
    private afterMouseMovedCallbacks : (() => void)[] = [];
    public height = 0;
    public width = 0;
    
    private hasUsedTouch = false;
    
    static DIMENSIONS = ['x', 'y'];
    
    private enabledModes = ["SIMPLE_PAN", "HOLD_ZOOM_IN", "CLICK_HOLD_ZOOM_OUT", "WHEEL_ZOOM", "PINCH_ZOOM", "DBLCLICK_ZOOM_IN", "DBLRIGHTCLICK_ZOOM_OUT"];
    //@Input() onPanned: (x: number, y: number) => void;
    public onPanned = new EzEventEmitter<EasyPzPanData>();
    public onZoomed = new EzEventEmitter<EasyPzZoomData>();
    public resetAbsoluteScale = new EzEventEmitter<void>();
    
    private totalTransform = { scale: 1, translateX: 0, translateY: 0};
    private totalTransformSnapshot = { scale: 1, translateX: 0, translateY: 0};
    public el: HTMLElement;
    private options = {
        minScale: 0.8,
        maxScale: 10,
        bounds: { top: -50, right: 50, bottom: 50, left: -50 }
    };
    
    constructor(el: Node|{node: () => HTMLElement},
                onTransform: (transform: { scale: number, translateX: number, translateY: number}) => void = () => {},
                options?: {
                    minScale?: number,
                    maxScale?: number,
                    bounds?: { top: number, right: number, bottom: number, left: number }
                },
                enabledModes?: string[],
                onPanned: (panData: EasyPzPanData, transform: { scale: number, translateX: number, translateY: number}) => void = () => {},
                onZoomed: (zoomData: EasyPzZoomData, transform: { scale: number, translateX: number, translateY: number}) => void = () => {},
                onResetAbsoluteScale: () => void = () => {},
                private applyTransformTo: string = '',
                replaceVariables = false)
    {
        if(enabledModes && enabledModes.length)
        {
            this.enabledModes = enabledModes;
        }
        this.el = el instanceof Node ? <HTMLElement> el : el.node();
        this.modes = EasyPZ.modes.map(unresolvedMode =>
        {
            return unresolvedMode(this);
        });
        
        if(options)
        {
            if(typeof options.minScale !== 'undefined')
            {
                this.options.minScale = options.minScale;
            }
            if(typeof options.maxScale !== 'undefined')
            {
                this.options.maxScale = options.maxScale;
            }
            if(typeof options.bounds !== 'undefined')
            {
                this.options.bounds = options.bounds;
            }
        }
        
        let transformBeforeScale = !applyTransformTo;
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
    
            this.ensureTransformWithinBounds(transformBeforeScale);
            
            onPanned(panData, this.totalTransform);
            onTransform(this.totalTransform);
        });
        
        this.onZoomed.subscribe((zoomData: EasyPzZoomData) =>
        {
            // Zoom either relative to the current transformation, or to the saved snapshot.
            const zoomDataScaleChange = zoomData.scaleChange ? zoomData.scaleChange : 1;
            let relativeTransform = zoomData.absoluteScaleChange ? this.totalTransformSnapshot : this.totalTransform;
            let scaleChange = zoomData.absoluteScaleChange ? 1 / zoomData.absoluteScaleChange : 1 / zoomDataScaleChange;
            let scalePrev = zoomData.absoluteScaleChange ? this.totalTransformSnapshot.scale : this.totalTransform.scale;
            
            //this.totalTransform.scale = this.getScaleWithinLimits(relativeTransform.scale * scaleChange);
            
            if(transformBeforeScale)
            {
                let scaleAfter = this.getScaleWithinLimits(this.totalTransform.scale * scaleChange);
                this.totalTransform.scale = scaleAfter;
                //let scaleAfter = this.totalTransform.scale * scaleChange;
                
                this.totalTransform.translateX = (relativeTransform.translateX - zoomData.x) / scalePrev * scaleAfter + zoomData.x;
                this.totalTransform.translateY = (relativeTransform.translateY - zoomData.y) / scalePrev * scaleAfter + zoomData.y;
                
                if(zoomData.targetX && zoomData.targetY)
                {
                    this.totalTransform.translateX += (zoomData.targetX - zoomData.x) / scalePrev * scaleAfter;
                    this.totalTransform.translateY += (zoomData.targetY - zoomData.y) / scalePrev * scaleAfter;
                }
            }
            else
            {
                this.totalTransform.scale = this.getScaleWithinLimits(relativeTransform.scale * scaleChange);
                scaleChange = this.totalTransform.scale / scalePrev;
                
                let posBefore = {x: zoomData.x , y: zoomData.y };
                let posAfter = {x: posBefore.x * scaleChange, y: posBefore.y * scaleChange};
                let relative = {x: posAfter.x - posBefore.x, y: posAfter.y - posBefore.y};
                
                this.totalTransform.translateX = relativeTransform.translateX - relative.x / this.totalTransform.scale;
                this.totalTransform.translateY = relativeTransform.translateY - relative.y / this.totalTransform.scale;
                
                if(zoomData.targetX && zoomData.targetY)
                {
                    this.totalTransform.translateX += (zoomData.targetX - zoomData.x) / this.totalTransform.scale;
                    this.totalTransform.translateY += (zoomData.targetY - zoomData.y) / this.totalTransform.scale;
                }
            }
    
            this.ensureTransformWithinBounds(transformBeforeScale);
            
            onZoomed(zoomData, this.totalTransform);
            onTransform(this.totalTransform);
        });
    }
    
    private getScaleWithinLimits(scale: number) : number
    {
        if(!isNaN(this.options.minScale) && this.options.minScale !== null)
        {
            scale = scale > this.options.minScale ? scale : this.options.minScale;
        }
    
        if(!isNaN(this.options.maxScale) && this.options.maxScale !== null)
        {
            scale = scale < this.options.maxScale ? scale : this.options.maxScale;
        }
        return scale;
    }
    
    private ensureTransformWithinBounds(transformBeforeScale)
    {
        if(this.options.bounds)
        {
            let scale = transformBeforeScale ? this.totalTransform.scale - 1 : 1 - 1 / this.totalTransform.scale;
            
            if(this.totalTransform.translateX < -1 * scale * this.width + this.options.bounds.left)
            {
                this.totalTransform.translateX = -1 * scale * this.width + this.options.bounds.left;
            }
            if(this.totalTransform.translateX > this.options.bounds.right)
            {
                this.totalTransform.translateX = this.options.bounds.right;
            }
            if(this.totalTransform.translateY < -1 * scale * this.height + this.options.bounds.top)
            {
                this.totalTransform.translateY = -1 * scale * this.height + this.options.bounds.top;
            }
            if(this.totalTransform.translateY > this.options.bounds.bottom)
            {
                this.totalTransform.translateY = this.options.bounds.bottom;
            }
        }
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
                const transform = element.getAttribute('transform') || '';
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
    
    //private templateVariableElements: Element[] = [];
    //private static TEMPLATE_VARIABLES = { 'translateX': '__EASYPZ-TRANSLATE-X__', 'translateY': '__EASYPZ-TRANSLATE-Y__', 'scale': '__EASYPZ-SCALE__'};
    
    private detectTemplateVariables()
    {
        /*const templateVariableNames = Object.keys(EasyPZ.TEMPLATE_VARIABLES).map(key => EasyPZ.TEMPLATE_VARIABLES[key]);
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
        }*/
    }
    
    private replaceVariables()
    {
        /*const TEMPLATE_VARIABLES = Object.keys(EasyPZ.TEMPLATE_VARIABLES);
        
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
        });*/
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
        this.setDimensions();
    }
    
    private setDimensions()
    {
        let rect = this.el.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
    }
    
    private updateMousePosition(event: MouseEvent|TouchEvent) : void
    {
        let pos = this.getMousePosition(event);
        if(pos)
        {
            this.mousePos = pos;
        }
    }
    
    private getMousePosition(event: MouseEvent|TouchEvent) : {x: number, y: number}|null
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
            if(touches.length < 1) return null;
            pos = {x: touches[0].clientX, y: touches[0].clientY};
        }
        
        return this.getRelativePosition(pos.x, pos.y);
    }
    
    public getRelativePosition(x: number, y: number) : {x: number, y: number}
    {
        let boundingRect = this.el.getBoundingClientRect();
        this.width = boundingRect.width;
        this.height = boundingRect.height;
        return { x: x - boundingRect.left, y: y - boundingRect.top };
    }
    
    private onMouseTouchDown(mouseEvent: MouseEvent|null, touchEvent?: TouchEvent)
    {
        this.lastMouseDownTime = this.mouseDownTime;
        this.lastMousePos = {x: this.mousePos.x, y: this.mousePos.y};
        this.mouseDownTime = Date.now();
        let event = mouseEvent || touchEvent;
        
        if(!event)
        {
            return console.error('no event!');
        }
        
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
    
    private onMouseTouchMove(mouseEvent: MouseEvent|null, touchEvent?: TouchEvent) : boolean
    {
        this.mouseMoveTime = Date.now();
        this.lastMousePos = {x: this.mousePos.x, y: this.mousePos.y};
        let event = mouseEvent || touchEvent;
        
        if(!event)
        {
            console.error('no event');
            return false;
        }
        this.updateMousePosition(event);
        
        let eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE;
        let eventWasUsed = this.onMouseTouchEvent(eventType, event);
        
        for(let cb of this.afterMouseMovedCallbacks)
        {
            cb();
        }
        return eventWasUsed;
    }
    
    private onMouseMove(event: MouseEvent)
    {
        this.onMouseTouchMove(event);
    }
    
    private onTouchMove(event: TouchEvent)
    {
        if(event.touches.length == 1)
        {
            const eventWasUsed = this.onMouseTouchMove(null, event);
            
            if(eventWasUsed)
            {
                event.preventDefault();
            }
        }
        else if(event.touches.length == 2)
        {
            this.updateMousePosition(event);
            let eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE;
            this.onMultiTouchEvent(eventType, event);
            event.preventDefault();
        }
    }
    
    private static modes : ((easyPZ: EasyPZ) => EasyPzMode)[] = [];
    private modes : EasyPzMode[] = [];
    
    public static addMode(unresolvedMode: (easyPZ: EasyPZ) => EasyPzMode)
    {
        EasyPZ.modes.push(unresolvedMode);
    }
    
    private getEventData(event, modeName) : EasyPzCallbackData
    {
        return {
            event: event,
            modeName: modeName
        };
    }
    
    private getActiveModes()
    {
        let modes : { mode: EasyPzMode, activeId: string}[] = [];
        
        this.modes.forEach(mode =>
        {
            mode.ids.forEach(modeId =>
            {
                if(this.enabledModes.indexOf(modeId) !== -1)
                {
                    modes.push({ mode: mode, activeId: modeId });
                }
            });
        });
        
        return modes;
    }
    
    private onMultiTouchEvent(eventType: number, event: TouchEvent)
    {
        this.getActiveModes().forEach(modeData =>
        {
            if(eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE && modeData.mode.onMove)
                modeData.mode.onMove(this.getEventData(event, modeData.activeId));
            else if(eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN && modeData.mode.onClickTouch)
                modeData.mode.onClickTouch(this.getEventData(event, modeData.activeId));
            else if(eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP && modeData.mode.onClickTouchEnd)
                modeData.mode.onClickTouchEnd(this.getEventData(event, modeData.activeId));
        });
    }
    
    private onMouseTouchUp(mouseEvent: MouseEvent|null, touchEvent?: TouchEvent)
    {
        this.mouseUpTime = Date.now();
        this.lastMousePos = {x: this.mousePos.x, y: this.mousePos.y};
        let event = mouseEvent || touchEvent;
        
        if(!event)
        {
            return console.error('no event');
        }
        
        this.updateMousePosition(event);
        
        let eventType = EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP;
        this.onMouseTouchEvent(eventType, event);
    }
    
    private onMouseTouchEvent(eventType: number, event: MouseEvent|TouchEvent)
    {
        let eventWasUsed = false;
        
        if(EasyPZ.isRightClick(event))
        {
            if(eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN)
            {
                //TODO should check if it uses the event.
                this.onRightClick(eventType, event);
            }
            return eventWasUsed;
        }
        
        this.getActiveModes().forEach(modeData =>
        {
            if(eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_MOVE && modeData.mode.onMove)
                modeData.mode.onMove(this.getEventData(event, modeData.activeId));
            else if(eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_DOWN && modeData.mode.onClickTouch)
                modeData.mode.onClickTouch(this.getEventData(event, modeData.activeId));
            else if(eventType === EasyPZ.MOUSE_EVENT_TYPES.MOUSE_UP && modeData.mode.onClickTouchEnd)
                modeData.mode.onClickTouchEnd(this.getEventData(event, modeData.activeId));
            
            eventWasUsed = true;
            /*if(modeData.mode.active)
            {
                eventWasUsed = true;
            }*/
        });
        return eventWasUsed;
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
        
        if(pos && (pos.x < 0 || pos.x > this.width || pos.y < 0 || pos.y > this.height))
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
        /*if(this.modeOn(EasyPZ.MODES.DBLRIGHTCLICK_ZOOM_IN) || this.modeOn(EasyPZ.MODES.DBLRIGHTCLICK_ZOOM_OUT))
        {
            event.preventDefault();
            return false;
        }*/
    }
    
    private onWheel(event: WheelEvent)
    {
        let captured = false;
        
        this.getActiveModes().forEach(modeData =>
        {
            if(modeData.mode.onWheel)
            {
                modeData.mode.onWheel(this.getEventData(event, modeData.activeId));
                captured = true;
            }
        });
        
        if(captured)
        {
            event.preventDefault();
        }
    }
    
    private onRightClick(eventType: number, event: MouseEvent|TouchEvent)
    {
        this.getActiveModes().forEach(modeData =>
        {
            if(modeData.mode.onRightClick)
            {
                modeData.mode.onRightClick(this.getEventData(event, modeData.activeId));
            }
        });
    }
    
    public static momentumInteraction(startSpeed : number, friction : number, onStep : (dist) => void)
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
    
    
    /* Useful functions */
    
    static isRightClick(event: MouseEvent|TouchEvent): boolean
    {
        return event instanceof MouseEvent
            && (!!event.clientX)
            && (("which" in event && event.which === 3)
                || ("button" in event && event.button === 2));
    }
    
    static getPositionDistance(pos1: {x: number, y: number}, pos2: {x: number, y: number})
    {
        return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
    }
    
    callbackAfterTimeoutOrMovement(timeout: number, movement: number) : EzPromise<number>
    {
        return new EzPromise<number>((resolve) =>
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

/* Simple Pan*/
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
        ids: ['SIMPLE_PAN'],
        settings: { minDistance: 3, delay: 300 },
        
        active: false,
        data: {lastPosition: {x: 0, y: 0}},
        
        onClickTouch: () =>
        {
            mode.active = false;
            mode.data.lastPosition = {x: easypz.mousePos.x, y: easypz.mousePos.y};
            
            easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.minDistance).then((dist) =>
            {
                mode.active = easypz.mouseUpTime < easypz.mouseDownTime && dist >= mode.settings.minDistance;
            });
        },
        
        onMove: () =>
        {
            if(mode.active)
            {
                let relativeX = easypz.mousePos.x - mode.data.lastPosition.x;
                let relativeY = easypz.mousePos.y - mode.data.lastPosition.y;
                easypz.onPanned.emit({x: relativeX, y: relativeY});
                
                mode.data.lastPosition = {x: easypz.mousePos.x, y: easypz.mousePos.y};
            }
        },
        
        onClickTouchEnd: () =>
        {
            mode.active = false;
        }
    };
    
    return mode;
});

/* Flick Pan */
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
        ids: ['FLICK_PAN'],
        settings: { minDistance: 3, delay: 300, friction: 0.005 },
        
        active: false,
        data: {
            continueTime: 0,
            positions: [],
            momentum: null
        },
        
        onClickTouch: () =>
        {
            mode.active = false;
            mode.data.positions = [{x: easypz.mousePos.x, y: easypz.mousePos.y, time: Date.now()}];
            
            if(mode.data.momentum)
            {
                mode.data.momentum.stop();
            }
            
            easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.minDistance).then((dist) =>
            {
                mode.active = easypz.mouseUpTime < easypz.mouseDownTime && dist >= mode.settings.minDistance;
            });
        },
        
        onMove: () =>
        {
            if(mode.active)
            {
                let relativeX = easypz.mousePos.x - easypz.lastMousePos.x;
                let relativeY = easypz.mousePos.y - easypz.lastMousePos.y;
                easypz.onPanned.emit({x: relativeX, y: relativeY});
                
                mode.data.positions.push({x: easypz.mousePos.x, y: easypz.mousePos.y, time: Date.now()});
            }
        },
        
        onClickTouchEnd: () =>
        {
            if(mode.active)
            {
                mode.active = false;
                
                let referencePoints = mode.data.positions.filter(flickPos =>
                {
                    return flickPos.time >= Date.now() - 100 && flickPos.time <= Date.now() - 50;
                });
                
                if(referencePoints.length == 0) return;
                
                let refPoint = referencePoints[0];
                let dist = EasyPZ.getPositionDistance({x: refPoint.x, y: refPoint.y}, easypz.mousePos);
                let flickDirection = {x: (easypz.mousePos.x - refPoint.x) / dist, y: (easypz.mousePos.y - refPoint.y) / dist};
                
                let time = Date.now() - refPoint.time;
                let speed = dist / time;
                mode.data.momentum = EasyPZ.momentumInteraction(speed, mode.settings.friction, (dist) =>
                {
                    let relativeMove = {x: flickDirection.x * dist, y: flickDirection.y * dist };
                    easypz.onPanned.emit(relativeMove);
                });
                
                mode.data.momentum.start();
            }
        }
    };
    
    return mode;
});

/* Hold Zoom */
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
        ids: ['HOLD_ZOOM_IN', 'HOLD_ZOOM_OUT', 'CLICK_HOLD_ZOOM_IN', 'CLICK_HOLD_ZOOM_OUT'],
        settings: { maxDistance: 3, delay: 350, zoomInScaleChangePerMs: -0.0015,
            zoomOutScaleChangePerMs: 0.003, doubleClickTimeout: 300 },
        
        active: false,
        data: { zoomingOut: false, zoomPos: {x: 0, y: 0} },
        
        onClickTouch: (eventData: EasyPzCallbackData) =>
        {
            let holdZoomLastChange;
            
            let recursiveZoom = () =>
            {
                if(mode.active)
                {
                    let timePassed = Date.now() - holdZoomLastChange;
                    let scaleChangePerMs = mode.data.zoomingOut ? mode.settings.zoomOutScaleChangePerMs : mode.settings.zoomInScaleChangePerMs;
                    let scale = 1 + scaleChangePerMs * timePassed;
                    easypz.onZoomed.emit({x: mode.data.zoomPos.x, y: mode.data.zoomPos.y, scaleChange: scale});
                    holdZoomLastChange = Date.now();
                    
                    requestAnimationFrame(recursiveZoom);
                }
            };
            
            // If the pointer is moved within the first 300ms, it is not considered zooming.
            easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.maxDistance).then((dist) =>
            {
                mode.active = easypz.mouseUpTime < easypz.mouseDownTime && dist <= mode.settings.maxDistance;
                
                if(mode.active)
                {
                    holdZoomLastChange = Date.now();
                    let hasClickedFirst = easypz.mouseDownTime - easypz.lastMouseDownTime < mode.settings.doubleClickTimeout;
                    mode.data.zoomPos = {x: easypz.mousePos.x, y: easypz.mousePos.y};
                    
                    // start zooming
                    let clickFirst = eventData.modeName === 'CLICK_HOLD_ZOOM_IN' ||
                        eventData.modeName === 'CLICK_HOLD_ZOOM_OUT';
                    
                    if(hasClickedFirst == clickFirst)
                    {
                        mode.data.zoomingOut = eventData.modeName === 'HOLD_ZOOM_OUT' ||
                            eventData.modeName === 'CLICK_HOLD_ZOOM_OUT';
                        recursiveZoom();
                    }
                }
            });
        },
        
        onMove: () =>
        {
            if(mode.active)
            {
                mode.data.zoomPos = {x: easypz.mousePos.x, y: easypz.mousePos.y};
            }
        },
        
        onClickTouchEnd: () =>
        {
            mode.active = false;
        }
    };
    
    return mode;
});

/* Double Click Zoom */
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
        ids: ['DBLCLICK_ZOOM_IN', 'DBLCLICK_ZOOM_OUT', 'DBLRIGHTCLICK_ZOOM_IN', 'DBLRIGHTCLICK_ZOOM_OUT'],
        settings: { dblClickTime: 300,
            zoomInScaleChange: 0.33,
            zoomOutScaleChange: 3,
            maxHoldTime: 200
        },
        
        onClickTouchEnd: (eventData: EasyPzCallbackData) =>
        {
            let isDblClick = easypz.mouseDownTime - easypz.lastMouseDownTime < mode.settings.dblClickTime;
            let isHold = easypz.mouseUpTime - easypz.mouseDownTime > mode.settings.maxHoldTime;
            let isNotRightClick = eventData.modeName.substr(0, 'DBLCLICK'.length) === 'DBLCLICK';
            
            if (isDblClick && !isHold && isNotRightClick)
            {
                const zoomingOut = eventData.modeName === 'DBLCLICK_ZOOM_OUT';
                
                let scaleChange = zoomingOut ? mode.settings.zoomOutScaleChange : mode.settings.zoomInScaleChange;
                easypz.onZoomed.emit({x: easypz.mousePos.x, y: easypz.mousePos.y, scaleChange: scaleChange});
            }
        },
        
        onRightClick: (eventData: EasyPzCallbackData) =>
        {
            let isDblClick = easypz.mouseDownTime - easypz.lastMouseDownTime < mode.settings.dblClickTime;
            let isHold = easypz.mouseUpTime - easypz.mouseDownTime > mode.settings.maxHoldTime;
            let isRightClick = eventData.modeName.substr(0, 'DBLRIGHTCLICK'.length) === 'DBLRIGHTCLICK';
            
            if (isDblClick && !isHold && isRightClick)
            {
                const zoomingOut = eventData.modeName === 'DBLRIGHTCLICK_ZOOM_OUT';
                
                let scaleChange = zoomingOut ? mode.settings.zoomOutScaleChange : mode.settings.zoomInScaleChange;
                easypz.onZoomed.emit({x: easypz.mousePos.x, y: easypz.mousePos.y, scaleChange: scaleChange});
            }
        }
    };
    
    return mode;
});

/* Wheel Zoom */
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
        ids: ['WHEEL_ZOOM', 'WHEEL_ZOOM_MOMENTUM'],
        settings: {
            zoomInScaleChange: 0.8,
            zoomOutScaleChange: 1.2,
            momentumSpeedPercentage: 0.01,
            momentumFriction: 0.000004
        },
        
        onWheel: (eventData: EasyPzCallbackData) =>
        {
            const delta = eventData.event.wheelDelta ? eventData.event.wheelDelta : -1 * eventData.event.deltaY;
            const change = delta / Math.abs(delta);
            const zoomingIn = change > 0;
            
            let scale = zoomingIn ? mode.settings.zoomInScaleChange : mode.settings.zoomOutScaleChange;
            easypz.onZoomed.emit({x: easypz.mousePos.x, y: easypz.mousePos.y, scaleChange: scale});
            
            if(eventData.modeName === 'WHEEL_ZOOM_MOMENTUM')
            {
                let relativeScale = 1 - scale;
                let absScale = Math.abs(relativeScale) * mode.settings.momentumSpeedPercentage;
                let scaleSign = sign(relativeScale);
                
                this.flickMomentum = EasyPZ.momentumInteraction(absScale, mode.settings.momentumFriction, (dist) =>
                {
                    let newScale = 1 - scaleSign * dist;
                    easypz.onZoomed.emit({x: easypz.mousePos.x, y: easypz.mousePos.y, scaleChange: newScale});
                });
                
                this.flickMomentum.start();
            }
        }
    };
    
    return mode;
});

/* Pinch Zoom and Pan */
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
        ids: ['PINCH_ZOOM', 'PINCH_ZOOM_QUADRATIC', 'PINCH_ZOOM_POWER_FOUR', 'PINCH_ZOOM_MOMENTUM', 'PINCH_PAN'],
        settings: {
            friction: 0.00001
        },
        data: {
            momentum: null,
            posStart1: null,
            posStart2: null,
            references: [],
            zoomPos: {x: 0, y: 0},
            zoomCenterPos: {x: 0, y: 0}
        },
        
        onClickTouch(eventData: EasyPzCallbackData)
        {
            if(mode.data.momentum)
            {
                mode.data.momentum.stop();
            }
            mode.data.references = [];
            
            if(eventData.event.touches && eventData.event.touches.length > 1)
            {
                mode.data.posStart1 = easypz.getRelativePosition(eventData.event.touches[0].clientX, eventData.event.touches[0].clientY);
                mode.data.posStart2 = easypz.getRelativePosition(eventData.event.touches[1].clientX, eventData.event.touches[1].clientY);
                easypz.resetAbsoluteScale.emit(null);
            }
        },
        
        onMove(eventData: EasyPzCallbackData)
        {
            if(mode.data.posStart1 && mode.data.posStart2)
            {
                const pos1 = easypz.getRelativePosition(eventData.event.touches[0].clientX, eventData.event.touches[0].clientY);
                const pos2 = easypz.getRelativePosition(eventData.event.touches[1].clientX, eventData.event.touches[1].clientY);
                const distBefore = EasyPZ.getPositionDistance(mode.data.posStart1, mode.data.posStart2);
                const distNow = EasyPZ.getPositionDistance(pos1, pos2);
                const ratio = distBefore / distNow;
                
                let power = 1;
                if(eventData.modeName === 'PINCH_ZOOM_QUADRATIC') power = 2;
                if(eventData.modeName === 'PINCH_ZOOM_POWER_FOUR') power = 4;
                if(eventData.modeName === 'PINCH_PAN') power = 0;
                const scale = Math.pow(ratio, power);
                
                mode.data.references.push({time: Date.now(), scale});
                mode.data.zoomPos = {x: (mode.data.posStart1.x + mode.data.posStart2.x) / 2, y: (mode.data.posStart1.y + mode.data.posStart2.y) / 2};
                mode.data.zoomCenterPos = {x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2};
                easypz.onZoomed.emit({x: mode.data.zoomPos.x, y: mode.data.zoomPos.y, absoluteScaleChange: scale, targetX: mode.data.zoomCenterPos.x, targetY: mode.data.zoomCenterPos.y});
            }
        },
        
        onClickTouchEnd(eventData: EasyPzCallbackData)
        {
            mode.data.posStart1 = null;
            mode.data.posStart1 = null;
            
            if(eventData.modeName === 'PINCH_ZOOM_MOMENTUM' && mode.data.references.length > 5)
            {
                let refLast = mode.data.references[mode.data.references.length-1];
                let ref = mode.data.references[mode.data.references.length-4];
                let refTimeDiff = refLast.time - ref.time;
                let refScaleDiff = refLast.scale - ref.scale;
                
                let lastScale = refLast.scale;
                
                let scaleChangeSpeed = refScaleDiff / refTimeDiff;
                let absScaleChangeSpeed = Math.abs(scaleChangeSpeed);
                let scaleSign = sign(scaleChangeSpeed);
                
                mode.data.momentum = EasyPZ.momentumInteraction(absScaleChangeSpeed, mode.settings.friction, (dist) =>
                {
                    let newScale = lastScale + scaleSign * dist;
                    easypz.onZoomed.emit({x: this.pinchZoomPos.x, y: this.pinchZoomPos.y, absoluteScaleChange: newScale, targetX: this.pinchZoomCenterPos.x, targetY: this.pinchZoomCenterPos.y});
                    lastScale = newScale;
                });
                
                mode.data.momentum.start();
            }
        }
    };
    
    return mode;
});

/* Wheel Pan */
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
        ids: ['WHEEL_PAN_X', 'WHEEL_PAN_Y'],
        settings: {
            speed: 50
        },
        
        onWheel: (eventData: EasyPzCallbackData) =>
        {
            const delta = eventData.event.wheelDelta ? eventData.event.wheelDelta : -1 * eventData.event.deltaY;
            let change = delta / Math.abs(delta);
            let zoomingIn = change > 0;
            let sign = zoomingIn ? 1 : -1;
            
            let panned = {x: 0, y: 0};
            const direction = eventData.modeName === 'WHEEL_PAN_X' ? 'x' : 'y';
            panned[direction] = mode.settings.speed * sign;
            easypz.onPanned.emit(panned);
        }
    };
    
    return mode;
});

/* Brush Zoom */
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
        ids: ['BRUSH_ZOOM', 'BRUSH_ZOOM_X', 'BRUSH_ZOOM_Y'],
        settings: {
            minDistance: 3,
            delay: 300,
            minTime: 150
        },
        active: false,
        data: {
            startPos: {x: 0, y: 0},
            el: null
        },
        
        onClickTouch: () =>
        {
            if(easypz.numberOfPointers !== 1)
            {
                mode.active = false;
                
                if(mode.data.el)
                {
                    mode.data.el.style.display = 'none';
                }
            }
            else
            {
                mode.active = true;
                
                if(!mode.data.el)
                {
                    mode.data.el = document.createElement('div');
                    mode.data.el.style.border = '1px solid #c00';
                    mode.data.el.style.background = 'rgba(200,50,50,0.3)';
                    mode.data.el.style.position = 'absolute';
                    document.body.appendChild(mode.data.el);
                }
                
                //this.brushZoomDirection = direction;
                mode.data.startPos = {x: easypz.mousePos.x, y: easypz.mousePos.y};
                
                easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.minDistance).then((dist) =>
                {
                    mode.active = easypz.numberOfPointers == 1 && dist > mode.settings.minDistance;
                    
                    if(!mode.active && mode.data.el)
                        mode.data.el.style.display = 'none';
                });
                setTimeout(() =>
                {
                    if(easypz.numberOfPointers !== 1)
                    {
                        mode.active = false;
                        
                        if(mode.data.el)
                            mode.data.el.style.display = 'none';
                    }
                }, mode.settings.delay);
            }
        },
        
        onMove: (eventData) =>
        {
            if(easypz.numberOfPointers !== 1)
            {
                mode.active = false;
                
                if(mode.data.el)
                    mode.data.el.style.display = 'none';
            }
            
            if(mode.active)
            {
                let left = easypz.mousePos.x < mode.data.startPos.x ? easypz.mousePos.x : mode.data.startPos.x;
                let width = Math.abs(mode.data.startPos.x - easypz.mousePos.x);
                let top = easypz.mousePos.y < mode.data.startPos.y ? easypz.mousePos.y : mode.data.startPos.y;
                let height = Math.abs(mode.data.startPos.y - easypz.mousePos.y);
                
                if(eventData.modeName === 'BRUSH_ZOOM_X')
                {
                    top = easypz.el.getBoundingClientRect().top;
                    height = easypz.height;
                }
                else if(eventData.modeName === 'BRUSH_ZOOM_Y')
                {
                    left = easypz.el.getBoundingClientRect().left;
                    width = easypz.width;
                }
                
                mode.data.el.style.display = 'block';
                mode.data.el.style.left = left + 'px';
                mode.data.el.style.top = top + 'px';
                mode.data.el.style.width = width + 'px';
                mode.data.el.style.height = height + 'px';
            }
        },
        
        onClickTouchEnd: (eventData: EasyPzCallbackData) =>
        {
            if(mode.active)
            {
                mode.active = false;
                mode.data.el.style.display = 'none';
                
                if(Date.now() - easypz.mouseDownTime > mode.settings.minTime)
                {
                    let middle = {x: mode.data.startPos.x + (easypz.mousePos.x - mode.data.startPos.x) / 2, y: mode.data.startPos.y + (easypz.mousePos.y - mode.data.startPos.y) / 2 };
                    
                    const dist = {
                        x: Math.abs(easypz.mousePos.x - mode.data.startPos.x),
                        y: Math.abs(easypz.mousePos.y - mode.data.startPos.y)
                    };
                    
                    let scaleChange;
                    
                    if(eventData.modeName === 'BRUSH_ZOOM')
                    {
                        scaleChange = Math.max(dist.x / easypz.width, dist.y / easypz.height) * 1.3;
                    }
                    else if(eventData.modeName === 'BRUSH_ZOOM_X')
                    {
                        scaleChange = dist.x / easypz.width * 1.3;
                    }
                    else if(eventData.modeName === 'BRUSH_ZOOM_Y')
                    {
                        scaleChange = dist.y / easypz.height * 1.3;
                    }
                    
                    //this.onZoomed.emit({x: middle.x, y: middle.y, scaleChange: scaleChange });
                    easypz.onZoomed.emit({x: middle.x, y: middle.y, scaleChange: scaleChange, targetX: this.width / 2, targetY: this.height / 2});
                }
            }
        }
    };
    
    return mode;
});


/* Dynamic / RubPointing Zoom */
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
        ids: ['DYNAMIC_ZOOM_X_STATIC', 'DYNAMIC_ZOOM_X_ORIGINAL_PAN', 'DYNAMIC_ZOOM_X_NORMAL_PAN', 'DYNAMIC_ZOOM_X_ADJUSTABLE', 'DYNAMIC_ZOOM_Y_STATIC', 'DYNAMIC_ZOOM_Y_ORIGINAL_PAN', 'DYNAMIC_ZOOM_Y_NORMAL_PAN', 'DYNAMIC_ZOOM_Y_ADJUSTABLE'],
        settings: {
            speed: 0.05,
            minDistance: 3,
            delay: 300,
            minDirectionPercentage: 0.7
        },
        active: false,
        data: {
            startPos: {x: 0, y: 0},
            relativePos: {x: 0, y: 0},
            direction: 'x'
        },
        
        onClickTouch: (eventData: EasyPzCallbackData) =>
        {
            mode.data.direction = eventData.modeName.substr('DYNAMIC_ZOOM_'.length, 1).toLowerCase();
            const direction = mode.data.direction;
            
            mode.data.startPos = {x: easypz.mousePos.x, y: easypz.mousePos.y};
            mode.data.relativePos = {x: 0, y: 0};
            
            easypz.resetAbsoluteScale.emit(null);
            
            easypz.callbackAfterTimeoutOrMovement(mode.settings.delay, mode.settings.minDistance).then((dist) =>
            {
                let distInDirection = Math.abs(mode.data.startPos[direction] - easypz.mousePos[direction]);
                
                if (easypz.numberOfPointers > 1 || dist < mode.settings.minDistance || distInDirection / dist < mode.settings.minDirectionPercentage)
                {
                    mode.active = false;
                }
                else if(this.mouseDownTime > this.mouseUpTime)
                {
                    mode.active = true;
                }
            });
        },
        
        onMove: (eventData: EasyPzCallbackData) =>
        {
            if(mode.active)
            {
                let relativeMove = {x: 0, y: 0};
                const direction = mode.data.direction;
                
                EasyPZ.DIMENSIONS.forEach(dimension => {
                    relativeMove[dimension] = easypz.mousePos[dimension] - easypz.lastMousePos[dimension];
                });
                let dist = easypz.mousePos[direction] - mode.data.startPos[direction];
                if(!dist) return;
                
                let scale = Math.exp(-1 * mode.settings.speed * dist);
                EasyPZ.DIMENSIONS.forEach(dimension => {
                    mode.data.relativePos[dimension] += relativeMove[dimension] * scale;
                });
                
                
                let actualZoomPosition : {x: number, y: number};
                let targetX = null;
                let targetY = null;
                
                let dynamicZoomPosition;
                
                if(eventData.modeName === 'DYNAMIC_ZOOM_X_ADJUSTABLE'
                    || eventData.modeName === 'DYNAMIC_ZOOM_Y_ADJUSTABLE')
                {
                    actualZoomPosition = {x: mode.data.startPos.x + mode.data.relativePos.x, y: mode.data.startPos.y + mode.data.relativePos.y};
                    targetX = easypz.mousePos.x;
                    targetY = easypz.mousePos.y;
                    dynamicZoomPosition = { x: easypz.mousePos.x, y: easypz.mousePos.y };
                }
                else if(eventData.modeName === 'DYNAMIC_ZOOM_X_STATIC'
                    || eventData.modeName === 'DYNAMIC_ZOOM_Y_STATIC')
                {
                    dynamicZoomPosition = {x: mode.data.startPos.x, y: mode.data.startPos.y};
                }
                else if(eventData.modeName === 'DYNAMIC_ZOOM_X_NORMAL_PAN'
                    || eventData.modeName === 'DYNAMIC_ZOOM_Y_NORMAL_PAN')
                {
                    dynamicZoomPosition = {x: mode.data.startPos.x - mode.data.relativePos.x, y: mode.data.startPos.y - mode.data.relativePos.y};
                }
                else if(eventData.modeName === 'DYNAMIC_ZOOM_X_ORIGINAL_PAN'
                    || eventData.modeName === 'DYNAMIC_ZOOM_Y_ORIGINAL_PAN')
                {
                    dynamicZoomPosition = {x: easypz.mousePos.x, y: easypz.mousePos.y};
                }
                
                let zoomPos = actualZoomPosition ? actualZoomPosition : dynamicZoomPosition;
                easypz.onZoomed.emit({x: zoomPos.x, y: zoomPos.y, absoluteScaleChange: scale, targetX: targetX, targetY: targetY});
            }
        },
        
        onClickTouchEnd: () =>
        {
            mode.active = false;
        }
    };
    
    return mode;
});

/* Rub Zoom */
EasyPZ.addMode((easypz: EasyPZ) =>
{
    const mode = {
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
            hasChangedDirectionDirection:'x',
            
            zoomPosition: null,
            zoomReference: null
        },
        
        onClickTouch: () =>
        {
            mode.active = false;
            
            mode.data.zoomPosition = {x: easypz.mousePos.x, y: easypz.mousePos.y};
            mode.data.zoomReference = {x: easypz.mousePos.x, y: easypz.mousePos.y};
        },
        
        onMove: (eventData: EasyPzCallbackData) =>
        {
            if(mode.data.zoomReference)
            {
                const direction = eventData.modeName.substr(eventData.modeName.length - 1).toLowerCase();
                let distance = Math.abs(mode.data.zoomReference[direction] - easypz.mousePos[direction]);
                
                let signBefore = sign(easypz.lastMousePos[direction] - mode.data.zoomReference[direction]);
                let signNow = sign(easypz.mousePos[direction] - easypz.lastMousePos[direction]);
                
                if(signBefore != 0 && signNow != 0 && signBefore != signNow && distance > mode.settings.minDistance)
                {
                    mode.data.zoomReference = {x: easypz.mousePos.x, y: easypz.mousePos.y};
                    distance = 0;
                    mode.data.hasChangedDirection = true;
                    mode.data.hasChangedDirectionSign = signNow;
                    mode.data.hasChangedDirectionDirection = direction;
                }
                
                if(!mode.active && mode.data.hasChangedDirection && direction == mode.data.hasChangedDirectionDirection && signNow != mode.data.hasChangedDirectionSign)
                {
                    mode.data.hasChangedDirection = false;
                }
                
                if(mode.data.hasChangedDirection && distance > mode.settings.minDistanceAfterDirectionChange)
                {
                    mode.active = true;
                }
                
                let distanceSinceLast = Math.abs(easypz.mousePos[direction] - easypz.lastMousePos[direction]);
                if(mode.active && distanceSinceLast)
                {
                    const directionValue = eventData.modeName.substr(0, 'RUB_ZOOM_IN'.length) === 'RUB_ZOOM_IN' ? 1 : -1;
                    const zoomPos = {x: (easypz.mousePos.x + mode.data.zoomReference.x)/2, y: (easypz.mousePos.y + mode.data.zoomReference.y)/2};
                    const scaleChange = 1 - mode.settings.speed * distanceSinceLast * directionValue;
                    
                    easypz.onZoomed.emit({x: zoomPos.x, y: zoomPos.y, scaleChange: scaleChange});
                }
            }
        },
        
        onClickTouchEnd: () =>
        {
            mode.active = false;
            mode.data.zoomPosition = null;
            mode.data.zoomReference = null;
            mode.data.hasChangedDirection = false;
        }
    };
    
    return mode;
});
