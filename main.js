/*
 Function  : Final project: BB_Bomb
 Author    : WEI, Lixin
 Build_Date: Dec. 05, 2016
 Version   : 1.0
 */

//Global variables
var FRAME_SPEED = 10,
    HERO_SIZE = 30,
    KEY_DOWN_STEP = 10,
    LASER_SPEED = 15;

var stopped = false,
    isKeyDownLeft = false,
    isKeyDownRight = false,
    isKeyDownUp = false,
    isKeyDownDown = false,
    isShooting = false,
    lastShotTime = +new Date(),
    laserShotInterval = 10;//ms pre shot
    mousePos = new Victor(0,0);

var canvas = document.getElementById("canvas"),
    ctx = canvas.getContext("2d");

var hero = new Hero(),
    laserCollection = new LaserCollection();

//Functions
function Hero() {
    this.pos = new Victor( canvas.width/2,canvas.height/2);
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
function Laser(center, dir, len, speed) {
    this.dir = dir.normalize();
    this.len = len;
    this.startPos = center;
    this.endPos = this.startPos.clone().add(this.dir.clone().multiply(new Victor(this.len,this.len)));
    this.speed = speed;

    this.draw = function() {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.startPos.x, this.startPos.y);
        ctx.lineTo(this.endPos.x, this.endPos.y);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    };
    this.update = function () {
        var d = dir.clone().multiply(new Victor(speed, speed));
        this.startPos.add(d);
        this.endPos.add(d);
    };
    this.isOut = function () {
        return this.startPos.x>canvas.width || this.startPos.x<0 || this.startPos.y>canvas.height || this.startPos.y<0;
    };
}
function LaserCollection() {
    this.laserList = new buckets.LinkedList();
    this.addLaser = function (laser) {
        this.laserList.add(laser);
    };
    this.draw = function () {
        var index=0;
        this.laserList.forEach(function (obj) {
            obj.draw();
        });
        for(var i=0 ; i<this.laserList.size() ; ++i) { //Remove lasers out of screen
            var temp = this.laserList.first();
            this.laserList.removeElementAtIndex(0);
            if(!temp.isOut()) this.laserList.add(temp);
        }
    };
    this.update = function () {
        this.laserList.forEach(function (obj) {
            obj.update();
        });
    };
}
function draw() {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hero.draw();
    laserCollection.draw();
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
    var now = +new Date();
    var itv = now-lastShotTime;
    if(itv>=laserShotInterval && isShooting) {
        lastShotTime=now;
        var dir = new Victor(mousePos.x-hero.pos.x, mousePos.y-hero.pos.y);
        for(var i=-Math.PI/2+0.5 ; i<=Math.PI/2-0.5 ; i+=0.1*Math.random()) {
            laserCollection.addLaser(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED));
        }
    }
    laserCollection.update();
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
    isShooting = true;
};
canvas.onmouseup = function (event) {
    isShooting = false;
};
canvas.onmousemove = function (event) {
    mousePos = new Victor(event.offsetX, event.offsetY);
};
//Init
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.strokeStyle = "white";
timeOut();