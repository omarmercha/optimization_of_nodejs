// "use strict";
import observer from "@cocreate/observer";
import "./style.css";

const coors = ['left', 'right', 'top', 'bottom'];
const coCreateResize = {
    selector: '', //'.resize',
    resizers: [],
    resizeWidgets: [],

    init: function(handleObj) {
        for (var handleKey in handleObj)
            if (handleObj.hasOwnProperty(handleKey) && handleKey == 'selector')
                this.selector = handleObj[handleKey];

        this.resizers = document.querySelectorAll(this.selector);
        var _this = this;
        this.resizers.forEach(function(resize, idx) {
            let resizeWidget = new CoCreateResize(resize, handleObj);
            _this.resizeWidgets[idx] = resizeWidget;
        })
    },

    initElement: function(target) {
        let resizeWidget = new CoCreateResize(target, {
            dragLeft: "[data-resize_handle='left']",
            dragRight: "[data-resize_handle='right']",
            dragTop: "[data-resize_handle='top']",
            dragBottom: "[data-resize_handle='bottom']"
        });
        this.resizeWidgets[0] = resizeWidget;
    }
}

function CoCreateResize(resizer, options) {
    this.resizeWidget = resizer;
    this.cornerSize = 10;
    this.doDrags = coors.map((coor, i) => this.doDrag(i));
    this.initDrags = coors.map((coor, i) => this.initDrag(i));
    this.checkDragCorners = [[0, 2], [0, 3], [2, 0], [2, 1], [1, 2], [1, 3], [3, 0], [3, 1]].map((pair) => this.checkDragCorner(pair[0], pair[1]));
    this.init(options);
    this.drags = [this.leftDrag, this.rightDrag, this.topDrag, this.bottomDrag];
}

CoCreateResize.prototype = {
    doDrag: function(coor) {
        return (e) => {
            let full, offset = 100 //for skipping offset < 10

            if (e.touches)
                e = e.touches[0];

            if (coor == 2) {
                offset = this.startTop + e.clientY - this.startY;
                full = this.startHeight - e.clientY + this.startY;
            } else if (coor == 3) {
                full = this.startHeight + e.clientY - this.startY;
            } else if (coor == 0) {
                offset = this.startLeft + e.clientX - this.startX;
                full = this.startWidth - e.clientX + this.startX;
            } else {
                full = this.startWidth + e.clientX - this.startX;
            }

            if (offset < 10 || full < 10)
                return;

            if (coor == 3 || coor == 2) {
                if (coor == 2) this.resizeWidget.style.top = offset + 'px';
                this.resizeWidget.style.height = full + 'px';
            } else {
                if (coor == 0) this.resizeWidget.style.left = offset + 'px';
                this.resizeWidget.style.width = full + 'px';
            }
        }
    },

    initDrag: function(coor) {
        return (e) => {
            this.processIframe();
            const computedStyle = document.defaultView.getComputedStyle(this.resizeWidget);

            if (coor == 2 || coor == 3) {
                this.startTop = parseInt(computedStyle.top, 10);
                this.startHeight = parseInt(computedStyle.height, 10);
                if (e.touches) this.startY = e.touches[0].clientY;
                else this.startY = e.clientY;
            } else {
                this.startLeft = parseInt(computedStyle.left, 10);
                this.startWidth = parseInt(computedStyle.width, 10);
                if (e.touches) this.startX = e.touches[0].clientX;
                else this.startX = e.clientX;
            }

            this.addListenerMulti(document.documentElement, 'mousemove touchmove', this.doDrags[coor]);
            this.addListenerMulti(document.documentElement, 'mouseup touchend', this.stopDrag);
        }
    },

    checkDragCorner: function(coor1, coor2) {
        return (e) => {
            const isCoor2Y = coor2 >= 2
            const scroll = isCoor2Y ? document.documentElement.scrollTop : document.documentElement.scrollLeft;
            if (e.touches)
                e = e.touches[0];
            const client = isCoor2Y ? e.clientY : e.clientX
            let offset
            if (coor2 % 2 == 0)
                offset = client - this.getDistance(this.drags[coor2], isCoor2Y) + scroll;
            else
                offset = this.getDistance(this.drags[coor2], isCoor2Y) - client - scroll;

            this.removeListenerMulti(this.drags[coor1], 'mousedown touchstart', this.initDrags[coor1]);
            this.removeListenerMulti(this.drags[coor1], 'mousedown touchstart', this.initDrags[coor2]);
            this.addListenerMulti(this.drags[coor1], 'mousedown touchstart', this.initDrags[coor1]);

            if (offset < this.cornerSize && this.drags[coor2]) {
                this.drags[coor1].style.cursor = (coor1 + coor2) % 2 == 1 ? 'ne-resize' : 'se-resize';
                this.addListenerMulti(this.drags[coor1], 'mousedown touchstart', this.initDrags[coor2]);
            } else {
                this.drags[coor1].style.cursor = isCoor2Y ? 'e-resize' : 's-resize';
            }
        }
    },

    init: function(handleObj) {
        if (this.resizeWidget) {
            this.leftDrag = this.resizeWidget.querySelector(handleObj['dragLeft']);
            this.rightDrag = this.resizeWidget.querySelector(handleObj['dragRight']);
            this.topDrag = this.resizeWidget.querySelector(handleObj['dragTop']);
            this.bottomDrag = this.resizeWidget.querySelector(handleObj['dragBottom']);
            this.bindListeners();
            this.initResize();
        }
    },

    initResize: function() {
        const drags = [this.leftDrag, this.topDrag, this.rightDrag, this.bottomDrag]
        drags.forEach((drag, k) => {
            if (drag)
                [0, 1].forEach((i) => this.addListenerMulti(drag, 'mousemove touchmove', this.checkDragCorners[k * 2 + i]))
        })
    },

    stopDrag: function(e) {
        this.resizeWidget.querySelectorAll('iframe').forEach(function(item) {
            item.style.pointerEvents = null;
        });

        this.doDrags.forEach((drag) => this.removeListenerMulti(document.documentElement, 'mousemove touchmove', drag))
        this.removeListenerMulti(document.documentElement, 'mouseup touchend', this.stopDrag);
    },

    bindListeners: function() {
        this.stopDrag = this.stopDrag.bind(this);
    },

    getDistance: function(elem, isY) {
        var location = 0;
        if (elem.offsetParent) {
            do {
                const offset = isY ? elem.offsetTop : elem.offsetLeft
                location += offset;
                elem = elem.offsetParent;
            } while (elem);
        }
        return location >= 0 ? location : 0;
    },

    addListenerMulti: function(element, eventNames, listener) {
        eventNames.split(' ').forEach((event) => element.addEventListener(event, listener))
    },

    removeListenerMulti: function(element, eventNames, listener) {
        eventNames.split(' ').forEach((event) => element.removeEventListener(event, listener))
    },

    // style="pointer-events:none" for iframe when drag event starts
    processIframe: function() {
        this.resizeWidget.querySelectorAll('iframe').forEach(function(item) {
            item.style.pointerEvents = 'none';
        });
    }
}

observer.init({
    name: 'CoCreateResize',
    observe: ['subtree', 'childList'],
    include: '.resize',
    callback: function(mutation) {
        coCreateResize.initElement(mutation.target);
    }
})
export default coCreateResize;