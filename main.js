/*
 Function  : Final project: BB_Bomb
 Author    : WEI, Lixin
 Build_Date: Dec. 05, 2016
 Version   : 1.0
 */

//Global variables
var FRAME_SPEED = 10,
    HERO_SIZE = 20,
    KEY_DOWN_STEP = 10;

var stopped = false,
    isKeyDownLeft = false,
    isKeyDownRight = false,
    isKeyDownUp = false,
    isKeyDownDown = false;

var canvas = document.getElementById("canvas"),
    ctx = canvas.getContext("2d");

var hero = new Hero(),
    laser = new Laser();

//Functions
function Hero() {
    this.pos = {
        x : canvas.width/2,
        y : canvas.height/2
    };
    this.MAX_LINE_WIDTH = 5;
    this.MIN_LINE_WIDTH = 1;
    this.lineWidth = 1;
    this.lineAnimateDir = 1;
    this.draw = function () {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = this.lineWidth;
        ctx.arc(this.pos.x, this.pos.y, HERO_SIZE, 0, Math.PI*2, true);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    };
    this.move = function (dx, dy) {
        this.pos.x += dx;
        this.pos.y += dy;
        if(this.pos.x>canvas.width) this.pos.x=canvas.width;
        if(this.pos.y>canvas.height) this.pos.y=canvas.height;
        if(this.pos.x<0) this.pos.x=0;
        if(this.pos.y<0) this.pos.y=0;

    };
    this.update = function (dt) {
        this.lineWidth += dt*this.lineAnimateDir;
        if(this.lineWidth>this.MAX_LINE_WIDTH || this.lineWidth<this.MIN_LINE_WIDTH)
            this.lineAnimateDir = -this.lineAnimateDir;
    };
}
function Laser() {
    this.shown = false;
    this.animateHidden = false;
    this.HIDE_FRAME = 3;
    this.frame = 0;
    this.endPos = {
        x : 0,
        y : 0
    };
    this.draw = function() {
        if(this.shown && this.animateHidden) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(hero.pos.x, hero.pos.y);
            ctx.lineTo(this.endPos.x, this.endPos.y);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }
    };
    this.update = function () {
        this.frame++;
        if(this.frame>=this.HIDE_FRAME) {
            this.frame = 0;
            this.animateHidden = ! this.animateHidden;
        }
    };
}
function LaserCollection() {
    this.laserQueue = new buckets.Queue();
    this.addLaser = function () {
        
    };
    this.draw = function () {
        this.laserQueue.forEach(function (obj) {
            obj.draw();
        })
    };
}
function draw() {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hero.draw();
    laser.draw();
    ctx.restore();
}

function update() {
    //hero movement START
    var dx = 0, dy = 0;
    if(isKeyDownLeft) dx -= 1;
    if(isKeyDownRight) dx += 1;
    if(isKeyDownUp) dy -= 1;
    if(isKeyDownDown) dy += 1;
    if(dx && dy) {
        var w = KEY_DOWN_STEP*Math.sqrt(2)/2;
        dx *= w;
        dy *= w;
    }
    else if(dx) {
        dx *= KEY_DOWN_STEP;
    }
    else if(dy) {
        dy *= KEY_DOWN_STEP;
    }
    hero.move(dx, dy);
    //hero movement END
    hero.update(0.1);
    laser.update();
}
function timeOut() {
    draw();
    update();
    if(stopped == false) {
        requestAnimationFrame(timeOut);
        //setTimeout(timeOut, FRAME_SPEED);
    }
}
//Events
document.onkeydown = function (event) {
    event.preventDefault();
    if(event.keyCode == 37 || event.keyCode == 65) { // left
        isKeyDownLeft = true;
    }
    if(event.keyCode == 38 || event.keyCode == 87) { // up
        isKeyDownUp = true;
    }
    if(event.keyCode == 39 || event.keyCode == 68) { // right
        isKeyDownRight = true;
    }
    if(event.keyCode == 40 || event.keyCode == 83) { // down
        isKeyDownDown = true;
    }
};
document.onkeyup = function (event) {
    event.preventDefault();
    if(event.keyCode == 37 || event.keyCode == 65) { // left
        isKeyDownLeft = false;
    }
    if(event.keyCode == 38 || event.keyCode == 87) { // up
        isKeyDownUp = false;
    }
    if(event.keyCode == 39 || event.keyCode == 68) { // right
        isKeyDownRight = false;
    }
    if(event.keyCode == 40 || event.keyCode == 83) { // down
        isKeyDownDown = false;
    }
};
canvas.onmousedown = function (event) {
    laser.shown = true;
};
canvas.onmouseup = function (event) {
    laser.shown = false;
};
canvas.onmousemove = function (event) {
    laser.endPos = {
        x : event.offsetX,
        y : event.offsetY
    };
};
//Init
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.strokeStyle = "white";
timeOut();